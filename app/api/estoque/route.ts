import { NextResponse } from "next/server";
import { lerEstoque } from "@/lib/storage";
import {
  estoqueBaixo,
  normalizarProduto,
  percentualEstoque,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  let data;
  try {
    data = await lerEstoque();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao carregar estoque";
    return NextResponse.json(
      {
        erro: msg,
        notas: [],
        resumo: { totalNotas: 0, produtosEmAlerta: 0, produtosInativos: 0 },
      },
      { status: 500 }
    );
  }

  const notas = data.notas.map((nota) => ({
    ...nota,
    produtos: nota.produtos.map((p) => {
      const prod = normalizarProduto(p);
      const percentual = Math.round(percentualEstoque(prod) * 10) / 10;
      return {
        ...prod,
        percentual,
        alerta: estoqueBaixo(prod),
      };
    }),
  }));

  const produtosEmAlerta = notas.reduce(
    (acc, n) => acc + n.produtos.filter((p) => p.alerta).length,
    0
  );

  const produtosInativos = notas.reduce(
    (acc, n) => acc + n.produtos.filter((p) => !p.ativo).length,
    0
  );

  return NextResponse.json({
    notas,
    resumo: {
      totalNotas: notas.length,
      produtosEmAlerta,
      produtosInativos,
    },
  });
}
