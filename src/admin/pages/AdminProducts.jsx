import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAllProducts, setProductActive } from '../../services/admin';
import { formatMoney, formatCategoryName } from '../../config/siteConfig';
import { displayPrice, isSoldByLength, pricedVariants, totalStock } from '../../lib/pricing';
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
        <table className="data-table is-stacked">
          <thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="cell-media"><img src={p.product_images?.find((im) => im.is_primary)?.url || p.product_images?.[0]?.url || '/assets/placeholder-product.jpg'} alt="" width={40} height={40} className="admin-thumb" loading="lazy" /></td>
                <td className="cell-primary">{p.name}</td>
                <td data-label="Category">{formatCategoryName(p.categories?.name) || 'Uncategorized'}</td>
                <td data-label="Price">
                  {isSoldByLength(p) ? (
                    pricedVariants(p).length
                      ? <span>From {formatMoney(displayPrice(p))} <span className="cell-muted">· {pricedVariants(p).length} lengths</span></span>
                      : <span className="text-error">No lengths set</span>
                  ) : formatMoney(p.sale_price ?? p.price)}
                </td>
                <td data-label="Stock">
                  {isSoldByLength(p) ? (
                    pricedVariants(p).length ? totalStock(p) : <span className="text-error">—</span>
                  ) : p.allow_preorder ? 'Made to order' : p.stock <= 5 ? <span className="text-error">{p.stock}</span> : p.stock}
                </td>
                <td data-label="Status"><span className={`admin-pill ${p.is_active ? 'is-good' : 'is-neutral'}`}>{p.is_active ? 'Active' : 'Hidden'}</span></td>
                <td className="table-actions">
                  <Link to={`/admin/products/${p.id}/edit`} className="btn btn-sm btn-outline">Edit</Link>
                  <button className="btn btn-sm btn-outline" onClick={() => toggleActive(p)}>{p.is_active ? 'Deactivate' : 'Activate'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {products.length === 0 && <p className="empty-state">No products yet. Add your first product.</p>}
    </div>
  );
}
