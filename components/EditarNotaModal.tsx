"use client";

import { useEffect, useState } from "react";
import styles from "./EditarNotaModal.module.css";

export interface ProdutoEditavel {
  id: string;
  nome: string;
  quantidade: number;
  valorReferencia: number;
  percentualSeguranca: number;
  ativo: boolean;
}

interface Props {
  notaId: string;
  numeroNota: string;
  produtos: ProdutoEditavel[];
  onFechar: () => void;
  onSalvo: () => void;
}

export default function EditarNotaModal({
  notaId,
  numeroNota,
  produtos: iniciais,
  onFechar,
  onSalvo,
}: Props) {
  const [produtos, setProdutos] = useState(iniciais);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setProdutos(iniciais);
  }, [iniciais]);

  function atualizar(
    id: string,
    campo: keyof ProdutoEditavel,
    valor: number | boolean
  ) {
    setProdutos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p))
    );
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/notas/${notaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtos: produtos.map((p) => ({
            id: p.id,
            valorReferencia: p.valorReferencia,
            percentualSeguranca: p.percentualSeguranca,
            ativo: p.ativo,
          })),
        }),
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

        <div className={styles.modalBody}>
          {produtos.map((p) => (
            <div key={p.id} className={styles.produtoEdit}>
              <div className={styles.produtoNome}>{p.nome}</div>
              <div className={styles.grid}>
                <div className={styles.field}>
                  <label htmlFor={`ref-${p.id}`}>Valor de referência</label>
                  <input
                    id={`ref-${p.id}`}
                    type="number"
                    min={1}
                    value={p.valorReferencia}
                    onChange={(e) =>
                      atualizar(p.id, "valorReferencia", Number(e.target.value))
                    }
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`seg-${p.id}`}>% de segurança</label>
                  <input
                    id={`seg-${p.id}`}
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={p.percentualSeguranca}
                    onChange={(e) =>
                      atualizar(
                        p.id,
                        "percentualSeguranca",
                        Number(e.target.value)
                      )
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
                  onClick={() => atualizar(p.id, "ativo", !p.ativo)}
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
