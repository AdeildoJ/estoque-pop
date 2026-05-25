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

/** Quantidade de referência fixa (somente backend) */
export const REFERENCIA_ESTOQUE = 25;

/** Alerta quando estoque fica abaixo deste % da referência (somente backend) */
export const PERCENTUAL_ESTOQUE_BAIXO = 10;

export interface ProdutoPublico {
  id: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  ativo: boolean;
  alerta: boolean;
}

export interface ProdutoConfigUpdate {
  id: string;
  ativo?: boolean;
}

/** Dados editáveis no modal de configuração da nota */
export interface ProdutoEditavel {
  id: string;
  nome: string;
  quantidade: number;
  valorReferencia: number;
  percentualSeguranca: number;
  ativo: boolean;
}

export function normalizarNumeroNota(numero: string): string {
  return numero.trim().replace(/\s+/g, "");
}

export function normalizarProduto(p: Produto): Produto {
  return {
    ...p,
    valorReferencia: REFERENCIA_ESTOQUE,
    percentualSeguranca: PERCENTUAL_ESTOQUE_BAIXO,
    capacidadeMaxima: REFERENCIA_ESTOQUE,
    ativo: p.ativo ?? true,
  };
}

export function produtoParaCliente(p: Produto): ProdutoPublico {
  const prod = normalizarProduto(p);
  return {
    id: prod.id,
    nome: prod.nome,
    quantidade: prod.quantidade,
    valorUnitario: prod.valorUnitario,
    ativo: prod.ativo,
    alerta: estoqueBaixo(prod),
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

export interface ProdutoEstoque {
  notaId: string;
  numeroNota: string;
  produtoId: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  ativo: boolean;
}

export interface ItemCompra {
  notaId: string;
  produtoId: string;
  quantidade: number;
}
