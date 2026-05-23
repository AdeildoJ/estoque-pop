import type {
  EstoqueData,
  NotaEntrada,
  NotaFiscal,
  Produto,
  ProdutoConfigUpdate,
} from "./types";
import { normalizarNumeroNota, normalizarProduto } from "./types";
import { getRedis } from "./redis";

const LIST_KEY = "estoque:notas";
const NUMEROS_KEY = "estoque:numeros-lidos";
const LEGACY_KEY = "estoque-hospital";
const MAX_NOTAS = 200;
const EMPTY: EstoqueData = { notas: [] };

function gerarId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function criarProduto(
  p: NotaEntrada["produtos"][0]
): Produto {
  const valorReferencia =
    p.capacidadeMaxima ?? Math.max(p.quantidade, 100);

  return normalizarProduto({
    id: gerarId(),
    nome: p.nome,
    quantidade: p.quantidade,
    valorUnitario: p.valorUnitario,
    valorReferencia,
    percentualSeguranca: 10,
    ativo: true,
    capacidadeMaxima: valorReferencia,
  });
}

function criarNota(entrada: NotaEntrada): NotaFiscal {
  return {
    id: gerarId(),
    numeroNota: entrada.numeroNota.trim(),
    valorNota: entrada.valorNota,
    produtos: entrada.produtos.map(criarProduto),
    criadoEm: new Date().toISOString(),
    lida: true,
  };
}

function normalizarNota(raw: unknown): NotaFiscal | null {
  if (!raw || typeof raw !== "object") return null;
  const n = raw as NotaFiscal;
  if (!n.numeroNota || !Array.isArray(n.produtos)) return null;

  return {
    ...n,
    lida: n.lida ?? true,
    produtos: n.produtos.map((p) => normalizarProduto(p as Produto)),
  };
}

async function migrarLegadoSeNecessario(): Promise<void> {
  const redis = getRedis();
  const legacy = await redis.get<EstoqueData>(LEGACY_KEY);
  if (!legacy?.notas?.length) return;

  for (const nota of legacy.notas.slice(0, MAX_NOTAS).reverse()) {
    const n = normalizarNota(nota);
    if (n) {
      await redis.rpush(LIST_KEY, n);
      await redis.sadd(NUMEROS_KEY, normalizarNumeroNota(n.numeroNota));
    }
  }
  await redis.del(LEGACY_KEY);
}

async function sincronizarNumerosLidos(notas: NotaFiscal[]): Promise<void> {
  const redis = getRedis();
  for (const n of notas) {
    await redis.sadd(NUMEROS_KEY, normalizarNumeroNota(n.numeroNota));
  }
}

async function persistirNotas(notas: NotaFiscal[]): Promise<void> {
  const redis = getRedis();
  const limitadas = notas.slice(0, MAX_NOTAS);

  await redis.del(LIST_KEY);
  if (limitadas.length) {
    for (let i = limitadas.length - 1; i >= 0; i--) {
      await redis.lpush(LIST_KEY, limitadas[i]);
    }
  }
}

export async function lerEstoque(): Promise<EstoqueData> {
  const redis = getRedis();

  let lista = await redis.lrange<NotaFiscal>(LIST_KEY, 0, MAX_NOTAS - 1);

  if (!lista?.length) {
    await migrarLegadoSeNecessario();
    lista = await redis.lrange<NotaFiscal>(LIST_KEY, 0, MAX_NOTAS - 1);
    if (lista?.length) {
      const notas = lista
        .map(normalizarNota)
        .filter((n): n is NotaFiscal => n !== null);
      await sincronizarNumerosLidos(notas);
    }
  }

  if (!lista?.length) return EMPTY;

  return {
    notas: lista
      .map(normalizarNota)
      .filter((n): n is NotaFiscal => n !== null),
  };
}

export async function notaJaExiste(numeroNota: string): Promise<boolean> {
  const redis = getRedis();
  const chave = normalizarNumeroNota(numeroNota);
  return (await redis.sismember(NUMEROS_KEY, chave)) === 1;
}

export type ResultadoAdicao =
  | { ok: true; nota: NotaFiscal; duplicada: false }
  | { ok: false; duplicada: true; numeroNota: string };

export async function adicionarNota(
  entrada: NotaEntrada
): Promise<ResultadoAdicao> {
  const chave = normalizarNumeroNota(entrada.numeroNota);

  if (await notaJaExiste(chave)) {
    return { ok: false, duplicada: true, numeroNota: entrada.numeroNota };
  }

  const nota = criarNota(entrada);
  const redis = getRedis();

  await redis.lpush(LIST_KEY, nota);
  await redis.ltrim(LIST_KEY, 0, MAX_NOTAS - 1);
  await redis.sadd(NUMEROS_KEY, chave);

  return { ok: true, nota, duplicada: false };
}

export async function obterNotaPorId(id: string): Promise<NotaFiscal | null> {
  const { notas } = await lerEstoque();
  return notas.find((n) => n.id === id) ?? null;
}

export async function atualizarConfigNota(
  notaId: string,
  produtosConfig: ProdutoConfigUpdate[]
): Promise<NotaFiscal | null> {
  const { notas } = await lerEstoque();
  const idx = notas.findIndex((n) => n.id === notaId);
  if (idx === -1) return null;

  const nota = notas[idx];
  const configMap = new Map(produtosConfig.map((c) => [c.id, c]));

  const produtosAtualizados = nota.produtos.map((p) => {
    const cfg = configMap.get(p.id);
    if (!cfg) return p;

    return normalizarProduto({
      ...p,
      valorReferencia: cfg.valorReferencia ?? p.valorReferencia,
      percentualSeguranca: cfg.percentualSeguranca ?? p.percentualSeguranca,
      ativo: cfg.ativo ?? p.ativo,
      capacidadeMaxima: cfg.valorReferencia ?? p.valorReferencia,
    });
  });

  const notaAtualizada: NotaFiscal = {
    ...nota,
    produtos: produtosAtualizados,
  };

  notas[idx] = notaAtualizada;
  await persistirNotas(notas);

  return notaAtualizada;
}
