/**
 * TaskFlow - Modern Todo List Application
 * Core Application Logic & State Management
 */

(function () {
  'use strict';

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const STORAGE_KEY_TASKS = 'taskflow_tasks';
  const STORAGE_KEY_THEME = 'taskflow_theme';

  const defaultTasks = [
    {
      id: 'task-1',
      title: 'Welcome to TaskFlow! 🎉',
      category: 'General',
      priority: 'high',
      dueDate: new Date().toISOString().split('T')[0],
      completed: false,
      createdAt: Date.now() - 3600000 * 2,
    },
    {
      id: 'task-2',
      title: 'Complete project documentation and roadmap',
      category: 'Work',
      priority: 'medium',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      completed: false,
      createdAt: Date.now() - 3600000,
    },
    {
      id: 'task-3',
      title: 'Morning 5km jog and workout session 🏃‍♂️',
      category: 'Fitness',
      priority: 'low',
      dueDate: '',
      completed: true,
      createdAt: Date.now() - 7200000,
    }
  ];

  let tasks = loadTasks();
  let currentFilter = 'all'; // 'all' | 'active' | 'completed'
  let currentCategory = 'all'; // 'all' | string
  let currentSearch = '';
  let currentSort = 'created-desc';
  let recentlyDeletedTask = null;
  let undoTimeout = null;

  // ==========================================
  // DOM ELEMENTS
  // ==========================================
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const currentDateEl = document.getElementById('current-date');
  
  // Progress & Stats
  const progressHeadlineEl = document.getElementById('progress-headline');
  const totalCountEl = document.getElementById('total-count');
  const pendingCountEl = document.getElementById('pending-count');
  const completedCountEl = document.getElementById('completed-count');
  const progressCircle = document.getElementById('progress-circle');
  const progressPercentEl = document.getElementById('progress-percent');

  // Task Creation Form
  const addTaskForm = document.getElementById('add-task-form');
  const taskInput = document.getElementById('task-input');
  const taskCategory = document.getElementById('task-category');
  const taskPriority = document.getElementById('task-priority');
  const taskDueDate = document.getElementById('task-due-date');

  // Toolbar & Filters
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const sortSelect = document.getElementById('sort-select');
  const categoryPillsContainer = document.getElementById('category-pills-container');
  const currentViewTitle = document.getElementById('current-view-title');

  // Actions
  const markAllBtn = document.getElementById('mark-all-btn');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');

  // List & Empty State
  const taskListEl = document.getElementById('task-list');
  const emptyStateEl = document.getElementById('empty-state');
  const emptyTitleEl = document.getElementById('empty-title');
  const emptyDescEl = document.getElementById('empty-desc');

  // Modal
  const editModal = document.getElementById('edit-modal');
  const editTaskForm = document.getElementById('edit-task-form');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelModalBtn = document.getElementById('cancel-modal-btn');
  const editTaskIdInput = document.getElementById('edit-task-id');
  const editTaskTextInput = document.getElementById('edit-task-text');
  const editTaskCategoryInput = document.getElementById('edit-task-category');
  const editTaskPriorityInput = document.getElementById('edit-task-priority');
  const editTaskDueDateInput = document.getElementById('edit-task-due-date');

  // Toast Container
  const toastContainer = document.getElementById('toast-container');

  // ==========================================
  // INITIALIZATION
  // ==========================================
  function init() {
    initTheme();
    displayCurrentDate();
    setupEventListeners();
    render();
  }

  // Load Tasks from Storage
  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TASKS);
      return stored ? JSON.parse(stored) : defaultTasks;
    } catch (e) {
      console.error('Failed to parse tasks from localStorage', e);
      return defaultTasks;
    }
  }

  // Save Tasks to Storage
  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks to localStorage', e);
    }
  }

  // Theme Handling
  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEY_THEME, newTheme);
    refreshIcons();
  }

  // Date Display
  function displayCurrentDate() {
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    currentDateEl.textContent = new Date().toLocaleDateString(undefined, options);
  }

  // ==========================================
  // EVENT LISTENERS
  // ==========================================
  function setupEventListeners() {
    // Theme toggle
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Form submission
    addTaskForm.addEventListener('submit', handleAddTask);

    // Search input
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.trim().toLowerCase();
      clearSearchBtn.classList.toggle('hidden', currentSearch.length === 0);
      render();
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      currentSearch = '';
      clearSearchBtn.classList.add('hidden');
      searchInput.focus();
      render();
    });

    // Status Filter Tabs
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        render();
      });
    });

    // Category Filter Pills
    categoryPillsContainer.addEventListener('click', (e) => {
      const pill = e.target.closest('.pill-btn');
      if (!pill) return;
      categoryPillsContainer.querySelectorAll('.pill-btn').forEach((b) => b.classList.remove('active'));
      pill.classList.add('active');
      currentCategory = pill.dataset.category;
      render();
    });

    // Sort select
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      render();
    });

    // Bulk actions
    markAllBtn.addEventListener('click', handleMarkAllCompleted);
    clearCompletedBtn.addEventListener('click', handleClearCompleted);

    // Modal controls
    closeModalBtn.addEventListener('click', closeEditModal);
    cancelModalBtn.addEventListener('click', closeEditModal);
    editTaskForm.addEventListener('submit', handleSaveEditedTask);

    // Close modal on overlay click
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) closeEditModal();
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !editModal.classList.contains('hidden')) {
        closeEditModal();
      }
    });
  }

  // ==========================================
  // TASK CRUD OPERATIONS
  // ==========================================

  function handleAddTask(e) {
    e.preventDefault();
    const title = taskInput.value.trim();
    if (!title) return;

    const newTask = {
      id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      title: title,
      category: taskCategory.value,
      priority: taskPriority.value,
      dueDate: taskDueDate.value,
      completed: false,
      createdAt: Date.now(),
    };

    tasks.unshift(newTask);
    saveTasks();
    addTaskForm.reset();
    taskPriority.value = 'medium';
    showToast('Task added successfully!', 'success');
    render();
  }

  function toggleTaskCompletion(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveTasks();
    render();

    if (task.completed) {
      checkAllCompletedCelebration();
    }
  }

  function openEditModal(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    editTaskIdInput.value = task.id;
    editTaskTextInput.value = task.title;
    editTaskCategoryInput.value = task.category;
    editTaskPriorityInput.value = task.priority;
    editTaskDueDateInput.value = task.dueDate || '';

    editModal.classList.remove('hidden');
    editTaskTextInput.focus();
    refreshIcons();
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
  }

  function handleSaveEditedTask(e) {
    e.preventDefault();
    const id = editTaskIdInput.value;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    task.title = editTaskTextInput.value.trim();
    task.category = editTaskCategoryInput.value;
    task.priority = editTaskPriorityInput.value;
    task.dueDate = editTaskDueDateInput.value;

    saveTasks();
    closeEditModal();
    showToast('Task updated!', 'success');
    render();
  }

  function deleteTask(id) {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return;

    const deleted = tasks.splice(index, 1)[0];
    recentlyDeletedTask = { task: deleted, index: index };
    saveTasks();
    render();

    showUndoToast(`Deleted "${deleted.title.length > 20 ? deleted.title.substring(0, 20) + '...' : deleted.title}"`);
  }

  function undoDelete() {
    if (!recentlyDeletedTask) return;
    const { task, index } = recentlyDeletedTask;
    tasks.splice(index, 0, task);
    recentlyDeletedTask = null;
    saveTasks();
    render();
    showToast('Task restored!', 'success');
  }

  function handleMarkAllCompleted() {
    const visibleTasks = getFilteredTasks();
    if (visibleTasks.length === 0) return;

    let updatedCount = 0;
    visibleTasks.forEach((vt) => {
      const task = tasks.find((t) => t.id === vt.id);
      if (task && !task.completed) {
        task.completed = true;
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      saveTasks();
      render();
      triggerConfetti();
      showToast(`Marked ${updatedCount} tasks as completed!`, 'success');
    }
  }

  function handleClearCompleted() {
    const completedTasksCount = tasks.filter((t) => t.completed).length;
    if (completedTasksCount === 0) {
      showToast('No completed tasks to clear.', 'info');
      return;
    }

    tasks = tasks.filter((t) => !t.completed);
    saveTasks();
    render();
    showToast(`Cleared ${completedTasksCount} completed tasks!`, 'success');
  }

  // ==========================================
  // FILTERING & SORTING
  // ==========================================

  function getFilteredTasks() {
    return tasks
      .filter((task) => {
        // Status filter
        if (currentFilter === 'active' && task.completed) return false;
        if (currentFilter === 'completed' && !task.completed) return false;

        // Category filter
        if (currentCategory !== 'all' && task.category !== currentCategory) return false;

        // Search query
        if (currentSearch) {
          const matchTitle = task.title.toLowerCase().includes(currentSearch);
          const matchCat = task.category.toLowerCase().includes(currentSearch);
          if (!matchTitle && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Sort priority order: high (3) > medium (2) > low (1)
        const priorityWeight = { high: 3, medium: 2, low: 1 };

        switch (currentSort) {
          case 'created-asc':
            return a.createdAt - b.createdAt;
          case 'due-asc':
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
          case 'priority-desc':
            return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
          case 'alphabetical':
            return a.title.localeCompare(b.title);
          case 'created-desc':
          default:
            return b.createdAt - a.createdAt;
        }
      });
  }

  // ==========================================
  // RENDERING
  // ==========================================

  function render() {
    updateProgressAndStats();
    renderTaskList();
    updateViewHeader();
    refreshIcons();
  }

  function updateProgressAndStats() {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    const pending = total - completed;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    totalCountEl.textContent = total;
    completedCountEl.textContent = completed;
    pendingCountEl.textContent = pending;
    progressPercentEl.textContent = `${percent}%`;

    // Calculate ring stroke
    // Circumference = 2 * PI * 42 = 263.89
    const circumference = 263.89;
    const offset = circumference - (percent / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;

    // Motivational headlines
    if (total === 0) {
      progressHeadlineEl.textContent = 'Add your first task!';
    } else if (percent === 100) {
      progressHeadlineEl.textContent = 'Awesome! All tasks done! 🌟';
    } else if (percent >= 75) {
      progressHeadlineEl.textContent = 'Almost at the finish line! 🚀';
    } else if (percent >= 50) {
      progressHeadlineEl.textContent = 'Halfway there, keep going! 💪';
    } else {
      progressHeadlineEl.textContent = "Let's get things done! ✨";
    }
  }

  function updateViewHeader() {
    let title = 'All Tasks';
    if (currentFilter === 'active') title = 'Active Tasks';
    if (currentFilter === 'completed') title = 'Completed Tasks';
    if (currentCategory !== 'all') title += ` • ${currentCategory}`;
    if (currentSearch) title += ` (matching "${currentSearch}")`;

    currentViewTitle.textContent = title;
  }

  function renderTaskList() {
    const filtered = getFilteredTasks();
    taskListEl.innerHTML = '';

    if (filtered.length === 0) {
      emptyStateEl.classList.remove('hidden');
      if (currentSearch) {
        emptyTitleEl.textContent = 'No matching tasks';
        emptyDescEl.textContent = `No tasks matched your search for "${currentSearch}".`;
      } else if (currentFilter === 'completed') {
        emptyTitleEl.textContent = 'No completed tasks yet';
        emptyDescEl.textContent = 'Mark tasks as done to see them organized here.';
      } else if (currentFilter === 'active') {
        emptyTitleEl.textContent = 'No active tasks!';
        emptyDescEl.textContent = 'Great job, you have cleared all your active tasks.';
      } else {
        emptyTitleEl.textContent = 'No tasks in this category';
        emptyDescEl.textContent = 'Add a new task using the form above.';
      }
      return;
    }

    emptyStateEl.classList.add('hidden');

    filtered.forEach((task) => {
      const li = createTaskElement(task);
      taskListEl.appendChild(li);
    });
  }

  function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;

    // Format due date & check overdue
    let dueHtml = '';
    if (task.dueDate) {
      const today = new Date().toISOString().split('T')[0];
      const isOverdue = !task.completed && task.dueDate < today;
      const formattedDate = formatReadableDate(task.dueDate);
      dueHtml = `
        <span class="task-due ${isOverdue ? 'overdue' : ''}">
          <i data-lucide="${isOverdue ? 'alert-circle' : 'calendar'}"></i>
          ${isOverdue ? 'Overdue: ' : 'Due: '}${formattedDate}
        </span>
      `;
    }

    // Category emoji helper
    const categoryIcons = {
      General: '🏷️',
      Work: '💼',
      Personal: '👤',
      Study: '📚',
      Shopping: '🛒',
      Fitness: '⚡'
    };
    const catIcon = categoryIcons[task.category] || '🏷️';

    li.innerHTML = `
      <label class="checkbox-container">
        <input type="checkbox" ${task.completed ? 'checked' : ''} aria-label="Toggle completed">
        <div class="custom-checkbox">
          <i data-lucide="check"></i>
        </div>
      </label>

      <div class="task-content">
        <span class="task-title">${escapeHtml(task.title)}</span>
        <div class="task-meta">
          <span class="badge badge-category">${catIcon} ${escapeHtml(task.category)}</span>
          <span class="badge badge-priority ${task.priority}">
            <i data-lucide="flag"></i> ${capitalize(task.priority)}
          </span>
          ${dueHtml}
        </div>
      </div>

      <div class="task-actions">
        <button class="action-btn edit-btn" title="Edit task" aria-label="Edit task">
          <i data-lucide="edit-3"></i>
        </button>
        <button class="action-btn delete-btn" title="Delete task" aria-label="Delete task">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `;

    // Event binding
    const checkbox = li.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => toggleTaskCompletion(task.id));

    const editBtn = li.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => openEditModal(task.id));

    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => {
      li.classList.add('slide-out');
      setTimeout(() => {
        deleteTask(task.id);
      }, 200);
    });

    return li;
  }

  // ==========================================
  // UTILITIES & EFFECTS
  // ==========================================

  function checkAllCompletedCelebration() {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    if (total > 0 && total === completed) {
      triggerConfetti();
      showToast('🎉 Bravo! You finished all your tasks!', 'success');
    }
  }

  function triggerConfetti() {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#6366f1', '#a855f7', '#06b6d4', '#10b981', '#f59e0b']
      });
    }
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-message">${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function showUndoToast(message) {
    if (undoTimeout) clearTimeout(undoTimeout);

    // Remove existing undo toast if any
    const existingUndo = toastContainer.querySelector('.toast-undo');
    if (existingUndo) existingUndo.remove();

    const toast = document.createElement('div');
    toast.className = 'toast toast-undo';
    toast.innerHTML = `
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-btn" id="toast-undo-action">Undo</button>
    `;

    toastContainer.appendChild(toast);

    const undoBtn = toast.querySelector('#toast-undo-action');
    undoBtn.addEventListener('click', () => {
      undoDelete();
      toast.remove();
    });

    undoTimeout = setTimeout(() => {
      recentlyDeletedTask = null;
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  function formatReadableDate(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // Start app
  document.addEventListener('DOMContentLoaded', init);
})();
