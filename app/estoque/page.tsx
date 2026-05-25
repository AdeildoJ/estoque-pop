"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./estoque.module.css";

interface ProdutoView {
  id: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  ativo: boolean;
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
          {dados.resumo.produtosEmAlerta} produto(s) com estoque baixo
        </div>
      )}

      {carregando && <p className={styles.mensagem}>Carregando estoque...</p>}
      {erro && <p className={styles.erro}>{erro}</p>}

      {!carregando && !erro && dados?.notas.length === 0 && (
        <div className={styles.vazio}>
          <p>Nenhuma nota fiscal registrada ainda.</p>
          <p className={styles.vazioHint}>
            As notas entram automaticamente quando o n8n envia o e-mail para o
            webhook.
          </p>
        </div>
      )}

      <div className={styles.lista}>
        {dados?.notas.map((nota) => (
          <article key={nota.id} className={styles.notaCard}>
            <div className={styles.notaTop}>
              <div className={styles.notaInfo}>
                <div className={styles.notaCampo}>
                  <span className={styles.notaLabel}>Nota fiscal</span>
                  <span className={styles.notaValor}>{nota.numeroNota}</span>
                </div>
                <div className={styles.notaCampo}>
                  <span className={styles.notaLabel}>Valor total</span>
                  <span className={styles.notaValor}>
                    {formatarMoeda(nota.valorNota)}
                  </span>
                </div>
                <div className={styles.notaCampo}>
                  <span className={styles.notaLabel}>Recebida em</span>
                  <time className={styles.notaData}>
                    {formatarData(nota.criadoEm)}
                  </time>
                </div>
              </div>
            </div>

            <div className={styles.tabelaWrap}>
              <table className={styles.tabela}>
                <colgroup>
                  <col className={styles.colProduto} />
                  <col className={styles.colQtd} />
                  <col className={styles.colMoeda} />
                  <col className={styles.colMoeda} />
                  <col className={styles.colStatus} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={styles.colProduto}>Produto</th>
                    <th className={styles.colQtd}>Qtd. em estoque</th>
                    <th className={styles.colMoeda}>Preço unit.</th>
                    <th className={styles.colMoeda}>Subtotal</th>
                    <th className={styles.colStatus}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {nota.produtos.map((p) => (
                    <tr
                      key={p.id}
                      className={`${p.alerta ? styles.linhaAlerta : ""} ${
                        !p.ativo ? styles.linhaInativa : ""
                      }`}
                    >
                      <td className={styles.colProduto} title={p.nome}>
                        {p.nome}
                      </td>
                      <td className={styles.colQtd}>{p.quantidade}</td>
                      <td className={styles.colMoeda}>
                        {formatarMoeda(p.valorUnitario)}
                      </td>
                      <td className={styles.colMoeda}>
                        {formatarMoeda(p.quantidade * p.valorUnitario)}
                      </td>
                      <td className={styles.colStatus}>
                        {!p.ativo && (
                          <span className={styles.badgeInativo}>Inativo</span>
                        )}
                        {p.alerta && p.ativo && (
                          <span className={styles.badgeAlerta}>Baixo</span>
                        )}
                        {p.ativo && !p.alerta && (
                          <span className={styles.badgeOk}>OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
