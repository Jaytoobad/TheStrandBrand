import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllProducts, setProductActive } from '../../services/admin';
import { formatMoney } from '../../config/siteConfig';
import { useToast } from '../../context/ToastContext';
import PageLoader from '../../components/PageLoader';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  function load() {
    fetchAllProducts().then(setProducts).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function toggleActive(p) {
    try {
      await setProductActive(p.id, !p.is_active);
      load();
    } catch {
      showToast('Could not update product.', 'error');
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="admin-header">
        <h1>Products</h1>
        <Link to="/admin/products/new" className="btn btn-primary btn-sm">+ Add Product</Link>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td><img src={p.product_images?.[0]?.url || '/assets/placeholder-product.jpg'} alt="" width={40} height={40} style={{ objectFit: 'cover', borderRadius: 6 }} /></td>
                <td>{p.name}</td>
                <td>{p.categories?.name || '—'}</td>
                <td>{formatMoney(p.sale_price ?? p.price)}</td>
                <td>{p.stock <= 5 ? <span style={{ color: 'var(--color-error)' }}>{p.stock}</span> : p.stock}</td>
                <td>{p.is_active ? 'Active' : 'Inactive'}</td>
                <td className="table-actions">
                  <Link to={`/admin/products/${p.id}/edit`} className="btn btn-sm btn-outline">Edit</Link>
                  <button className="btn btn-sm btn-outline" onClick={() => toggleActive(p)}>{p.is_active ? 'Deactivate' : 'Activate'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {products.length === 0 && <p className="empty-state">No products yet — add your first one.</p>}
    </div>
  );
}
