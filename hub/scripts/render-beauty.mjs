import { readFileSync, writeFileSync } from "node:fs";
import { renderPage } from "../core/pageforge/dist/index.js";

const schema = JSON.parse(readFileSync("./examples/beauty-landing.json", "utf8"));
const html = renderPage(schema);
writeFileSync("./examples/beauty-landing.html", html);
console.log("rendered examples/beauty-landing.html");
