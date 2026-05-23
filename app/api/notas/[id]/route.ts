import { NextRequest, NextResponse } from "next/server";
import { atualizarConfigNota, obterNotaPorId } from "@/lib/storage";
import {
  estoqueBaixo,
  normalizarProduto,
  percentualEstoque,
  type ProdutoConfigUpdate,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const nota = await obterNotaPorId(id);
    if (!nota) {
      return NextResponse.json({ erro: "Nota não encontrada" }, { status: 404 });
    }

    const produtos = nota.produtos.map((p) => {
      const prod = normalizarProduto(p);
      return {
        ...prod,
        percentual: Math.round(percentualEstoque(prod) * 10) / 10,
        alerta: estoqueBaixo(prod),
      };
    });

    return NextResponse.json({ ...nota, produtos });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao buscar nota";
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ erro: "Body inválido" }, { status: 400 });
  }

  const b = body as { produtos?: ProdutoConfigUpdate[] };
  if (!Array.isArray(b.produtos) || b.produtos.length === 0) {
    return NextResponse.json(
      { erro: "Campo 'produtos' é obrigatório" },
      { status: 400 }
    );
  }

  try {
    const nota = await atualizarConfigNota(id, b.produtos);
    if (!nota) {
      return NextResponse.json({ erro: "Nota não encontrada" }, { status: 404 });
    }

    const produtos = nota.produtos.map((p) => {
      const prod = normalizarProduto(p);
      return {
        ...prod,
        percentual: Math.round(percentualEstoque(prod) * 10) / 10,
        alerta: estoqueBaixo(prod),
      };
    });

    return NextResponse.json({ sucesso: true, nota: { ...nota, produtos } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar nota";
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}
