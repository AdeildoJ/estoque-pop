const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", ".next");

try {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("[dev] Cache .next removido");
} catch {
  /* pasta inexistente */
}
