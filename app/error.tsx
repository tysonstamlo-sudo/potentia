'use client';

// app/error.tsx — if any page crashes, show this instead of a black screen.
// Users can try again, reload or log out. The message helps us find the bug.

import { useEffect, type CSSProperties } from 'react';
import { supabase } from '../lib/supabase';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
useEffect(() => {
console.error('App crashed:', error);
}, [error]);

const btn: CSSProperties = {
width: '100%',
padding: '14px 16px',
borderRadius: 14,
fontSize: 15,
fontWeight: 600,
border: 'none',
cursor: 'pointer',
};

return (
<div
style={{
minHeight: '100dvh',
background: '#0A0E11',
color: '#EAF6FA',
display: 'flex',
alignItems: 'center',
justifyContent: 'center',
padding: 24,
fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
}}
>
<div style={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
<p style={{ fontSize: 13, letterSpacing: '0.35em', color: '#4FD1F0', marginBottom: 18 }}>POTENTIA</p>
<h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
<p style={{ fontSize: 14, color: '#9FB3BD', lineHeight: 1.5, marginBottom: 6 }}>
တစ်ခုခု မှားသွားပါတယ်။ ပြန်ကြိုးစားကြည့်ပါ။
</p>
<p style={{ fontSize: 12, color: '#6B7F88', marginBottom: 22, wordBreak: 'break-word' }}>
{error?.message || 'Unknown error'}
{error?.digest ? ` · ${error.digest}` : ''}
</p>
<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
<button onClick={() => reset()} style={{ ...btn, background: '#4FD1F0', color: '#0A0E11' }}>
Try again · ပြန်ကြိုးစားရန်
</button>
<button onClick={() => window.location.reload()} style={{ ...btn, background: '#16222A', color: '#EAF6FA' }}>
Reload the app
</button>
<button
onClick={async () => {
try {
await supabase.auth.signOut();
} finally {
window.location.href = '/login';
}
}}
style={{ ...btn, background: 'transparent', color: '#9FB3BD', fontWeight: 400 }}
>
Log out
</button>
</div>
<p style={{ fontSize: 11, color: '#6B7F88', marginTop: 20 }}>If this keeps happening, send us a screenshot of this screen.</p>
</div>
</div>
);
}


