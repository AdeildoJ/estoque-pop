import { NextResponse } from "next/server";
import { lerEstoque } from "@/lib/storage";
import { estoqueBaixo, percentualEstoque } from "@/lib/types";

export async function GET() {
  let data;
  try {
    data = await lerEstoque();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao carregar estoque";
    return NextResponse.json({ erro: msg, notas: [], resumo: { totalNotas: 0, produtosEmAlerta: 0 } }, { status: 500 });
  }

  const notas = data.notas.map((nota) => ({
    ...nota,
    produtos: nota.produtos.map((p) => ({
      ...p,
      percentual: Math.round(percentualEstoque(p) * 10) / 10,
      alerta: estoqueBaixo(p),
    })),
  }));

  const totalAlertas = notas.reduce(
    (acc, n) => acc + n.produtos.filter((p) => p.alerta).length,
    0
  );

  return NextResponse.json({
    notas,
    resumo: {
      totalNotas: notas.length,
      produtosEmAlerta: totalAlertas,
    },
  });
}
