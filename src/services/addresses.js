import { supabase } from '../lib/supabaseClient';

export async function fetchAddresses(userId) {
  const { data, error } = await supabase.from('addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveAddress(userId, address) {
  if (address.is_default) {
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
  }
  if (address.id) {
    const { error } = await supabase.from('addresses').update(address).eq('id', address.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('addresses').insert({ ...address, user_id: userId });
    if (error) throw error;
  }
}

export async function deleteAddress(id) {
  const { error } = await supabase.from('addresses').delete().eq('id', id);
  if (error) throw error;
}
