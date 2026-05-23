import { NextRequest, NextResponse } from "next/server";
import { adicionarNota } from "@/lib/storage";
import { validarNotaEntrada } from "@/lib/validacao";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_KEY = process.env.API_KEY ?? "";

function autorizado(request: NextRequest): boolean {
  if (!API_KEY) return true;
  return request.headers.get("x-api-key") === API_KEY;
}

export async function POST(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  let resultado;
  try {
    resultado = validarNotaEntrada(body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro de validação";
    return NextResponse.json({ erro: msg }, { status: 400 });
  }

  if (!resultado.ok) {
    return NextResponse.json({ erro: resultado.erro }, { status: 400 });
  }

  try {
    const res = await adicionarNota(resultado.data);

    if (!res.ok) {
      return NextResponse.json(
        {
          sucesso: false,
          duplicada: true,
          mensagem: `Nota ${res.numeroNota} já foi registrada anteriormente`,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        sucesso: true,
        mensagem: "Nota fiscal registrada no estoque",
        nota: res.nota,
      },
      { status: 201 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao salvar no estoque";
    console.error("[webhook]", e);
    return NextResponse.json({ erro: msg }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    return NextResponse.redirect(new URL("/estoque", request.url));
  }

  return NextResponse.json({
    endpoint: "/api/webhook",
    metodo: "POST",
    tela: "/estoque",
  });
}
