"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AppShell.module.css";

const ICONS = ["⌂", "▤", "⚕", "👤", "⊕", "⚙", "☰", "▦", "▥", "📱"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEstoque = pathname.startsWith("/estoque");
  const isCompra = pathname.startsWith("/compra");

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button type="button" className={styles.menuBtn} aria-label="Menu">
            ☰
          </button>
          <div className={styles.logo}>
            <span className={styles.logoNutri}>nutri</span>
            <span className={styles.logoSync}>SYNC</span>
          </div>
          <div className={styles.unidade}>
            <span>🏥</span>
            <span>Unimed Piracicaba</span>
            <span>▾</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span>Adeildo Junior</span>
          <div className={styles.avatar}>AJ</div>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.iconRail} aria-label="Menu principal">
          {ICONS.map((icon, i) => (
            <button
              key={icon}
              type="button"
              className={`${styles.iconBtn} ${i === 0 ? styles.iconBtnActive : ""}`}
              aria-hidden
            >
              {icon}
            </button>
          ))}
        </nav>

        <aside className={styles.subSidebar}>
          <div className={styles.subHeader}>
            <h2 className={styles.subTitle}>NutriStore</h2>
          </div>
          <nav className={styles.subNav}>
            <span className={styles.navGroupLabel}>NutriStore</span>
            <Link
              href="/estoque"
              className={`${styles.navItem} ${isEstoque ? styles.navItemActive : ""}`}
            >
              Estoque
            </Link>
            <Link
              href="/compra"
              className={`${styles.navItem} ${isCompra ? styles.navItemActive : ""}`}
            >
              Compra
            </Link>
          </nav>
        </aside>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
