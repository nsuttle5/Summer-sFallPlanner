// Task Board JavaScript

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let columns = JSON.parse(localStorage.getItem('taskColumns')) || [
    'Backlog',
    'In Progress', 
    'Review',
    'Complete'
];
let draggedTask = null;
let editingTaskId = null;

// Initialize the task board
document.addEventListener('DOMContentLoaded', function() {
    renderBoard();
    populateAssigneeFilter();
    populateColumnSelect();
});

// Save data to localStorage
function saveData() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('taskColumns', JSON.stringify(columns));
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Render the entire board
function renderBoard() {
    const board = document.getElementById('taskBoard');
    board.innerHTML = '';
    
    columns.forEach(columnName => {
        const columnTasks = tasks.filter(task => task.column === columnName);
        const columnElement = createColumnElement(columnName, columnTasks);
        board.appendChild(columnElement);
    });
}

// Create a column element
function createColumnElement(columnName, columnTasks) {
    const column = document.createElement('div');
    column.className = 'board-column';
    column.innerHTML = `
        <div class="column-header">
            <span class="column-title">${columnName}</span>
            <span class="task-count">${columnTasks.length}</span>
            <span class="column-menu" onclick="toggleColumnMenu('${columnName}', event)">⋯</span>
            <div class="column-actions" id="menu-${columnName}">
                <button class="column-action" onclick="renameColumn('${columnName}')">Rename</button>
                <button class="column-action delete" onclick="deleteColumn('${columnName}')">Delete</button>
            </div>
        </div>
        <div class="column-body" ondrop="dropTask(event, '${columnName}')" ondragover="allowDrop(event)" ondragleave="dragLeave(event)">
            ${columnTasks.length === 0 ? createEmptyColumnState() : columnTasks.map(task => createTaskCard(task)).join('')}
        </div>
    `;
    return column;
}

// Create empty column state
function createEmptyColumnState() {
    return `
        <div class="empty-column">
            <div class="empty-column-icon">📋</div>
            <div class="empty-column-text">No tasks yet</div>
            <div class="empty-column-subtext">Drag tasks here or create a new one</div>
        </div>
    `;
}

// Create a task card
function createTaskCard(task) {
    const categoryClass = task.category.replace('-', '');
    const priorityClass = task.priority;
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const today = new Date();
    const isOverdue = dueDate && dueDate < today;
    const isDueSoon = dueDate && dueDate <= new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000) && !isOverdue;
    
    return `
        <div class="task-card" draggable="true" ondragstart="dragStart(event, '${task.id}')" onclick="editTask('${task.id}')">
            <div class="task-header">
                <h4 class="task-title">${task.title}</h4>
                <span class="task-priority ${priorityClass}">${task.priority}</span>
            </div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
            <div class="task-meta">
                <span class="task-category ${categoryClass}">${getCategoryLabel(task.category)}</span>
                <div>
                    ${task.assignee ? `<div class="task-assignee">👤 ${task.assignee}</div>` : ''}
                    ${task.dueDate ? `<div class="task-due-date ${isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : ''}">📅 ${formatDate(task.dueDate)}</div>` : ''}
                </div>
            </div>
        </div>
    `;
}

// Get category label
function getCategoryLabel(category) {
    const labels = {
        '2d-art': '2D Art',
        '3d-art': '3D Art',
        'coding': 'Code',
        'writing': 'Write',
        'music': 'Music',
        'design': 'Design',
        'other': 'Other'
    };
    return labels[category] || category;
}

// Format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
}

// Drag and Drop Functions
function dragStart(event, taskId) {
    draggedTask = taskId;
    event.target.classList.add('dragging');
}

function allowDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function dragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

function dropTask(event, columnName) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    if (draggedTask) {
        const task = tasks.find(t => t.id === draggedTask);
        if (task) {
            task.column = columnName;
            saveData();
            renderBoard();
        }
        draggedTask = null;
    }
}

// Column Management
function addColumn() {
    const columnName = document.getElementById('columnName').value.trim();
    if (columnName && !columns.includes(columnName)) {
        columns.push(columnName);
        document.getElementById('columnName').value = '';
        saveData();
        renderBoard();
        populateColumnSelect();
    }
}

function toggleColumnMenu(columnName, event) {
    event.stopPropagation();
    const menu = document.getElementById(`menu-${columnName}`);
    const allMenus = document.querySelectorAll('.column-actions');
    
    // Close all other menus
    allMenus.forEach(m => {
        if (m !== menu) m.classList.remove('show');
    });
    
    menu.classList.toggle('show');
}

function renameColumn(oldName) {
    const newName = prompt('Enter new column name:', oldName);
    if (newName && newName.trim() && newName !== oldName) {
        const index = columns.indexOf(oldName);
        if (index !== -1) {
            columns[index] = newName.trim();
            // Update tasks in this column
            tasks.forEach(task => {
                if (task.column === oldName) {
                    task.column = newName.trim();
                }
            });
            saveData();
            renderBoard();
            populateColumnSelect();
        }
    }
    closeAllMenus();
}

function deleteColumn(columnName) {
    if (confirm(`Are you sure you want to delete the "${columnName}" column? All tasks in this column will be moved to "Backlog".`)) {
        // Move tasks to Backlog
        tasks.forEach(task => {
            if (task.column === columnName) {
                task.column = 'Backlog';
            }
        });
        
        // Remove column
        const index = columns.indexOf(columnName);
        if (index !== -1) {
            columns.splice(index, 1);
        }
        
        saveData();
        renderBoard();
        populateColumnSelect();
    }
    closeAllMenus();
}

function closeAllMenus() {
    document.querySelectorAll('.column-actions').forEach(menu => {
        menu.classList.remove('show');
    });
}

// Task Management
function openTaskModal() {
    console.log('Opening task modal...');
    editingTaskId = null;
    document.getElementById('taskModalTitle').textContent = 'Add New Task';
    document.getElementById('taskForm').reset();
    
    const modalOverlay = document.getElementById('taskModalOverlay');
    console.log('Modal overlay element:', modalOverlay);
    
    if (modalOverlay) {
        modalOverlay.style.display = 'flex';
        console.log('Modal display set to flex');
    } else {
        console.error('Modal overlay not found!');
    }
    
    populateColumnSelect();
}

function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        editingTaskId = taskId;
        document.getElementById('taskModalTitle').textContent = 'Edit Task';
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description;
        document.getElementById('taskCategory').value = task.category;
        document.getElementById('taskAssignee').value = task.assignee;
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskDueDate').value = task.dueDate;
        document.getElementById('taskColumn').value = task.column;
        document.getElementById('taskModalOverlay').style.display = 'flex';
        populateColumnSelect();
    }
}

function closeTaskModal() {
    console.log('Closing task modal...');
    const modalOverlay = document.getElementById('taskModalOverlay');
    if (modalOverlay) {
        modalOverlay.style.display = 'none';
        console.log('Modal closed');
    }
    editingTaskId = null;
}

function saveTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const category = document.getElementById('taskCategory').value;
    const assignee = document.getElementById('taskAssignee').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const dueDate = document.getElementById('taskDueDate').value;
    const column = document.getElementById('taskColumn').value;
    
    if (!title || !category) {
        alert('Please fill in the required fields (Title and Category)');
        return;
    }
    
    const taskData = {
        title,
        description,
        category,
        assignee,
        priority,
        dueDate,
        column: column || 'Backlog'
    };
    
    if (editingTaskId) {
        // Update existing task
        const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = { ...tasks[taskIndex], ...taskData };
        }
    } else {
        // Create new task
        const newTask = {
            id: generateId(),
            createdAt: new Date().toISOString(),
            ...taskData
        };
        tasks.push(newTask);
    }
    
    saveData();
    renderBoard();
    populateAssigneeFilter();
    closeTaskModal();
}

// Filter Functions
function populateAssigneeFilter() {
    const assignees = [...new Set(tasks.map(task => task.assignee).filter(Boolean))];
    const filter = document.getElementById('assigneeFilter');
    
    // Clear existing options except "All Assignees"
    filter.innerHTML = '<option value="">All Assignees</option>';
    
    assignees.forEach(assignee => {
        const option = document.createElement('option');
        option.value = assignee;
        option.textContent = assignee;
        filter.appendChild(option);
    });
}

function populateColumnSelect() {
    const select = document.getElementById('taskColumn');
    select.innerHTML = '';
    
    columns.forEach(column => {
        const option = document.createElement('option');
        option.value = column;
        option.textContent = column;
        select.appendChild(option);
    });
    
    // Set default to first column
    if (columns.length > 0) {
        select.value = columns[0];
    }
}

function filterTasks() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const assigneeFilter = document.getElementById('assigneeFilter').value;
    
    const taskCards = document.querySelectorAll('.task-card');
    
    taskCards.forEach(card => {
        const taskId = card.getAttribute('onclick').match(/'([^']+)'/)[1];
        const task = tasks.find(t => t.id === taskId);
        
        let show = true;
        
        if (categoryFilter && task.category !== categoryFilter) {
            show = false;
        }
        
        if (assigneeFilter && task.assignee !== assigneeFilter) {
            show = false;
        }
        
        card.style.display = show ? 'block' : 'none';
    });
    
    // Update column counts
    columns.forEach(columnName => {
        const columnElement = document.querySelector(`[data-column="${columnName}"]`);
        const visibleTasks = tasks.filter(task => {
            let include = task.column === columnName;
            if (categoryFilter && task.category !== categoryFilter) include = false;
            if (assigneeFilter && task.assignee !== assigneeFilter) include = false;
            return include;
        });
        
        const countElement = columnElement?.querySelector('.task-count');
        if (countElement) {
            countElement.textContent = visibleTasks.length;
        }
    });
}

// Close menus when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.column-menu') && !event.target.closest('.column-actions')) {
        closeAllMenus();
    }
});

// Handle modal close on overlay click
document.getElementById('taskModalOverlay').addEventListener('click', function(event) {
    if (event.target === this) {
        closeTaskModal();
    }
});

// Handle drag end
document.addEventListener('dragend', function(event) {
    if (event.target.classList.contains('task-card')) {
        event.target.classList.remove('dragging');
    }
});
