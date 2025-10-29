'use client';
import { useEffect, useState } from 'react';

export default function Page() {
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe) {
      const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
      if (tgUser?.id) {
        setUserId(tgUser.id);
      }
    }
  }, []);

  return (
    <div>
      <h1>Telegram Mini App</h1>
      {userId ? (
        <p>Chat ID (User ID): {userId}</p>
      ) : (
        <p>Loading user info...</p>
      )}
    </div>
  );
}

