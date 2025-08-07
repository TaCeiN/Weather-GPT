import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler as any);
    // iOS style A2HS hint: Safari on iOS doesn't fire beforeinstallprompt
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window as any).navigator.standalone;
    if (isIos && !isStandalone) {
      // Small delay to avoid flashing immediately
      const t = setTimeout(() => setIosHint(true), 1200);
      return () => { window.removeEventListener('beforeinstallprompt', handler as any); clearTimeout(t); };
    }
    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  // Chrome/Android flow
  if (visible && deferred) {
    const install = async () => {
      try {
        await deferred.prompt();
        await deferred.userChoice;
      } finally {
        setVisible(false);
        setDeferred(null);
      }
    };
    const close = () => setVisible(false);
    return (
      <div className="px-4 pt-2">
        <div className="rounded-2xl bg-white/15 border border-white/20 backdrop-blur px-3 py-2 flex items-center justify-between">
          <div className="text-sm">Установить приложение на главный экран</div>
          <div className="flex gap-2">
            <button onClick={install} className="text-xs px-3 py-1 rounded-full bg-white/20 hover:bg-white/30">Установить</button>
            <button onClick={close} className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20">Позже</button>
          </div>
        </div>
      </div>
    );
  }

  // iOS hint flow
  if (iosHint) {
    const close = () => setIosHint(false);
    return (
      <div className="px-4 pt-2">
        <div className="rounded-2xl bg-white/15 border border-white/20 backdrop-blur px-3 py-2 flex items-center justify-between">
          <div className="text-sm">
            iOS: нажмите кнопку «Поделиться» и выберите «На экран "Домой"»
          </div>
          <button onClick={close} className="text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20">Ок</button>
        </div>
      </div>
    );
  }

  return null;
}
