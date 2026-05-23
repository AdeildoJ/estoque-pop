"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./compra.module.css";

interface ProdutoEstoque {
  notaId: string;
  numeroNota: string;
  produtoId: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  ativo: boolean;
}

interface CarrinhoItem {
  key: string;
  notaId: string;
  produtoId: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  max: number;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CompraPage() {
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const res = await fetch("/api/compra/produtos");
      if (!res.ok) throw new Error("Falha ao carregar produtos");
      const json = await res.json();
      setProdutos(json.produtos ?? []);
    } catch {
      setErro("Não foi possível carregar o estoque.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const produtosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return produtos;
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.numeroNota.toLowerCase().includes(q)
    );
  }, [produtos, busca]);

  const totalCarrinho = useMemo(
    () =>
      carrinho.reduce((acc, i) => acc + i.quantidade * i.valorUnitario, 0),
    [carrinho]
  );

  function itemKey(notaId: string, produtoId: string) {
    return `${notaId}:${produtoId}`;
  }

  function qtdNoCarrinho(notaId: string, produtoId: string) {
    return (
      carrinho.find((c) => c.notaId === notaId && c.produtoId === produtoId)
        ?.quantidade ?? 0
    );
  }

  function adicionarAoCarrinho(p: ProdutoEstoque) {
    if (!p.ativo) return;
    setSucesso(null);

    const key = itemKey(p.notaId, p.produtoId);
    const noCarrinho = qtdNoCarrinho(p.notaId, p.produtoId);

    if (noCarrinho >= p.quantidade) {
      setErro(`Estoque máximo de "${p.nome}" atingido.`);
      return;
    }

    setErro(null);

    if (noCarrinho > 0) {
      setCarrinho((prev) =>
        prev.map((c) =>
          c.key === key ? { ...c, quantidade: c.quantidade + 1 } : c
        )
      );
    } else {
      setCarrinho((prev) => [
        ...prev,
        {
          key,
          notaId: p.notaId,
          produtoId: p.produtoId,
          nome: p.nome,
          quantidade: 1,
          valorUnitario: p.valorUnitario,
          max: p.quantidade,
        },
      ]);
    }
  }

  function alterarQtdCarrinho(key: string, delta: number) {
    setCarrinho((prev) =>
      prev
        .map((c) => {
          if (c.key !== key) return c;
          const nova = c.quantidade + delta;
          if (nova <= 0) return null;
          if (nova > c.max) return { ...c, quantidade: c.max };
          return { ...c, quantidade: nova };
        })
        .filter((c): c is CarrinhoItem => c !== null)
    );
  }

  function removerDoCarrinho(key: string) {
    setCarrinho((prev) => prev.filter((c) => c.key !== key));
  }

  async function confirmarCompra() {
    if (!carrinho.length) return;
    setConfirmando(true);
    setErro(null);
    setSucesso(null);

    try {
      const res = await fetch("/api/compra/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itens: carrinho.map((c) => ({
            notaId: c.notaId,
            produtoId: c.produtoId,
            quantidade: c.quantidade,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.erro ?? "Falha ao confirmar");

      setCarrinho([]);
      setSucesso(json.mensagem ?? "Compra confirmada!");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao confirmar compra");
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className={styles.layout}>
      <div className={styles.catalogo}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.titulo}>Compra</h1>
            <p className={styles.subtitulo}>
              Monte o carrinho com itens do estoque (sem pagamento)
            </p>
          </div>
          <button type="button" className={styles.btnSec} onClick={carregar}>
            Atualizar
          </button>
        </div>

        {sucesso && <div className={styles.bannerOk}>{sucesso}</div>}
        {erro && <div className={styles.bannerErro}>{erro}</div>}

        <input
          type="search"
          className={styles.busca}
          placeholder="Buscar produto ou nota..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />

        {carregando && <p className={styles.mensagem}>Carregando produtos...</p>}

        {!carregando && produtosFiltrados.length === 0 && (
          <p className={styles.mensagem}>Nenhum produto disponível no estoque.</p>
        )}

        <div className={styles.tabela}>
          <div className={styles.tabelaHead}>
            <span>Produto</span>
            <span>Nota</span>
            <span>Disponível</span>
            <span>Unit.</span>
            <span>Status</span>
            <span />
          </div>
          {produtosFiltrados.map((p) => (
            <div
              key={itemKey(p.notaId, p.produtoId)}
              className={`${styles.tabelaRow} ${!p.ativo ? styles.rowInativo : ""}`}
            >
              <span className={styles.nome} title={p.nome}>
                {p.nome}
              </span>
              <span className={styles.muted}>{p.numeroNota}</span>
              <span className={styles.qtd}>{p.quantidade}</span>
              <span>{formatarMoeda(p.valorUnitario)}</span>
              <span>
                {!p.ativo ? (
                  <span className={styles.badgeInativo}>Inativo</span>
                ) : (
                  <span className={styles.badgeAtivo}>Ativo</span>
                )}
              </span>
              <button
                type="button"
                className={styles.btnAdd}
                disabled={!p.ativo || p.quantidade <= qtdNoCarrinho(p.notaId, p.produtoId)}
                onClick={() => adicionarAoCarrinho(p)}
              >
                + Carrinho
              </button>
            </div>
          ))}
        </div>
      </div>

      <aside className={styles.carrinho}>
        <h2 className={styles.carrinhoTitulo}>Carrinho</h2>
        <p className={styles.carrinhoSub}>
          {carrinho.length} item(ns) · {formatarMoeda(totalCarrinho)}
        </p>

        {carrinho.length === 0 ? (
          <p className={styles.carrinhoVazio}>
            Adicione produtos ativos com estoque disponível.
          </p>
        ) : (
          <ul className={styles.carrinhoLista}>
            {carrinho.map((item) => (
              <li key={item.key} className={styles.carrinhoItem}>
                <div className={styles.carrinhoItemTop}>
                  <span className={styles.carrinhoNome}>{item.nome}</span>
                  <button
                    type="button"
                    className={styles.btnRemover}
                    onClick={() => removerDoCarrinho(item.key)}
                    aria-label="Remover"
                  >
                    ×
                  </button>
                </div>
                <div className={styles.carrinhoControles}>
                  <button
                    type="button"
                    className={styles.btnQtd}
                    onClick={() => alterarQtdCarrinho(item.key, -1)}
                  >
                    −
                  </button>
                  <span className={styles.carrinhoQtd}>
                    {item.quantidade} / {item.max}
                  </span>
                  <button
                    type="button"
                    className={styles.btnQtd}
                    onClick={() => alterarQtdCarrinho(item.key, 1)}
                    disabled={item.quantidade >= item.max}
                  >
                    +
                  </button>
                  <span className={styles.carrinhoSubtotal}>
                    {formatarMoeda(item.quantidade * item.valorUnitario)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.carrinhoFooter}>
          <div className={styles.totalRow}>
            <span>Total estimado</span>
            <strong>{formatarMoeda(totalCarrinho)}</strong>
          </div>
          <button
            type="button"
            className={styles.btnConfirmar}
            disabled={!carrinho.length || confirmando}
            onClick={confirmarCompra}
          >
            {confirmando ? "Confirmando..." : "Confirmar compra"}
          </button>
          <p className={styles.aviso}>
            Ao confirmar, as quantidades serão descontadas do estoque.
          </p>
        </div>
      </aside>
    </div>
  );
}
