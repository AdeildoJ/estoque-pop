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
  capacidadeMaxima: number;
}

export interface NotaFiscal {
  id: string;
  numeroNota: string;
  valorNota: number;
  produtos: Produto[];
  criadoEm: string;
}

export interface EstoqueData {
  notas: NotaFiscal[];
}

export function percentualEstoque(produto: Produto): number {
  if (produto.capacidadeMaxima <= 0) return 0;
  return (produto.quantidade / produto.capacidadeMaxima) * 100;
}

export function estoqueBaixo(produto: Produto): boolean {
  return percentualEstoque(produto) < 10;
}
