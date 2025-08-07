import React, { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null;
  return (
    <div className="px-4 pt-2">
      <div className="rounded-2xl bg-yellow-400/20 border border-yellow-400/30 text-yellow-100 px-3 py-2 text-sm">
        Нет интернета. Показаны кэшированные данные (если доступны).
      </div>
    </div>
  );
}
