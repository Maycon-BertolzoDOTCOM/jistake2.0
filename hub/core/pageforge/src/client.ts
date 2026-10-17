import { hydratePage } from "./hydration";

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => hydratePage(document));
  } else {
    hydratePage(document);
  }
}

export { hydratePage };
