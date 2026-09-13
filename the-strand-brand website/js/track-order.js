/* =======================================================================
   TRACK-ORDER.JS  —  ORDER TRACKING PAGE LOGIC
   -----------------------------------------------------------------------
   A customer types their tracking ID + the email they ordered with, and
   we show the order status as a little timeline.
   ======================================================================= */

const ORDER_STEPS = ["Processing", "Packed", "Shipped", "Delivered"];

document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("[data-track-form]");
  if (!form) return; // not on the tracking page

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const id = document.querySelector("#track-id").value;
    const email = document.querySelector("#track-email").value;
    const order = findOrder(id, email);
    const result = document.querySelector("[data-track-result]");

    if (!order) {
      result.innerHTML = `
        <div class="empty-state">
          <h3>We couldn't find that order</h3>
          <p>Double check your tracking ID and the email used at checkout.</p>
        </div>
      `;
      return;
    }

    result.innerHTML = renderOrderStatus(order);
  });
});

function renderOrderStatus(order) {
  const currentIndex = ORDER_STEPS.indexOf(order.status);

  const timelineHtml = ORDER_STEPS.map((step, i) => {
    let stateClass = "";
    if (i < currentIndex) stateClass = "done";
    if (i === currentIndex) stateClass = "current";
    const historyEntry = order.history.find(h => h.status === step);
    const dateLabel = historyEntry ? new Date(historyEntry.at).toLocaleString() : "";
    return `
      <li class="${stateClass}">
        <div class="step-label">${step}</div>
        ${dateLabel ? `<div class="step-date">${dateLabel}</div>` : ""}
      </li>
    `;
  }).join("");

  const itemsHtml = order.items.map(item => `
    <div class="summary-row">
      <span>${item.name} × ${item.qty}</span>
      <span>${formatMoney(item.price * item.qty)}</span>
    </div>
  `).join("");

  return `
    <div class="summary-box" style="margin-top:var(--space-md)">
      <h3>Order ${order.id}</h3>
      <p style="color:var(--muted)">Placed ${new Date(order.createdAt).toLocaleDateString()}</p>
      <ul class="timeline">${timelineHtml}</ul>
      <div style="margin-top:var(--space-md)">
        ${itemsHtml}
        <div class="summary-row total">
          <span>Total</span>
          <span>${formatMoney(order.total)}</span>
        </div>
      </div>
    </div>
  `;
}
