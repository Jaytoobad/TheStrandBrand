// Read-only Brevo check: account, sending domains, and recent transactional
// email results. Every call here is a GET — nothing is sent.
//
// The API key is read from .env.local so it never appears in a committed file.
// Usage: node scripts/check-brevo.mjs
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);

const key = env.BREVO_API_KEY;
if (!key) {
  console.error('BREVO_API_KEY is not set in .env.local');
  process.exit(1);
}

async function get(path) {
  const res = await fetch(`https://api.brevo.com/v3${path}`, {
    headers: { 'api-key': key, accept: 'application/json' },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 300);
  }
  return { status: res.status, body };
}

const account = await get('/account');
console.log('=== account ===');
if (account.status === 200) {
  const a = account.body;
  console.log(`  email        : ${a.email}`);
  console.log(`  company      : ${a.company_name ?? '(none)'}`);
  console.log(`  plan         : ${a.plan ?? '(unknown)'}`);
  console.log(`  children     : ${a.children ?? 0}`);
} else {
  console.log(`  HTTP ${account.status}: ${JSON.stringify(account.body).slice(0, 300)}`);
}

const domains = await get('/smtp/domains');
console.log('\n=== sending domains ===');
if (domains.status === 200 && Array.isArray(domains.body)) {
  if (!domains.body.length) console.log('  none configured');
  for (const d of domains.body) {
    console.log(`  ${d.domain}`);
    console.log(`    active        : ${d.is_active ? 'yes' : 'NO — mail will not be sent'}`);
    console.log(`    authenticate  : ${d.authentication ? 'yes' : 'no'}`);
    console.log(`    created       : ${d.created_at}`);
  }
} else {
  console.log(`  HTTP ${domains.status}: ${JSON.stringify(domains.body).slice(0, 300)}`);
}

const events = await get('/transactionalEmails?limit=20&sort=desc');
console.log('\n=== recent transactional emails (newest first) ===');
if (events.status !== 200) {
  console.log(`  HTTP ${events.status}: ${JSON.stringify(events.body).slice(0, 300)}`);
} else {
  const rows = events.body.transactionalEmails || events.body.data || [];
  if (!rows.length) {
    console.log('  none sent yet');
  } else {
    const tally = {};
    for (const m of rows) {
      const subject = (m.subject || '(no subject)').slice(0, 52);
      console.log(`  [${String(m.event ?? '?').padEnd(8)}] ${m.sentAt ?? m.createdAt ?? '?'}  ${subject}`);
      tally[m.event] = (tally[m.event] || 0) + 1;
    }
    console.log('\n  tally:', JSON.stringify(tally));
    const failing = rows.filter((m) => m.event && !['delivered', 'sent', 'queued', 'processed'].includes(m.event));
    if (failing.length) {
      console.log('\n  failing messages:');
      for (const m of failing.slice(0, 10)) {
        console.log(`    event=${m.event} subject=${(m.subject || '').slice(0, 60)}`);
        if (m.date) console.log(`      date   : ${m.date}`);
        if (m.reason) console.log(`      reason : ${m.reason}`);
        if (m.diag) console.log(`      diag   : ${m.diag}`);
      }
    }
  }
}