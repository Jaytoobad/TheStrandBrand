import { useEffect, useMemo, useState } from 'react';
import { fetchInventory, updateProductStock, updateVariantStock } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import { formatMoney } from '../../config/siteConfig';
import { isSoldByLength, lengthLabel } from '../../lib/pricing';
import PageLoader from '../../components/PageLoader';
import LoadError from '../components/LoadError';

export default function AdminInventory() {
  const [data, setData] = useState({ products: [], variants: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  // Stock boxes are controlled drafts. Remounting an input with defaultValue +
  // key={stock} whenever a save refetched the list made rapid edits revert.
  const [stockDrafts, setStockDraft] = useState({});
  const { showToast } = useToast();

  function load() { setLoadError(false); fetchInventory().then(setData).catch(() => setLoadError(true)).finally(() => setLoading(false)); }
  useEffect(load, []);

  // A sold-by-length product holds no stock of its own, so its own row is not the
  // number to edit or trust: the stock is the sum of its lengths. Grouping the
  // variants once here keeps the products table honest.
  const lengthsByProduct = useMemo(() => {
    const map = new Map();
    for (const v of data.variants) {
      if (!map.has(v.product_id)) map.set(v.product_id, []);
      map.get(v.product_id).push(v);
    }
    return map;
  }, [data.variants]);

  function lengthTotals(productId) {
    const lengths = lengthsByProduct.get(productId) || [];
    return {
      count: lengths.length,
      units: lengths.reduce((sum, v) => sum + (Number(v.stock) || 0), 0),
      soldOutLengths: lengths.filter((v) => Number(v.stock) <= 0).length,
    };
  }

  // Saves on blur, and only when the number actually changed.
  async function handleProductStock(p, value) {
    const stock = Math.max(0, Math.floor(Number(value) || 0));
    if (stock === p.stock) return;
    try { await updateProductStock(p.id, stock); showToast(`Stock updated for ${p.name}`); load(); } catch { showToast('Could not update stock.', 'error'); }
  }
  async function handleVariantStock(v, value) {
    const stock = Math.max(0, Math.floor(Number(value) || 0));
    if (stock === v.stock) {
      // Nothing changed, so drop the draft rather than leaving a stale number behind.
      setStockDraft((d) => { const next = { ...d }; delete next[v.id]; return next; });
      return;
    }
    try {
      await updateVariantStock(v.id, stock);
      setStockDraft((d) => { const next = { ...d }; delete next[v.id]; return next; });
      showToast('Stock updated');
      load();
    } catch { showToast('Could not update stock.', 'error'); }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="admin-header"><h1>Inventory</h1></div>

      {loadError && <LoadError what="inventory" onRetry={load} />}

      <p className="admin-page-hint">Type a new number and click away to save.</p>
      <h3 className="admin-table-title">Products</h3>
      <div className="data-table-wrap admin-table-gap">
        <table className="data-table is-stacked">
          <thead><tr><th>Product</th><th>Stock</th><th>Status</th></tr></thead>
          <tbody>
            {data.products.map((p) => {
              const byLength = isSoldByLength(p);
              const totals = lengthTotals(p.id);
              // Without any lengths yet the merchant has not finished setting the
              // product up, which is different from being out of stock.
              const missingLengths = byLength && totals.count === 0;
              const soldOut = byLength ? totals.units <= 0 : p.stock === 0;
              const low = byLength ? totals.units > 0 && totals.units <= 5 : p.stock > 0 && p.stock <= 5;

              return (
                <tr key={p.id}>
                  <td className="cell-primary">{p.name}</td>
                  <td data-label="Stock">
                    {byLength ? (
                      <span className="stock-derived">
                        {missingLengths ? <span className="cell-muted">No lengths set</span> : `${totals.units} across ${totals.count} length${totals.count === 1 ? '' : 's'}`}
                      </span>
                    ) : (
                      <input className="stock-input" type="number" min="0" inputMode="numeric" aria-label={`Stock for ${p.name}`} defaultValue={p.stock} key={p.stock} onBlur={(e) => handleProductStock(p, e.target.value)} />
                    )}
                  </td>
                  <td data-label="Status">
                    {missingLengths ? <span className="admin-pill is-bad">Needs lengths</span>
                      : p.allow_preorder ? <span className="admin-pill is-neutral">Made to order</span>
                      : soldOut ? <span className="admin-pill is-bad">Out of stock</span>
                      : low ? <span className="admin-pill is-warn">Low stock</span>
                      : <span className="admin-pill is-good">In stock</span>}
                    {byLength && totals.soldOutLengths > 0 && !missingLengths && (
                      <span className="cell-muted stock-note">
                        {totals.soldOutLengths} length{totals.soldOutLengths === 1 ? '' : 's'} sold out
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
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
                  <td data-label="Option">{v.option_name}: {/length/i.test(v.option_name || '') ? lengthLabel(v) : v.option_value}</td>
                  <td data-label="Price">
                  {v.price != null ? formatMoney(v.price) : <span className="cell-muted">—</span>}
                </td>
                  <td data-label="Stock"><input className="stock-input" type="number" min="0" inputMode="numeric" aria-label={`Stock for ${v.products?.name} ${lengthLabel(v)}`} value={stockDrafts[v.id] ?? v.stock} onChange={(e) => setStockDraft((d) => ({ ...d, [v.id]: e.target.value }))} onBlur={(e) => handleVariantStock(v, e.target.value)} /></td>
                </tr>
            ))}
          </tbody>
        </table>
        {data.variants.length === 0 && <p className="empty-state">No product variants yet.</p>}
      </div>
    </div>
  );
}
