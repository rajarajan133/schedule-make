// =================== Constants ===================
const AUTH_API_URL = 'http://127.0.0.1:5000';
const SCHEDULE_API_URL = 'http://127.0.0.1:5001';

// =================== Bootstrap Modals ===================
const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
const addTaskModal = new bootstrap.Modal(document.getElementById('addTaskModal'));

// =================== Toast ===================
function showToast(message, type = 'success') {
    const toastContainer = document.querySelector('.toast-container');
    const toastHtml = `
        <div class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    toastContainer.innerHTML = toastHtml;
    const toastEl = toastContainer.querySelector('.toast');
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

// =================== Auth Helpers ===================
function isLoggedIn() {
    return localStorage.getItem('access_token') !== null;
}

function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    showToast('You have been logged out.');
    updateUI();
}

// =================== UI Update ===================
function updateUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const dashboardContent = document.getElementById('dashboard-content');
    const welcomeMessage = document.getElementById('welcome-message');
    const dashboardLink = document.getElementById('dashboard-link');

    if (isLoggedIn()) {
        authButtons.style.display = 'none';
        userInfo.style.display = 'flex';
        dashboardContent.style.display = 'block';
        welcomeMessage.style.display = 'none';
        dashboardLink.style.display = 'block';
        const username = localStorage.getItem('username');
        document.getElementById('username-display').textContent = username;
        fetchSchedules();
    } else {
        authButtons.style.display = 'flex';
        userInfo.style.display = 'none';
        dashboardContent.style.display = 'none';
        welcomeMessage.style.display = 'block';
        dashboardLink.style.display = 'none';
    }
}

// =================== Auth Actions ===================
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${AUTH_API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('username', username);
            showToast('Login successful!');
            loginModal.hide();
            updateUI();
        } else {
            showToast(data.message || 'Login failed', 'danger');
        }
    } catch (error) {
        showToast('Network error, please try again.', 'danger');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${AUTH_API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok) {
            showToast('Registration successful! Please log in.');
            registerModal.hide();
        } else {
            showToast(data.message || 'Registration failed', 'danger');
        }
    } catch (error) {
        showToast('Network error, please try again.', 'danger');
    }
}

// =================== Schedule Actions ===================
async function fetchSchedules() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${SCHEDULE_API_URL}/schedules`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const schedules = await response.json();
            displaySchedules(schedules);
            checkReminders(schedules); // New: check reminders
        } else if (response.status === 401) {
            showToast('Session expired. Please log in again.', 'danger');
            handleLogout();
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to fetch schedules', 'danger');
        }
    } catch (error) {
        showToast('Network error, please try again.', 'danger');
    }
}

function displaySchedules(schedules) {
    const container = document.getElementById('tasks-container');
    container.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];
    schedules.forEach(task => {
        // Highlight overdue tasks
        const isOverdue = task.due_date && task.due_date < today && !task.completed;
        const overdueClass = isOverdue ? 'border-danger' : '';
        const recurringText = task.recurring && task.recurring !== 'none' ? `<span class='badge bg-info ms-2'>${task.recurring}</span>` : '';
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card h-100 ${task.completed ? 'border-success' : overdueClass}">
                <div class="card-body">
                    <h5 class="card-title">${task.title} ${recurringText}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${task.category} - ${task.due_date}</h6>
                    <p class="card-text">${task.description}</p>
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" id="taskStatus-${task.id}" ${task.completed ? 'checked' : ''} onchange="toggleTaskStatus(${task.id}, this.checked)">
                        <label class="form-check-label" for="taskStatus-${task.id}">
                            Completed
                        </label>
                    </div>
                </div>
                <div class="card-footer d-flex justify-content-between">
                    <button class="btn btn-warning btn-sm" onclick="editTask(${task.id})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteTask(${task.id})">Delete</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// =================== Reminder Notifications ===================
function checkReminders(schedules) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
    const now = new Date();
    schedules.forEach(task => {
        if (!task.reminder_time || task.completed) return;
        const dueDate = new Date(task.due_date + 'T' + task.reminder_time);
        if (dueDate > now && dueDate - now < 60000) { // within next minute
            new Notification(`Reminder: ${task.title}`, {
                body: `Due at ${task.due_date} ${task.reminder_time}`
            });
        }
    });
}

// =================== Task Form ===================
async function handleTaskForm(e) {
    e.preventDefault();
    const taskId = document.getElementById('taskId').value;
    const taskData = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDescription').value,
        category: document.getElementById('taskCategory').value,
        due_date: document.getElementById('taskDate').value,
        completed: document.getElementById('taskStatus').checked,
        priority: document.getElementById('taskPriority').value,
        reminder_time: document.getElementById('taskReminder').value,
        recurring: document.getElementById('taskRecurring').value
    };

    const token = localStorage.getItem('access_token');
    const method = taskId ? 'PUT' : 'POST';
    const url = taskId ? `${SCHEDULE_API_URL}/schedules/${taskId}` : `${SCHEDULE_API_URL}/schedules`;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(taskData)
        });

        if (response.ok) {
            showToast(`Task ${taskId ? 'updated' : 'added'} successfully!`);
            addTaskModal.hide();
            document.getElementById('taskForm').reset();
            document.getElementById('taskId').value = '';
            fetchSchedules();
        } else {
            const data = await response.json();
            showToast(data.message || `Failed to ${taskId ? 'update' : 'add'} task`, 'danger');
        }
    } catch (error) {
        showToast('Network error, please try again.', 'danger');
    }
}

async function editTask(id) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${SCHEDULE_API_URL}/schedules/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const task = await response.json();
        if (response.ok) {
            document.getElementById('taskId').value = task.id;
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description;
            document.getElementById('taskCategory').value = task.category;
            document.getElementById('taskDate').value = task.due_date;
            document.getElementById('taskStatus').checked = task.completed;
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskReminder').value = task.reminder_time;
            document.getElementById('taskRecurring').value = task.recurring;
            addTaskModal.show();
        } else {
            showToast('Failed to fetch task details.', 'danger');
        }
    } catch (error) {
        showToast('Network error, please try again.', 'danger');
    }
}

async function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${SCHEDULE_API_URL}/schedules/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                showToast('Task deleted successfully!');
                fetchSchedules();
            } else {
                showToast('Failed to delete task.', 'danger');
            }
        } catch (error) {
            showToast('Network error, please try again.', 'danger');
        }
    }
}

async function toggleTaskStatus(id, isCompleted) {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${SCHEDULE_API_URL}/schedules/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ completed: isCompleted })
        });
        if (response.ok) {
            showToast('Task status updated.');
            fetchSchedules(); // Refresh to update the UI
        } else {
            showToast('Failed to update task status.', 'danger');
        }
    } catch (error) {
        showToast('Network error, please try again.', 'danger');
    }
}

// =================== Utility Functions ===================
function filterTasks() {
    const filterText = document.getElementById('filterInput').value.toLowerCase();
    const allCards = document.querySelectorAll('#tasks-container .card');
    allCards.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        const subtitle = card.querySelector('.card-subtitle').textContent.toLowerCase();
        const description = card.querySelector('.card-text').textContent.toLowerCase();
        
        if (title.includes(filterText) || subtitle.includes(filterText) || description.includes(filterText)) {
            card.closest('.col-md-4').style.display = 'block';
        } else {
            card.closest('.col-md-4').style.display = 'none';
        }
    });
}

function exportData(format) {
    const tasks = Array.from(document.querySelectorAll('#tasks-container .card')).map(card => {
        return {
            title: card.querySelector('.card-title').textContent,
            category: card.querySelector('.card-subtitle').textContent.split(' - ')[0],
            due_date: card.querySelector('.card-subtitle').textContent.split(' - ')[1],
            description: card.querySelector('.card-text').textContent,
            completed: card.querySelector('.form-check-input').checked
        };
    });

    if (format === 'json') {
        const dataStr = JSON.stringify(tasks, null, 2);
        downloadFile('tasks.json', dataStr, 'application/json');
    } else if (format === 'csv') {
        const header = ["Title", "Category", "Due Date", "Description", "Completed"];
        const rows = tasks.map(task => [
            task.title,
            task.category,
            task.due_date,
            `"${task.description.replace(/"/g, '""')}"`, // Handle commas and quotes in description
            task.completed ? "Yes" : "No"
        ]);
        const csvContent = [
            header.join(','),
            ...rows.map(e => e.join(','))
        ].join('\n');
        downloadFile('tasks.csv', csvContent, 'text/csv');
    }
}

function downloadFile(filename, text, mimeType) {
    const element = document.createElement('a');
    element.setAttribute('href', `data:${mimeType};charset=utf-8,${encodeURIComponent(text)}`);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function setInitialDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    // Assign to #taskDate if present
    const dateInput = document.getElementById('taskDate');
    if (dateInput) {
        dateInput.value = formattedDate;
    }
}

// =================== Initialization ===================
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    setInitialDate();
});

document.getElementById('addTaskModal').addEventListener('show.bs.modal', () => {
    setInitialDate();
});

// =================== Event Listeners ===================
document.getElementById('loginForm').addEventListener('submit', handleLogin);
document.getElementById('registerForm').addEventListener('submit', handleRegister);
document.getElementById('logout-btn').addEventListener('click', handleLogout);
document.getElementById('taskForm').addEventListener('submit', handleTaskForm);
document.getElementById('darkModeToggle').addEventListener('change', (e) => {
    document.body.classList.toggle('dark-mode', e.target.checked);
});
document.getElementById('filterInput').addEventListener('input', filterTasks);
document.getElementById('export-json').addEventListener('click', () => exportData('json'));
document.getElementById('export-csv').addEventListener('click', () => exportData('csv'));

// Initial UI setup (redundant, but kept for safety)
document.addEventListener('DOMContentLoaded', updateUI);