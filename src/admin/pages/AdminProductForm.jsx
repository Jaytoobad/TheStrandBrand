import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  fetchProductForEdit, saveProduct, saveProductImages, saveProductVariants,
  uploadProductImage, fetchAllCategories,
} from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import { formatMoney } from '../../config/siteConfig';
import { compressImage } from '../../lib/imageCompression';
import PageLoader from '../../components/PageLoader';

function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// A length is stored as plain digits so it can be ordered numerically, and
// displayed with an inch mark. Accepts 10, 10", 10in and 10.5.
function parseInches(raw) {
  const cleaned = String(raw).toLowerCase().replace(/[^0-9.]/g, '');
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) && value > 0 ? String(value) : null;
}

function formatInches(raw) {
  const parsed = parseInches(raw);
  return parsed ? `${parsed}"` : '';
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
    allow_preorder: true, is_new_arrival: false, is_featured: false, is_active: true,
  });
  const [images, setImages] = useState([]); // [{ url, is_primary, sort_order }]
  const [variants, setVariants] = useState([]); // [{ option_name, option_value, price, price_adjustment, stock }]
  const [uploading, setUploading] = useState(false);

  // Categories flagged sold_by_inches get per-length pricing and stock instead of
  // a single price. The flag lives on the category so it cannot be lost by a rename.
  const soldByInches = Boolean(categories.find((c) => c.id === form.category_id)?.sold_by_inches);

  // Keep rows sorted shortest to longest so the order the merchant sees matches
  // the order customers see.
  function sortedInchRows(rows) {
    return [...rows].sort((a, b) => {
      const aLen = Number(a.inches);
      const bLen = Number(b.inches);
      if (Number.isFinite(aLen) && Number.isFinite(bLen) && aLen !== bLen) return aLen - bLen;
      return 0;
    });
  }

  const inchRows = soldByInches ? sortedInchRows(variants) : [];

  // One place that decides whether the length table is valid, so the sidebar
  // summary and the save button can never disagree with what submit will do.
  // Each problem carries the index of the offending row so the form can point at it.
  const lengthCheck = useMemo(() => {
    const rows = soldByInches ? sortedInchRows(variants) : [];
    const problems = [];
    const seen = new Map();

    rows.forEach((row) => {
      const index = variants.indexOf(row);
      const parsed = parseInches(row.inches);
      if (!parsed) {
        problems.push({ index, message: 'needs a number of inches, for example 14 or 14"' });
      } else if (seen.has(parsed)) {
        problems.push({ index, message: `duplicates the ${parsed}" length` });
      } else {
        seen.set(parsed, index);
      }

      if (!(Number(row.price) > 0)) {
        problems.push({ index, message: `${parsed ? `${parsed}"` : 'this length'} needs a price` });
      }
      if (Number(row.stock) < 0) {
        problems.push({ index, message: `${parsed ? `${parsed}"` : 'this length'} cannot have negative stock` });
      }
    });

    if (soldByInches && !rows.length) {
      problems.push({ index: -1, message: 'add at least one length with a price and stock' });
    }

    const prices = rows.map((r) => Number(r.price)).filter((n) => Number.isFinite(n) && n > 0);
    return {
      rows,
      problems,
      ok: problems.length === 0,
      count: rows.length,
      min: prices.length ? Math.min(...prices) : null,
      max: prices.length ? Math.max(...prices) : null,
      units: rows.reduce((sum, r) => sum + (Number(r.stock) || 0), 0),
    };
  }, [soldByInches, variants]);

  // The rows that are wrong, so the table and the summary can flag the same ones.
  const problemIndexes = useMemo(
    () => new Set(lengthCheck.problems.map((p) => p.index)),
    [lengthCheck.problems],
  );

  useEffect(() => {
    fetchAllCategories().then(setCategories);
    if (isEdit) {
      fetchProductForEdit(id).then((p) => {
        setForm({
          name: p.name, description: p.description || '', category_id: p.category_id || '',
          price: p.price, sale_price: p.sale_price || '', stock: p.stock,
          allow_preorder: p.allow_preorder ?? true,
          is_new_arrival: p.is_new_arrival, is_featured: p.is_featured, is_active: p.is_active,
        });
        setImages(p.product_images.map((im) => ({ url: im.url, is_primary: im.is_primary, sort_order: im.sort_order })));
        setVariants(
          p.product_variants.map((v) => ({
            id: v.id,
            inches: v.option_name === 'Length' ? formatInches(v.option_value) : v.option_value,
            option_name: v.option_name,
            option_value: v.option_value,
            price: v.price == null ? '' : Number(v.price),
            price_adjustment: v.price_adjustment,
            stock: v.stock,
          })),
        );
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
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // The storefront falls back to the first image, so never leave none marked
      // primary while images remain.
      if (next.length && !next.some((im) => im.is_primary)) next[0] = { ...next[0], is_primary: true };
      return next;
    });
  }

  function makePrimary(idx) {
    setImages((prev) => prev.map((im, i) => ({ ...im, is_primary: i === idx })));
  }

  function moveImage(idx, dir) {
    setImages((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function addVariantRow() {
    setVariants((prev) => [...prev, { inches: '', option_name: '', option_value: '', price: '', price_adjustment: 0, stock: 0 }]);
  }
  function addInchRow() {
    setVariants((prev) => [...prev, { inches: '', option_name: 'Length', option_value: '', price: '', price_adjustment: 0, stock: 0 }]);
  }
  function updateInch(idx, field, value) {
    setVariants((prev) =>
      prev.map((v, i) => {
        if (i !== idx) return v;
        if (field === 'inches') {
          const parsed = parseInches(value);
          return { ...v, inches: value, option_value: parsed || '' };
        }
        return { ...v, [field]: value };
      }),
    );
  }
  function updateVariant(idx, field, value) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  }
  function removeVariant(idx) {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name) { showToast('Name is required.', 'error'); return; }

    let lengths = [];
    // products.price is NOT NULL and is what price sorting and any "from"
    // display fall back to, so for a sold-by-length product it tracks the
    // cheapest length. Computed rather than assigned into form state.
    let productPrice = Number(form.price);

    if (soldByInches) {
      if (!lengthCheck.ok) {
        showToast(`Lengths: ${lengthCheck.problems[0].message}.`, 'error');
        return;
      }
      lengths = lengthCheck.rows;
      productPrice = lengthCheck.min;
    }

    if (!(productPrice > 0)) { showToast('Price is required.', 'error'); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        slug: slugify(form.name),
        description: form.description,
        category_id: form.category_id || null,
        price: productPrice,
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        // Real stock lives on each length, so the product row carries none.
        // Preorder stays available so a length can be made to order.
        stock: soldByInches ? 0 : Number(form.stock),
        allow_preorder: form.allow_preorder,
        is_new_arrival: form.is_new_arrival,
        is_featured: form.is_featured,
        is_active: form.is_active,
      };
      const saved = await saveProduct(payload, id);
      const productId = id || saved.id;
      await saveProductImages(productId, images);

      const rows = soldByInches
        ? lengths.map((row) => ({
            id: row.id,
            option_name: 'Length',
            option_value: parseInches(row.inches),
            price: Number(row.price),
            stock: Number(row.stock || 0),
            price_adjustment: 0,
          }))
        : variants.filter((v) => v.option_name && v.option_value);

      await saveProductVariants(productId, rows);
      showToast(isEdit ? 'Product updated' : 'Product created');
      navigate('/admin/products');
    } catch (err) {
      showToast(err.message || 'Could not save product.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;

  const categoryName = categories.find((c) => c.id === form.category_id)?.name;
  const summaryPrice = soldByInches
    ? (lengthCheck.min != null && lengthCheck.max != null
      ? (lengthCheck.min === lengthCheck.max ? formatMoney(lengthCheck.min) : `${formatMoney(lengthCheck.min)} – ${formatMoney(lengthCheck.max)}`)
      : '—')
    : (form.price ? formatMoney(Number(form.price)) : '—');

  return (
    <div>
      <div className="admin-header">
        <h1>{isEdit ? 'Edit Product' : 'Add Product'}</h1>
        {isEdit && <p className="admin-header-sub">Changes are not live until you save.</p>}
      </div>

      <form className="admin-form-layout" onSubmit={handleSubmit}>
        <div className="admin-form-main">
          <section className="admin-form-section">
            <h3>Basics</h3>
            <div className="form-group">
              <label>Product Name</label>
              <input required value={form.name} onChange={(e) => updateField('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Category</label>
              <select value={form.category_id} onChange={(e) => updateField('category_id', e.target.value)}>
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {soldByInches && (
                <p className="form-hint form-hint-strong">
                  {categoryName} is sold by length, so pricing and stock are set per length below.
                </p>
              )}
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={5} value={form.description} onChange={(e) => updateField('description', e.target.value)} />
            </div>
          </section>

          <section className="admin-form-section">
            <h3>Images</h3>
            <p className="form-hint form-hint-lead">The first image is the one shown in listings. Drag order is set with the arrows.</p>
            <div className="image-list">
              {images.map((img, i) => (
                <div key={i} className={img.is_primary ? 'image-list-item is-primary' : 'image-list-item'}>
                  <img src={img.url} alt="" />
                  {img.is_primary && <span className="image-list-badge">Main</span>}
                  <button type="button" onClick={() => removeImage(i)} aria-label={`Remove image ${i + 1}`}>&times;</button>
                  <div className="image-list-tools">
                    <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label={`Move image ${i + 1} earlier`}>&larr;</button>
                    <button type="button" onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} aria-label={`Move image ${i + 1} later`}>&rarr;</button>
                    {!img.is_primary && <button type="button" onClick={() => makePrimary(i)}>Main</button>}
                  </div>
                </div>
              ))}
            </div>
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} />
            {uploading && <p className="form-hint">Uploading…</p>}
            {images.length === 0 && <p className="form-hint">No images yet. A product needs at least one to look right in listings.</p>}
          </section>

          <section className="admin-form-section">
            <h3>{soldByInches ? 'Lengths, pricing & stock' : 'Pricing & stock'}</h3>

            {soldByInches ? (
              <>
                <p className="form-hint form-hint-lead">
                  Every length you sell, shortest first. Customers choose one on the product page and are
                  charged that length&rsquo;s price. The product&rsquo;s own price follows your cheapest
                  length automatically.
                </p>
                <div className="data-table-wrap">
                  <table className="data-table is-stacked length-table">
                    <thead>
                      <tr><th>Length (inches)</th><th>Price (GH₵)</th><th>Stock</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {inchRows.map((row) => {
                        const originalIndex = variants.indexOf(row);
                        const bad = problemIndexes.has(originalIndex);
                        return (
                          <tr key={row.id || `${row.inches}-${originalIndex}`} className={bad ? 'row-problem' : undefined}>
                            <td data-label="Length (inches)">
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder='e.g. 18 or 18"'
                                value={row.inches ?? ''}
                                onChange={(e) => updateInch(originalIndex, 'inches', e.target.value)}
                                aria-label="Length in inches"
                                aria-invalid={bad || undefined}
                              />
                            </td>
                            <td data-label="Price (GH₵)">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={row.price ?? ''}
                                onChange={(e) => updateInch(originalIndex, 'price', e.target.value)}
                                aria-label={`Price for ${row.inches || 'this length'}`}
                                aria-invalid={bad || undefined}
                              />
                            </td>
                            <td data-label="Stock">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={row.stock ?? 0}
                                onChange={(e) => updateInch(originalIndex, 'stock', e.target.value)}
                                aria-label={`Stock for ${row.inches || 'this length'}`}
                                aria-invalid={bad || undefined}
                              />
                            </td>
                            <td className="table-actions">
                              <button type="button" className="btn btn-sm btn-outline" onClick={() => removeVariant(originalIndex)}>Remove</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {lengthCheck.count > 0 && (
                      <tfoot>
                        <tr>
                          <td data-label="Totals">{lengthCheck.count} length{lengthCheck.count === 1 ? '' : 's'}</td>
                          <td data-label="Price span">{summaryPrice}</td>
                          <td data-label="Total stock">{lengthCheck.units}</td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                <button type="button" className="btn btn-sm btn-outline" onClick={addInchRow}>+ Add length</button>
              </>
            ) : (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Price (GH₵)</label>
                    <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => updateField('price', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Sale Price (optional)</label>
                    <input type="number" min="0" step="0.01" value={form.sale_price} onChange={(e) => updateField('sale_price', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Base Stock</label>
                  <input type="number" min="0" value={form.stock} onChange={(e) => updateField('stock', e.target.value)} />
                </div>
              </>
            )}
          </section>

          {!soldByInches && (
            <section className="admin-form-section">
              <h3>Variants (Length, Color, etc.)</h3>
              <p className="form-hint form-hint-lead">Options add or subtract from the base price above.</p>
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
            </section>
          )}
        </div>

        <aside className="admin-form-side">
          <div className="admin-side-card">
            <h3>Summary</h3>
            <dl className="summary-list">
              <div className="summary-row">
                <dt>Category</dt>
                <dd>{categoryName || 'Uncategorised'}</dd>
              </div>
              <div className="summary-row">
                <dt>{soldByInches ? 'Price span' : 'Price'}</dt>
                <dd>{summaryPrice}</dd>
              </div>
              <div className="summary-row">
                <dt>{soldByInches ? 'Lengths' : 'Stock'}</dt>
                <dd>{soldByInches ? lengthCheck.count : (form.stock ?? 0)}</dd>
              </div>
              {soldByInches && (
                <div className="summary-row">
                  <dt>Total units</dt>
                  <dd>{lengthCheck.units}</dd>
                </div>
              )}
            </dl>
            {soldByInches && !lengthCheck.ok && (
              <ul className="summary-problems">
                {lengthCheck.problems.map((p, i) => (
                  <li key={`${p.index}-${i}`}>{p.message}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="admin-side-card">
            <h3>Visibility</h3>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.is_active} onChange={(e) => updateField('is_active', e.target.checked)} />
              Active (visible on storefront)
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.is_featured} onChange={(e) => updateField('is_featured', e.target.checked)} />
              Featured / Best Seller
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.is_new_arrival} onChange={(e) => updateField('is_new_arrival', e.target.checked)} />
              New Arrival
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.allow_preorder} onChange={(e) => updateField('allow_preorder', e.target.checked)} />
              Allow made-to-order
            </label>
            <p className="form-hint">
              Made-to-order lets customers buy a length that is out of stock or at zero stock.
            </p>
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="btn btn-primary btn-block" disabled={saving || (soldByInches && !lengthCheck.ok)}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
            </button>
            <Link to="/admin/products" className="btn btn-outline btn-block">Cancel</Link>
          </div>
        </aside>
      </form>
    </div>
  );
}
