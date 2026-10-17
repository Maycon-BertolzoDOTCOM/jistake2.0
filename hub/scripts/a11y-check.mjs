import { readFileSync } from "node:fs";

const html = readFileSync(process.argv[2] || "./examples/beauty-landing.html", "utf8");
const checks = {
  skipLink: html.includes('class="skip-link"'),
  mainLandmark: html.includes('role="main"'),
  htmlLang: /<html[^>]+lang=/.test(html),
  viewport: html.includes('name="viewport"'),
  imagesHaveAlt: !/<img(?![^>]*\salt=)/.test(html),
  reducedMotion: html.includes("prefers-reduced-motion"),
  headings: /<h1[\s>]/.test(html),
};

const failed = Object.entries(checks).filter(([, value]) => !value).map(([key]) => key);
console.log(JSON.stringify({ passed: failed.length === 0, checks, failed }, null, 2));
if (failed.length) process.exitCode = 1;
