import { Redis } from "@upstash/redis";

let client: Redis | null = null;

/**
 * Cliente Upstash Redis (serverless).
 * Variáveis injetadas pela Vercel ao conectar Storage → Upstash Redis.
 */
export function getRedis(): Redis {
  if (client) return client;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Redis não configurado. Na Vercel: Storage → Upstash Redis → Connect → Redeploy. " +
        "Variáveis obrigatórias: KV_REST_API_URL e KV_REST_API_TOKEN (token de escrita, não READ_ONLY)."
    );
  }

  client = new Redis({ url, token });
  return client;
}
