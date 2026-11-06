// Connects the logic from todo-core.js to the page.
(function () {
  const core = window.TodoCore;

  let storage = null;
  try {
    storage = window.localStorage;
  } catch {
    storage = null;
  }

  const state = {
    tasks: storage ? core.loadTasks(storage) : [],
    filter: 'all',
  };

  const form = document.getElementById('new-task-form');
  const input = document.getElementById('new-task-input');
  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');
  const counter = document.getElementById('counter');
  const clearBtn = document.getElementById('clear-done');
  const footer = document.getElementById('list-footer');
  const filterButtons = document.querySelectorAll('[data-filter]');
  const storageWarning = document.getElementById('storage-warning');

  input.maxLength = core.MAX_LENGTH;

  function commit(nextTasks) {
    state.tasks = nextTasks;
    const saved = storage ? core.saveTasks(storage, state.tasks) : false;
    storageWarning.hidden = saved;
    render();
  }

  function renderTask(task) {
    const li = document.createElement('li');
    li.className = 'task' + (task.done ? ' task--done' : '');
    li.dataset.id = task.id;

    const label = document.createElement('label');
    label.className = 'task__label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task__check';
    checkbox.checked = task.done;
    checkbox.dataset.action = 'toggle';

    const title = document.createElement('span');
    title.className = 'task__title';
    title.textContent = task.title;

    label.append(checkbox, title);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'task__remove';
    remove.dataset.action = 'remove';
    remove.setAttribute('aria-label', 'Удалить задачу «' + task.title + '»');
    remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

    li.append(label, remove);
    return li;
  }

  function render() {
    const visible = core.filterTasks(state.tasks, state.filter);
    list.replaceChildren(...visible.map(renderTask));

    const hasTasks = state.tasks.length > 0;
    footer.hidden = !hasTasks;
    empty.hidden = visible.length > 0;
    if (!hasTasks) {
      empty.textContent = 'Задач пока нет. Добавьте первую.';
    } else if (state.filter === 'active') {
      empty.textContent = 'Все задачи выполнены.';
    } else if (state.filter === 'done') {
      empty.textContent = 'Выполненных задач пока нет.';
    }

    const active = core.countActive(state.tasks);
    counter.textContent = 'Осталось ' + active + ' ' + core.pluralTasks(active);
    clearBtn.disabled = active === state.tasks.length;

    filterButtons.forEach(btn => {
      const selected = btn.dataset.filter === state.filter;
      btn.classList.toggle('filter--active', selected);
      btn.setAttribute('aria-pressed', String(selected));
    });
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const title = core.normalizeTitle(input.value);
    if (!title) {
      input.value = '';
      input.focus();
      return;
    }
    commit(core.addTask(state.tasks, title));
    input.value = '';
    input.focus();
  });

  list.addEventListener('change', event => {
    if (event.target.dataset.action !== 'toggle') return;
    const id = event.target.closest('.task').dataset.id;
    commit(core.toggleTask(state.tasks, id));
  });

  list.addEventListener('click', event => {
    const button = event.target.closest('[data-action="remove"]');
    if (!button) return;
    const id = button.closest('.task').dataset.id;
    commit(core.removeTask(state.tasks, id));
    input.focus();
  });

  clearBtn.addEventListener('click', () => commit(core.clearCompleted(state.tasks)));

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      render();
    });
  });

  // Pick up changes made in another tab of the same site.
  window.addEventListener('storage', event => {
    if (event.key !== core.STORAGE_KEY) return;
    state.tasks = core.parseTasks(event.newValue);
    render();
  });

  storageWarning.hidden = Boolean(storage);
  render();
})();
