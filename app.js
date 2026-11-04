const form = document.getElementById('add-form');
const input = document.getElementById('task-input');
const list = document.getElementById('task-list');
const remaining = document.getElementById('remaining');

// Tasks saved before "done" existed have no flag; treat them as not done.
let tasks = (JSON.parse(localStorage.getItem('tasks')) || [])
    .map((task) => ({ ...task, done: Boolean(task.done) }));

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function renderTasks() {
    list.innerHTML = '';

    // Show done tasks last, but keep each task's index in `tasks` for the handlers.
    [...tasks.entries()]
        .sort(([, a], [, b]) => a.done - b.done)
        .forEach(([index, task]) => {
            const li = document.createElement('li');
            li.className = task.done ? 'task-item done' : 'task-item';
            li.innerHTML = `
                <label class="task-label">
                    <input type="checkbox" class="toggle" data-index="${index}" ${task.done ? 'checked' : ''}>
                    <span class="task-text"></span>
                </label>
                <button class="delete-btn" data-index="${index}">Delete</button>
            `;
            li.querySelector('.task-text').textContent = task.text;
            list.appendChild(li);
        });

    const left = tasks.filter((task) => !task.done).length;
    remaining.textContent = `${left} ${left === 1 ? 'task' : 'tasks'} left`;
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) {
        tasks.push({ text, createdAt: Date.now(), done: false });
        saveTasks();
        renderTasks();
        input.value = '';
    }
});

list.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-btn')) {
        const index = parseInt(e.target.dataset.index, 10);
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
    }
});

list.addEventListener('change', (e) => {
    if (e.target.classList.contains('toggle')) {
        const index = parseInt(e.target.dataset.index, 10);
        tasks[index].done = e.target.checked;
        saveTasks();
        renderTasks();
    }
});

renderTasks();
