import { NextResponse } from "next/server";
import { listarProdutosEstoque } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const produtos = await listarProdutosEstoque();
    return NextResponse.json({ produtos });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao listar produtos";
    return NextResponse.json({ erro: msg, produtos: [] }, { status: 500 });
  }
}
