import { readFileSync, writeFileSync } from "node:fs";
import { renderPage } from "../core/pageforge/dist/index.js";

const schema = JSON.parse(readFileSync("./examples/visual-pilot.json", "utf8"));
const html = renderPage(schema);
writeFileSync("./examples/visual-pilot.html", html);
console.log("rendered examples/visual-pilot.html");
