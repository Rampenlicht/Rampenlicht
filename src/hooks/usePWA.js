import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Custom Hook für PWA Service Worker Management
 * Bietet Update-Benachrichtigungen und Kontrolle über Service Worker
 */
export function usePWA() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);

  const {
    needRefresh: [needRefreshState, setNeedRefreshState],
    offlineReady: [offlineReadyState, setOfflineReadyState],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('✅ Service Worker registriert:', registration);
      
      // Prüfe alle 60 Sekunden auf Updates
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000); // 60 Sekunden
      }
    },
    onRegisterError(error) {
      console.error('❌ Service Worker Registrierung fehlgeschlagen:', error);
    },
    onNeedRefresh() {
      console.log('🔄 Update verfügbar - Seite muss aktualisiert werden');
      setNeedRefresh(true);
      setNeedRefreshState(true);
    },
    onOfflineReady() {
      console.log('✅ App ist offline-bereit!');
      setOfflineReady(true);
      setOfflineReadyState(true);
    },
  });

  // Update App
  const updateApp = async () => {
    await updateServiceWorker(true);
    setNeedRefresh(false);
    // Seite neu laden
    window.location.reload();
  };

  // Verwerfe Update
  const dismissUpdate = () => {
    setNeedRefresh(false);
    setNeedRefreshState(false);
  };

  // Verwerfe Offline-Ready Nachricht
  const dismissOfflineReady = () => {
    setOfflineReady(false);
    setOfflineReadyState(false);
  };

  return {
    needRefresh,
    offlineReady,
    updateApp,
    dismissUpdate,
    dismissOfflineReady,
  };
}

