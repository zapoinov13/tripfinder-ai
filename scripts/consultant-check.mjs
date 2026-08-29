/**
 * Консультант: проверяем весь путь, а не отдельные куски.
 *
 * Настоящий сервер ходит в подставной Supabase и подставного AI-провайдера
 * (scripts/../ tools: /tmp/stub.mjs), поэтому проверяется то же, что поедет в
 * прод: настройки читаются, сводка каталога собирается, промпт уходит
 * провайдеру, ответ доходит до экрана.
 *
 *   node scripts/consultant-check.mjs <адрес-с-AI> <адрес-без-AI>
 *
 * Первый — сервер, поднятый против подставного Supabase (консультант включён).
 * Второй — обычный dev-сервер (база недоступна, консультант выключен).
 */
import { readFileSync } from "node:fs";
import { chromium } from "/home/user/tripfinder-ai/node_modules/playwright/index.mjs";

const WITH_AI = process.argv[2] ?? "http://127.0.0.1:8812";
const NO_AI = process.argv[3] ?? "http://127.0.0.1:8813";
const PROMPT_FILE = "/tmp/last-prompt.json";

const fail = [];
const ok = (cond, msg) => {
  console.log(`${cond ? "ок  " : "НЕТ "} ${msg}`);
  if (!cond) fail.push(msg);
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

// ------------------------------------------------------------ консультант включён
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${WITH_AI}/ai-search`, { waitUntil: "domcontentloaded" });
  // Ждём, пока React оживит разметку: до этого поле есть, но состояние в нём
  // не меняется, и кнопка отправки остаётся выключенной.
  const field = page.locator('input[aria-label="Сообщение консультанту"]');
  await field.waitFor({ state: "visible" });
  await page.waitForFunction(
    () => Boolean(document.querySelector('button[aria-label="Отправить"]')),
    null,
    { timeout: 15000 },
  );
  await page.waitForTimeout(1500);

  const body = () => page.locator("body").innerText();
  ok(/Консультант TourGo/.test(await body()), "консультант открыт, а не старая форма");
  ok(/Расскажите, что за поездка/.test(await body()), "приветствие на месте");

  await field.click();
  await field.pressSequentially("экскурсии в Дубае", { delay: 20 });
  const sendButton = page.locator('button[aria-label="Отправить"]');
  await sendButton.waitFor({ state: "visible" });
  await page.waitForFunction(
    () => !document.querySelector('button[aria-label="Отправить"]')?.hasAttribute("disabled"),
    null,
    { timeout: 15000 },
  );
  await sendButton.click();
  await page.waitForTimeout(3000);

  const text = await body();
  ok(/экскурсии в Дубае/.test(text), "сообщение человека видно в переписке");
  ok(/есть экскурсии от компаний площадки/.test(text), "ответ консультанта дошёл до экрана");

  // Промпт: заземлён ли консультант на настоящий каталог.
  let prompt = "";
  try {
    const sent = JSON.parse(readFileSync(PROMPT_FILE, "utf8"));
    prompt = sent.messages?.find((m) => m.role === "system")?.content ?? "";
  } catch {
    /* файла нет — проверки ниже это покажут */
  }
  ok(prompt.length > 0, "провайдеру ушёл системный промпт");
  ok(/Дубай/.test(prompt), "в промпте настоящее направление из каталога");
  ok(/Анталия/.test(prompt), "в промпте второе направление");
  ok(/Алматы/.test(prompt), "в промпте города вылета");
  ok(/450000/.test(prompt), "в промпте настоящая нижняя цена");
  ok(/авто — 2/.test(prompt), "в промпте счётчик объявлений по разделам");
  ok(/Не выдумывай/.test(prompt), "модели запрещено выдумывать");
  ok(/оставить заявку/.test(prompt), "модели сказано, что делать, если ничего нет");
  ok(!/паспорт/i.test(prompt) || /Не спрашивай/.test(prompt), "модели запрещено просить документы");

  // Кнопка действия: собрана нашим разбором, ведёт на живой раздел.
  const action = page.getByRole("button", { name: /Посмотреть экскурсии/ });
  ok((await action.count()) > 0, "под ответом есть кнопка в нужный раздел");
  if ((await action.count()) > 0) {
    await action.first().click();
    await page.waitForTimeout(2000);
    ok(page.url().includes("/excursions"), `кнопка открыла раздел (${page.url()})`);
  }
  await ctx.close();
}

// --------------------------------------------------- вопрос из ссылки заполняет чат
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${WITH_AI}/ai-search?q=${encodeURIComponent("нужна машина в Дубае")}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(3000);
  const text = await page.locator("body").innerText();
  ok(/нужна машина в Дубае/.test(text), "вопрос из ссылки начал разговор");
  ok(page.url().includes("/ai-search"), "человека не унесло с консультанта");
  await ctx.close();
}

// ----------------------------------------------------------- консультант выключен
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${NO_AI}/ai-search`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const text = await page.locator("body").innerText();
  ok(!/Консультант TourGo/.test(text), "без ключа чат не показывается");
  ok(/Опишите поездку своими словами/.test(text), "страница работает как обычный поиск");
  ok((await page.getByRole("button", { name: "Найти" }).count()) > 0, "кнопка «Найти» на месте");
  await ctx.close();
}

// ------------------------------------- выключенный консультант не бросает с вопросом
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${NO_AI}/ai-search?q=${encodeURIComponent("хочу экскурсию в Дубае")}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(2500);
  ok(page.url().includes("/excursions"), `вопрос из ссылки открыл раздел (${page.url()})`);
  await ctx.close();
}

await browser.close();
console.log(fail.length === 0 ? "\nВСЁ ЗЕЛЁНОЕ" : `\nПРОВАЛЕНО: ${fail.length}`);
process.exit(fail.length === 0 ? 0 : 1);
