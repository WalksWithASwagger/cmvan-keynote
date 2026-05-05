// Google Analytics 4
(function () {
  var s = document.createElement('script');
  s.src = 'https://www.googletagmanager.com/gtag/js?id=G-NZ9H74R399';
  s.async = true;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', 'G-NZ9H74R399');
})();

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
    initSubscribe();
    // Once the header is in the DOM, layer dropdown behavior on top of
    // native <details>. Lazy-imported so pages without the header skip it.
    import("/js/common/nav.js").catch((err) => {
      console.warn("[header.js] nav.js load failed:", err);
    });
  });
} else {
  markCurrentNav();
}

function initSubscribe() {
  const form = document.querySelector('.newsletter-band__form');
  if (!form) return;
  const input = form.querySelector('input[type="email"]');
  const btn = form.querySelector('button[type="submit"]');
  const msg = form.querySelector('.newsletter-band__msg');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (input.value || '').trim();
    if (!email) return;
    btn.disabled = true;
    btn.textContent = 'sending…';
    msg.textContent = '';
    msg.className = 'newsletter-band__msg';
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (data.ok) {
        msg.textContent = "you're in. check your inbox.";
        msg.className = 'newsletter-band__msg newsletter-band__msg--ok';
        form.reset();
      } else {
        msg.textContent = data.error || 'something went wrong.';
        msg.className = 'newsletter-band__msg newsletter-band__msg--err';
      }
    } catch {
      msg.textContent = 'network error. try again.';
      msg.className = 'newsletter-band__msg newsletter-band__msg--err';
    }
    btn.disabled = false;
    btn.textContent = 'subscribe';
  });
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
