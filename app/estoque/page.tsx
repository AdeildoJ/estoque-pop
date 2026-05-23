"use client";

import { useCallback, useEffect, useState } from "react";
import EditarNotaModal, {
  type ProdutoEditavel,
} from "@/components/EditarNotaModal";
import styles from "./estoque.module.css";

interface ProdutoView {
  id: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  valorReferencia: number;
  percentualSeguranca: number;
  ativo: boolean;
  percentual: number;
  alerta: boolean;
}

interface NotaView {
  id: string;
  numeroNota: string;
  valorNota: number;
  produtos: ProdutoView[];
  criadoEm: string;
  lida: boolean;
}

interface EstoqueResponse {
  notas: NotaView[];
  resumo: {
    totalNotas: number;
    produtosEmAlerta: number;
    produtosInativos: number;
  };
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EstoquePage() {
  const [dados, setDados] = useState<EstoqueResponse | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [notaEditando, setNotaEditando] = useState<NotaView | null>(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const res = await fetch("/api/estoque");
      if (!res.ok) throw new Error("Falha ao carregar estoque");
      const json = (await res.json()) as EstoqueResponse;
      setDados(json);
    } catch {
      setErro("Não foi possível carregar o estoque.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, 15000);
    return () => clearInterval(intervalo);
  }, [carregar]);

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.titulo}>Estoque</h1>
          <p className={styles.subtitulo}>
            Notas fiscais recebidas via n8n · NutriStore
          </p>
        </div>
        <button type="button" className={styles.btnAtualizar} onClick={carregar}>
          Atualizar
        </button>
      </div>

      {dados && dados.resumo.produtosEmAlerta > 0 && (
        <div className={`${styles.banner} ${styles.bannerAlerta}`}>
          {dados.resumo.produtosEmAlerta} produto(s) abaixo do percentual de
          segurança configurado
        </div>
      )}

      {carregando && <p className={styles.mensagem}>Carregando estoque...</p>}
      {erro && <p className={styles.erro}>{erro}</p>}

      {!carregando && !erro && dados?.notas.length === 0 && (
        <div className={styles.vazio}>
          <p>Nenhuma nota fiscal registrada ainda.</p>
        </div>
      )}

      <div className={styles.lista}>
        {dados?.notas.map((nota) => (
          <article key={nota.id} className={styles.notaCard}>
            <div className={styles.notaTop}>
              <div className={styles.notaInfo}>
                <div className={styles.notaCampo}>
                  <span className={styles.notaLabel}>Nº da NOTA</span>
                  <span className={styles.notaValor}>{nota.numeroNota}</span>
                </div>
                <div className={styles.notaCampo}>
                  <span className={styles.notaLabel}>VALOR da NOTA</span>
                  <span className={styles.notaValor}>
                    {formatarMoeda(nota.valorNota)}
                  </span>
                </div>
                <time className={styles.notaData}>
                  {formatarData(nota.criadoEm)}
                </time>
              </div>
              <button
                type="button"
                className={styles.btnEditar}
                onClick={() => setNotaEditando(nota)}
              >
                Editar
              </button>
            </div>

            <div className={styles.produtos}>
              {nota.produtos.map((p) => (
                <div
                  key={p.id}
                  className={`${styles.produtoRow} ${
                    p.alerta ? styles.produtoRowAlerta : ""
                  } ${!p.ativo ? styles.produtoRowInativo : ""}`}
                >
                  <span className={styles.produtoNome} title={p.nome}>
                    {p.nome}
                  </span>
                  <div className={styles.col}>
                    <span>Qtd</span>
                    <br />
                    <strong>
                      {p.quantidade} / {p.valorReferencia}
                    </strong>
                    <div className={styles.barraMini}>
                      <div
                        className={styles.barraFill}
                        style={{
                          width: `${Math.min(p.percentual, 100)}%`,
                          background: p.alerta
                            ? "var(--nutri-danger)"
                            : "var(--nutri-header)",
                        }}
                      />
                    </div>
                  </div>
                  <div className={styles.col}>
                    <span>Unit.</span>
                    <br />
                    <strong>{formatarMoeda(p.valorUnitario)}</strong>
                  </div>
                  <div className={styles.col}>
                    <span>Estoque</span>
                    <br />
                    <strong>{p.percentual}%</strong>
                    <br />
                    <span style={{ fontSize: "0.7rem" }}>
                      seg. {p.percentualSeguranca}%
                    </span>
                  </div>
                  <div className={styles.col}>
                    {!p.ativo && (
                      <span className={styles.badgeInativo}>Inativo</span>
                    )}
                    {p.alerta && (
                      <span className={styles.badgeAlerta}>Baixo</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      {notaEditando && (
        <EditarNotaModal
          notaId={notaEditando.id}
          numeroNota={notaEditando.numeroNota}
          produtos={notaEditando.produtos.map(
            (p): ProdutoEditavel => ({
              id: p.id,
              nome: p.nome,
              quantidade: p.quantidade,
              valorReferencia: p.valorReferencia,
              percentualSeguranca: p.percentualSeguranca,
              ativo: p.ativo,
            })
          )}
          onFechar={() => setNotaEditando(null)}
          onSalvo={carregar}
        />
      )}
    </>
  );
}
