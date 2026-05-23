import { Redis } from "@upstash/redis";
import type { EstoqueData, NotaEntrada, NotaFiscal, Produto } from "./types";
import { lerEstoqueLocal, salvarEstoqueLocal } from "./storage-local";

const KV_KEY = "estoque-hospital";
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

async function lerDoRedis(): Promise<EstoqueData> {
  const redis = getRedis()!;
  const data = await redis.get<EstoqueData>(KV_KEY);
  return data ?? EMPTY;
}

async function salvarNoRedis(data: EstoqueData): Promise<void> {
  const redis = getRedis()!;
  await redis.set(KV_KEY, data);
}

export async function lerEstoque(): Promise<EstoqueData> {
  if (usaRedis()) return lerDoRedis();
  return lerEstoqueLocal();
}

export async function salvarEstoque(data: EstoqueData): Promise<void> {
  if (usaRedis()) {
    await salvarNoRedis(data);
    return;
  }
  salvarEstoqueLocal(data);
}

function gerarId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function adicionarNota(entrada: NotaEntrada): Promise<NotaFiscal> {
  const estoque = await lerEstoque();

  const produtos: Produto[] = entrada.produtos.map((p) => ({
    id: gerarId(),
    nome: p.nome,
    quantidade: p.quantidade,
    valorUnitario: p.valorUnitario,
    capacidadeMaxima:
      p.capacidadeMaxima ?? Math.max(p.quantidade, 100),
  }));

  const nota: NotaFiscal = {
    id: gerarId(),
    numeroNota: entrada.numeroNota,
    valorNota: entrada.valorNota,
    produtos,
    criadoEm: new Date().toISOString(),
  };

  estoque.notas.unshift(nota);
  await salvarEstoque(estoque);
  return nota;
}
