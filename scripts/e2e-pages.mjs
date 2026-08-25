/**
 * Обход всех ключевых страниц под разными ролями: ищем ошибки рендера и пустые экраны.
 * Запуск: node scripts/e2e-pages.mjs [--port 9336] [--base http://localhost:8081]
 */

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const PORT = arg("port", "9336");
const BASE = arg("base", "http://localhost:8081");

const created = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, {
  method: "PUT",
}).then((r) => r.json());
const ws = new WebSocket(created.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));

let id = 1;
const pending = new Map();
let errors = [];

ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result);
    pending.delete(m.id);
    return;
  }
  if (m.method === "Runtime.exceptionThrown") {
    const d = m.params.exceptionDetails;
    const text = String(d.exception?.description ?? d.text);
    // Гидрация SSR/клиент: известная особенность стора, её ловим отдельно.
    if (!text.includes("Hydration failed") && !text.includes("error while hydrating")) {
      errors.push(text.slice(0, 160));
    }
  }
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    const text = (m.params.args ?? []).map((a) => String(a.value ?? a.description ?? "")).join(" ");
    if (!text.includes("Hydration") && !text.includes("hydrating")) errors.push(text.slice(0, 160));
  }
});

const send = (method, params = {}) =>
  new Promise((res) => {
    const i = id++;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

await send("Runtime.enable");
await send("Page.enable");

const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", {
    expression: `(async () => { ${expression} })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  return r.result?.value;
};

const visit = async (path) => {
  errors = [];
  await send("Page.navigate", { url: `${BASE}${path}` });
  await new Promise((r) => setTimeout(r, 1800));
  const info = await evaluate(`
    const body = document.body.innerText.trim();
    return { chars: body.length, title: document.title, head: body.slice(0, 60).replace(/\\n+/g, " | ") };
  `);
  const status = errors.length === 0 && info.chars > 200 ? "ok" : "ВНИМАНИЕ";
  console.log(
    `${status.padEnd(9)} ${path.padEnd(26)} ${String(info.chars).padStart(5)} симв. | ${info.head}`,
  );
  if (errors.length) console.log("          ошибки:", errors.slice(0, 2));
};

/** Сессию сбрасываем через storage: клик по «Выйти» зависит от того, где мы находимся. */
const logout = async () => {
  await send("Page.navigate", { url: `${BASE}/` });
  await new Promise((r) => setTimeout(r, 1500));
  await evaluate("localStorage.clear(); sessionStorage.clear(); return true;");
};

const login = async (email) => {
  await logout();
  await send("Page.navigate", { url: `${BASE}/login` });
  await new Promise((r) => setTimeout(r, 2000));
  const result = await evaluate(`
    const setValue = (el, value) => {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
      Object.getOwnPropertyDescriptor(proto.prototype, "value").set.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const inputs = Array.from(document.querySelectorAll("input"));
    const email = inputs.find((i) => i.type === "email") ?? inputs[0];
    const pass = inputs.find((i) => i.type === "password");
    const submit = document.querySelector("button[type=submit]");
    if (!email || !pass || !submit) return { error: "нет формы входа", url: location.pathname };
    setValue(email, ${JSON.stringify(email)});
    setValue(pass, "demo1234");
    await new Promise((r) => setTimeout(r, 150));
    submit.click();
    await new Promise((r) => setTimeout(r, 3000));
    return { url: location.pathname, signedIn: document.body.innerText.includes(${JSON.stringify(email)}) };
  `);
  console.log(`\nвход ${email}:`, JSON.stringify(result));
};

await send("Page.navigate", { url: `${BASE}/` });
await new Promise((r) => setTimeout(r, 1500));
await evaluate("localStorage.clear(); sessionStorage.clear(); return true;");

console.log("\nгость");
for (const p of [
  "/",
  "/search",
  "/hot",
  "/destinations",
  "/excursions",
  "/experiences",
  "/assistance",
  "/for-companies",
  "/company-signup",
  "/about",
  "/premium",
  "/ai-search",
  "/login",
  "/registration",
]) {
  await visit(p);
}

await login("tourist@tourgo.demo");
for (const p of [
  "/profile",
  "/profile/requests",
  "/profile/messages",
  "/profile/trips",
  "/profile/favorites",
  "/profile/ai",
  "/profile/settings",
  "/notifications",
  "/compare",
  "/request",
]) {
  await visit(p);
}

await login("operator@tourgo.demo");
for (const p of [
  "/operator",
  "/operator/requests",
  "/operator/offers",
  "/operator/tours",
  "/operator/messages",
  "/operator/bookings",
  "/operator/company",
  "/operator/reviews",
  "/operator/promotion",
  "/operator/analytics",
  "/operator/api",
  "/operator/billing",
  "/operator/settings",
]) {
  await visit(p);
}

await login("admin@tourgo.demo");
for (const p of [
  "/admin",
  "/admin/users",
  "/admin/operators",
  "/admin/tours",
  "/admin/bookings",
  "/admin/payments",
  "/admin/premium",
  "/admin/promotions",
  "/admin/api-monitoring",
  "/admin/audit-logs",
  "/admin/analytics",
  "/admin/ai-keys",
  "/admin/settings",
]) {
  await visit(p);
}

ws.close();
