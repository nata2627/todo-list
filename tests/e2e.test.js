const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { startServer } = require('./server.js');

// BASE_URL points the same checks at the deployed site.
let baseUrl = process.env.BASE_URL;
let server;
let browser;

test.before(async () => {
  if (!baseUrl) {
    server = await startServer();
    baseUrl = server.url;
  }
  browser = await chromium.launch();
});

test.after(async () => {
  await browser?.close();
  server?.close();
});

async function openPage() {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('dialog', dialog => {
    errors.push('dialog: ' + dialog.message());
    dialog.dismiss();
  });
  await page.goto(baseUrl);
  return { page, errors, close: () => context.close() };
}

async function addTask(page, text) {
  await page.fill('#new-task-input', text);
  await page.press('#new-task-input', 'Enter');
}

const titles = page => page.locator('.task__title').allTextContents();
const counter = page => page.locator('#counter').textContent();

test('adds a task with Enter and with the button', async () => {
  const { page, errors, close } = await openPage();
  await addTask(page, 'Купить молоко');
  assert.deepEqual(await titles(page), ['Купить молоко']);
  assert.equal(await page.inputValue('#new-task-input'), '');
  assert.equal(await counter(page), 'Осталось 1 задача');

  await page.fill('#new-task-input', 'Позвонить маме');
  await page.click('.new-task__button');
  assert.deepEqual(await titles(page), ['Купить молоко', 'Позвонить маме']);
  assert.equal(await counter(page), 'Осталось 2 задачи');
  assert.deepEqual(errors, []);
  await close();
});

test('ignores empty and whitespace-only input', async () => {
  const { page, errors, close } = await openPage();
  await page.click('.new-task__button');
  await addTask(page, '     ');
  assert.equal(await page.locator('.task').count(), 0);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'new-task-input');
  assert.ok(await page.locator('#empty-state').isVisible());
  assert.deepEqual(errors, []);
  await close();
});

test('shows markup in a task as plain text', async () => {
  const { page, errors, close } = await openPage();
  const text = '<img src=x onerror=alert(1)> <b>x</b>';
  await addTask(page, text);
  assert.deepEqual(await titles(page), [text]);
  assert.equal(await page.locator('.task img, .task b').count(), 0);
  assert.deepEqual(errors, []);
  await close();
});

test('marks a task done and back', async () => {
  const { page, errors, close } = await openPage();
  await addTask(page, 'первая');
  await addTask(page, 'вторая');
  const first = page.locator('.task').first();

  await first.locator('.task__check').click();
  assert.match(await first.getAttribute('class'), /task--done/);
  assert.equal(await counter(page), 'Осталось 1 задача');

  // Clicking the text toggles too, because it sits inside the label.
  await first.locator('.task__title').click();
  assert.doesNotMatch(await first.getAttribute('class'), /task--done/);
  assert.equal(await counter(page), 'Осталось 2 задачи');
  assert.deepEqual(errors, []);
  await close();
});

test('deletes a task', async () => {
  const { page, errors, close } = await openPage();
  await addTask(page, 'первая');
  await addTask(page, 'вторая');
  await page.click('[aria-label="Удалить задачу «первая»"]');
  assert.deepEqual(await titles(page), ['вторая']);
  assert.deepEqual(errors, []);
  await close();
});

test('keeps tasks, order and marks after reload', async () => {
  const { page, errors, close } = await openPage();
  for (const text of ['раз', 'два', 'три']) await addTask(page, text);
  await page.locator('.task').nth(1).locator('.task__check').check();
  await page.reload();
  assert.deepEqual(await titles(page), ['раз', 'два', 'три']);
  assert.deepEqual(await page.locator('.task__check').evaluateAll(els => els.map(e => e.checked)), [false, true, false]);
  assert.equal(await counter(page), 'Осталось 2 задачи');
  assert.deepEqual(errors, []);
  await close();
});

test('filters and clears completed tasks', async () => {
  const { page, errors, close } = await openPage();
  for (const text of ['раз', 'два', 'три']) await addTask(page, text);
  await page.locator('.task').nth(0).locator('.task__check').check();

  await page.click('[data-filter="active"]');
  assert.deepEqual(await titles(page), ['два', 'три']);
  await page.click('[data-filter="done"]');
  assert.deepEqual(await titles(page), ['раз']);
  await page.click('[data-filter="all"]');
  assert.deepEqual(await titles(page), ['раз', 'два', 'три']);

  await page.click('#clear-done');
  assert.deepEqual(await titles(page), ['два', 'три']);
  assert.ok(await page.locator('#clear-done').isDisabled());
  assert.deepEqual(errors, []);
  await close();
});

test('opens with corrupted storage', async () => {
  const { page, errors, close } = await openPage();
  await page.evaluate(() => localStorage.setItem('todo-list.v1', 'не json'));
  await page.reload();
  assert.equal(await page.locator('.task').count(), 0);
  assert.ok(await page.locator('#empty-state').isVisible());
  await addTask(page, 'после сбоя');
  assert.deepEqual(await titles(page), ['после сбоя']);
  assert.deepEqual(errors, []);
  await close();
});
