// Tiny include helper. Fetches partials/header.html + footer.html and inserts
// them into elements with [data-include="header"] / [data-include="footer"].
// Marks the matching nav link with aria-current="page" so layout.css can
// highlight it. Pure browser API, ES module, zero deps.

const PARTIALS = {
  header: "/partials/header.html",
  footer: "/partials/footer.html",
};

const includes = Array.from(document.querySelectorAll("[data-include]"));
if (includes.length) {
  Promise.all(
    includes.map(async (el) => {
      const name = el.getAttribute("data-include");
      const url = PARTIALS[name];
      if (!url) return;
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (!res.ok) throw new Error(`${url} → ${res.status}`);
        el.innerHTML = await res.text();
      } catch (err) {
        // Fail loud in console, soft in UI — leaves the slot empty rather than
        // breaking the page when running over file:// (use `npx serve site/`).
        console.warn("[header.js] include failed:", err);
      }
    })
  ).then(() => {
    markCurrentNav();
    // Once the header is in the DOM, layer dropdown behavior on top of
    // native <details>. Lazy-imported so pages without the header skip it.
    import("/js/common/nav.js").catch((err) => {
      console.warn("[header.js] nav.js load failed:", err);
    });
  });
} else {
  markCurrentNav();
}

function markCurrentNav() {
  const here = normalize(window.location.pathname);
  document.querySelectorAll(".site-nav a[data-route]").forEach((a) => {
    if (normalize(a.getAttribute("data-route")) === here) {
      a.setAttribute("aria-current", "page");
    }
  });
}

function normalize(path) {
  if (!path) return "/";
  let p = path.replace(/index\.html$/i, "").replace(/\/+$/g, "");
  return p === "" ? "/" : p;
}
