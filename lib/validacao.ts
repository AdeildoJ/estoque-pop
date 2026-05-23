import type { NotaEntrada } from "./types";

function paraNumero(valor: unknown): number | undefined {
  if (typeof valor === "number" && !Number.isNaN(valor)) return valor;
  if (typeof valor === "string") {
    const n = parseFloat(valor.replace(",", ".").trim());
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

export function validarNotaEntrada(body: unknown): {
  ok: true;
  data: NotaEntrada;
} | { ok: false; erro: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, erro: "Corpo da requisição inválido" };
  }

  const b = body as Record<string, unknown>;

  const numeroNota = b.numeroNota ?? b.numero_nota ?? b.nota;
  const valorNota = b.valorNota ?? b.valor_nota ?? b.valor;
  const produtosRaw = b.produtos ?? b.items ?? b.itens;

  if (!numeroNota || typeof numeroNota !== "string") {
    return { ok: false, erro: "Campo 'numeroNota' é obrigatório (string)" };
  }

  const valorNotaNum = paraNumero(valorNota);
  if (valorNotaNum === undefined) {
    return { ok: false, erro: "Campo 'valorNota' é obrigatório (number)" };
  }

  if (!Array.isArray(produtosRaw) || produtosRaw.length === 0) {
    return { ok: false, erro: "Campo 'produtos' deve ser um array com itens" };
  }

  const produtos = produtosRaw.map((item, i) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Produto ${i + 1}: formato inválido`);
    }
    const p = item as Record<string, unknown>;
    const nome = p.nome ?? p.produto ?? p.descricao;
    const quantidade = paraNumero(
      p.quantidade ?? p.qtd ?? p.quantidadeUnitaria
    );
    const valorUnitario = paraNumero(
      p.valorUnitario ?? p.valor_unitario ?? p.preco
    );
    const capacidadeMaxima = paraNumero(
      p.capacidadeMaxima ?? p.capacidade_maxima ?? p.capacidade
    );

    if (!nome || typeof nome !== "string") {
      throw new Error(`Produto ${i + 1}: 'nome' é obrigatório`);
    }
    if (quantidade === undefined) {
      throw new Error(`Produto ${i + 1}: 'quantidade' ou 'qtd' é obrigatório`);
    }
    if (valorUnitario === undefined) {
      throw new Error(`Produto ${i + 1}: 'valorUnitario' é obrigatório`);
    }

    return {
      nome,
      quantidade,
      valorUnitario,
      ...(capacidadeMaxima !== undefined ? { capacidadeMaxima } : {}),
    };
  });

  return {
    ok: true,
    data: {
      numeroNota: String(numeroNota),
      valorNota: valorNotaNum,
      produtos,
    },
  };
}
