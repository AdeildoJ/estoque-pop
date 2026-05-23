export interface ProdutoEntrada {
  nome: string;
  quantidade: number;
  valorUnitario: number;
  capacidadeMaxima?: number;
}

export interface NotaEntrada {
  numeroNota: string;
  valorNota: number;
  produtos: ProdutoEntrada[];
}

export interface Produto {
  id: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  /** Valor de referência para cálculo de estoque baixo */
  valorReferencia: number;
  /** % mínimo de segurança — alerta se estoque ficar abaixo */
  percentualSeguranca: number;
  /** Se false, item não pode ser comprado */
  ativo: boolean;
  /** @deprecated use valorReferencia */
  capacidadeMaxima?: number;
}

export interface NotaFiscal {
  id: string;
  numeroNota: string;
  valorNota: number;
  produtos: Produto[];
  criadoEm: string;
  lida: boolean;
}

export interface EstoqueData {
  notas: NotaFiscal[];
}

export interface ProdutoConfigUpdate {
  id: string;
  valorReferencia?: number;
  percentualSeguranca?: number;
  ativo?: boolean;
}

export function normalizarNumeroNota(numero: string): string {
  return numero.trim().replace(/\s+/g, "");
}

export function normalizarProduto(p: Produto): Produto {
  const valorReferencia =
    p.valorReferencia ?? p.capacidadeMaxima ?? Math.max(p.quantidade, 100);

  return {
    ...p,
    valorReferencia,
    percentualSeguranca: p.percentualSeguranca ?? 10,
    ativo: p.ativo ?? true,
  };
}

export function percentualEstoque(produto: Produto): number {
  const ref = produto.valorReferencia ?? produto.capacidadeMaxima ?? 0;
  if (ref <= 0) return 0;
  return (produto.quantidade / ref) * 100;
}

export function estoqueBaixo(produto: Produto): boolean {
  const p = normalizarProduto(produto);
  return percentualEstoque(p) < p.percentualSeguranca;
}
