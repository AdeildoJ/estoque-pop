import { NextRequest, NextResponse } from "next/server";
import { processarCompra } from "@/lib/storage";
import type { ItemCompra } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ erro: "Body inválido" }, { status: 400 });
  }

  const b = body as { itens?: ItemCompra[] };
  if (!Array.isArray(b.itens) || b.itens.length === 0) {
    return NextResponse.json({ erro: "Carrinho vazio" }, { status: 400 });
  }

  for (const item of b.itens) {
    if (
      !item.notaId ||
      !item.produtoId ||
      typeof item.quantidade !== "number"
    ) {
      return NextResponse.json({ erro: "Item do carrinho inválido" }, { status: 400 });
    }
  }

  try {
    const resultado = await processarCompra(b.itens);

    if (!resultado.ok) {
      return NextResponse.json({ erro: resultado.erro }, { status: 400 });
    }

    return NextResponse.json({
      sucesso: true,
      mensagem: "Compra confirmada. Estoque atualizado.",
      itensProcessados: resultado.itensProcessados,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao processar compra";
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}
