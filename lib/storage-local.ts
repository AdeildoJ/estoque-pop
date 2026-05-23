import fs from "fs";
import path from "path";
import type { EstoqueData } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "estoque.json");

const EMPTY: EstoqueData = { notas: [] };

export function lerEstoqueLocal(): EstoqueData {
  try {
    if (!fs.existsSync(DATA_FILE)) return EMPTY;
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw) as EstoqueData;
    if (!Array.isArray(data.notas)) return EMPTY;
    return data;
  } catch {
    return EMPTY;
  }
}

export function salvarEstoqueLocal(data: EstoqueData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}
