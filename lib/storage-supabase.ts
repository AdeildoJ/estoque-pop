import type { EstoqueData, NotaFiscal } from "./types";

const MAX_NOTAS = 200;

function getConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return { url, key };
}

export function usaSupabase(): boolean {
  return getConfig() !== null;
}

function headers(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function lerDoSupabase(): Promise<EstoqueData> {
  const cfg = getConfig()!;

  const res = await fetch(
    `${cfg.url}/rest/v1/notas_fiscais?select=*&order=criado_em.desc&limit=${MAX_NOTAS}`,
    { headers: headers(cfg.key), cache: "no-store" }
  );

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase leitura falhou: ${txt}`);
  }

  const rows = (await res.json()) as Array<{
    id: string;
    numero_nota: string;
    valor_nota: number;
    produtos: NotaFiscal["produtos"];
    criado_em: string;
  }>;

  return {
    notas: rows.map((r) => ({
      id: r.id,
      numeroNota: r.numero_nota,
      valorNota: r.valor_nota,
      produtos: r.produtos,
      criadoEm: r.criado_em,
    })),
  };
}

export async function adicionarNoSupabase(nota: NotaFiscal): Promise<void> {
  const cfg = getConfig()!;

  const res = await fetch(`${cfg.url}/rest/v1/notas_fiscais`, {
    method: "POST",
    headers: { ...headers(cfg.key), Prefer: "return=minimal" },
    body: JSON.stringify({
      id: nota.id,
      numero_nota: nota.numeroNota,
      valor_nota: nota.valorNota,
      produtos: nota.produtos,
      criado_em: nota.criadoEm,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    if (txt.includes("notas_fiscais") && txt.includes("does not exist")) {
      throw new Error(
        "Tabela não criada no Supabase. Execute o SQL do arquivo supabase/schema.sql no SQL Editor."
      );
    }
    throw new Error(`Supabase gravação falhou: ${txt}`);
  }
}
