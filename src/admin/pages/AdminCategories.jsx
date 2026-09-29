import { useEffect, useState } from 'react';
import { fetchAllCategories, saveCategory, setCategoryActive, uploadCategoryImage } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import { compressImage } from '../../lib/imageCompression';
import PageLoader from '../../components/PageLoader';

const empty = { name: '', slug: '', description: '', image_url: '', sort_order: 0, is_active: true };

function slugify(str) { return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

// Pasting a page link (instead of the image itself) is the usual reason an
// image URL "doesn't work". Explain how to grab the real image address.
function imageUrlHint(url) {
  if (/pinterest\.|pin\.it/i.test(url) && !/pinimg\.com/i.test(url)) {
    return 'That is a Pinterest page link, not the image. Open the pin, right-click the photo → "Copy image address" (it starts with https://i.pinimg.com/).';
  }
  if (/amazon\.|amzn\./i.test(url) && !/media-amazon\.com|images-amazon\.com/i.test(url)) {
    return 'That is an Amazon product page link, not the image. Right-click the product photo → "Copy image address" (it starts with https://m.media-amazon.com/).';
  }
  return 'This link does not load as an image. Right-click the picture → "Copy image address", or upload the image instead.';
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [brokenUrl, setBrokenUrl] = useState(null);
  const { showToast } = useToast();

  function load() { fetchAllCategories().then(setCategories).finally(() => setLoading(false)); }
  useEffect(load, []);

  const imageUrl = editing?.image_url?.trim() || '';
  const imageBroken = Boolean(imageUrl) && brokenUrl === imageUrl;

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast(`${file.name} is not an image.`, 'error'); return; }
    if (file.size > 15 * 1024 * 1024) { showToast(`${file.name} is larger than 15MB.`, 'error'); return; }
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const url = await uploadCategoryImage(compressed);
      // The form may have been cancelled while uploading — don't reopen it.
      setEditing((prev) => (prev ? { ...prev, image_url: url } : prev));
    } catch {
      showToast('Image upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (imageBroken) { showToast('The image link does not load. Fix it, upload an image, or clear the field.', 'error'); return; }
    try {
      await saveCategory({ ...editing, image_url: imageUrl || null, slug: slugify(editing.name) }, editing.id);
      showToast('Category saved');
      setEditing(null);
      load();
    } catch {
      showToast('Could not save category. The name may already be in use.', 'error');
    }
  }

  async function toggleActive(c) {
    try {
      await setCategoryActive(c.id, !c.is_active);
      load();
    } catch {
      showToast('Could not update category.', 'error');
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div>
      <div className="admin-header">
        <h1>Categories</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...empty })}>+ Add Category</button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.description}</td>
                <td>{c.is_active ? 'Active' : 'Inactive'}</td>
                <td className="table-actions">
                  <button className="btn btn-sm btn-outline" onClick={() => setEditing(c)}>Edit</button>
                  <button className="btn btn-sm btn-outline" onClick={() => toggleActive(c)}>{c.is_active ? 'Deactivate' : 'Activate'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <form className="admin-form" onSubmit={handleSave} style={{ marginTop: 24 }}>
          <h3>{editing.id ? 'Edit Category' : 'New Category'}</h3>
          <div className="form-group"><label>Name</label><input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
          <div className="form-group"><label>Description</label><textarea rows={2} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>

          <div className="form-group">
            <label htmlFor="category-image-url">Image</label>
            <input
              id="category-image-url"
              type="url"
              placeholder="Paste a direct image address, or upload below"
              value={editing.image_url || ''}
              onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
              aria-invalid={imageBroken}
              aria-describedby="category-image-help"
            />
            <div className="category-image-upload">
              <label className="btn btn-sm btn-outline">
                {uploading ? 'Uploading…' : 'Upload image'}
                <input type="file" accept="image/*" className="visually-hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
              {imageUrl && (
                <button type="button" className="btn btn-sm btn-outline" onClick={() => setEditing({ ...editing, image_url: '' })}>Clear</button>
              )}
            </div>
            {imageUrl && (
              <div className={`category-image-preview${imageBroken ? ' is-broken' : ''}`}>
                {!imageBroken && (
                  <img
                    src={imageUrl}
                    alt="Category preview"
                    referrerPolicy="no-referrer"
                    onError={() => setBrokenUrl(imageUrl)}
                  />
                )}
              </div>
            )}
            <p id="category-image-help" className={imageBroken ? 'form-error' : 'form-hint'}>
              {imageBroken ? imageUrlHint(imageUrl) : 'Tip: right-click any online image → "Copy image address". Uploading is the most reliable option.'}
            </p>
          </div>

          <div className="form-group"><label>Sort Order</label><input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>Save</button>
          </div>
        </form>
      )}
    </div>
  );
}
