import { useCallback, useEffect, useMemo, useState } from 'react';
import { siteConfig, formatMoney } from '../../config/siteConfig';
import { ACCRA_REGION, MAX_DELIVERY_FEE } from '../../config/delivery';
import { getDeliveryRates } from '../../services/delivery';
import { updateDeliveryRates } from '../../services/admin';
import { useToast } from '../../context/ToastContext';
import PageLoader from '../../components/PageLoader';

function isValidFee(value) {
  if (value === '' || value == null) return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= MAX_DELIVERY_FEE;
}

export default function AdminSettings() {
  const { showToast } = useToast();
  const [rows, setRows] = useState([]); // [{ region, fee, value }]
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkFee, setBulkFee] = useState('');

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const rates = await getDeliveryRates({ fresh: true });
      setRows(rates.map((r) => ({ ...r, value: String(r.fee) })));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changed = useMemo(() => rows.filter((r) => isValidFee(r.value) && Number(r.value) !== r.fee), [rows]);
  const hasInvalid = rows.some((r) => !isValidFee(r.value));

  function setValue(region, value) {
    setRows((prev) => prev.map((r) => (r.region === region ? { ...r, value } : r)));
  }

  function applyToOtherRegions() {
    if (!isValidFee(bulkFee)) { showToast(`Enter a fee between 0 and ${MAX_DELIVERY_FEE}.`, 'error'); return; }
    setRows((prev) => prev.map((r) => (r.region === ACCRA_REGION ? r : { ...r, value: String(Number(bulkFee)) })));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (hasInvalid) { showToast('Every region needs a fee of 0 or more.', 'error'); return; }
    if (!changed.length) return;
    setSaving(true);
    try {
      await updateDeliveryRates(changed.map((r) => ({ region: r.region, fee: Number(r.value) })));
      showToast(`Delivery fees saved for ${changed.length} region${changed.length > 1 ? 's' : ''}.`);
      await load();
    } catch {
      showToast('Could not save delivery fees. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="admin-header"><h1>Settings</h1></div>

      <section className="admin-panel" aria-labelledby="delivery-fees-title">
        <div className="admin-panel-header">
          <div>
            <h2 id="delivery-fees-title">Delivery fees</h2>
            <p>Customers pay the fee for the region they pick at checkout. New fees apply to new orders straight away. Orders already placed keep the fee they paid.</p>
          </div>
        </div>

        {loading ? <PageLoader /> : loadError ? (
          <div className="empty-state">
            <p>Could not load delivery fees.</p>
            <button type="button" className="btn btn-outline btn-sm" onClick={load}>Try again</button>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="delivery-bulk">
              <label htmlFor="bulk-fee">Set every region outside Greater Accra to</label>
              <div className="delivery-bulk-controls">
                <div className="fee-input">
                  <span aria-hidden="true">{siteConfig.currencySymbol}</span>
                  <input id="bulk-fee" type="number" min="0" max={MAX_DELIVERY_FEE} step="0.01" inputMode="decimal" value={bulkFee} onChange={(e) => setBulkFee(e.target.value)} placeholder="e.g. 50" />
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={applyToOtherRegions}>Apply</button>
              </div>
            </div>

            <div className="data-table-wrap">
              <table className="data-table delivery-rates-table">
                <thead><tr><th>Region</th><th>Fee</th></tr></thead>
                <tbody>
                  {rows.map((r) => {
                    const invalid = !isValidFee(r.value);
                    const isChanged = !invalid && Number(r.value) !== r.fee;
                    return (
                      <tr key={r.region} className={isChanged ? 'is-changed' : undefined}>
                        <td>
                          <label htmlFor={`fee-${r.region}`}>{r.region}</label>
                          {r.region === ACCRA_REGION && <span className="admin-pill is-neutral">Within Accra</span>}
                          {isChanged && <span className="delivery-was">was {formatMoney(r.fee)}</span>}
                        </td>
                        <td>
                          <div className="fee-input">
                            <span aria-hidden="true">{siteConfig.currencySymbol}</span>
                            <input
                              id={`fee-${r.region}`}
                              type="number"
                              min="0"
                              max={MAX_DELIVERY_FEE}
                              step="0.01"
                              inputMode="decimal"
                              value={r.value}
                              onChange={(e) => setValue(r.region, e.target.value)}
                              aria-invalid={invalid}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="admin-save-bar">
              <span>{hasInvalid ? 'Fix the empty or invalid fees.' : changed.length ? `${changed.length} unsaved change${changed.length > 1 ? 's' : ''}` : 'All fees saved'}</span>
              <div>
                <button type="button" className="btn btn-outline btn-sm" disabled={!changed.length || saving} onClick={() => setRows((prev) => prev.map((r) => ({ ...r, value: String(r.fee) })))}>Discard</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!changed.length || hasInvalid || saving}>{saving ? 'Saving…' : 'Save fees'}</button>
              </div>
            </div>
          </form>
        )}
      </section>

      <section className="admin-panel" aria-labelledby="business-info-title">
        <div className="admin-panel-header">
          <div>
            <h2 id="business-info-title">Business information</h2>
            <p>These details are set in <code>src/config/siteConfig.js</code>. Ask your developer to change them and redeploy.</p>
          </div>
        </div>
        <dl className="admin-info-list">
          <div><dt>Brand name</dt><dd>{siteConfig.brandName}</dd></div>
          <div><dt>WhatsApp</dt><dd>{siteConfig.whatsappDisplay}</dd></div>
          <div><dt>Phone</dt><dd>{siteConfig.phoneDisplay}</dd></div>
          <div><dt>Contact email</dt><dd>{siteConfig.contactEmail}</dd></div>
        </dl>
      </section>
    </div>
  );
}
