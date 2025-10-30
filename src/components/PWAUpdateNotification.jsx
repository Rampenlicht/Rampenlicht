import React from 'react';
import { usePWA } from '../hooks/usePWA';

/**
 * PWA Update Benachrichtigung
 * Zeigt einen Banner an, wenn ein App-Update verfügbar ist
 */
export default function PWAUpdateNotification() {
  const { needRefresh, offlineReady, updateApp, dismissUpdate, dismissOfflineReady } = usePWA();

  // Offline-Ready Benachrichtigung
  if (offlineReady) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
        <div className="bg-green-600 text-white rounded-lg shadow-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="shrink-0">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">App ist offline-bereit!</p>
              <p className="text-xs opacity-90">Du kannst die App jetzt auch offline nutzen</p>
            </div>
          </div>
          <button
            onClick={dismissOfflineReady}
            className="shrink-0 ml-3 text-white hover:text-gray-200 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Update verfügbar Benachrichtigung
  if (needRefresh) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
        <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="shrink-0">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Update verfügbar!</p>
              <p className="text-xs opacity-90 mb-3">Eine neue Version der App ist verfügbar</p>
              <div className="flex space-x-2">
                <button
                  onClick={updateApp}
                  className="flex-1 bg-white text-blue-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  Jetzt aktualisieren
                </button>
                <button
                  onClick={dismissUpdate}
                  className="px-3 py-2 text-sm text-white hover:text-gray-200 transition-colors"
                >
                  Später
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

