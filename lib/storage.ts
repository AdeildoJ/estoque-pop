import { Redis } from "@upstash/redis";
import type { EstoqueData, NotaEntrada, NotaFiscal, Produto } from "./types";
import { lerEstoqueLocal, salvarEstoqueLocal } from "./storage-local";

const LIST_KEY = "estoque:notas";
const LEGACY_KEY = "estoque-hospital";
const MAX_NOTAS = 200;
const EMPTY: EstoqueData = { notas: [] };

function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) return null;
  return new Redis({ url, token });
}

function usaRedis(): boolean {
  return getRedis() !== null;
}

function gerarId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function criarNota(entrada: NotaEntrada): NotaFiscal {
  const produtos: Produto[] = entrada.produtos.map((p) => ({
    id: gerarId(),
    nome: p.nome,
    quantidade: p.quantidade,
    valorUnitario: p.valorUnitario,
    capacidadeMaxima:
      p.capacidadeMaxima ?? Math.max(p.quantidade, 100),
  }));

  return {
    id: gerarId(),
    numeroNota: entrada.numeroNota,
    valorNota: entrada.valorNota,
    produtos,
    criadoEm: new Date().toISOString(),
  };
}

async function migrarLegadoSeNecessario(redis: Redis): Promise<void> {
  const legacy = await redis.get<EstoqueData>(LEGACY_KEY);
  if (!legacy?.notas?.length) return;

  const notas = legacy.notas.slice(0, MAX_NOTAS);
  for (let i = notas.length - 1; i >= 0; i--) {
    await redis.rpush(LIST_KEY, notas[i]);
  }
  await redis.del(LEGACY_KEY);
}

async function lerDoRedis(): Promise<EstoqueData> {
  try {
    const redis = getRedis()!;

    let lista = await redis.lrange<NotaFiscal>(LIST_KEY, 0, MAX_NOTAS - 1);

    if (!lista?.length) {
      await migrarLegadoSeNecessario(redis);
      lista = await redis.lrange<NotaFiscal>(LIST_KEY, 0, MAX_NOTAS - 1);
    }

    if (!lista?.length) return EMPTY;

    return {
      notas: lista.filter(
        (n): n is NotaFiscal =>
          Boolean(n && typeof n === "object" && "numeroNota" in n)
      ),
    };
  } catch (e) {
    console.error("[redis ler]", e);
    throw new Error(
      "Erro ao ler Redis. Verifique Upstash na Vercel (Storage → Redis → Redeploy)."
    );
  }
}

async function adicionarNoRedis(nota: NotaFiscal): Promise<void> {
  const redis = getRedis()!;
  await redis.lpush(LIST_KEY, nota);
  await redis.ltrim(LIST_KEY, 0, MAX_NOTAS - 1);
}

export async function lerEstoque(): Promise<EstoqueData> {
  if (usaRedis()) return lerDoRedis();
  return lerEstoqueLocal();
}

export async function salvarEstoque(data: EstoqueData): Promise<void> {
  if (usaRedis()) {
    throw new Error(
      "Use adicionarNota() com Redis. Armazenamento em lote não suportado."
    );
  }
  salvarEstoqueLocal({
    notas: data.notas.slice(0, MAX_NOTAS),
  });
}

export async function adicionarNota(entrada: NotaEntrada): Promise<NotaFiscal> {
  const nota = criarNota(entrada);

  if (usaRedis()) {
    await adicionarNoRedis(nota);
    return nota;
  }

  try {
    const estoque = lerEstoqueLocal();
    estoque.notas.unshift(nota);
    salvarEstoqueLocal({ notas: estoque.notas.slice(0, MAX_NOTAS) });
    return nota;
  } catch {
    throw new Error(
      "Armazenamento indisponível. Conecte Upstash Redis na Vercel (Storage → Redis → Redeploy)."
    );
  }
}
