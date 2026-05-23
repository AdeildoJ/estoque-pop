import { NextRequest, NextResponse } from "next/server";
import { adicionarNota } from "@/lib/storage";
import { validarNotaEntrada } from "@/lib/validacao";

const API_KEY = process.env.API_KEY ?? "";

function autorizado(request: NextRequest): boolean {
  if (!API_KEY) return true;
  const key = request.headers.get("x-api-key");
  return key === API_KEY;
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
    const nota = await adicionarNota(resultado.data);

    return NextResponse.json(
      {
        sucesso: true,
        mensagem: "Nota fiscal registrada no estoque",
        nota,
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
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.json({
    aviso: "Esta URL é só para o n8n (POST). Para ver o estoque, abra a raiz do site: /",
    endpoint: "/api/webhook",
    metodo: "POST",
    tela: "/",
    exemplo: {
      numeroNota: "12345",
      valorNota: 1500.0,
      produtos: [
        {
          nome: "Luva cirúrgica",
          quantidade: 50,
          valorUnitario: 2.5,
          capacidadeMaxima: 500,
        },
      ],
    },
  });
}
