import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDeliveryRates } from '../services/delivery';
import { DEFAULT_DELIVERY_RATES } from '../config/delivery';

// Returns the delivery fee for each region. Falls back to the built-in
// defaults if the database can't be reached; checkout still works because the
// server re-checks the fee and asks the customer to review if it differs.
export default function useDeliveryRates() {
  const [rates, setRates] = useState(null);

  const load = useCallback(async (fresh = false) => {
    try {
      const result = await getDeliveryRates({ fresh });
      setRates(result.length ? result : DEFAULT_DELIVERY_RATES);
    } catch {
      setRates(DEFAULT_DELIVERY_RATES);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const feeByRegion = useMemo(
    () => Object.fromEntries((rates || []).map((r) => [r.region, r.fee])),
    [rates],
  );
  const lowestFee = useMemo(
    () => (rates?.length ? Math.min(...rates.map((r) => r.fee)) : null),
    [rates],
  );

  return {
    rates: rates || [],
    loading: rates === null,
    feeByRegion,
    lowestFee,
    refresh: () => load(true),
  };
}
