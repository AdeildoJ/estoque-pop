import { NextResponse } from "next/server";
import { lerEstoque } from "@/lib/storage";
import { estoqueBaixo, percentualEstoque } from "@/lib/types";

export async function GET() {
  const data = await lerEstoque();

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
