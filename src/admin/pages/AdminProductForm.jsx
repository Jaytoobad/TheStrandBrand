import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchProductForEdit, saveProduct, saveProductImages, saveProductVariants,
  uploadProductImage, fetchAllCategories,
} from '../../services/admin';
import { useToast } from '../../context/ToastContext';
 import { compressImage } from '../../lib/imageCompression';
import PageLoader from '../../components/PageLoader';

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function AdminProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', category_id: '', price: '', sale_price: '', stock: 0,
    is_new_arrival: false, is_featured: false, is_active: true,
  });
  const [images, setImages] = useState([]); // [{ url, is_primary, sort_order }]
  const [variants, setVariants] = useState([]); // [{ option_name, option_value, price_adjustment, stock }]
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAllCategories().then(setCategories);
    if (isEdit) {
      fetchProductForEdit(id).then((p) => {
        setForm({
          name: p.name, description: p.description || '', category_id: p.category_id || '',
          price: p.price, sale_price: p.sale_price || '', stock: p.stock,
          is_new_arrival: p.is_new_arrival, is_featured: p.is_featured, is_active: p.is_active,
        });
        setImages(p.product_images.map((im) => ({ url: im.url, is_primary: im.is_primary, sort_order: im.sort_order })));
        setVariants(p.product_variants.map((v) => ({ option_name: v.option_name, option_value: v.option_value, price_adjustment: v.price_adjustment, stock: v.stock })));
      }).finally(() => setLoading(false));
    }
  }, [id, isEdit]);

  function updateField(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleImageUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const tempId = id || 'temp-' + Date.now(); // product_images storage path can use a temp folder before first save
      const uploaded = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) { showToast(`${file.name} is not an image.`, 'error'); continue; }
        if (file.size > 15 * 1024 * 1024) { showToast(`${file.name} is larger than 15MB.`, 'error'); continue; }
        const compressed = await compressImage(file); const url = await uploadProductImage(compressed, tempId);
        uploaded.push(url);
      }
      setImages((prev) => [
        ...prev,
        ...uploaded.map((url, i) => ({ url, is_primary: prev.length === 0 && i === 0, sort_order: prev.length + i })),
      ]);
    } catch {
      showToast('Image upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function addVariantRow() {
    setVariants((prev) => [...prev, { option_name: '', option_value: '', price_adjustment: 0, stock: 0 }]);
  }
  function updateVariant(idx, field, value) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  }
  function removeVariant(idx) {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.price) { showToast('Name and price are required.', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: slugify(form.name),
        description: form.description,
        category_id: form.category_id || null,
        price: Number(form.price),
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        stock: Number(form.stock),
        is_new_arrival: form.is_new_arrival,
        is_featured: form.is_featured,
        is_active: form.is_active,
      };
      const saved = await saveProduct(payload, id);
      const productId = id || saved.id;
      await saveProductImages(productId, images);
      await saveProductVariants(productId, variants.filter((v) => v.option_name && v.option_value));
      showToast(isEdit ? 'Product updated' : 'Product created');
      navigate('/admin/products');
    } catch (err) {
      showToast(err.message || 'Could not save product.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="admin-header"><h1>{isEdit ? 'Edit Product' : 'Add Product'}</h1></div>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-form-section">
          <h3>Basic Information</h3>
          <div className="form-group"><label>Product Name</label><input required value={form.name} onChange={(e) => updateField('name', e.target.value)} /></div>
          <div className="form-group"><label>Description</label><textarea rows={4} value={form.description} onChange={(e) => updateField('description', e.target.value)} /></div>
          <div className="form-group">
            <label>Category</label>
            <select value={form.category_id} onChange={(e) => updateField('category_id', e.target.value)}>
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="admin-form-section">
          <h3>Pricing &amp; Stock</h3>
          <div className="form-row">
            <div className="form-group"><label>Price (GH₵)</label><input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => updateField('price', e.target.value)} /></div>
            <div className="form-group"><label>Sale Price (optional)</label><input type="number" min="0" step="0.01" value={form.sale_price} onChange={(e) => updateField('sale_price', e.target.value)} /></div>
          </div>
          <div className="form-group"><label>Base Stock</label><input type="number" min="0" value={form.stock} onChange={(e) => updateField('stock', e.target.value)} /></div>
          <label className="checkbox-row"><input type="checkbox" checked={form.is_new_arrival} onChange={(e) => updateField('is_new_arrival', e.target.checked)} /> New Arrival</label>
          <label className="checkbox-row"><input type="checkbox" checked={form.is_featured} onChange={(e) => updateField('is_featured', e.target.checked)} /> Featured / Best Seller</label>
          <label className="checkbox-row"><input type="checkbox" checked={form.is_active} onChange={(e) => updateField('is_active', e.target.checked)} /> Active (visible on storefront)</label>
        </div>

        <div className="admin-form-section">
          <h3>Product Images</h3>
          <div className="image-list">
            {images.map((img, i) => (
              <div key={i} className="image-list-item">
                <img src={img.url} alt="" />
                <button type="button" onClick={() => removeImage(i)}>×</button>
              </div>
            ))}
          </div>
          <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} />
          {uploading && <p style={{ fontSize: '0.8rem', marginTop: 6 }}>Uploading…</p>}
        </div>

        <div className="admin-form-section">
          <h3>Variants (Length, Color, etc.)</h3>
          {variants.map((v, i) => (
            <div key={i} className="variant-row">
              <input placeholder="Option name (e.g. Length)" value={v.option_name} onChange={(e) => updateVariant(i, 'option_name', e.target.value)} />
              <input placeholder="Value (e.g. 20&quot;)" value={v.option_value} onChange={(e) => updateVariant(i, 'option_value', e.target.value)} />
              <input placeholder="Price +/-" type="number" step="0.01" value={v.price_adjustment} onChange={(e) => updateVariant(i, 'price_adjustment', e.target.value)} />
              <input placeholder="Stock" type="number" value={v.stock} onChange={(e) => updateVariant(i, 'stock', e.target.value)} />
              <button type="button" className="btn btn-sm btn-outline" onClick={() => removeVariant(i)}>Remove</button>
            </div>
          ))}
          <button type="button" className="btn btn-sm btn-outline" onClick={addVariantRow}>+ Add Variant Option</button>
        </div>

        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Product'}</button>
      </form>
    </div>
  );
}
