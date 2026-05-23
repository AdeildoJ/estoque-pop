"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./AppShell.module.css";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEstoque = pathname.startsWith("/estoque");
  const isCompra = pathname.startsWith("/compra");
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = () => {
      if (mq.matches) setMenuAberto(true);
    };
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function toggleMenu() {
    setMenuAberto((v) => !v);
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.menuBtn}
            onClick={toggleMenu}
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
          >
            ☰
          </button>
          <div className={styles.logo}>
            <span className={styles.logoNutri}>nutri</span>
            <span className={styles.logoSync}>SYNC</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span>Adeildo Junior</span>
          <div className={styles.avatar}>AJ</div>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.iconRail} aria-label="NutriStore">
          <button
            type="button"
            className={`${styles.nsBtn} ${menuAberto ? styles.nsBtnActive : ""}`}
            onClick={toggleMenu}
            title="NutriStore"
            aria-label="Abrir menu NutriStore"
            aria-expanded={menuAberto}
          >
            <span className={styles.nsMark}>NS</span>
          </button>
        </nav>

        {menuAberto && (
          <button
            type="button"
            className={styles.backdrop}
            onClick={() => setMenuAberto(false)}
            aria-label="Fechar menu"
          />
        )}

        <aside
          className={`${styles.subSidebar} ${menuAberto ? styles.subSidebarAberto : ""}`}
        >
          <div className={styles.subHeader}>
            <h2 className={styles.subTitle}>NutriStore</h2>
          </div>
          <nav className={styles.subNav}>
            <Link
              href="/estoque"
              className={`${styles.navItem} ${isEstoque ? styles.navItemActive : ""}`}
              onClick={() => {
                if (window.innerWidth < 1024) setMenuAberto(false);
              }}
            >
              Estoque
            </Link>
            <Link
              href="/compra"
              className={`${styles.navItem} ${isCompra ? styles.navItemActive : ""}`}
              onClick={() => {
                if (window.innerWidth < 1024) setMenuAberto(false);
              }}
            >
              Compra
            </Link>
          </nav>
        </aside>

        <main
          className={`${styles.main} ${menuAberto ? styles.mainComMenu : ""}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
