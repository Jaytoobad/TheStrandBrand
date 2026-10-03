import { useEffect, useState } from 'react';
import { fetchInventory, updateProductStock, updateVariantStock } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import { formatMoney } from '../../config/siteConfig';
import PageLoader from '../../components/PageLoader';

export default function AdminInventory() {
  const [data, setData] = useState({ products: [], variants: [] });
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  function load() { fetchInventory().then(setData).finally(() => setLoading(false)); }
  useEffect(load, []);

  // Saves on blur, and only when the number actually changed.
  async function handleProductStock(p, value) {
    const stock = Math.max(0, Math.floor(Number(value) || 0));
    if (stock === p.stock) return;
    try { await updateProductStock(p.id, stock); showToast(`Stock updated for ${p.name}`); load(); } catch { showToast('Could not update stock.', 'error'); }
  }
  async function handleVariantStock(v, value) {
    const stock = Math.max(0, Math.floor(Number(value) || 0));
    if (stock === v.stock) return;
    try { await updateVariantStock(v.id, stock); showToast('Stock updated'); load(); } catch { showToast('Could not update stock.', 'error'); }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="admin-header"><h1>Inventory</h1></div>

      <p className="admin-page-hint">Type a new number and click away to save.</p>
      <h3 className="admin-table-title">Products</h3>
      <div className="data-table-wrap admin-table-gap">
        <table className="data-table is-stacked">
          <thead><tr><th>Product</th><th>Stock</th><th>Status</th></tr></thead>
          <tbody>
            {data.products.map((p) => (
              <tr key={p.id}>
                <td className="cell-primary">{p.name}</td>
                <td data-label="Stock"><input className="stock-input" type="number" min="0" inputMode="numeric" aria-label={`Stock for ${p.name}`} defaultValue={p.stock} key={p.stock} onBlur={(e) => handleProductStock(p, e.target.value)} /></td>
                <td data-label="Status">{p.allow_preorder ? <span className="admin-pill is-neutral">Made to order</span> : p.stock === 0 ? <span className="admin-pill is-bad">Out of stock</span> : p.stock <= 5 ? <span className="admin-pill is-warn">Low stock</span> : <span className="admin-pill is-good">In stock</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="admin-table-title">Variants</h3>
      <div className="data-table-wrap">
        <table className="data-table is-stacked">
          <thead><tr><th>Product</th><th>Option</th><th>Price</th><th>Stock</th></tr></thead>
          <tbody>
            {data.variants.map((v) => (
              <tr key={v.id}>
                <td className="cell-primary">{v.products?.name}</td>
                <td data-label="Option">{v.option_name}: {v.option_value}</td>
                <td data-label="Price">
                  {v.price != null ? formatMoney(v.price) : <span className="cell-muted">—</span>}
                </td>
                <td data-label="Stock"><input className="stock-input" type="number" min="0" inputMode="numeric" aria-label={`Stock for ${v.products?.name} ${v.option_value}`} defaultValue={v.stock} key={v.stock} onBlur={(e) => handleVariantStock(v, e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.variants.length === 0 && <p className="empty-state">No product variants yet.</p>}
      </div>
    </div>
  );
}
