import { useEffect, useState } from 'react';
import { fetchAllCategories, saveCategory, setCategoryActive } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import PageLoader from '../../components/PageLoader';

const empty = { name: '', slug: '', description: '', image_url: '', sort_order: 0, is_active: true };

function slugify(str) { return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const { showToast } = useToast();

  function load() { fetchAllCategories().then(setCategories).finally(() => setLoading(false)); }
  useEffect(load, []);

  async function handleSave(e) {
    e.preventDefault();
    try {
      await saveCategory({ ...editing, slug: slugify(editing.name) }, editing.id);
      showToast('Category saved');
      setEditing(null);
      load();
    } catch {
      showToast('Could not save category — the name may already be in use.', 'error');
    }
  }

  async function toggleActive(c) {
    await setCategoryActive(c.id, !c.is_active);
    load();
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
          <div className="form-group"><label>Description</label><textarea rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
          <div className="form-group"><label>Image URL</label><input value={editing.image_url || ''} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} /></div>
          <div className="form-group"><label>Sort Order</label><input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      )}
    </div>
  );
}
