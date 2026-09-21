import { useEffect, useState } from 'react';
import { fetchInventory, updateProductStock, updateVariantStock } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import PageLoader from '../../components/PageLoader';

export default function AdminInventory() {
  const [data, setData] = useState({ products: [], variants: [] });
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  function load() { fetchInventory().then(setData).finally(() => setLoading(false)); }
  useEffect(load, []);

  async function handleProductStock(id, value) {
    const stock = Math.max(0, Number(value));
    try { await updateProductStock(id, stock); load(); } catch { showToast('Could not update stock.', 'error'); }
  }
  async function handleVariantStock(id, value) {
    const stock = Math.max(0, Number(value));
    try { await updateVariantStock(id, stock); load(); } catch { showToast('Could not update stock.', 'error'); }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="admin-header"><h1>Inventory</h1></div>

      <h3 style={{ marginBottom: 12 }}>Products</h3>
      <div className="data-table-wrap" style={{ marginBottom: 32 }}>
        <table className="data-table">
          <thead><tr><th>Product</th><th>Stock</th><th>Status</th></tr></thead>
          <tbody>
            {data.products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td><input type="number" min="0" defaultValue={p.stock} onBlur={(e) => handleProductStock(p.id, e.target.value)} style={{ width: 80 }} /></td>
                <td>{p.stock === 0 ? <span style={{ color: 'var(--color-error)' }}>Out of stock</span> : p.stock <= 5 ? <span style={{ color: '#b98d4f' }}>Low stock</span> : 'In stock'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginBottom: 12 }}>Variants</h3>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Product</th><th>Option</th><th>Stock</th></tr></thead>
          <tbody>
            {data.variants.map((v) => (
              <tr key={v.id}>
                <td>{v.products?.name}</td>
                <td>{v.option_name}: {v.option_value}</td>
                <td><input type="number" min="0" defaultValue={v.stock} onBlur={(e) => handleVariantStock(v.id, e.target.value)} style={{ width: 80 }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
