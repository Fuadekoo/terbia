'use client';
// import { useEffect, useState } from 'react';
import { retrieveRawInitData } from '@telegram-apps/sdk'


export default function Page() {
const initDataRaw = retrieveRawInitData()
console.log(initDataRaw)
//   const [userId, setUserId] = useState<number | null>(null);

//   useEffect(() => {
//         // Check if the window object exists and if Telegram.WebApp.initDataUnsafe is available
//         if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe) {
//           // Get the user information from the Telegram WebApp initData
//           const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
//           if (tgUser?.id) {
//             setUserId(tgUser.id);    // Set the user ID in the state
//           }
//         }
//     }, []);

  return (
    <div>
      <h1>Telegram Mini App</h1>
      
      {initDataRaw ? (
        <p>Chat ID (User ID): {initDataRaw}</p>
      ) : (
        <p>Loading user info...</p>
      )}
    </div>
  );
}
