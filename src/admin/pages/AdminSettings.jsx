import { siteConfig } from '../../config/siteConfig';

// Business info (WhatsApp number, socials, hero content, delivery fee) lives
// in src/config/siteConfig.js so it's one file to edit and every page picks
// it up automatically — no database table needed for this static content.
export default function AdminSettings() {
  return (
    <div>
      <div className="admin-header"><h1>Settings</h1></div>
      <div className="admin-form">
        <p style={{ marginBottom: 16, color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
          Business information (WhatsApp number, social links, hero banners, delivery fee) is managed in
          <code> src/config/siteConfig.js</code> in the codebase, rather than here, so it can be version-controlled
          along with the rest of the site. Edit that file and redeploy to update these values everywhere at once.
        </p>
        <div className="form-group"><label>Brand Name</label><input value={siteConfig.brandName} disabled /></div>
        <div className="form-group"><label>WhatsApp Number</label><input value={siteConfig.whatsappNumber} disabled /></div>
        <div className="form-group"><label>Contact Email</label><input value={siteConfig.contactEmail} disabled /></div>
        <div className="form-group"><label>Default Delivery Fee</label><input value={siteConfig.defaultDeliveryFee} disabled /></div>
      </div>
    </div>
  );
}
