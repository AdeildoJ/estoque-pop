import { Redis } from "@upstash/redis";

let client: Redis | null = null;

export function redisConfigurado(): boolean {
  return Boolean(resolveUrl() && resolveToken());
}

function resolveUrl(): string | undefined {
  return (
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  );
}

function resolveToken(): string | undefined {
  return (
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

export function getRedis(): Redis {
  if (client) return client;

  const url = resolveUrl();
  const token = resolveToken();

  if (!url || !token) {
    throw new Error(
      "Redis não configurado na Vercel. Settings → Environment Variables: " +
        "adicione KV_REST_API_URL e KV_REST_API_TOKEN (token de escrita), depois Redeploy."
    );
  }

  client = new Redis({ url, token });
  return client;
}

export async function testarRedis(): Promise<{ ok: boolean; erro?: string }> {
  if (!redisConfigurado()) {
    return { ok: false, erro: "Variáveis KV_REST_API_URL / KV_REST_API_TOKEN ausentes" };
  }
  try {
    const pong = await getRedis().ping();
    return { ok: pong === "PONG" };
  } catch (e) {
    return {
      ok: false,
      erro: e instanceof Error ? e.message : "Falha ao conectar no Redis",
    };
  }
}
