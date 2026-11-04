const form = document.getElementById('add-form');
const input = document.getElementById('task-input');
const list = document.getElementById('task-list');

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function renderTasks() {
    list.innerHTML = '';

    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.innerHTML = `
            <span class="task-text">${task.text}</span>
            <button class="delete-btn" data-index="${index}">Delete</button>
        `;
        list.appendChild(li);
    });
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) {
        tasks.push({ text, createdAt: Date.now() });
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

renderTasks();
