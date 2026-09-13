/* =======================================================================
   CONFIG.JS  —  YOUR STORE SETTINGS
   -----------------------------------------------------------------------
   Put your own details in here. Nothing in this file needs coding
   knowledge to change.
   ======================================================================= */

const STORE_CONFIG = {

  /* -------------------------------------------------------------------
     PAYSTACK PUBLIC KEY
     ---------------------------------------------------------------
     1. Log in to your Paystack dashboard: https://dashboard.paystack.com
     2. Go to Settings -> API Keys & Webhooks
     3. Copy the "Public Key" (it starts with pk_test_ or pk_live_)
        - pk_test_...  -> use this while you're testing, no real money moves
        - pk_live_...  -> use this once you're ready to accept real payments
     4. Paste it below between the quotes.

     IMPORTANT SECURITY NOTE:
     Only ever put your PUBLIC key here. Never put your SECRET key
     (sk_test_... / sk_live_...) in any file that lives in a browser —
     that key must stay on a server. This site only needs the public
     key to open the Paystack payment popup.
     ------------------------------------------------------------------- */
  paystackPublicKey: "pk_test_REPLACE_WITH_YOUR_PUBLIC_KEY",

  /* Store contact + branding, used across the site */
  storeName: "TheStrandBrand",
  storeEmail: "hello@yourstore.com",
  storePhone: "+233 000 000 000",
  currencySymbol: "₵",

  /* Simple password that guards the /admin.html page.
     This is a basic front-end lock, not bank-grade security — it just
     keeps casual visitors out. Change it to something only you know.
     See the big note in admin.html / js/admin.js about upgrading this
     to real authentication once you have a backend. */
  adminPassword: "changeme123"
};
