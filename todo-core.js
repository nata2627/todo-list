// Task list logic with no DOM access: pure functions over an array of tasks.
// Loaded as window.TodoCore in the browser and via module.exports in Node tests.
(function (root) {
  const STORAGE_KEY = 'todo-list.v1';
  const MAX_LENGTH = 200;

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function normalizeTitle(text) {
    return String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_LENGTH);
  }

  function addTask(tasks, text, id = makeId()) {
    const title = normalizeTitle(text);
    if (!title) return tasks;
    return [...tasks, { id, title, done: false, createdAt: Date.now() }];
  }

  function toggleTask(tasks, id) {
    return tasks.map(t => (t.id === id ? { ...t, done: !t.done } : t));
  }

  function removeTask(tasks, id) {
    return tasks.filter(t => t.id !== id);
  }

  function clearCompleted(tasks) {
    return tasks.filter(t => !t.done);
  }

  function filterTasks(tasks, filter) {
    if (filter === 'active') return tasks.filter(t => !t.done);
    if (filter === 'done') return tasks.filter(t => t.done);
    return tasks;
  }

  function countActive(tasks) {
    return tasks.filter(t => !t.done).length;
  }

  // Russian plural forms: 1 задача, 2 задачи, 5 задач, 11 задач.
  function pluralTasks(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return 'задача';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'задачи';
    return 'задач';
  }

  // Stored data may be corrupted or edited by hand, so keep only well-formed records.
  function parseTasks(raw) {
    if (!raw) return [];
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return [];
    }
    if (!Array.isArray(data)) return [];
    return data
      .filter(t => t && typeof t.id === 'string' && typeof t.title === 'string')
      .map(t => ({
        id: t.id,
        title: normalizeTitle(t.title),
        done: Boolean(t.done),
        createdAt: Number(t.createdAt) || 0,
      }))
      .filter(t => t.title);
  }

  function loadTasks(storage) {
    try {
      return parseTasks(storage.getItem(STORAGE_KEY));
    } catch {
      return [];
    }
  }

  function saveTasks(storage, tasks) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      return true;
    } catch {
      return false;
    }
  }

  const api = {
    STORAGE_KEY,
    MAX_LENGTH,
    normalizeTitle,
    addTask,
    toggleTask,
    removeTask,
    clearCompleted,
    filterTasks,
    countActive,
    pluralTasks,
    parseTasks,
    loadTasks,
    saveTasks,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.TodoCore = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
