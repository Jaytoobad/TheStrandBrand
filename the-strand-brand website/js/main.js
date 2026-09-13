/* =======================================================================
   MAIN.JS  —  HOME PAGE LOGIC
   -----------------------------------------------------------------------
   Handles: drawing the product grid, the search bar, the category filter
   chips, the heart (favorite) button, "Add to cart", and the quick-view
   popup. Only runs on index.html.
   ======================================================================= */

let currentFilter = "all";
let currentSearch = "";

document.addEventListener("DOMContentLoaded", function () {
  const grid = document.querySelector("[data-product-grid]");
  if (!grid) return; // not on the home page, nothing to do

  buildFilterChips();
  renderProducts();

  const searchInput = document.querySelector("[data-search-input]");
  const searchForm = document.querySelector("[data-search-form]");
  if (searchForm) {
    searchForm.addEventListener("submit", function (e) {
      e.preventDefault();
      currentSearch = searchInput.value.trim().toLowerCase();
      renderProducts();
    });
  }
  // Also filter live as they type, so the button is optional but nice to have
  if (searchInput) {
    searchInput.addEventListener("input", function () {
      currentSearch = searchInput.value.trim().toLowerCase();
      renderProducts();
    });
  }

  // Quick view modal — closes on backdrop click or the × button
  document.addEventListener("click", function (e) {
    if (e.target.matches("[data-modal-close]") || e.target.matches(".modal-overlay")) {
      closeQuickView();
    }
  });
});

/* Builds the row of category chips (All, Featured, Straight, Curly...)
   automatically from whatever "type" values exist in products.js, so you
   don't need to touch this file when you add a new hair type. */
function buildFilterChips() {
  const row = document.querySelector("[data-filter-row]");
  if (!row) return;

  const types = Array.from(new Set(PRODUCTS.map(p => p.type)));
  const chips = [{ key: "all", label: "All" }, { key: "featured", label: "Featured" }]
    .concat(types.map(t => ({ key: t, label: t.charAt(0).toUpperCase() + t.slice(1) })));

  row.innerHTML = chips.map(chip =>
    `<button class="chip${chip.key === "all" ? " active" : ""}" data-filter="${chip.key}">${chip.label}</button>`
  ).join("");

  row.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", function () {
      currentFilter = btn.dataset.filter;
      row.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      renderProducts();
    });
  });
}

/* Figures out which products should currently be visible, based on the
   active filter chip and whatever's typed in the search bar. */
function getVisibleProducts() {
  return PRODUCTS.filter(product => {
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "featured" && product.featured) ||
      product.type === currentFilter;

    const haystack = (product.name + " " + product.type + " " + product.description).toLowerCase();
    const matchesSearch = currentSearch === "" || haystack.includes(currentSearch);

    return matchesFilter && matchesSearch;
  });
}

function renderProducts() {
  const grid = document.querySelector("[data-product-grid]");
  const emptyState = document.querySelector("[data-empty-state]");
  const products = getVisibleProducts();

  if (products.length === 0) {
    grid.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }
  if (emptyState) emptyState.style.display = "none";

  grid.innerHTML = products.map(renderProductCard).join("");

  // Wire up buttons on the cards we just created
  grid.querySelectorAll("[data-add-cart]").forEach(btn => {
    btn.addEventListener("click", function () {
      const id = Number(btn.dataset.addCart);
      addToCart(id, 1);
      refreshNavBadges();
      showToast("Added to cart");
    });
  });

  grid.querySelectorAll("[data-toggle-fav]").forEach(btn => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation(); // sits inside the thumbnail — don't also open quick view
      const id = Number(btn.dataset.toggleFav);
      const nowFav = toggleFavorite(id);
      btn.classList.toggle("is-active", nowFav);
      btn.innerHTML = nowFav ? "♥" : "♡";
      refreshNavBadges();
      showToast(nowFav ? "Added to favorites" : "Removed from favorites");
    });
  });

  grid.querySelectorAll("[data-quick-view]").forEach(el => {
    el.addEventListener("click", function () {
      openQuickView(Number(el.dataset.quickView));
    });
  });
}

function renderProductCard(product) {
  const stock = getStockInfo(product);
  const fav = isFavorite(product.id) ? " is-active" : "";
  const priceHtml = product.oldPrice
    ? `<span class="old-price">${formatMoney(product.oldPrice)}</span>${formatMoney(product.price)}`
    : formatMoney(product.price);

  return `
    <div class="product-card">
      <div class="product-thumb" data-quick-view="${product.id}">
        <img src="${product.image}" alt="${product.name}" loading="lazy">
        <button class="fav-toggle${fav}" data-toggle-fav="${product.id}" aria-label="Toggle favorite">
          ${fav ? "♥" : "♡"}
        </button>
      </div>
      <div class="product-info">
        <span class="product-type">${product.type}</span>
        <h3 class="product-name" data-quick-view="${product.id}" style="cursor:pointer">${product.name}</h3>
        <span class="stock-badge ${stock.cssClass}">${stock.label}</span>
        <span class="product-price">${priceHtml}</span>
      </div>
      <div class="product-actions">
        <button class="btn btn-primary" data-add-cart="${product.id}" ${stock.canBuy ? "" : "disabled"}>
          ${stock.canBuy ? "Add to cart" : "Sold out"}
        </button>
      </div>
    </div>
  `;
}

/* -----------------------------------------------------------------------
   QUICK VIEW MODAL
   -------------------------------------------------------------------- */
function openQuickView(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  const stock = getStockInfo(product);

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-box">
      <button class="modal-close" data-modal-close aria-label="Close">&times;</button>
      <div class="modal-grid">
        <img src="${product.image}" alt="${product.name}">
        <div>
          <span class="product-type">${product.type}</span>
          <h2>${product.name}</h2>
          <span class="stock-badge ${stock.cssClass}">${stock.label}</span>
          <p style="margin-top:1rem">${product.description}</p>
          <p class="product-price" style="font-size:1.3rem">${formatMoney(product.price)}</p>
          <button class="btn btn-primary btn-block" data-add-cart="${product.id}" ${stock.canBuy ? "" : "disabled"}>
            ${stock.canBuy ? "Add to cart" : "Sold out"}
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("[data-add-cart]").addEventListener("click", function () {
    addToCart(product.id, 1);
    refreshNavBadges();
    showToast("Added to cart");
    closeQuickView();
  });
}

function closeQuickView() {
  const overlay = document.querySelector(".modal-overlay");
  if (overlay) overlay.remove();
}
