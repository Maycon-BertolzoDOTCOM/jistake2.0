export function hydratePage(root?: ParentNode): void {
  const scope = root ?? (typeof document !== "undefined" ? document : null);
  if (!scope) return;

  const tabs = Array.from(scope.querySelectorAll("[data-construct='tabs']"));
  for (const tabSection of tabs) {
    const buttons = Array.from(tabSection.querySelectorAll("[data-tab]")) as HTMLButtonElement[];
    const panels = Array.from(tabSection.querySelectorAll("[data-panel]")) as HTMLElement[];
    buttons.forEach((button, index) => {
      button.addEventListener("click", () => {
        buttons.forEach((item, itemIndex) => item.setAttribute("aria-selected", String(itemIndex === index)));
        panels.forEach((panel, panelIndex) => {
          panel.hidden = panelIndex !== index;
        });
      });
    });
  }

  const modals = Array.from(scope.querySelectorAll("[data-construct='modal']"));
  for (const modal of modals) {
    const trigger = modal.querySelector("[data-modal-trigger]") as HTMLElement | null;
    const content = modal.querySelector("[data-modal-content]") as HTMLElement | null;
    if (!trigger || !content) continue;
    trigger.addEventListener("click", () => {
      content.hidden = false;
    });
    content.addEventListener("click", (event: Event) => {
      if (event.target === content) content.hidden = true;
    });
  }

  const drawers = Array.from(scope.querySelectorAll("[data-construct='drawer']"));
  for (const drawer of drawers) {
    const trigger = drawer.querySelector("[data-drawer-trigger]") as HTMLElement | null;
    const content = drawer.querySelector("[data-drawer-content]") as HTMLElement | null;
    if (!trigger || !content) continue;
    trigger.addEventListener("click", () => {
      content.hidden = !content.hidden;
    });
  }

  const tooltips = Array.from(scope.querySelectorAll("[data-construct='tooltip']"));
  for (const tooltip of tooltips) {
    const bubble = tooltip.querySelector("[role='tooltip']") as HTMLElement | null;
    if (!bubble) continue;
    const show = () => { bubble.hidden = false; };
    const hide = () => { bubble.hidden = true; };
    tooltip.addEventListener("mouseenter", show);
    tooltip.addEventListener("mouseleave", hide);
    tooltip.addEventListener("focusin", show);
    tooltip.addEventListener("focusout", hide);
  }

  const counters = Array.from(scope.querySelectorAll("[data-construct='animated-counter']")) as HTMLElement[];
  for (const counter of counters) {
    const target = Number(counter.getAttribute("data-value") || "0");
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      counter.textContent = String(Math.round(target * progress));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const reveals = Array.from(scope.querySelectorAll("[data-construct='scroll-reveal']")) as HTMLElement[];
  for (const reveal of reveals) {
    const observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          reveal.classList.add("is-visible");
          observer.unobserve(reveal);
        }
      }
    });
    observer.observe(reveal);
  }

  const parallaxes = Array.from(scope.querySelectorAll("[data-construct='parallax']")) as HTMLElement[];
  for (const parallax of parallaxes) {
    const speed = Number(parallax.getAttribute("data-speed") || "0.5");
    const onScroll = () => {
      const offset = window.scrollY * speed;
      parallax.style.transform = `translateY(${offset}px)`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
}

export const hydrationScript = `(() => {
  const q = (root, sel) => Array.from(root.querySelectorAll(sel));
  const tabs = q(document, "[data-construct='tabs']");
  tabs.forEach((section) => {
    const buttons = q(section, "[data-tab]");
    const panels = q(section, "[data-panel]");
    buttons.forEach((button, index) => {
      button.addEventListener("click", () => {
        buttons.forEach((item, i) => item.setAttribute("aria-selected", String(i === index)));
        panels.forEach((panel, i) => { panel.hidden = i !== index; });
      });
    });
  });
  const modals = q(document, "[data-construct='modal']");
  modals.forEach((modal) => {
    const trigger = modal.querySelector("[data-modal-trigger]");
    const content = modal.querySelector("[data-modal-content]");
    if (!trigger || !content) return;
    trigger.addEventListener("click", () => { content.hidden = false; });
    content.addEventListener("click", (event) => { if (event.target === content) content.hidden = true; });
  });
  const drawers = q(document, "[data-construct='drawer']");
  drawers.forEach((drawer) => {
    const trigger = drawer.querySelector("[data-drawer-trigger]");
    const content = drawer.querySelector("[data-drawer-content]");
    if (!trigger || !content) return;
    trigger.addEventListener("click", () => { content.hidden = !content.hidden; });
  });
  const tooltips = q(document, "[data-construct='tooltip']");
  tooltips.forEach((tooltip) => {
    const bubble = tooltip.querySelector("[role='tooltip']");
    if (!bubble) return;
    const show = () => { bubble.hidden = false; };
    const hide = () => { bubble.hidden = true; };
    tooltip.addEventListener("mouseenter", show);
    tooltip.addEventListener("mouseleave", hide);
    tooltip.addEventListener("focusin", show);
    tooltip.addEventListener("focusout", hide);
  });
  const counters = q(document, "[data-construct='animated-counter']");
  counters.forEach((counter) => {
    const target = Number(counter.getAttribute("data-value") || "0");
    const start = performance.now();
    const duration = 900;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      counter.textContent = String(Math.round(target * progress));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const reveals = q(document, "[data-construct='scroll-reveal']");
  reveals.forEach((reveal) => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal.classList.add("is-visible");
          observer.unobserve(reveal);
        }
      });
    });
    observer.observe(reveal);
  });
  const parallaxes = q(document, "[data-construct='parallax']");
  parallaxes.forEach((parallax) => {
    const speed = Number(parallax.getAttribute("data-speed") || "0.5");
    const onScroll = () => {
      parallax.style.transform = "translateY(" + (window.scrollY * speed) + "px)";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  });
})();`;
