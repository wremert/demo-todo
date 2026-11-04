const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

// Opens the real index.html + app.js, with `stored` as the raw localStorage value (like a page load).
function openApp(stored) {
    const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only' });
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
        reload: () => openApp(dom.window.localStorage.getItem('tasks')),
    };
}

test('starts with an empty list when nothing is stored', () => {
    const app = openApp();
    assert.deepEqual(app.texts(), []);
});

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
