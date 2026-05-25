const fs = require("fs");
const path = require("path");
const { Redis } = require("@upstash/redis");

const KEYS = ["estoque:notas", "estoque:numeros-lidos", "estoque-hospital"];

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const envPath = path.join(__dirname, "..", file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i === -1) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

async function main() {
  loadEnv();

  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error(
      "Redis não configurado. Defina KV_REST_API_URL e KV_REST_API_TOKEN em .env.local"
    );
    process.exit(1);
  }

  const redis = new Redis({ url, token });

  const existentes = [];
  for (const key of KEYS) {
    if (await redis.exists(key)) existentes.push(key);
  }

  if (!existentes.length) {
    console.log("Nada para limpar — o estoque já está vazio.");
    return;
  }

  await redis.del(...KEYS);
  console.log("Estoque limpo com sucesso.");
  console.log("Chaves removidas:", existentes.join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
