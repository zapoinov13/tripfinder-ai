/**
 * Подставной Supabase и подставной AI-провайдер для проверки консультанта.
 *
 * Настоящую базу из контейнера не видно, а проверять консультанта на моках
 * внутри браузера бессмысленно: так не увидишь ни того, что настройки
 * читаются, ни того, что в промпт попал настоящий каталог. Здесь сервер
 * платформы ходит своим обычным путём — просто оба конца подставные.
 *
 *   node scripts/ai-stub-server.mjs
 *   SUPABASE_URL=http://127.0.0.1:8899 \
 *   SUPABASE_PUBLISHABLE_KEY=sb_publishable_test \
 *   SUPABASE_PROJECT_ID=mgyufoyornzbwvgdfojb \
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_test \
 *   npx vite dev --port 8812
 *
 * Промпт, ушедший «провайдеру», кладётся в /tmp/last-prompt.json — его и
 * проверяет scripts/consultant-check.mjs.
 */
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import { generateKeyPairSync, randomUUID, sign as signBuffer } from "node:crypto";

/**
 * Настоящая пара ключей и настоящая подпись.
 *
 * Проверка входа в платформе идёт через Supabase и падает на подделанном
 * токене раньше, чем дело доходит до нашего кода. Поддельная подпись тут не
 * годится: нужен токен, который проверяющая сторона действительно примет.
 * Ключ живёт только в этом процессе и только на время проверки.
 */
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const KID = randomUUID();
const JWKS = {
  keys: [{ ...publicKey.export({ format: "jwk" }), kid: KID, alg: "RS256", use: "sig" }],
};

const b64url = (input) => Buffer.from(input).toString("base64url");

function adminToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid: KID }));
  const payload = b64url(
    JSON.stringify({
      sub: ADMIN_ID,
      email: ADMIN_EMAIL,
      aud: "authenticated",
      role: "authenticated",
      iss: "http://127.0.0.1:8899/auth/v1",
      iat: now,
      exp: now + 3600,
      session_id: randomUUID(),
    }),
  );
  const data = `${header}.${payload}`;
  const signature = signBuffer("sha256", Buffer.from(data), privateKey).toString("base64url");
  return `${data}.${signature}`;
}

const ADMIN_ID = "00000000-0000-4000-8000-000000000001";
const ADMIN_EMAIL = "admin@test.tourgo.app";

const AI_SETTINGS = {
  id: 1,
  provider: "custom",
  model: "test-model",
  base_url: "http://127.0.0.1:8899/v1",
  api_key: "test-key",
  enabled: true,
  // Пусто — чтобы проверялся стандартный промпт из кода, а не выдумка стенда.
  system_prompt: "",
  updated_at: new Date().toISOString(),
};

const TOURS = [
  {
    price: 450000,
    currency: "KZT",
    from_city: "Алматы",
    hotels: { city: "Дубай", country: "ОАЭ" },
  },
  {
    price: 980000,
    currency: "KZT",
    from_city: "Астана",
    hotels: { city: "Анталия", country: "Турция" },
  },
];
const LISTINGS = [{ vertical: "car" }, { vertical: "car" }, { vertical: "sport" }];
const ORGS = [
  { city: "Дубай", services: ["excursions"], status: "APPROVED" },
  { city: "Алматы", services: ["tours"], status: "APPROVED" },
];

const server = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const url = req.url ?? "";
    if (process.env["STUB_LOG"]) console.log(req.method, url);
    const single = (req.headers["accept"] ?? "").includes("vnd.pgrst.object");
    const send = (data, status = 200) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(data));
    };

    // Вход: страница «AI и ключи» ходит серверной функцией под админом.
    if (url.includes("/.well-known/jwks.json")) return send(JWKS);
    // Токен для проверки: тест забирает его отсюда и кладёт в браузер.
    if (url.startsWith("/__token")) return send({ token: adminToken() });
    if (url.includes("/auth/v1/user")) {
      return send({
        id: ADMIN_ID,
        aud: "authenticated",
        role: "authenticated",
        email: ADMIN_EMAIL,
      });
    }
    if (url.includes("/rest/v1/profiles")) {
      const row = { id: ADMIN_ID, email: ADMIN_EMAIL, role: "PLATFORM_ADMIN", status: "active" };
      return send(single ? row : [row]);
    }

    if (url.includes("/rest/v1/ai_settings")) return send(single ? AI_SETTINGS : [AI_SETTINGS]);
    if (url.includes("/rest/v1/tour_offers")) return send(TOURS);
    if (url.includes("/rest/v1/vertical_listings")) return send(LISTINGS);
    if (url.includes("/rest/v1/organizations_public")) return send(ORGS);
    if (url.includes("/rest/v1/rpc/consume_ai_quota")) return send(true);

    // Список моделей: страница «AI и ключи» спрашивает его у провайдера.
    if (url.endsWith("/v1/models") || url.endsWith("/models")) {
      return send({
        data: [{ id: "test-model" }, { id: "test-model-mini" }, { id: "test-embedding-3" }],
      });
    }

    if (url.includes("/v1/chat/completions")) {
      // Промпт записываем: по нему проверяем, что консультант заземлён.
      writeFileSync("/tmp/last-prompt.json", body);
      return send({
        choices: [
          {
            message: {
              role: "assistant",
              content: "В Дубае есть экскурсии от компаний площадки. Посмотрите раздел экскурсий.",
            },
          },
        ],
      });
    }

    if (url.includes("/rest/v1/")) return send([]);
    send({});
  });
});
server.listen(8899, "127.0.0.1", () => console.log("stub на 8899"));
