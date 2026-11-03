import { firefox, webkit } from '@playwright/test';
import { TodoPage } from '../../pages/TodoPage.ts';
for (const [name, type] of Object.entries({ firefox, webkit })) {
  const browser = await type.launch();
  for (const key of ['Tab', 'Alt+Tab']) {
    const context = await browser.newContext({ baseURL: 'http://localhost:8088', recordVideo: { dir: '.runs/keyboard-probe-video' } });
    const page = await context.newPage();
    const todo = new TodoPage(page);
    await todo.goto();
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

