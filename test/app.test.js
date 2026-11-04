const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

// Opens the real index.html + app.js + style.css, with `stored` as the raw localStorage value (like a page load).
function openApp(stored) {
    const withCss = html.replace('</head>', `<style>${css}</style></head>`);
    const dom = new JSDOM(withCss, { url: 'http://localhost/', runScripts: 'outside-only' });
    if (stored !== undefined) dom.window.localStorage.setItem('tasks', stored);
    dom.window.eval(appJs);
    return page(dom);
}

function page(dom) {
    const doc = dom.window.document;
    const item = (text) => [...doc.querySelectorAll('.task-item')]
        .find((li) => li.querySelector('.task-text').textContent === text);

    return {
        doc,
        item,
        texts: () => [...doc.querySelectorAll('.task-text')].map((el) => el.textContent),
        stored: () => JSON.parse(dom.window.localStorage.getItem('tasks')),
        add(text) {
            doc.getElementById('task-input').value = text;
            doc.querySelector('#add-form button[type="submit"]').click();
        },
        remove: (text) => item(text).querySelector('.delete-btn').click(),
        toggle: (text) => item(text).querySelector('input[type="checkbox"]').click(),
        isChecked: (text) => item(text).querySelector('input[type="checkbox"]').checked,
        remaining: () => Number(doc.getElementById('remaining').textContent.match(/\d+/)[0]),
        style: (el) => dom.window.getComputedStyle(el),
        reload: () => openApp(dom.window.localStorage.getItem('tasks')),
    };
}

test('starts with an empty list when nothing is stored', () => {
    const app = openApp();
    assert.deepEqual(app.texts(), []);
});

for (const [kind, stored] of [['invalid JSON', '{broken'], ['JSON that is not a list', '{"text":"A"}']]) {
    test(`starts empty instead of crashing when stored data is ${kind}, and keeps a backup`, () => {
        const app = openApp(stored);
        assert.deepEqual(app.texts(), []);
        assert.equal(app.remaining(), 0);
        app.add('New');
        assert.deepEqual(app.stored().map((t) => t.text), ['New']);
        assert.equal(app.doc.defaultView.localStorage.getItem('tasks-backup'), stored);
    });
}

test('adds a task, shows it and saves it', () => {
    const app = openApp();
    app.add('Buy milk');
    assert.deepEqual(app.texts(), ['Buy milk']);
    assert.equal(app.stored()[0].text, 'Buy milk');
    assert.equal(app.doc.getElementById('task-input').value, '', 'input is cleared');
});

test('ignores whitespace-only input', () => {
    const app = openApp();
    app.add('   ');
    assert.deepEqual(app.texts(), []);
});

test('deletes the clicked task and keeps the others', () => {
    const app = openApp();
    ['A', 'B', 'C'].forEach(app.add);
    app.remove('B');
    assert.deepEqual(app.texts(), ['A', 'C']);
    assert.deepEqual(app.stored().map((t) => t.text), ['A', 'C']);
});

test('tasks survive a reload', () => {
    const app = openApp();
    ['A', 'B'].forEach(app.add);
    assert.deepEqual(app.reload().texts(), ['A', 'B']);
});

test('shows task text literally instead of running it as HTML', () => {
    const evil = '<img src=x onerror="alert(1)">';
    const app = openApp();
    app.add(evil);
    assert.deepEqual(app.texts(), [evil]);
    assert.equal(app.doc.querySelector('#task-list img'), null);
});

// WCAG contrast ratio between two "rgb(r, g, b)" / "#rrggbb" colors.
function contrast(a, b) {
    const lum = (color) => {
        const hex = color.match(/^#(..)(..)(..)$/);
        const rgb = hex ? hex.slice(1).map((h) => parseInt(h, 16)) : color.match(/\d+/g).map(Number);
        const [r, g, b] = rgb.map((v) => {
            const c = v / 255;
            return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

test('req 1: every task has a checkbox to the left of its text', () => {
    const app = openApp();
    app.add('A');
    const li = app.item('A');
    const box = li.querySelector('input[type="checkbox"]');
    assert.ok(box, 'checkbox exists');
    const text = li.querySelector('.task-text');
    assert.ok(box.compareDocumentPosition(text) & app.doc.defaultView.Node.DOCUMENT_POSITION_FOLLOWING);
});

test('req 2: a done task is struck through and still readable', () => {
    const app = openApp();
    app.add('A');
    app.toggle('A');
    const text = app.item('A').querySelector('.task-text');
    assert.match(app.style(text).textDecoration, /line-through/);
    const ratio = contrast(app.style(text).color, app.style(app.item('A')).backgroundColor);
    assert.ok(ratio >= 4.5, `contrast ${ratio.toFixed(2)} must be at least 4.5 (WCAG AA)`);
});

test('req 3: done state is saved and survives a reload', () => {
    const app = openApp();
    ['A', 'B'].forEach(app.add);
    app.toggle('A');
    assert.equal(app.stored().find((t) => t.text === 'A').done, true);
    const reloaded = app.reload();
    assert.equal(reloaded.isChecked('A'), true);
    assert.equal(reloaded.isChecked('B'), false);
});

test('req 4: counter shows remaining tasks and updates immediately', () => {
    const app = openApp();
    ['A', 'B', 'C'].forEach(app.add);
    assert.equal(app.remaining(), 3);
    app.toggle('A');
    assert.equal(app.remaining(), 2);
    app.remove('B');
    assert.equal(app.remaining(), 1);
    app.toggle('A');
    assert.equal(app.remaining(), 2);
    app.remove('A');
    assert.equal(app.remaining(), 1);
    app.add('D');
    assert.equal(app.remaining(), 2);
});

test('req 5: done tasks are shown last and can be marked not done again', () => {
    const app = openApp();
    ['A', 'B', 'C'].forEach(app.add);
    app.toggle('A');
    assert.deepEqual(app.texts(), ['B', 'C', 'A']);
    app.toggle('A');
    assert.equal(app.isChecked('A'), false);
    assert.deepEqual(app.texts(), ['A', 'B', 'C'], 'returns to its original place');
});

test('req 6: add and delete still hit the right task when done tasks are sorted last', () => {
    const app = openApp();
    ['A', 'B', 'C'].forEach(app.add);
    app.toggle('A'); // shown as B, C, A — screen position no longer matches array position
    app.remove('A');
    assert.deepEqual(app.stored().map((t) => t.text), ['B', 'C']);
    app.toggle('B');
    app.remove('C');
    assert.deepEqual(app.stored().map((t) => t.text), ['B']);
    app.add('D');
    assert.deepEqual(app.texts(), ['D', 'B']);
});

test('req 7: stored tasks without a done flag work as not done', () => {
    const app = openApp(JSON.stringify([{ text: 'Old', createdAt: 1 }]));
    assert.equal(app.isChecked('Old'), false);
    assert.equal(app.remaining(), 1);
    app.toggle('Old');
    assert.equal(app.stored()[0].done, true);
    assert.equal(app.remaining(), 0);
});
