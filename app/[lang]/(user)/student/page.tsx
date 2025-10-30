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
  const AVATAR_URL = process.env.NEXT_PUBLIC_STUDENT_AVATAR_URL || 'https://dummyimage.com/220x220/f3c1e6/ffffff&text=%20';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, marginBottom: 16, textAlign: 'center' }}>{title}</h1>

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
              <div style={{ marginBottom: 12, fontWeight: 600, textAlign: 'center' }}>Who&apos;s learning?</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 18, justifyItems: 'center' }}>
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
                      style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.25)', boxShadow: '0 6px 16px rgba(0,0,0,0.25)', display: 'block', margin: '0 auto' }}
                    />
                    <div style={{ marginTop: 10, color: '#ddd', textAlign: 'center', fontWeight: 600, letterSpacing: 0.2 as number, filter: 'blur(1.1px)' }}>{s.name || 'Student'}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showPackagesFor && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
              <div style={{ background: '#111', color: '#fff', width: 'min(560px, 92vw)', borderRadius: 16, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,0.45)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src={AVATAR_URL} alt={showPackagesFor.name || 'Student avatar'} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.25)' }} />
                    <div style={{ fontWeight: 700 }}>{showPackagesFor.name || 'Student'}</div>
                  </div>
                  <button onClick={() => setShowPackagesFor(null)} style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16, justifyItems: 'center' }}>
                  {showPackagesFor.packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => handleChoose(showPackagesFor.studentId, pkg.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <div style={{ width: 110, height: 110, borderRadius: '50%', border: '3px solid #2d7ef7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#fff', fontWeight: 700 }}>
                        {pkg.name.slice(0, 10)}
                      </div>
                      <div style={{ textAlign: 'center', marginTop: 8, color: '#ddd' }}>{pkg.name}</div>
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
