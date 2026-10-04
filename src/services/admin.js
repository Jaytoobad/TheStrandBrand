import { supabase } from '../lib/supabaseClient';
import { compressImage } from '../lib/imageCompression';
import { THUMB_WIDTH, thumbPath } from '../lib/imageUrl';
import { safeExternalUrl } from '../lib/safeUrl';
import { isSoldByLength } from '../lib/pricing';

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
      // Paid orders the team still has to make and send out (unpaid checkouts are not counted).
      supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['paid', 'processing', 'packaged']),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('total, created_at').eq('payment_status', 'paid'),
    ]);

  const totalSales = paidOrders.data?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = paidOrders.data?.filter((o) => o.created_at.startsWith(today)).reduce((sum, o) => sum + Number(o.total), 0) || 0;

  // head: true returns only the count (data is always null), so read `count`.
  // Made-to-order products don't use stock, so they never count as low stock.
  // A sold-by-length product stores no stock of its own either — its lengths do —
  // so counting it would list every bundle as low regardless of what is in stock.
  const { data: lowStockRows } = await supabase
    .from('products')
    .select('id, stock, categories(sold_by_inches)')
    .lte('stock', 5).eq('allow_preorder', false).eq('is_active', true);
  const lowStockCount = (lowStockRows || []).filter((p) => !isSoldByLength(p)).length;

  return {
    totalSales, todaySales, totalOrders, pendingOrders, deliveredOrders, totalCustomers, totalProducts,
    paidOrderCount: paidOrders.data?.length || 0,
    lowStockCount,
  };
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
  const { data, error } = await supabase.from('products').select('*, categories(name, sold_by_inches), product_images(url, is_primary), product_variants(id, price, stock, option_name, option_value)').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchProductForEdit(id) {
  const { data, error } = await supabase.from('products').select('*, categories(name, sold_by_inches), product_images(*), product_variants(*)').order('sort_order').eq('id', id).single();
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

// Variants are matched on (option_name, option_value) and updated in place
// rather than deleted and reinserted. The old version regenerated every
// variant UUID on each save, which silently removed customers' cart lines
// (CartContext drops a line whose variant no longer exists) and nulled
// order_items.variant_id on historical orders. Lengths are also the identity
// here: renaming one is a new length, not a replacement of the old one.
export async function saveProductVariants(productId, variants) {
  const { data: existing, error: loadErr } = await supabase
    .from('product_variants')
    .select('id, option_name, option_value')
    .eq('product_id', productId);
  if (loadErr) throw loadErr;

  const kept = new Set();
  const rows = [];

  variants.forEach((v, index) => {
    const optionName = v.option_name.trim();
    const optionValue = v.option_value.trim();
    const key = `${optionName}::${optionValue}`;
    kept.add(key);

    const previous = (existing || []).find(
      (e) => `${e.option_name}::${e.option_value}` === key,
    );

    rows.push(
      previous
        ? supabase
            .from('product_variants')
            .update({
              price: v.price === '' || v.price == null ? null : Number(v.price),
              price_adjustment: Number(v.price_adjustment || 0),
              stock: Number(v.stock || 0),
              sort_order: index,
            })
            .eq('id', previous.id)
        : supabase.from('product_variants').insert({
            product_id: productId,
            option_name: optionName,
            option_value: optionValue,
            price: v.price === '' || v.price == null ? null : Number(v.price),
            price_adjustment: Number(v.price_adjustment || 0),
            stock: Number(v.stock || 0),
            sort_order: index,
          }),
    );
  });

  const removed = (existing || []).filter(
    (e) => !kept.has(`${e.option_name}::${e.option_value}`),
  );

  const results = await Promise.all([
    ...rows,
    ...(removed.length
      ? [supabase.from('product_variants').delete().in('id', removed.map((r) => r.id))]
      : []),
  ]);

  const failure = results.find((r) => r.error);
  if (failure) throw failure.error;
}

// File names are unique (timestamped), so browsers can cache them for a year.
const IMAGE_CACHE_SECONDS = '31536000';

// Uploads the photo plus a small copy for cards/tiles (see src/lib/imageUrl.js).
// A failed thumbnail doesn't block the upload; the site falls back to the full photo.
async function uploadImageWithThumb(file, path) {
  const bucket = supabase.storage.from('product-images');
  const { error } = await bucket.upload(path, file, { cacheControl: IMAGE_CACHE_SECONDS, upsert: false });
  if (error) throw error;
  try {
    const thumb = await compressImage(file, { maxWidth: THUMB_WIDTH, quality: 0.75 });
    const { error: thumbError } = await bucket.upload(thumbPath(path), thumb, { cacheControl: IMAGE_CACHE_SECONDS, upsert: false });
    if (thumbError) throw thumbError;
  } catch (err) {
    console.warn('Thumbnail upload failed', err);
  }
  return bucket.getPublicUrl(path).data.publicUrl;
}

export async function uploadProductImage(file, productId) {
  const ext = file.name.split('.').pop();
  return uploadImageWithThumb(file, `${productId}/${Date.now()}.${ext}`);
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

// Category images share the public `product-images` bucket (same admin-only
// insert policy), kept in their own folder so they're easy to find.
export async function uploadCategoryImage(file) {
  const ext = file.name.split('.').pop();
  return uploadImageWithThumb(file, `categories/${Date.now()}.${ext}`);
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
  // Commas and brackets would break the .or() filter syntax, so strip them.
  const term = search?.replace(/[,()%*]/g, ' ').trim();
  if (term) query = query.or(`order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_email.ilike.%${term}%`);
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
  // The tracking link is shown to customers as a clickable link, so a value that
  // is not a plain http(s) URL is rejected here rather than stored and quietly
  // dropped at display time.
  const url = String(fields.external_tracking_url || '').trim();
  if (url && !safeExternalUrl(url)) {
    throw new Error('The tracking link must be a full http:// or https:// address.');
  }
  const { error } = await supabase.from('orders').update(fields).eq('id', orderId);
  if (error) throw error;
}

// --- Customers ---
export async function fetchAllCustomers() {
  const { data: customers, error } = await supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false });
  if (error) throw error;

  // Only paid orders count towards "Total spent" (abandoned checkouts don't).
  const { data: orders } = await supabase.from('orders').select('user_id, total').not('user_id', 'is', null).eq('payment_status', 'paid');
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
    // categories(sold_by_inches) is needed because a sold-by-length product keeps
    // no stock of its own: the real count lives on its lengths, so the product
    // row would otherwise read as permanently out of stock.
    supabase.from('products').select('id, name, stock, is_active, allow_preorder, categories(sold_by_inches)').order('name'),
    supabase.from('product_variants').select('id, product_id, option_name, option_value, price, stock, sort_order, products(name)').order('sort_order'),
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

// --- Delivery fees ---
// changes: [{ region, fee }]. RLS silently skips rows a non-admin can't
// update, so an empty result is treated as a failure.
export async function updateDeliveryRates(changes) {
  const updatedAt = new Date().toISOString();
  const results = await Promise.all(
    changes.map(({ region, fee }) =>
      supabase.from('delivery_rates').update({ fee, updated_at: updatedAt }).eq('region', region).select('region')),
  );
  const failed = results.find((r) => r.error || !r.data?.length);
  if (failed) throw failed.error || new Error('Delivery fee update was not allowed.');
  await logActivity('update_delivery_rates', { changes });
}
