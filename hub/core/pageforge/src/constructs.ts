import { ConstructType } from "./types";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function listItems(items: unknown): string {
  if (!Array.isArray(items)) return "";
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

export const CONSTRUCTS: Record<ConstructType, { required: string[]; render: (props: Record<string, unknown>) => string }> = {
  hero: {
    required: ["headline"],
    render: (props) => `
<section class="hero">
  <h1>${escapeHtml(props.headline)}</h1>
  ${props.subheadline ? `<p>${escapeHtml(props.subheadline)}</p>` : ""}
  ${props.ctaLabel ? `<a class="cta" href="${escapeHtml(props.ctaHref || "#")}">${escapeHtml(props.ctaLabel)}</a>` : ""}
</section>`,
  },
  proof: {
    required: ["items"],
    render: (props) => `
<section class="proof">
  <ul>${listItems(props.items)}</ul>
</section>`,
  },
  features: {
    required: ["items"],
    render: (props) => `
<section class="features">
  <ul>${Array.isArray(props.items) ? props.items.map((item: unknown) => `<li><strong>${escapeHtml((item as Record<string, unknown>).title)}</strong><span>${escapeHtml((item as Record<string, unknown>).description)}</span></li>`).join("") : ""}</ul>
</section>`,
  },
  pricing: {
    required: ["plans"],
    render: (props) => `
<section class="pricing">
  ${Array.isArray(props.plans) ? props.plans.map((plan: unknown) => `<article><h3>${escapeHtml((plan as Record<string, unknown>).name)}</h3><p>${escapeHtml((plan as Record<string, unknown>).price)}</p><ul>${listItems((plan as Record<string, unknown>).features)}</ul></article>`).join("") : ""}
</section>`,
  },
  faq: {
    required: ["items"],
    render: (props) => `
<section class="faq">
  ${Array.isArray(props.items) ? props.items.map((item: unknown) => `<details><summary>${escapeHtml((item as Record<string, unknown>).question)}</summary><p>${escapeHtml((item as Record<string, unknown>).answer)}</p></details>`).join("") : ""}
</section>`,
  },
  cta: {
    required: ["label", "href"],
    render: (props) => `
<section class="cta">
  <a href="${escapeHtml(props.href)}">${escapeHtml(props.label)}</a>
</section>`,
  },
  footer: {
    required: ["text"],
    render: (props) => `
<footer>
  <p>${escapeHtml(props.text)}</p>
</footer>`,
  },
  gallery: {
    required: ["items"],
    render: (props) => `
<section class="gallery">
  ${Array.isArray(props.items) ? props.items.map((item: unknown) => `<figure><img src="${escapeHtml((item as Record<string, unknown>).src)}" alt="${escapeHtml((item as Record<string, unknown>).alt || "")}" /><figcaption>${escapeHtml((item as Record<string, unknown>).caption || "")}</figcaption></figure>`).join("") : ""}
</section>`,
  },
  testimonials: {
    required: ["items"],
    render: (props) => `
<section class="testimonials">
  ${Array.isArray(props.items) ? props.items.map((item: unknown) => `<blockquote><p>${escapeHtml((item as Record<string, unknown>).quote)}</p><cite>${escapeHtml((item as Record<string, unknown>).author)}</cite></blockquote>`).join("") : ""}
</section>`,
  },
  location: {
    required: ["address"],
    render: (props) => `
<section class="location">
  <p>${escapeHtml(props.address)}</p>
  ${props.mapUrl ? `<a href="${escapeHtml(props.mapUrl)}">Ver no mapa</a>` : ""}
</section>`,
  },
  "booking-cta": {
    required: ["label", "href"],
    render: (props) => `
<section class="booking-cta">
  <a class="cta" href="${escapeHtml(props.href)}">${escapeHtml(props.label)}</a>
  ${props.note ? `<small>${escapeHtml(props.note)}</small>` : ""}
</section>`,
  },

  tabs: {
    required: ["items"],
    render: (props) => `
<section class="tabs" data-construct="tabs">
  ${Array.isArray(props.items) ? props.items.map((item: unknown, index: number) => `<div role="tabpanel" id="panel-${index}" hidden="${index !== 0}">${escapeHtml((item as Record<string, unknown>).content)}</div>`).join("") : ""}
  <div role="tablist" aria-label="${escapeHtml(props.label || "Tabs")}">
    ${Array.isArray(props.items) ? props.items.map((item: unknown, index: number) => `<button type="button" role="tab" id="tab-${index}" aria-selected="${index === 0}" data-tab="${index}">${escapeHtml((item as Record<string, unknown>).label)}</button>`).join("") : ""}
  </div>
</section>`,
  },
  accordion: {
    required: ["items"],
    render: (props) => `
<section class="accordion" data-construct="accordion">
  ${Array.isArray(props.items) ? props.items.map((item: unknown) => `<details><summary>${escapeHtml((item as Record<string, unknown>).title)}</summary><div role="region">${escapeHtml((item as Record<string, unknown>).content)}</div></details>`).join("") : ""}
</section>`,
  },
  carousel: {
    required: ["items"],
    render: (props) => `
<section class="carousel" data-construct="carousel">
  ${Array.isArray(props.items) ? props.items.map((item: unknown) => `<figure>${escapeHtml((item as Record<string, unknown>).caption)}</figure>`).join("") : ""}
</section>`,
  },
  form: {
    required: ["fields"],
    render: (props) => `
<form class="form" data-construct="form">
  ${Array.isArray(props.fields) ? props.fields.map((field: unknown) => `<label>${escapeHtml((field as Record<string, unknown>).label)}<input name="${escapeHtml((field as Record<string, unknown>).name)}" type="${escapeHtml((field as Record<string, unknown>).type || "text")}" /></label>`).join("") : ""}
  <button type="submit">${escapeHtml(props.submitLabel || "Enviar")}</button>
</form>`,
  },
  modal: {
    required: ["trigger", "content"],
    render: (props) => `
<section class="modal" data-construct="modal">
  <button type="button" data-modal-trigger aria-haspopup="dialog">${escapeHtml(props.trigger)}</button>
  <dialog data-modal-content hidden role="dialog" aria-modal="true" aria-label="${escapeHtml(props.label || "Modal")}">${escapeHtml(props.content)}</dialog>
</section>`,
  },
  "scroll-reveal": {
    required: ["content"],
    render: (props) => `
<section class="scroll-reveal" data-construct="scroll-reveal">
  ${escapeHtml(props.content)}
</section>`,
  },
  parallax: {
    required: ["content"],
    render: (props) => `
<section class="parallax" data-construct="parallax" data-speed="${escapeHtml(props.speed || "0.5")}">
  ${escapeHtml(props.content)}
</section>`,
  },
  "animated-counter": {
    required: ["value"],
    render: (props) => `
<section class="animated-counter" data-construct="animated-counter" data-value="${escapeHtml(props.value)}">
  ${escapeHtml(props.label || "")}
</section>`,
  },
  drawer: {
    required: ["trigger", "content"],
    render: (props) => `
<section class="drawer" data-construct="drawer">
  <button type="button" data-drawer-trigger aria-expanded="false">${escapeHtml(props.trigger)}</button>
  <aside data-drawer-content hidden role="dialog" aria-label="${escapeHtml(props.label || "Drawer")}">${escapeHtml(props.content)}</aside>
</section>`,
  },
  tooltip: {
    required: ["label", "content"],
    render: (props) => `
<span class="tooltip" data-construct="tooltip">
  ${escapeHtml(props.label)}
  <span role="tooltip" hidden aria-hidden="true">${escapeHtml(props.content)}</span>
</span>`,
  },

  "nail-showcase": {
    required: ["design", "color"],
    render: (props) => `
<section class="nail-showcase" data-construct="nail-showcase">
  <figure>
    ${props.image ? `<img src="${escapeHtml(props.image)}" alt="${escapeHtml(props.design || "Nail design")}" />` : ""}
    <figcaption>
      <span class="nail-swatch" style="background:${escapeHtml(props.color)}" aria-hidden="true"></span>
      <strong>${escapeHtml(props.design)}</strong>
      ${props.caption ? `<p>${escapeHtml(props.caption)}</p>` : ""}
    </figcaption>
  </figure>
</section>`,
  },

  quiz: {
    required: ["title", "questions"],
    render: (props) => `
<section class="quiz" data-construct="quiz">
  <h2>${escapeHtml(props.title)}</h2>
  ${Array.isArray(props.questions) ? props.questions.map((q: unknown, index: number) => `<fieldset data-question="${index}"><legend>${escapeHtml((q as Record<string, unknown>).label)}</legend>${Array.isArray((q as Record<string, unknown>).options) ? ((q as Record<string, unknown>).options as unknown[]).map((option: unknown) => `<label><input type="radio" name="q${index}" value="${escapeHtml(option)}" /> ${escapeHtml(option)}</label>`).join("") : ""}</fieldset>`).join("") : ""}
  <button type="submit">${escapeHtml(props.submitLabel || "Enviar")}</button>
</section>`,
  },
};
