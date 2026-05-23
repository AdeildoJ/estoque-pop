import { Redis } from "@upstash/redis";
import type { EstoqueData, NotaEntrada, NotaFiscal, Produto } from "./types";
import { lerEstoqueLocal, salvarEstoqueLocal } from "./storage-local";
import {
  adicionarNoSupabase,
  lerDoSupabase,
  usaSupabase,
} from "./storage-supabase";

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

function emProducao(): boolean {
  return process.env.VERCEL === "1";
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
}

async function adicionarNoRedis(nota: NotaFiscal): Promise<void> {
  const redis = getRedis()!;
  await redis.lpush(LIST_KEY, nota);
  await redis.ltrim(LIST_KEY, 0, MAX_NOTAS - 1);
}

function erroArmazenamento(): Error {
  return new Error(
    "Banco não configurado na Vercel. Opção A: Storage → Upstash Redis → Connect → Redeploy. " +
      "Opção B: Supabase grátis — veja CONFIGURAR-BANCO.md no GitHub (estoque-pop)."
  );
}

export async function lerEstoque(): Promise<EstoqueData> {
  if (usaRedis()) return lerDoRedis();
  if (usaSupabase()) return lerDoSupabase();
  if (emProducao()) throw erroArmazenamento();
  return lerEstoqueLocal();
}

export async function salvarEstoque(data: EstoqueData): Promise<void> {
  if (usaRedis() || usaSupabase()) {
    throw new Error("Use adicionarNota() para gravar.");
  }
  salvarEstoqueLocal({ notas: data.notas.slice(0, MAX_NOTAS) });
}

export async function adicionarNota(entrada: NotaEntrada): Promise<NotaFiscal> {
  const nota = criarNota(entrada);

  if (usaRedis()) {
    await adicionarNoRedis(nota);
    return nota;
  }

  if (usaSupabase()) {
    await adicionarNoSupabase(nota);
    return nota;
  }

  if (emProducao()) throw erroArmazenamento();

  const estoque = lerEstoqueLocal();
  estoque.notas.unshift(nota);
  salvarEstoqueLocal({ notas: estoque.notas.slice(0, MAX_NOTAS) });
  return nota;
}
