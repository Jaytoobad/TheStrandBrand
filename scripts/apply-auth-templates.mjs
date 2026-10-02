// ============================================================================
// Apply the branded Auth email templates to Supabase via the Management API.
// ============================================================================
// The templates live in Supabase's Auth service, not in the database, so they
// cannot be changed with SQL or `supabase db push`. The Management API is the
// only non-browser route, and it needs a personal access token.
//
// Usage (PowerShell):
//   node scripts/apply-auth-templates.mjs <path-to-token-file> [project-ref]
//
// The token file is deleted after a successful apply so the credential does not
// linger on disk. Nothing secret is ever printed: the script only reports
// template keys, subjects and body lengths.
//
// Create a token at https://supabase.com/dashboard/account/tokens (name it
// something like "cli-template-apply") and revoke it afterwards.
// ============================================================================

import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';

const tokenFile = process.argv[2];
const projectRef = process.argv[3] || 'orsipouxwpxowsgzgjxf';

if (!tokenFile) {
  console.error('Usage: node scripts/apply-auth-templates.mjs <token-file> [project-ref]');
  process.exit(1);
}

// Which Supabase Auth template each repo file feeds. Auth's own keys are
// confirmed against the live config before anything is written.
const TEMPLATES = [
  {
    key: 'confirmation',
    file: 'supabase/templates/confirm-signup.html',
    fallbackSubject: 'Confirm your TheStrandBrand account',
  },
  {
    key: 'recovery',
    file: 'supabase/templates/reset-password.html',
    fallbackSubject: 'Reset your TheStrandBrand password',
  },
];

const token = (await readFile(tokenFile, 'utf8')).trim();
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

const base = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;

const current = await fetch(base, { headers });
if (!current.ok) {
  console.error(`Could not read the current Auth config (HTTP ${current.status}).`);
  console.error('Check that the token is valid and has access to this project.');
  process.exit(1);
}

const config = await current.json();
const existing = config.mailer_templates || {};
const available = Object.keys(existing);
console.log(`Auth templates currently configured: ${available.join(', ') || 'none'}`);

const updated = { ...existing };

for (const template of TEMPLATES) {
  if (available.length > 0 && !available.includes(template.key)) {
    console.error(`Refusing to write: Auth has no "${template.key}" template (saw ${available.join(', ')}).`);
    process.exit(1);
  }

  const content = (await readFile(path.resolve(template.file), 'utf8')).trim();
  const subject = existing[template.key]?.subject || template.fallbackSubject;

  if (!content.includes('{{ .ConfirmationURL }}') && !content.includes('{{ .Token }}')) {
    console.error(`Refusing to write ${template.file}: it has no Supabase URL variable.`);
    process.exit(1);
  }

  updated[template.key] = { subject, content };
  console.log(`Prepared "${template.key}": subject "${subject}", body ${content.length} characters.`);
}

const applied = await fetch(base, {
  method: 'PATCH',
  headers,
  body: JSON.stringify({ mailer_templates: updated }),
});

if (!applied.ok) {
  console.error(`Update failed (HTTP ${applied.status}): ${await applied.text()}`);
  process.exit(1);
}

const verified = await (await fetch(base, { headers })).json();
for (const template of TEMPLATES) {
  const saved = verified.mailer_templates?.[template.key];
  const hasLink = Boolean(saved?.content?.includes('{{ .ConfirmationURL }}') || saved?.content?.includes('{{ .Token }}'));
  console.log(
    `Verified "${template.key}": subject "${saved?.subject}", body ${saved?.content?.length ?? 0} characters, link token present: ${hasLink}`,
  );
}

await unlink(tokenFile);
console.log(`Token file deleted: ${tokenFile}`);
console.log('Done. Send yourself a signup or password-reset email to confirm delivery.');
