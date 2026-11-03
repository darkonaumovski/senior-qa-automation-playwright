import { firefox, webkit } from '@playwright/test';
import { TodoPage } from '../../pages/TodoPage.ts';
for (const [name, type] of Object.entries({ firefox, webkit })) {
  const browser = await type.launch();
  for (const key of ['Tab', 'Alt+Tab']) {
    const context = await browser.newContext({ baseURL: 'http://localhost:8088', recordVideo: { dir: '.runs/keyboard-probe-video' } });
    const page = await context.newPage();
    const todo = new TodoPage(page);
    await todo.goto({ clearData: false });
    await todo.seedTodos(['Existing task']);
    await page.bringToFront();
    const focus = [];
    for (let i = 0; i < 22; i++) {
      focus.push(await page.evaluate(() => ({
        hasFocus: document.hasFocus(), html: document.activeElement.outerHTML.slice(0, 300),
        fieldTabIndex: document.querySelector('.new-todo').tabIndex,
      })));
      await page.keyboard.press(key);
    }
    console.log(JSON.stringify({ name, key, focus }));
    await context.close();
  }
  await browser.close();
}


const browser = await firefox.launch();
const page = await browser.newPage({ baseURL: 'http://localhost:8088' });
const todo = new TodoPage(page);
await todo.goto();
await todo.newTodoInput.click();
for (let i = 0; i < 2; i++) { await page.keyboard.type('Repeated title'); await page.keyboard.press('Enter'); }
console.log(JSON.stringify({duplicateKeyboard:await todo.storedTitles(),rows:await todo.todoItems.count()}));
await todo.newTodoInput.press('Tab');
await todo.addTodo('Repeated title');
console.log(JSON.stringify({afterBlur:await todo.storedTitles(),rows:await todo.todoItems.count()}));
await browser.close();
