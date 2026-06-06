// Merch — renders the Punk Rock AI shop from /data/merch.json and mounts
// Shopify Buy Buttons (Store A "Krug umbrella" → punk-rock collection).
// Storefront domain + token are publishable, so they live in the JSON.
// Degrades to "Shop opening soon" whenever store config or a product id is
// missing, so the page is safe to ship before the Shopify store is wired.

const SDK_URL =
  "https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js";

const grid = document.getElementById("merch-grid");
if (grid) main();

async function main() {
  let config;
  try {
    const res = await fetch("/data/merch.json", { credentials: "same-origin" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    config = await res.json();
  } catch (err) {
    console.warn("[merch]", err);
    grid.dataset.state = "error";
    return;
  }

  const products = Array.isArray(config?.products) ? config.products : [];
  renderCards(products);

  const domain = config?.store?.domain?.trim();
  const token = config?.store?.storefrontToken?.trim();
  const live = products.filter((p) => p.productId?.trim());

  if (!domain || !token || !live.length) {
    grid.dataset.state = "pending";
    return;
  }

  try {
    const ui = await getShopifyUI(domain, token);
    live.forEach((product) => {
      const node = grid.querySelector(`[data-buy="${product.id}"]`);
      if (!node) return;
      node.innerHTML = "";
      ui.createComponent("product", {
        id: product.productId.trim(),
        node,
        moneyFormat: "%24%7B%7Bamount%7D%7D",
        options: buyButtonOptions,
      });
    });
    grid.dataset.state = "ready";
  } catch (err) {
    console.warn("[merch]", err);
    grid.dataset.state = "error";
  }
}

function renderCards(products) {
  grid.innerHTML = products
    .map(
      (p) => `
      <article class="merch-card">
        <h2 class="merch-card__name">${escapeHtml(p.name)}</h2>
        <p class="merch-card__blurb">${escapeHtml(p.blurb)}</p>
        <p class="merch-card__price">${escapeHtml(p.price)}</p>
        <div class="merch-card__buy" data-buy="${escapeHtml(p.id)}">
          <span class="merch-card__soon">Shop opening soon</span>
        </div>
      </article>`
    )
    .join("");
}

let uiPromise = null;
function getShopifyUI(domain, storefrontAccessToken) {
  if (uiPromise) return uiPromise;
  uiPromise = loadScript().then(() => {
    const shopify = window.ShopifyBuy;
    const client = shopify.buildClient({ domain, storefrontAccessToken });
    return shopify.UI.onReady(client);
  });
  return uiPromise;
}

let scriptPromise = null;
function loadScript() {
  if (window.ShopifyBuy?.UI) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = SDK_URL;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return scriptPromise;
}

const buyButtonOptions = {
  product: {
    buttonDestination: "cart",
    contents: { img: false, title: false, price: false, options: true },
    text: { button: "Add to cart" },
    styles: {
      product: { margin: "0", "max-width": "100%" },
      button: {
        "background-color": "#e11d2e",
        color: "#ffffff",
        "border-radius": "0",
        "font-weight": "700",
        "text-transform": "uppercase",
        "letter-spacing": "0.08em",
        ":hover": { "background-color": "#b51624" },
        ":focus": { "background-color": "#b51624" },
      },
    },
  },
  cart: {
    text: { title: "Punk Rock AI", total: "Subtotal", button: "Checkout" },
    styles: {
      button: {
        "background-color": "#e11d2e",
        color: "#ffffff",
        ":hover": { "background-color": "#b51624" },
        ":focus": { "background-color": "#b51624" },
      },
    },
  },
  toggle: {
    styles: {
      toggle: {
        "background-color": "#e11d2e",
        ":hover": { "background-color": "#b51624" },
        ":focus": { "background-color": "#b51624" },
      },
    },
  },
};

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]
  );
}
