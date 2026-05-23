"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";

interface ProdutoView {
  id: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  capacidadeMaxima: number;
  percentual: number;
  alerta: boolean;
}

interface NotaView {
  id: string;
  numeroNota: string;
  valorNota: number;
  produtos: ProdutoView[];
  criadoEm: string;
}

interface EstoqueResponse {
  notas: NotaView[];
  resumo: { totalNotas: number; produtosEmAlerta: number };
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
  const [webhookUrl, setWebhookUrl] = useState("/api/webhook");

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/webhook`);
  }, []);

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
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Estoque do Hospital</h1>
          <p className={styles.subtitulo}>
            Notas fiscais recebidas automaticamente via n8n
          </p>
        </div>
        <button type="button" className={styles.btnAtualizar} onClick={carregar}>
          Atualizar
        </button>
      </header>

      {dados && dados.resumo.produtosEmAlerta > 0 && (
        <div className={styles.bannerAlerta}>
          {dados.resumo.produtosEmAlerta} produto(s) com estoque abaixo de 10%
        </div>
      )}

      {carregando && <p className={styles.mensagem}>Carregando estoque...</p>}
      {erro && <p className={styles.erro}>{erro}</p>}

      {!carregando && !erro && dados?.notas.length === 0 && (
        <div className={styles.vazio}>
          <p>Nenhuma nota fiscal registrada ainda.</p>
          <p className={styles.vazioHint}>
            No n8n, use POST (não abra no navegador):
          </p>
          <code className={styles.urlWebhook}>{webhookUrl}</code>
        </div>
      )}

      <div className={styles.lista}>
        {dados?.notas.map((nota) => (
          <article key={nota.id} className={styles.notaCard}>
            <div className={styles.notaHeader}>
              <div>
                <span className={styles.notaLabel}>Nº da NOTA</span>
                <strong className={styles.notaNumero}>{nota.numeroNota}</strong>
              </div>
              <div className={styles.notaValorBox}>
                <span className={styles.notaLabel}>VALOR da NOTA</span>
                <strong className={styles.notaValor}>
                  {formatarMoeda(nota.valorNota)}
                </strong>
              </div>
              <time className={styles.notaData}>{formatarData(nota.criadoEm)}</time>
            </div>

            <div className={styles.produtosGrid}>
              {nota.produtos.map((produto) => (
                <div
                  key={produto.id}
                  className={`${styles.produtoCard} ${
                    produto.alerta ? styles.produtoAlerta : ""
                  }`}
                >
                  {produto.alerta && (
                    <span className={styles.alertaBadge}>
                      Estoque baixo — {produto.percentual}% da capacidade
                    </span>
                  )}
                  <div className={styles.produtoLinha}>
                    <span className={styles.colLabel}>Produto</span>
                    <span className={styles.colValor}>{produto.nome}</span>
                  </div>
                  <div className={styles.produtoLinha}>
                    <span className={styles.colLabel}>Qtd. Unitária</span>
                    <span className={styles.colValor}>
                      {produto.quantidade}{" "}
                      <span className={styles.capacidade}>
                        / {produto.capacidadeMaxima}
                      </span>
                    </span>
                  </div>
                  <div className={styles.produtoLinha}>
                    <span className={styles.colLabel}>Valor Unitário</span>
                    <span className={styles.colValor}>
                      {formatarMoeda(produto.valorUnitario)}
                    </span>
                  </div>
                  <div className={styles.barraContainer}>
                    <div
                      className={styles.barra}
                      style={{
                        width: `${Math.min(produto.percentual, 100)}%`,
                        background: produto.alerta ? "var(--danger)" : "var(--primary)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
