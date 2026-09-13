/* =======================================================================
   ADMIN.JS  —  ADMIN DASHBOARD LOGIC
   -----------------------------------------------------------------------
   Powers admin.html: a simple password gate, a stats overview, an orders
   table where you can update order status, and an inventory table where
   you can see + correct stock levels.

   REMEMBER: this reads the same localStorage data described in
   storage.js, so it only shows orders placed in THIS browser. See the
   big note at the top of storage.js for how to move this to a real
   shared backend later.
   ======================================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const adminApp = document.querySelector("[data-admin-app]");
  if (!adminApp) return; // not on the admin page

  setupLoginGate();
  setupTabs();
});

/* -----------------------------------------------------------------------
   LOGIN GATE
   -------------------------------------------------------------------- */
function setupLoginGate() {
  const loginBox = document.querySelector("[data-admin-login]");
  const dashboard = document.querySelector("[data-admin-dashboard]");
  const form = document.querySelector("[data-admin-login-form]");
  const logoutBtn = document.querySelector("[data-admin-logout]");

  const isAuthed = sessionStorage.getItem(STORAGE_KEYS.adminAuth) === "yes";
  if (isAuthed) {
    loginBox.style.display = "none";
    dashboard.style.display = "block";
    renderDashboard();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const entered = document.querySelector("#admin-password").value;
    if (entered === STORE_CONFIG.adminPassword) {
      sessionStorage.setItem(STORAGE_KEYS.adminAuth, "yes");
      loginBox.style.display = "none";
      dashboard.style.display = "block";
      renderDashboard();
    } else {
      document.querySelector("[data-admin-login-error]").style.display = "block";
    }
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      sessionStorage.removeItem(STORAGE_KEYS.adminAuth);
      location.reload();
    });
  }
}

/* -----------------------------------------------------------------------
   TABS  (Overview / Orders / Inventory)
   -------------------------------------------------------------------- */
function setupTabs() {
  const tabButtons = document.querySelectorAll("[data-tab]");
  tabButtons.forEach(btn => {
    btn.addEventListener("click", function () {
      tabButtons.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.querySelector(`[data-tab-panel="${btn.dataset.tab}"]`).classList.add("active");
    });
  });
}

function renderDashboard() {
  renderStats();
  renderOrdersTable();
  renderInventoryTable();
}

/* -----------------------------------------------------------------------
   OVERVIEW STATS
   -------------------------------------------------------------------- */
function renderStats() {
  const el = document.querySelector("[data-admin-stats]");
  if (!el) return;

  const orders = getOrders();
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const lowStockCount = PRODUCTS.filter(p => {
    const info = getStockInfo(p);
    return info.available > 0 && info.available <= 5;
  }).length;
  const soldOutCount = PRODUCTS.filter(p => getAvailableStock(p) <= 0).length;

  const stats = [
    { label: "Total orders", value: orders.length },
    { label: "Revenue", value: formatMoney(revenue) },
    { label: "Low stock items", value: lowStockCount },
    { label: "Sold out items", value: soldOutCount }
  ];

  el.innerHTML = stats.map(s => `
    <div class="stat-card">
      <span class="stat-number">${s.value}</span>
      <span class="stat-label">${s.label}</span>
    </div>
  `).join("");
}

/* -----------------------------------------------------------------------
   ORDERS TABLE
   -------------------------------------------------------------------- */
function renderOrdersTable() {
  const tbody = document.querySelector("[data-orders-tbody]");
  if (!tbody) return;
  const orders = getOrders();

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">No orders yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(order => `
    <tr>
      <td>${order.id}</td>
      <td>${order.email}</td>
      <td>${order.items.map(i => i.name + " ×" + i.qty).join(", ")}</td>
      <td>${formatMoney(order.total)}</td>
      <td>${new Date(order.createdAt).toLocaleDateString()}</td>
      <td>
        <select data-order-status="${order.id}">
          ${ORDER_STATUS_OPTIONS.map(s =>
            `<option value="${s}" ${s === order.status ? "selected" : ""}>${s}</option>`
          ).join("")}
        </select>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-order-status]").forEach(select => {
    select.addEventListener("change", function () {
      updateOrderStatus(select.dataset.orderStatus, select.value);
      showToast("Order " + select.dataset.orderStatus + " marked as " + select.value);
      renderStats();
    });
  });
}

const ORDER_STATUS_OPTIONS = ["Processing", "Packed", "Shipped", "Delivered"];

/* -----------------------------------------------------------------------
   INVENTORY TABLE
   -------------------------------------------------------------------- */
function renderInventoryTable() {
  const tbody = document.querySelector("[data-inventory-tbody]");
  if (!tbody) return;

  tbody.innerHTML = PRODUCTS.map(product => {
    const info = getStockInfo(product);
    return `
      <tr>
        <td>${product.name}</td>
        <td>${product.type}</td>
        <td>${formatMoney(product.price)}</td>
        <td><span class="stock-badge ${info.cssClass}">${info.label}</span></td>
        <td>
          <input type="number" min="0" style="width:70px" value="${info.available}"
                 data-stock-input="${product.id}" data-original-stock="${product.stock}">
          <button class="btn btn-ghost" data-stock-save="${product.id}" style="padding:0.3rem 0.6rem;font-size:0.8rem">Save</button>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("[data-stock-save]").forEach(btn => {
    btn.addEventListener("click", function () {
      const id = Number(btn.dataset.stockSave);
      const input = tbody.querySelector(`[data-stock-input="${id}"]`);
      const original = Number(input.dataset.originalStock);
      const newAmount = Math.max(0, Number(input.value));
      setStockOverride(id, newAmount, original);
      showToast("Stock updated");
      renderInventoryTable();
      renderStats();
    });
  });
}
