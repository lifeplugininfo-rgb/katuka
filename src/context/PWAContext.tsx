import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type PlatformType = 'ios' | 'android' | 'desktop';

interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  platform: PlatformType;
  showIosGuide: boolean;
  setShowIosGuide: (show: boolean) => void;
  promptInstall: () => Promise<{ outcome: 'accepted' | 'dismissed' | 'manual'; message?: string }>;
  offlineReady: boolean;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

// BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [platform, setPlatform] = useState<PlatformType>('desktop');
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
    const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isAndroid = /android/i.test(ua);

    if (isIos) {
      setPlatform('ios');
    } else if (isAndroid) {
      setPlatform('android');
    } else {
      setPlatform('desktop');
    }

    // Check standalone mode (already installed & launched as PWA)
    const checkStandalone = () => {
      const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as any).standalone === true;
      const isAndroidApp = document.referrer.includes('android-app://');
      const standalone = isDisplayStandalone || isIosStandalone || isAndroidApp;
      setIsStandalone(standalone);
      if (standalone) {
        setIsInstalled(true);
      }
    };

    checkStandalone();

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowIosGuide(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check service worker / cache
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setOfflineReady(true);
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<{ outcome: 'accepted' | 'dismissed' | 'manual'; message?: string }> => {
    // If running on iOS, open manual guide
    if (platform === 'ios') {
      setShowIosGuide(true);
      return { outcome: 'manual', message: 'iOS requires manual Add to Home Screen via Share menu' };
    }

    // If native prompt is available
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          return { outcome: 'accepted' };
        } else {
          return { outcome: 'dismissed' };
        }
      } catch (err) {
        console.warn('PWA prompt error:', err);
        return { outcome: 'dismissed', message: 'Installation prompt could not be launched' };
      }
    }

    // Fallback if prompt isn't caught yet or browser doesn't fire beforeinstallprompt (e.g. desktop safari/firefox or already installed)
    if (isStandalone || isInstalled) {
      return { outcome: 'accepted', message: 'Katukan Anka PWA is already installed!' };
    }

    // Manual guidance modal
    setShowIosGuide(true);
    return { outcome: 'manual', message: 'Follow browser menu instructions to install to Home Screen' };
  }, [deferredPrompt, platform, isStandalone, isInstalled]);

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isStandalone,
        platform,
        showIosGuide,
        setShowIosGuide,
        promptInstall,
        offlineReady,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = (): PWAContextType => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};
