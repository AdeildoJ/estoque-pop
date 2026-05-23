import type { EstoqueData, NotaEntrada, NotaFiscal, Produto } from "./types";
import { getRedis } from "./redis";

const LIST_KEY = "estoque:notas";
const LEGACY_KEY = "estoque-hospital";
const MAX_NOTAS = 200;
const EMPTY: EstoqueData = { notas: [] };

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

function normalizarNota(raw: unknown): NotaFiscal | null {
  if (!raw || typeof raw !== "object") return null;
  const n = raw as NotaFiscal;
  if (!n.numeroNota || !Array.isArray(n.produtos)) return null;
  return n;
}

async function migrarLegadoSeNecessario(): Promise<void> {
  const redis = getRedis();
  const legacy = await redis.get<EstoqueData>(LEGACY_KEY);
  if (!legacy?.notas?.length) return;

  const notas = legacy.notas.slice(0, MAX_NOTAS);
  for (let i = notas.length - 1; i >= 0; i--) {
    await redis.rpush(LIST_KEY, notas[i]);
  }
  await redis.del(LEGACY_KEY);
}

export async function lerEstoque(): Promise<EstoqueData> {
  const redis = getRedis();

  let lista = await redis.lrange<NotaFiscal>(LIST_KEY, 0, MAX_NOTAS - 1);

  if (!lista?.length) {
    await migrarLegadoSeNecessario();
    lista = await redis.lrange<NotaFiscal>(LIST_KEY, 0, MAX_NOTAS - 1);
  }

  if (!lista?.length) return EMPTY;

  return {
    notas: lista
      .map(normalizarNota)
      .filter((n): n is NotaFiscal => n !== null),
  };
}

export async function adicionarNota(entrada: NotaEntrada): Promise<NotaFiscal> {
  const nota = criarNota(entrada);
  const redis = getRedis();

  await redis.lpush(LIST_KEY, nota);
  await redis.ltrim(LIST_KEY, 0, MAX_NOTAS - 1);

  return nota;
}
