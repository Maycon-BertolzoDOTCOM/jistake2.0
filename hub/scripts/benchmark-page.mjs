import { readFileSync, writeFileSync } from "node:fs";

const htmlPath = process.argv[2] || "./examples/beauty-landing.html";
const html = readFileSync(htmlPath, "utf8");
const kb = Buffer.byteLength(html, "utf8") / 1024;

const adapterMatches = html.match(/data-visual-adapter=['"][a-z]+['"]/g) || [];
const adapters = [...new Set(adapterMatches.map((m) => {
  const match = m.match(/['"]([a-z]+)['"]/);
  return match ? match[1] : "";
}).filter(Boolean))];

const report = {
  file: htmlPath,
  passed: kb <= 100 && html.includes('class="skip-link"') && html.includes('role="main"'),
  budgetKb: 100,
  checks: {
    sizeKb: Number(kb.toFixed(2)),
    skipLink: html.includes('class="skip-link"'),
    mainLandmark: html.includes('role="main"'),
    visualAdapters: adapters,
    dataConstructs: (html.match(/data-construct=['"][a-z-]+['"]/g) || []).length,
    cdnScripts: (html.match(/<script src="https:\/\/[^"]+"><\/script>/g) || []).length,
  },
  recommendations: kb <= 100
    ? ["OK: página dentro do budget e com acessibilidade básica."]
    : ["Reduza tamanho ou ajuste perfBudget.maxHtmlKb."],
};

writeFileSync("./examples/beauty-benchmark.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
