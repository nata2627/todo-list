const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../todo-core.js');

function memoryStorage() {
  const data = new Map();
  return {
    getItem: key => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

test('adds a task', () => {
  const tasks = core.addTask([], 'Купить молоко', 'a');
  assert.equal(tasks.length, 1);
  assert.deepEqual({ id: tasks[0].id, title: tasks[0].title, done: tasks[0].done }, { id: 'a', title: 'Купить молоко', done: false });
});

test('ignores empty and whitespace-only input', () => {
  assert.equal(core.addTask([], '').length, 0);
  assert.equal(core.addTask([], '   \n\t ').length, 0);
});

test('collapses whitespace and limits length', () => {
  assert.equal(core.addTask([], '  два   слова  ', 'a')[0].title, 'два слова');
  const long = 'x'.repeat(core.MAX_LENGTH + 50);
  assert.equal(core.addTask([], long, 'a')[0].title.length, core.MAX_LENGTH);
});

test('does not mutate the input array', () => {
  const tasks = core.addTask([], 'одна', 'a');
  const frozen = Object.freeze(tasks.map(t => Object.freeze({ ...t })));
  assert.doesNotThrow(() => core.toggleTask(frozen, 'a'));
  assert.doesNotThrow(() => core.removeTask(frozen, 'a'));
  assert.equal(frozen[0].done, false);
});

test('toggles done back and forth', () => {
  let tasks = core.addTask([], 'задача', 'a');
  tasks = core.toggleTask(tasks, 'a');
  assert.equal(tasks[0].done, true);
  tasks = core.toggleTask(tasks, 'a');
  assert.equal(tasks[0].done, false);
});

test('removes a task by id', () => {
  let tasks = core.addTask(core.addTask([], 'первая', 'a'), 'вторая', 'b');
  tasks = core.removeTask(tasks, 'a');
  assert.deepEqual(tasks.map(t => t.id), ['b']);
});

test('filters and counts active tasks', () => {
  let tasks = core.addTask(core.addTask([], 'первая', 'a'), 'вторая', 'b');
  tasks = core.toggleTask(tasks, 'a');
  assert.deepEqual(core.filterTasks(tasks, 'active').map(t => t.id), ['b']);
  assert.deepEqual(core.filterTasks(tasks, 'done').map(t => t.id), ['a']);
  assert.equal(core.filterTasks(tasks, 'all').length, 2);
  assert.equal(core.countActive(tasks), 1);
  assert.deepEqual(core.clearCompleted(tasks).map(t => t.id), ['b']);
});

test('picks the Russian plural form', () => {
  const cases = { 0: 'задач', 1: 'задача', 2: 'задачи', 4: 'задачи', 5: 'задач', 11: 'задач', 12: 'задач', 21: 'задача', 22: 'задачи', 111: 'задач' };
  for (const [n, word] of Object.entries(cases)) {
    assert.equal(core.pluralTasks(Number(n)), word, `n=${n}`);
  }
});

test('save and load round-trip', () => {
  const storage = memoryStorage();
  let tasks = core.addTask(core.addTask([], 'первая', 'a'), 'вторая', 'b');
  tasks = core.toggleTask(tasks, 'b');
  assert.equal(core.saveTasks(storage, tasks), true);
  assert.deepEqual(core.loadTasks(storage), tasks);
});

test('survives corrupted storage data', () => {
  assert.deepEqual(core.parseTasks('не json'), []);
  assert.deepEqual(core.parseTasks('{"a":1}'), []);
  assert.deepEqual(core.parseTasks(null), []);
  const mixed = JSON.stringify([{ id: 'a', title: 'норм', done: 1 }, { id: 5, title: 'плохой id' }, null, { id: 'c', title: '   ' }]);
  assert.deepEqual(core.parseTasks(mixed).map(t => [t.id, t.done]), [['a', true]]);
});

test('survives unavailable storage', () => {
  const broken = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('quota'); },
  };
  assert.deepEqual(core.loadTasks(broken), []);
  assert.equal(core.saveTasks(broken, []), false);
});
