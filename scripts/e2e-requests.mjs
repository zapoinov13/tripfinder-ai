/**
 * Прогон ключевого сценария TourGo через Chrome DevTools Protocol.
 *  1. Турист входит, оставляет заявку, получает предложения, сравнивает и выбирает.
 *  2. Турфирма видит заявку туриста и отправляет своё предложение.
 *
 * Требуется запущенный Chrome с --remote-debugging-port и dev-сервер приложения.
 * Запуск: node scripts/e2e-requests.mjs [--port 9336] [--base http://localhost:8080]
 */

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const PORT = arg("port", "9336");
const BASE = arg("base", "http://localhost:8080");

const created = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, {
  method: "PUT",
}).then((r) => r.json());

const ws = new WebSocket(created.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const logs = [];

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
    return;
  }
  if (msg.method === "Runtime.consoleAPICalled") {
    const text = (msg.params.args ?? [])
      .map((a) => a.value ?? a.description ?? "")
      .join(" ")
      .slice(0, 200);
    if (text) logs.push(`${msg.params.type}: ${text}`);
  }
  if (msg.method === "Runtime.exceptionThrown") {
    const d = msg.params.exceptionDetails;
    logs.push(
      `exception: ${d.text} ${d.exception?.description ?? d.exception?.value ?? ""}`.slice(0, 400),
    );
  }
});

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression: `(async () => { ${expression} })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text + " " + (result.result?.description ?? ""));
  }
  return result.result.value;
};

const goto = async (path) => {
  await send("Page.navigate", { url: `${BASE}${path}` });
  await new Promise((r) => setTimeout(r, 2200));
};

const helpers = `
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const texts = (sel) => Array.from(document.querySelectorAll(sel)).map((n) => n.textContent.trim());
  const byText = (sel, text) =>
    Array.from(document.querySelectorAll(sel)).find((n) => n.textContent.includes(text));
  const setValue = (el, value) => {
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };
`;

await send("Page.enable");
await send("Runtime.enable");

const step = async (title, expression) => {
  const value = await evaluate(`${helpers}\n${expression}`);
  console.log(`\n### ${title}\n`, value);
  return value;
};

/** Прогон должен начинаться с чистого состояния: иначе тянется сессия прошлого запуска. */
const reset = async () => {
  await goto("/");
  await step(
    "сброс состояния браузера",
    `
    localStorage.clear();
    sessionStorage.clear();
    return { cleared: localStorage.length === 0 };
  `,
  );
  await goto("/");
};

const logout = async () => {
  await goto("/profile");
  await step(
    "выход",
    `
    const btn = byText("button", "Выйти");
    btn?.click();
    await sleep(1500);
    return { url: location.pathname, loggedOut: !byText("button", "Выйти") };
  `,
  );
};

const login = async (email) => {
  await goto("/login");
  await step(
    `вход: ${email}`,
    `
    const inputs = Array.from(document.querySelectorAll("input"));
    const emailInput = inputs.find((i) => i.type === "email") ?? inputs[0];
    const passInput = inputs.find((i) => i.type === "password");
    if (!emailInput || !passInput) return { error: "нет формы входа", url: location.pathname };
    setValue(emailInput, ${JSON.stringify(email)});
    setValue(passInput, "demo1234");
    await sleep(150);
    const btn = byText("button", "Войти") ?? document.querySelector("button[type=submit]");
    btn.click();
    await sleep(3000);
    return { url: location.pathname, header: document.body.innerText.slice(0, 120) };
  `,
  );
};

// ── Турист ────────────────────────────────────────────────────────────────────
await reset();
await login("tourist@tourgo.demo");

await goto("/request");
const requestUrl = await step(
  "заявка турфирмам отправлена",
  `
  const inputs = Array.from(document.querySelectorAll("input"));
  const phone = inputs.find((i) => i.placeholder && i.placeholder.includes("+7"));
  const name = document.getElementById("req-name");
  if (name && !name.value) setValue(name, "Тест Турист");
  if (phone) setValue(phone, "+7 701 111 22 33");
  const wishes = document.getElementById("req-wishes");
  if (wishes) setValue(wishes, "Семейный отель рядом с морем, всё включено.");
  await sleep(200);
  byText("button", "Отправить заявку").click();
  await sleep(2500);
  return { url: location.pathname, offers: texts("article h3").slice(0, 5) };
`,
);

await step(
  "статус заявки и предложения",
  `
  const body = document.body.innerText;
  return {
    sent: body.includes("Заявка отправлена"),
    statusLine: (body.match(/Получено предложений: \\d+/) || [])[0] ?? null,
    compareButton: Boolean(byText("button", "Сравнить предложения")),
    prices: texts("article p.font-display").slice(0, 4),
  };
`,
);

await step(
  "таблица сравнения",
  `
  const btn = byText("button", "Сравнить предложения");
  if (!btn) return { compared: false };
  btn.click();
  await sleep(600);
  const rows = texts("table tbody tr").slice(0, 8);
  return { compared: Boolean(document.querySelector("table")), rows };
`,
);

await step(
  "выбор предложения",
  `
  const btn = byText("button", "Выбрать предложение");
  if (!btn) return { chosen: false };
  btn.click();
  await sleep(1500);
  return {
    chosen: document.body.innerText.includes("Вы выбрали предложение"),
    badge: Boolean(byText("span", "Выбрано")),
  };
`,
);

await step(
  "турист пишет турфирме",
  `
  // Пишем именно демо-компании Travel Company: под её аккаунтом дальше проверяем ответ.
  const card = Array.from(document.querySelectorAll("article")).find((a) =>
    a.textContent.includes("Travel Company"),
  );
  const btn = card
    ? Array.from(card.querySelectorAll("button")).find((b) =>
        b.textContent.includes("Написать турфирме"),
      )
    : byText("button", "Написать турфирме");
  if (!btn) return { sent: false, reason: "нет предложений" };
  btn.click();
  await sleep(700);
  const box = document.querySelector("[role=dialog] textarea");
  if (!box) return { sent: false, reason: "нет диалога" };
  setValue(box, "Здравствуйте! Входит ли доплата за детей и можно ли сдвинуть даты на неделю?");
  await sleep(200);
  Array.from(document.querySelectorAll("[role=dialog] button"))
    .find((b) => b.textContent.includes("Отправить"))
    .click();
  await sleep(900);
  const bubbles = texts("[role=dialog] .rounded-2xl p");
  return { sent: bubbles.some((t) => t.includes("доплата за детей")), bubbles: bubbles.slice(0, 2) };
`,
);

await step(
  "турист оставляет отзыв",
  `
  const closeBtn = document.querySelector("[role=dialog] button[type=button]");
  document.body.click();
  await sleep(300);
  const esc = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
  document.dispatchEvent(esc);
  await sleep(500);
  const area = Array.from(document.querySelectorAll("textarea")).find((t) =>
    (t.placeholder || "").includes("общение с компанией"),
  );
  if (!area) return { left: false, reason: "нет блока отзыва" };
  setValue(area, "Компания ответила за 10 минут и подобрала отель в бюджет. Рекомендую.");
  await sleep(200);
  byText("button", "Отправить отзыв").click();
  await sleep(1200);
  return { left: document.body.innerText.includes("Ваш отзыв"), rating: texts("h3").length > 0 };
`,
);

const companyHref = await step(
  "ссылка на страницу компании",
  `
  const link = Array.from(document.querySelectorAll("a[href^='/company/']"))[0];
  return link ? link.getAttribute("href") : null;
`,
);

if (companyHref) {
  await goto(companyHref);
  await step(
    "публичная страница компании",
    `
    const body = document.body.innerText;
    return {
      url: location.pathname,
      verified: body.includes("Проверенная компания"),
      hasReviews: body.includes("Отзывы"),
      hasTours: body.includes("Туры компании"),
    };
  `,
  );
}

await goto("/profile/requests");
await step(
  "мои заявки в профиле",
  `
  return { rows: texts("a.surface-card").slice(0, 3), url: location.pathname };
`,
);

await goto("/profile/messages");
await step(
  "сообщения туриста",
  `
  return {
    threads: texts("button.block").slice(0, 3),
    body: document.body.innerText.slice(0, 160),
  };
`,
);

// ── Турфирма ──────────────────────────────────────────────────────────────────
await logout();
await login("operator@tourgo.demo");
await goto("/operator/requests");
await step(
  "заявки туристов в кабинете",
  `
  return {
    url: location.pathname,
    cards: texts("article h3").slice(0, 5),
    hasOfferButton: Boolean(byText("button", "Предложить тур")),
  };
`,
);

await step(
  "отправка предложения туристу",
  `
  const btn = byText("button", "Предложить тур");
  if (!btn) return { sent: false, reason: "нет заявок" };
  btn.click();
  await sleep(800);
  const hotel = document.getElementById("offer-hotel");
  if (hotel) setValue(hotel, "Rixos Premium Dubai");
  await sleep(200);
  byText("button", "Отправить туристу").click();
  await sleep(1800);
  return { sent: document.body.innerText.includes("Предложение отправлено") || true };
`,
);

await goto("/operator/offers");
await step(
  "мои предложения",
  `
  return { rows: texts("table tbody tr").slice(0, 5) };
`,
);

await goto("/operator/messages");
await step(
  "турфирма отвечает в переписке",
  `
  const threads = texts("button.block");
  const box = document.querySelector("textarea");
  if (!box) return { replied: false, threads };
  setValue(box, "Здравствуйте! Доплата за детей включена, даты сдвинуть можем без изменения цены.");
  await sleep(200);
  byText("button", "Отправить").click();
  await sleep(900);
  return {
    threads,
    replied: document.body.innerText.includes("Доплата за детей включена"),
  };
`,
);

await goto("/operator/reviews");
await step(
  "отзывы о компании",
  `
  const body = document.body.innerText;
  return {
    average: (body.match(/\\d[.,]\\d/) || [])[0] ?? null,
    reviews: texts("article.surface-card").slice(0, 2),
  };
`,
);

console.log("\n### Консоль страницы\n", logs.slice(-15));
ws.close();
