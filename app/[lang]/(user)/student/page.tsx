'use client';
import { useEffect, useMemo, useState } from 'react';
import { startStudentFlow, chooseStudentPackage } from '@/actions/student/telegram';
import { retrieveRawInitData } from '@telegram-apps/sdk';

type TGInitData = { chat?: { id?: number }; user?: { id?: number } };

type StartSingle = { success: true; data: { mode: 'single'; url: string; packageName: string; studentId: number; studentName: string | null } };
type StartChoose = { success: true; data: { mode: 'choose'; students: Array<{ studentId: number; name: string | null; avatar: { initials: string; color: string }; packages: Array<{ id: string; name: string }> }> } };
type StartError = { success: false; error: string };

type HasData = StartSingle | StartChoose;
const hasData = (res: StartSingle | StartChoose | StartError | null): res is HasData => {
  return !!res && res.success === true;
};

export default function Page() {
  const [chatId, setChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startRes, setStartRes] = useState<StartSingle | StartChoose | StartError | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPackagesFor, setShowPackagesFor] = useState<null | { studentId: number; name: string | null; avatar: { initials: string; color: string }; packages: Array<{ id: string; name: string }> }>(null);

  useEffect(() => {
    // Try to read chat id from Telegram WebApp initDataUnsafe
    if (typeof window !== 'undefined') {
      // 1) Prefer initialDataRaw via SDK
      try {
        const raw = retrieveRawInitData();
        if (raw) {
          const params = new URLSearchParams(raw);
          const chatJson = params.get('chat') || params.get('user');
          if (chatJson) {
            const parsed = JSON.parse(chatJson) as { id?: number };
            if (parsed?.id) {
              setChatId(String(parsed.id));
              return;
            }
          }
        }
      } catch {}

      // 2) Fallback: initDataUnsafe
      const w = window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: TGInitData } } };
      const unsafe = w.Telegram?.WebApp?.initDataUnsafe;
      const id = unsafe?.chat?.id ?? unsafe?.user?.id;
      if (id) setChatId(String(id));
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!chatId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await startStudentFlow(chatId);
        setStartRes(res as StartSingle | StartChoose | StartError);
      } catch {
        setError('Failed to start flow');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [chatId]);

  // Removed extra profile pre-list rendering to keep UI minimal/professional

  const handleChoose = async (studentId: number, packageId: string) => {
    if (!chatId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await chooseStudentPackage(chatId, studentId, packageId);
      if (r.success) {
        window.location.href = r.url;
      } else {
        setError(r.error);
      }
    } catch {
      setError('Failed to set package');
    } finally {
      setLoading(false);
    }
  };


  const title = useMemo(() => {
    if (!chatId) return 'Loading Telegram user...';
    if (loading) return 'Preparing your learning path...';
    if (hasData(startRes) && startRes.data.mode === 'single') return 'Continue Learning';
    return "Who's learning?";
  }, [chatId, loading, startRes]);

  const singleData = hasData(startRes) && startRes.data.mode === 'single' ? startRes.data : null;
  const chooseData = hasData(startRes) && startRes.data.mode === 'choose' ? startRes.data : null;
  const AVATAR_URL = process.env.NEXT_PUBLIC_STUDENT_AVATAR_URL || 'https://dummyimage.com/220x220/bae6fd/0369a1&text=%20';
  const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL || 'https://dummyimage.com/64x64/0ea5e9/ffffff&text=DK';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
        <img src={BRAND_LOGO_URL} alt="Brand" style={{ width: 32, height: 32, borderRadius: 6 }} />
        <h1 style={{ fontSize: 24, margin: 0, textAlign: 'center', color: '#0369a1' }}>{title}</h1>
      </div>

      {!chatId && (
        <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 12, background: '#fafafa', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Open in Telegram</div>
          <div style={{ color: '#555', marginBottom: 12 }}>
            We couldn&apos;t detect your Telegram chat. Please open this page from the Telegram Mini App.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ? (
              <button
                onClick={() => {
                  const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME as string;
                  const url = `https://t.me/${username}?start=webapp`;
                  const w = window as unknown as { Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } } };
                  if (w.Telegram?.WebApp?.openTelegramLink) {
                    w.Telegram.WebApp.openTelegramLink(url);
                  } else {
                    window.open(url, '_blank');
                  }
                }}
                style={{ padding: '10px 14px', background: '#0f62fe', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                Open Telegram
              </button>
            ) : null}
            <span style={{ fontSize: 12, color: '#666' }}>Tip: Find our bot in Telegram and tap &quot;Open&quot;.</span>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: 12, border: '1px solid #ffe1e1', background: '#fff5f5', color: '#b00020', borderRadius: 8, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {chatId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && (
            <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8 }}>Loading...</div>
          )}

          {!loading && startRes && startRes.success === false && (
            <div style={{ padding: 16, border: '1px solid #ffe1e1', borderRadius: 12, background: '#fff5f5', color: '#6b0000' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Access not granted</div>
              <div style={{ color: '#6b0000' }}>{startRes.error || 'Your account does not have access to the course yet.'}</div>
              <div style={{ fontSize: 12, color: '#8a1c1c', marginTop: 8 }}>Please contact the admin to enable your access.</div>
            </div>
          )}

          {!loading && singleData && (
            <div style={{ padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
              <div style={{ marginBottom: 8 }}>Package: <b>{singleData.packageName}</b></div>
              <button
                onClick={() => { window.location.href = singleData.url; }}
                style={{ padding: '10px 14px', background: '#0f62fe', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                Start learning
              </button>
            </div>
          )}

          {!loading && chooseData && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 24, justifyItems: 'center' }}>
                {chooseData.students.map((s) => (
                  <button
                    key={s.studentId}
                    onClick={() => {
                      if (s.packages.length === 1) {
                        handleChoose(s.studentId, s.packages[0].id);
                      } else {
                        setShowPackagesFor(s);
                      }
                    }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'center' }}
                  >
                    <img
                      src={AVATAR_URL}
                      alt={s.name || 'Student avatar'}
                      style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid #38bdf8', boxShadow: '0 10px 24px rgba(2,132,199,0.25)', display: 'block', margin: '0 auto', background: '#e0f2fe' }}
                    />
                    <div style={{ marginTop: 10, color: '#0284c7', textAlign: 'center', fontWeight: 700 }}>{s.name || 'Student'}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showPackagesFor && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,132,199,0.25)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
              <div style={{ background: 'linear-gradient(180deg, #e0f2fe 0%, #bae6fd 100%)', color: '#0c4a6e', width: 'min(640px, 94vw)', borderRadius: 18, padding: 22, boxShadow: '0 18px 48px rgba(2,132,199,0.35)', border: '1px solid #7dd3fc' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={BRAND_LOGO_URL} alt="Brand" style={{ width: 28, height: 28, borderRadius: 6 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={AVATAR_URL} alt={showPackagesFor.name || 'Student avatar'} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '3px solid #38bdf8' }} />
                      <div style={{ fontWeight: 800, color: '#075985' }}>{showPackagesFor.name || 'Student'}</div>
                    </div>
                  </div>
                  <button onClick={() => setShowPackagesFor(null)} style={{ background: '#0284c7', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, borderRadius: 8, padding: '6px 10px' }}>Close</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 18, justifyItems: 'center' }}>
                  {showPackagesFor.packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => handleChoose(showPackagesFor.studentId, pkg.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <div style={{ width: 120, height: 120, borderRadius: '50%', border: '4px solid #0ea5e9', background: '#e0f2fe', color: '#075985', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontWeight: 800 }}>
                        {pkg.name.slice(0, 10)}
                      </div>
                      <div style={{ textAlign: 'center', marginTop: 10, color: '#0c4a6e', fontWeight: 700 }}>{pkg.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
