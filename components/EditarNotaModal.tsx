"use client";

import { useEffect, useState } from "react";
import type { ProdutoEditavel } from "@/lib/types";
import styles from "./EditarNotaModal.module.css";

interface Props {
  notaId: string;
  numeroNota: string;
  produtos: ProdutoEditavel[];
  onFechar: () => void;
  onSalvo: () => void;
}

type CamposNumericos = "valorReferencia" | "percentualSeguranca";

interface ProdutoForm {
  id: string;
  nome: string;
  quantidade: number;
  valorReferencia: string;
  percentualSeguranca: string;
  ativo: boolean;
}

function paraForm(produtos: ProdutoEditavel[]): ProdutoForm[] {
  return produtos.map((p) => ({
    id: p.id,
    nome: p.nome,
    quantidade: p.quantidade,
    valorReferencia: String(p.valorReferencia),
    percentualSeguranca: String(p.percentualSeguranca),
    ativo: p.ativo,
  }));
}

function parseInteiro(valor: string, min: number, max?: number): number | null {
  const n = Number(valor.trim());
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min) return null;
  if (max !== undefined && n > max) return null;
  return n;
}

function parsePercentual(valor: string): number | null {
  const n = Number(valor.trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

export default function EditarNotaModal({
  notaId,
  numeroNota,
  produtos: iniciais,
  onFechar,
  onSalvo,
}: Props) {
  const [produtos, setProdutos] = useState(() => paraForm(iniciais));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setProdutos(paraForm(iniciais));
  }, [notaId]);

  function atualizarCampo(
    id: string,
    campo: CamposNumericos,
    valor: string
  ) {
    setProdutos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p))
    );
  }

  function validarForm(): {
    ok: true;
    dados: {
      id: string;
      valorReferencia: number;
      percentualSeguranca: number;
      ativo: boolean;
    }[];
  } | { ok: false; erro: string } {
    const dados: {
      id: string;
      valorReferencia: number;
      percentualSeguranca: number;
      ativo: boolean;
    }[] = [];

    for (const p of produtos) {
      const ref = parseInteiro(p.valorReferencia, 1);
      if (ref === null) {
        return {
          ok: false,
          erro: `"${p.nome}": informe uma quantidade de referência válida (número inteiro ≥ 1).`,
        };
      }
      const seg = parsePercentual(p.percentualSeguranca);
      if (seg === null) {
        return {
          ok: false,
          erro: `"${p.nome}": informe um percentual de segurança entre 0 e 100.`,
        };
      }
      dados.push({
        id: p.id,
        valorReferencia: ref,
        percentualSeguranca: seg,
        ativo: p.ativo,
      });
    }

    return { ok: true, dados };
  }

  async function salvar() {
    const validacao = validarForm();
    if (!validacao.ok) {
      setErro(validacao.erro);
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/notas/${notaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtos: validacao.dados }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.erro ?? "Falha ao salvar");
      }
      onSalvo();
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onFechar} role="presentation">
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="editar-nota-titulo"
      >
        <div className={styles.modalHeader}>
          <h3 id="editar-nota-titulo">Editar nota {numeroNota}</h3>
          <button type="button" className={styles.fechar} onClick={onFechar}>
            ×
          </button>
        </div>

        <p className={styles.ajuda}>
          A quantidade de referência é a capacidade máxima usada para calcular o
          nível de estoque e os alertas.
        </p>

        <div className={styles.modalBody}>
          {produtos.map((p) => (
            <div key={p.id} className={styles.produtoEdit}>
              <div className={styles.produtoNome}>{p.nome}</div>
              <p className={styles.produtoQtdAtual}>
                Quantidade atual na nota: <strong>{p.quantidade}</strong>
              </p>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <label htmlFor={`ref-${p.id}`}>
                    Quantidade de referência
                  </label>
                  <input
                    id={`ref-${p.id}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={p.valorReferencia}
                    onChange={(e) =>
                      atualizarCampo(p.id, "valorReferencia", e.target.value)
                    }
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`seg-${p.id}`}>% de segurança</label>
                  <input
                    id={`seg-${p.id}`}
                    type="text"
                    inputMode="decimal"
                    value={p.percentualSeguranca}
                    onChange={(e) =>
                      atualizarCampo(p.id, "percentualSeguranca", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>
                  Status {p.ativo ? "(ativo)" : "(inativo)"}
                </span>
                <button
                  type="button"
                  className={`${styles.toggle} ${p.ativo ? styles.toggleOn : ""}`}
                  onClick={() =>
                    setProdutos((prev) =>
                      prev.map((item) =>
                        item.id === p.id
                          ? { ...item, ativo: !item.ativo }
                          : item
                      )
                    )
                  }
                  aria-pressed={p.ativo}
                >
                  <span className={styles.toggleKnob} />
                </button>
              </div>
            </div>
          ))}
          {erro && <p className={styles.erro}>{erro}</p>}
        </div>

        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSec} onClick={onFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.btnPri}
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
