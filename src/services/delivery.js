import { supabase } from '../lib/supabaseClient';

// Delivery fees per region are public (anyone can read them) and change
// rarely, so one request per page load is shared by every component.
let cached = null;

export function getDeliveryRates({ fresh = false } = {}) {
  if (!cached || fresh) {
    cached = supabase
      .from('delivery_rates')
      .select('region, fee, sort_order')
      .order('sort_order')
      .then(({ data, error }) => {
        if (error) throw error;
        return data.map((r) => ({ region: r.region, fee: Number(r.fee) }));
      })
      .catch((err) => {
        cached = null; // let the next caller retry
        throw err;
      });
  }
  return cached;
}
