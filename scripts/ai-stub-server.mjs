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

const AI_SETTINGS = {
  id: 1,
  provider: "custom",
  model: "test-model",
  base_url: "http://127.0.0.1:8899/v1",
  api_key: "test-key",
  enabled: true,
  system_prompt: "Ты TourGo AI.",
  updated_at: new Date().toISOString(),
};

const TOURS = [
  { price: 450000, currency: "KZT", from_city: "Алматы", hotels: { city: "Дубай", country: "ОАЭ" } },
  { price: 980000, currency: "KZT", from_city: "Астана", hotels: { city: "Анталия", country: "Турция" } },
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
    const single = (req.headers["accept"] ?? "").includes("vnd.pgrst.object");
    const send = (data, status = 200) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(data));
    };

    if (url.includes("/rest/v1/ai_settings")) return send(single ? AI_SETTINGS : [AI_SETTINGS]);
    if (url.includes("/rest/v1/tour_offers")) return send(TOURS);
    if (url.includes("/rest/v1/vertical_listings")) return send(LISTINGS);
    if (url.includes("/rest/v1/organizations_public")) return send(ORGS);
    if (url.includes("/rest/v1/rpc/consume_ai_quota")) return send(true);

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
