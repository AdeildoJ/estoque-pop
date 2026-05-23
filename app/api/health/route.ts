import { NextResponse } from "next/server";
import { redisConfigurado, testarRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VERSAO = "redis-v2";

export async function GET() {
  const configurado = redisConfigurado();
  const teste = configurado ? await testarRedis() : { ok: false, erro: "Não configurado" };

  return NextResponse.json({
    versao: VERSAO,
    redisConfigurado: configurado,
    redisConectado: teste.ok,
    erro: teste.erro ?? null,
    variaveisPresentes: {
      KV_REST_API_URL: Boolean(process.env.KV_REST_API_URL),
      KV_REST_API_TOKEN: Boolean(process.env.KV_REST_API_TOKEN),
      UPSTASH_REDIS_REST_URL: Boolean(process.env.UPSTASH_REDIS_REST_URL),
      UPSTASH_REDIS_REST_TOKEN: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    },
  });
}
