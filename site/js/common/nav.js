// site/js/common/nav.js
// Layers hover-open / click-outside-close / ESC behavior on top of the
// native <details> dropdowns in partials/header.html. The site nav works
// fully without this JS (each <details> click-toggles); this just makes
// it behave like a real dropdown menu on hover.

(function () {
  const groups = document.querySelectorAll(".site-nav__group");
  if (!groups.length) return;

  const isHoverable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Mark active group based on current path
  const path = normalize(window.location.pathname);
  groups.forEach((g) => {
    const links = g.querySelectorAll("a[data-route]");
    for (const a of links) {
      if (normalize(a.getAttribute("data-route")) === path || normalize(a.getAttribute("href")) === path) {
        g.setAttribute("data-active", "true");
        break;
      }
    }
  });

  if (isHoverable) {
    groups.forEach((g) => {
      let timer = null;
      g.addEventListener("mouseenter", () => {
        clearTimeout(timer);
        // Close any other open group
        for (const other of groups) {
          if (other !== g && other.open) other.open = false;
        }
        g.open = true;
      });
      g.addEventListener("mouseleave", () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          g.open = false;
        }, 150);
      });
    });
  }

  // ESC closes any open dropdown
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    for (const g of groups) {
      if (g.open) g.open = false;
    }
  });

  // Click outside any group closes all
  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!target || !(target instanceof Element)) return;
    if (target.closest(".site-nav__group")) return;
    for (const g of groups) {
      if (g.open) g.open = false;
    }
  });

  function normalize(path) {
    if (!path) return "/";
    let p = path
      .replace(/index\.html$/i, "")
      .replace(/\.html$/i, "")
      .replace(/\/+$/g, "");
    return p === "" ? "/" : p;
  }
})();
