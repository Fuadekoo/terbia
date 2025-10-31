'use client';
import { useEffect, useState } from 'react';
import { startStudentFlow, chooseStudentPackage } from '@/actions/student/telegram';
import { Loader2 } from 'lucide-react';
import { retrieveRawInitData } from '@telegram-apps/sdk';
import { Progress } from '@/components/ui/progress';

type TGInitData = { chat?: { id?: number }; user?: { id?: number } };

type TelegramTheme = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
};

type StartSingle = { success: true; data: { mode: 'single'; url: string; packageName: string; studentId: number; studentName: string | null } };
type StartChoose = { success: true; data: { mode: 'choose'; students: Array<{ studentId: number; name: string | null; avatar: { initials: string; color: string }; packages: Array<{ id: string; name: string; progressPercentage?: number }>; subject?: string | null; teacherName?: string | null; classFee?: string | null }> } };
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
  const [theme, setTheme] = useState<TelegramTheme>({});
  
  const [pendingChoice, setPendingChoice] = useState<string | null>(null);

  useEffect(() => {
    // Try to read chat id from Telegram WebApp initDataUnsafe and theme
    if (typeof window !== 'undefined') {
      const w = window as unknown as { 
        Telegram?: { 
          WebApp?: { 
            initDataUnsafe?: TGInitData;
            themeParams?: TelegramTheme;
            requestTheme?: () => void;
            onEvent?: (event: string, handler: () => void) => void;
            offEvent?: (event: string, handler: () => void) => void;
          } 
        } 
      };

      // Get theme
      if (w.Telegram?.WebApp?.themeParams) {
        setTheme(w.Telegram.WebApp.themeParams);
      }

      // Request theme update
      if (w.Telegram?.WebApp?.requestTheme) {
        w.Telegram.WebApp.requestTheme();
      }

      // Listen for theme changes
      const handleThemeChange = () => {
        if (w.Telegram?.WebApp?.themeParams) {
          setTheme(w.Telegram.WebApp.themeParams);
        }
      };

      if (w.Telegram?.WebApp?.onEvent) {
        w.Telegram.WebApp.onEvent('themeChanged', handleThemeChange);
      }

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
      const unsafe = w.Telegram?.WebApp?.initDataUnsafe;
      const id = unsafe?.chat?.id ?? unsafe?.user?.id;
      if (id) setChatId(String(id));

      return () => {
        if (w.Telegram?.WebApp?.offEvent) {
          w.Telegram.WebApp.offEvent('themeChanged', handleThemeChange);
        }
      };
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
    setPendingChoice(`${studentId}:${packageId}`);
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
      setPendingChoice(null);
    }
  };




  const singleData = hasData(startRes) && startRes.data.mode === 'single' ? startRes.data : null;
  const chooseData = hasData(startRes) && startRes.data.mode === 'choose' ? startRes.data : null;
  const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_BRAND_LOGO_URL || 'https://dummyimage.com/64x64/0ea5e9/ffffff&text=DK';
  const [selectedStudent, setSelectedStudent] = useState<null | { studentId: number; name: string | null; packages: Array<{ id: string; name: string; progressPercentage?: number }>; subject?: string | null; teacherName?: string | null; classFee?: string | null }>(null);

  // Auto-redirect when there is a single package path
  useEffect(() => {
    if (!singleData) return;
    window.location.href = singleData.url;
  }, [singleData]);

  // Theme helper functions with fallbacks
  const getBgColor = () => theme.bg_color || '#ffffff';
  const getTextColor = () => theme.text_color || '#000000';
  const getHintColor = () => theme.hint_color || '#999999';
  const getLinkColor = () => theme.link_color || '#0ea5e9';
  const getButtonColor = () => theme.button_color || '#0ea5e9';
  const getButtonTextColor = () => theme.button_text_color || '#ffffff';
  const getSecondaryBgColor = () => theme.secondary_bg_color || '#f0f0f0';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16, background: getBgColor(), color: getTextColor(), minHeight: '100vh' }} className='pt-60'>
     

      {!chatId && (
        <div style={{ padding: 16, border: `1px solid ${getSecondaryBgColor()}`, borderRadius: 12, background: getSecondaryBgColor(), marginBottom: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: getTextColor() }}>Open in Telegram</div>
          <div style={{ color: getHintColor(), marginBottom: 12 }}>
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
                style={{ padding: '10px 14px', background: getButtonColor(), color: getButtonTextColor(), border: 'none', borderRadius: 8, cursor: 'pointer' }}
              >
                Open Telegram
              </button>
            ) : null}
            <span style={{ fontSize: 12, color: getHintColor() }}>Tip: Find our bot in Telegram and tap &quot;Open&quot;.</span>
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: 12, border: `1px solid ${getSecondaryBgColor()}`, background: getSecondaryBgColor(), color: getTextColor(), borderRadius: 8, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {chatId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && (
            <div style={{ padding: 12, border: `1px solid ${getSecondaryBgColor()}`, borderRadius: 8, color: getTextColor() }}>Loading...</div>
          )}

          {!loading && startRes && startRes.success === false && (
            <div style={{ padding: 16, border: `1px solid ${getSecondaryBgColor()}`, borderRadius: 12, background: getSecondaryBgColor(), color: getTextColor() }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Access not granted</div>
              <div>{startRes.error || 'Your account does not have access to the course yet.'}</div>
              <div style={{ fontSize: 12, color: getHintColor(), marginTop: 8 }}>Please contact the admin to enable your access.</div>
            </div>
          )}

          {!loading && singleData && (
            <div style={{ padding: 12, border: `1px solid ${getSecondaryBgColor()}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, color: getTextColor() }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Redirecting...
            </div>
          )}

          {!loading && chooseData && chooseData.students.length > 1 && (
            <div className='pt-10'>
              {!selectedStudent && (
                <div style={{ display: 'grid' ,gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 24, justifyItems: 'center' }}>
                  {chooseData.students.map((s) => (
                    <button
                      key={s.studentId}
                      onClick={() => {
                        if (s.packages.length === 1) {
                          handleChoose(s.studentId, s.packages[0].id);
                        } else {
                          setSelectedStudent({ studentId: s.studentId, name: s.name, packages: s.packages, subject: s.subject, teacherName: s.teacherName, classFee: s.classFee });
                        }
                      }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'center' }}
                    >
                      <img
                        src="/userProfileIcon.png"
                        alt={s.name || 'Student avatar'}
                        style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: `4px solid ${getLinkColor()}`, boxShadow: `0 10px 24px ${getLinkColor()}40`, display: 'block', margin: '0 auto', background: getSecondaryBgColor() || '#e0f2fe' }}
                      />
                      <div style={{ marginTop: 10, color: getLinkColor(), textAlign: 'center', fontWeight: 700 }}>{s.name || 'Student'}</div>
                    </button>
                  ))}
                </div>
              )}

              {selectedStudent && (
                <div>
                  {/* Blurred overlay above header - Sticky */}
                  <div style={{ position: 'sticky', top: 0, zIndex: 10, height: 30, background: `${getBgColor()}dd`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', marginBottom: 0}} />
                  {/* Profile Header Card - Sticky */}
                  <div style={{ position: 'sticky', top: 30, zIndex: 9, background: getButtonColor(), borderRadius: 16, padding: 20, marginTop: 0, marginBottom: 20, color: getButtonTextColor(), boxShadow: '0 10px 24px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      {/* Avatar */}
                      <img
                        src="/userProfileIcon.png"
                        alt={selectedStudent.name || 'Student avatar'}
                        style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${getButtonTextColor()}4d`, flexShrink: 0 }}
                      />
                      {/* Student Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{selectedStudent.name || 'Student'}</div>
                        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8 }}>
                          <span>{selectedStudent.packages.length} {selectedStudent.packages.length === 1 ? 'package' : 'packages'}</span>
                          <span style={{ margin: '0 8px' }}>•</span>
                          <span>Available</span>
                        </div>
                        <div style={{ fontSize: 13, opacity: 0.85 }}>Teacher: {selectedStudent.teacherName || 'Not assigned'}</div>
                      </div>
                    </div>
                  </div>
                  {/* Package Cards Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18 }}>
                    {selectedStudent.packages.map((pkg) => (
                      <div key={`${selectedStudent.studentId}-${pkg.id}`} style={{ background: getSecondaryBgColor() || '#ffffff', border: `1px solid ${getSecondaryBgColor()}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 10px 24px rgba(0,0,0,0.08)' }}>
                        <div style={{ height: 140, position: 'relative' }}>
                          <img src="/quranlogo.png" alt="Package thumbnail" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 60, height: 60, borderRadius: '50%', background: `${getBgColor()}d9`, boxShadow: '0 8px 20px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: `16px solid ${getLinkColor()}`, marginLeft: 4 }} />
                          </div>
                        </div>
                        <div style={{ padding: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontSize: 12, color: getLinkColor(), background: getSecondaryBgColor() || '#e0f2fe', border: `1px solid ${getSecondaryBgColor()}`, padding: '4px 10px', borderRadius: 9999 }}>beginner</span>
                            <span style={{ fontSize: 12, color: getTextColor() }}>⭐ 4.8</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ fontWeight: 800, color: getTextColor(), lineHeight: 1.35, fontSize: 18, flex: 1 }}>
                              {pkg.name}
                            </div>
                            <div style={{ color: getLinkColor(), fontWeight: 800, whiteSpace: 'nowrap' }}>Available</div>
                          </div>
                          <div style={{ color: getHintColor(), fontSize: 13, marginTop: 8 }}>
                            {selectedStudent.name || 'Student'}
                          </div>
                          <div style={{ marginTop: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <span style={{ fontSize: 12, color: getHintColor() }}>{pkg.progressPercentage ?? 0}%</span>
                            </div>
                            <Progress value={pkg.progressPercentage ?? 0} />
                          </div>
                          <button onClick={() => handleChoose(selectedStudent.studentId, pkg.id)} style={{ width: '100%', marginTop: 14, padding: '12px 14px', background: getButtonColor(), color: getButtonTextColor(), border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={pendingChoice === `${selectedStudent.studentId}:${pkg.id}`}>
                            {pendingChoice === `${selectedStudent.studentId}:${pkg.id}` ? (<><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Continuing...</>) : 'continue Learning'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && chooseData && chooseData.students.length === 1 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 18 }}>
                {chooseData.students[0].packages.map((pkg) => (
                  <div key={pkg.id} style={{ background: getSecondaryBgColor() || '#ffffff', border: `1px solid ${getSecondaryBgColor()}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 10px 24px rgba(0,0,0,0.08)' }}>
                    <div style={{ height: 140, position: 'relative' }}>
                      <img src="/quranlogo.png" alt="Package thumbnail" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 60, height: 60, borderRadius: '50%', background: `${getBgColor()}d9`, boxShadow: '0 8px 20px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 0, height: 0, borderTop: '10px solid transparent', borderBottom: '10px solid transparent', borderLeft: `16px solid ${getLinkColor()}`, marginLeft: 4 }} />
                      </div>
                    </div>
                    <div style={{ padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: getLinkColor(), background: getSecondaryBgColor() || '#e0f2fe', border: `1px solid ${getSecondaryBgColor()}`, padding: '4px 10px', borderRadius: 9999 }}>beginner</span>
                        <span style={{ fontSize: 12, color: getTextColor() }}>⭐ 4.8</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ fontWeight: 800, color: getTextColor(), lineHeight: 1.35, fontSize: 18, flex: 1 }}>
                          {pkg.name}
                        </div>
                        <div style={{ color: getLinkColor(), fontWeight: 800, whiteSpace: 'nowrap' }}>Available</div>
                      </div>
                      <div style={{ color: getHintColor(), fontSize: 13, marginTop: 8 }}>
                        Kickstart your learning with engaging lessons and hands-on practice.
                      </div>
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 12, color: getHintColor() }}>{pkg.progressPercentage ?? 0}%</span>
                        </div>
                        <Progress value={pkg.progressPercentage ?? 0} />
                      </div>
                    <button onClick={() => handleChoose(chooseData.students[0].studentId, pkg.id)} style={{ width: '100%', marginTop: 14, padding: '12px 14px', background: getButtonColor(), color: getButtonTextColor(), border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={pendingChoice === `${chooseData.students[0].studentId}:${pkg.id}`}>
                      {pendingChoice === `${chooseData.students[0].studentId}:${pkg.id}` ? (<><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Continuing...</>) : 'continue Learning'}
                    </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showPackagesFor && (
            <div style={{ position: 'fixed', inset: 0, background: `${getBgColor()}40`, backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
              <div style={{ background: getSecondaryBgColor() || getBgColor(), color: getTextColor(), width: 'min(640px, 94vw)', borderRadius: 18, padding: 22, boxShadow: `0 18px 48px ${getTextColor()}20`, border: `1px solid ${getSecondaryBgColor()}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={BRAND_LOGO_URL} alt="Brand" style={{ width: 28, height: 28, borderRadius: 6 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src="/userProfileIcon.png" alt={showPackagesFor.name || 'Student avatar'} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${getLinkColor()}` }} />
                      <div style={{ fontWeight: 800, color: getTextColor() }}>{showPackagesFor.name || 'Student'}</div>
                    </div>
                  </div>
                  <button onClick={() => setShowPackagesFor(null)} style={{ background: getButtonColor(), border: 'none', color: getButtonTextColor(), cursor: 'pointer', fontSize: 14, borderRadius: 8, padding: '6px 10px' }}>Close</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 18, justifyItems: 'center' }}>
                  {showPackagesFor.packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => handleChoose(showPackagesFor.studentId, pkg.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <div style={{ width: 120, height: 120, borderRadius: '50%', border: `4px solid ${getLinkColor()}`, background: getSecondaryBgColor() || getBgColor(), color: getTextColor(), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontWeight: 800 }}>
                        {pkg.name.slice(0, 10)}
                      </div>
                      <div style={{ textAlign: 'center', marginTop: 10, color: getTextColor(), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {pkg.name}
                        {pendingChoice === `${showPackagesFor.studentId}:${pkg.id}` && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                      </div>
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
