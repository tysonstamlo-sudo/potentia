// lib/emailCheck.ts — stops bad email addresses BEFORE a sign-up email is sent.
// Every email sent to an address that doesn't exist "bounces", and too many bounces gets our email blocked.
// (The same blocked domains are also enforced in the database: see email-guard.sql.)

/** Common misspellings -> the real domain. */
const TYPOS: Record<string, string> = {
// gmail
'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmil.com': 'gmail.com', 'gmaill.com': 'gmail.com',
'gmali.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaul.com': 'gmail.com', 'gmeil.com': 'gmail.com',
'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.cmo': 'gmail.com',
'gmail.comm': 'gmail.com', 'gmail.vom': 'gmail.com', 'gmail.xom': 'gmail.com', 'gmail.cim': 'gmail.com', 'gmail.coom': 'gmail.com',
'gmail.net': 'gmail.com', 'gmail.org': 'gmail.com', 'gmail.co.com': 'gmail.com', 'gmaik.com': 'gmail.com', 'gmaio.com': 'gmail.com',
'gemail.com': 'gmail.com', 'gimail.com': 'gmail.com', 'g.mail.com': 'gmail.com', 'gmail.comn': 'gmail.com', 'gmsil.com': 'gmail.com',
'gmqil.com': 'gmail.com', 'gmail.c': 'gmail.com', 'gmail': 'gmail.com', 'googlemail.con': 'googlemail.com',
// yahoo
'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yhoo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yahoo.co': 'yahoo.com',
'yahoo.cm': 'yahoo.com', 'yaoo.com': 'yahoo.com', 'yhaoo.com': 'yahoo.com', 'yahoo.comm': 'yahoo.com',
// hotmail / outlook / live
'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmil.com': 'hotmail.com',
'hotmail.con': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmaill.com': 'hotmail.com', 'homail.com': 'hotmail.com', 'hotnail.com': 'hotmail.com',
'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.con': 'outlook.com', 'outlook.co': 'outlook.com', 'outllok.com': 'outlook.com',
'oulook.com': 'outlook.com', 'live.con': 'live.com',
// icloud
'iclod.com': 'icloud.com', 'icoud.com': 'icloud.com', 'icloud.con': 'icloud.com', 'icloud.co': 'icloud.com', 'iclould.com': 'icloud.com',
'icould.com': 'icloud.com', 'icluod.com': 'icloud.com',
// proton
'protonmail.con': 'protonmail.com', 'protonmal.com': 'protonmail.com', 'proton.mee': 'proton.me',
};

/** Endings that are almost always a slip of the finger. */
const BAD_ENDINGS: [RegExp, string][] = [
[/\.con$/, '.com'],
[/\.cmo$/, '.com'],
[/\.comm$/, '.com'],
[/\.vom$/, '.com'],
[/\.xom$/, '.com'],
[/\.c0m$/, '.com'],
[/\.ocm$/, '.com'],
[/\.cpm$/, '.com'],
[/\.nte$/, '.net'],
[/\.ogr$/, '.org'],
];

/** Throwaway inboxes and test domains: these never become real users. */
export const BLOCKED_DOMAINS = [
'example.com', 'example.org', 'example.net', 'test.com', 'test.test', 'mail.test', 'localhost', 'asdf.com', 'abc.com', 'aaa.com',
'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org', 'sharklasers.com', 'grr.la', 'guerrillamailblock.com',
'10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'tempmail.net', 'tempmailo.com', 'tempmail.plus',
'throwawaymail.com', 'yopmail.com', 'yopmail.fr', 'yopmail.net', 'getnada.com', 'nada.email', 'trashmail.com', 'trashmail.net', 'dispostable.com',
'maildrop.cc', 'mailnesia.com', 'mintemail.com', 'fakeinbox.com', 'fakemail.net', 'emailondeck.com', 'moakt.com', 'mohmal.com', 'tmpmail.org',
'tmpmail.net', 'tmail.io', 'mail.tm', 'minuteinbox.com', 'spamgourmet.com', 'mailcatch.com', 'burnermail.io', 'discard.email', 'tempinbox.com',
'emailfake.com', 'inboxkitten.com', 'mytemp.email', 'luxusmail.org', 'spam4.me', 'mailsac.com', 'tempr.email', 'dropmail.me', '1secmail.com',
'1secmail.net', '1secmail.org', 'temporary-mail.net', 'harakirimail.com', 'mailpoof.com', 'owlymail.com', 'tempmail.ninja',
];

export type EmailCheck =
| { ok: true }
| { ok: false; reason: 'format' | 'blocked' }
| { ok: false; reason: 'typo'; suggestion: string };

/** Check an email the person typed. `suggestion` is the corrected address when we can guess it. */
export function checkEmail(raw: string): EmailCheck {
const email = raw.trim().toLowerCase();
// one @, something before it, a domain with a dot, no spaces, no double dots, sensible characters
if (!/^[a-z0-9._%+-]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(email) || email.includes('..') || email.length > 120) {
// "name@gmail" (no ending) is common enough to fix for them
const at = email.split('@');
if (at.length === 2 && at[0] && TYPOS[at[1]]) return { ok: false, reason: 'typo', suggestion: `${at[0]}@${TYPOS[at[1]]}` };
return { ok: false, reason: 'format' };
}
const [name, domain] = email.split('@');
if (name.startsWith('.') || name.endsWith('.')) return { ok: false, reason: 'format' };
if (TYPOS[domain]) return { ok: false, reason: 'typo', suggestion: `${name}@${TYPOS[domain]}` };
for (const [bad, good] of BAD_ENDINGS) {
if (bad.test(domain)) return { ok: false, reason: 'typo', suggestion: `${name}@${domain.replace(bad, good)}` };
}
if (BLOCKED_DOMAINS.includes(domain) || BLOCKED_DOMAINS.some(d => domain.endsWith(`.${d}`))) return { ok: false, reason: 'blocked' };
const tld = domain.split('.').pop() ?? '';
if (tld.length < 2 || /^[0-9]+$/.test(tld)) return { ok: false, reason: 'format' };
return { ok: true };
}

