/* =======================================================================
   FAVORITES.JS  —  FAVORITES PAGE LOGIC
   -----------------------------------------------------------------------
   Draws the list of products a customer has "hearted" so they can come
   back and buy them later. Lives entirely in the browser (see the note
   at the top of storage.js), so favorites are per-device.
   ======================================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const grid = document.querySelector("[data-fav-grid]");
  if (!grid) return; // not on the favorites page

  renderFavorites();
});

function renderFavorites() {
  const grid = document.querySelector("[data-fav-grid]");
  const emptyState = document.querySelector("[data-fav-empty]");
  const favIds = getFavorites();
  const products = PRODUCTS.filter(p => favIds.includes(p.id));

  if (products.length === 0) {
    grid.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }
  if (emptyState) emptyState.style.display = "none";

  // Re-uses the exact same card markup as the home page (renderProductCard
  // lives in main.js) so the two pages always look consistent.
  grid.innerHTML = products.map(renderProductCard).join("");

  grid.querySelectorAll("[data-add-cart]").forEach(btn => {
    btn.addEventListener("click", function () {
      addToCart(Number(btn.dataset.addCart), 1);
      refreshNavBadges();
      showToast("Added to cart");
    });
  });

  grid.querySelectorAll("[data-toggle-fav]").forEach(btn => {
    btn.addEventListener("click", function (e) {
      e.stopPropagation(); // sits inside the thumbnail — don't also open quick view
      toggleFavorite(Number(btn.dataset.toggleFav));
      refreshNavBadges();
      renderFavorites(); // re-draw so removed items disappear immediately
      showToast("Removed from favorites");
    });
  });

  grid.querySelectorAll("[data-quick-view]").forEach(el => {
    el.addEventListener("click", function () {
      openQuickView(Number(el.dataset.quickView));
    });
  });
}
