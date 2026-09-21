import { supabase } from '../lib/supabaseClient';

// Every call in this file relies on Supabase RLS's is_admin() check to
// actually enforce access — see supabase/migrations/0001_init.sql. If a
// non-admin somehow reaches these screens, the database rejects the writes.

async function logActivity(action, details = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from('admin_activity').insert({ admin_id: user?.id, action, details });
}

// --- Dashboard ---
export async function fetchDashboardStats() {
  const [{ count: totalOrders }, { count: pendingOrders }, { count: deliveredOrders }, { count: totalCustomers }, { count: totalProducts }, paidOrders] =
    await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['pending_payment', 'paid', 'processing']),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total, created_at').eq('payment_status', 'paid'),
    ]);

  const totalSales = paidOrders.data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = paidOrders.data?.filter((o) => o.created_at.startsWith(today)).reduce((sum, o) => sum + Number(o.total), 0) || 0;

  const { data: lowStock } = await supabase.from('products').select('*', { count: 'exact', head: true }).lte('stock', 5).gt('stock', 0);

  return { totalSales, todaySales, totalOrders, pendingOrders, deliveredOrders, totalCustomers, totalProducts, lowStockCount: lowStock?.length ?? 0 };
}

export async function fetchRecentOrders(limit = 8) {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}

export async function fetchSalesOverTime(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('orders')
    .select('total, created_at')
    .eq('payment_status', 'paid')
    .gte('created_at', since.toISOString());
  if (error) throw error;
  return data;
}

// --- Products ---
export async function fetchAllProducts() {
  const { data, error } = await supabase.from('products').select('*, categories(name), product_images(url, is_primary)').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchProductForEdit(id) {
  const { data, error } = await supabase.from('products').select('*, product_images(*), product_variants(*)').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function saveProduct(product, id) {
  if (id) {
    const { data, error } = await supabase.from('products').update(product).eq('id', id).select().single();
    if (error) throw error;
    await logActivity('update_product', { id, name: product.name });
    return data;
  }
  const { data, error } = await supabase.from('products').insert(product).select().single();
  if (error) throw error;
  await logActivity('create_product', { id: data.id, name: product.name });
  return data;
}

export async function setProductActive(id, isActive) {
  const { error } = await supabase.from('products').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
  await logActivity(isActive ? 'reactivate_product' : 'deactivate_product', { id });
}

export async function saveProductImages(productId, images) {
  // images: [{ url, sort_order, is_primary }]
  await supabase.from('product_images').delete().eq('product_id', productId);
  if (images.length) {
    const { error } = await supabase.from('product_images').insert(images.map((img) => ({ ...img, product_id: productId })));
    if (error) throw error;
  }
}

export async function saveProductVariants(productId, variants) {
  await supabase.from('product_variants').delete().eq('product_id', productId);
  if (variants.length) {
    const { error } = await supabase.from('product_variants').insert(variants.map((v) => ({ ...v, product_id: productId })));
    if (error) throw error;
  }
}

export async function uploadProductImage(file, productId) {
  const ext = file.name.split('.').pop();
  const path = `${productId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

// --- Categories ---
export async function fetchAllCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order');
  if (error) throw error;
  return data;
}

export async function saveCategory(category, id) {
  if (id) {
    const { error } = await supabase.from('categories').update(category).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('categories').insert(category);
    if (error) throw error;
  }
}

export async function setCategoryActive(id, isActive) {
  const { error } = await supabase.from('categories').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

// --- Orders ---
export async function fetchAllOrders({ status, paymentStatus, search } = {}) {
  let query = supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  if (paymentStatus) query = query.eq('payment_status', paymentStatus);
  if (search) query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchAdminOrderById(id) {
  const { data, error } = await supabase.from('orders').select('*, order_items(*), order_status_history(*)').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function updateOrderStatus(orderId, status, note) {
  const { error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
  if (error) throw error;
  await supabase.from('order_status_history').insert({ order_id: orderId, status, note });
  await logActivity('update_order_status', { orderId, status });
}

export async function updateOrderShipping(orderId, fields) {
  const { error } = await supabase.from('orders').update(fields).eq('id', orderId);
  if (error) throw error;
}

// --- Customers ---
export async function fetchAllCustomers() {
  const { data: customers, error } = await supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false });
  if (error) throw error;

  const { data: orders } = await supabase.from('orders').select('user_id, total').not('user_id', 'is', null);
  const statsByUser = {};
  (orders || []).forEach((o) => {
    if (!statsByUser[o.user_id]) statsByUser[o.user_id] = { count: 0, total: 0 };
    statsByUser[o.user_id].count += 1;
    statsByUser[o.user_id].total += Number(o.total);
  });

  return customers.map((c) => ({ ...c, orderCount: statsByUser[c.id]?.count || 0, totalSpent: statsByUser[c.id]?.total || 0 }));
}

// --- Reviews ---
export async function fetchAllReviews() {
  const { data, error } = await supabase.from('reviews').select('*, products(name), profiles(first_name, last_name)').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function setReviewStatus(id, fields) {
  const { error } = await supabase.from('reviews').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteReview(id) {
  const { error } = await supabase.from('reviews').delete().eq('id', id);
  if (error) throw error;
}

// --- Inventory ---
export async function fetchInventory() {
  const [{ data: products }, { data: variants }] = await Promise.all([
    supabase.from('products').select('id, name, stock, is_active').order('name'),
    supabase.from('product_variants').select('id, product_id, option_name, option_value, stock, products(name)').order('option_name'),
  ]);
  return { products: products || [], variants: variants || [] };
}

export async function updateProductStock(id, stock) {
  const { error } = await supabase.from('products').update({ stock }).eq('id', id);
  if (error) throw error;
}

export async function updateVariantStock(id, stock) {
  const { error } = await supabase.from('product_variants').update({ stock }).eq('id', id);
  if (error) throw error;
}
