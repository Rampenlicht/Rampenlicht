// App Version und Build Info
// Diese Werte werden beim Deployment aktualisiert

export const APP_VERSION = '1.0.0';

// Build-Datum wird beim Build-Prozess gesetzt
// Format: DD.MM.YYYY
export const BUILD_DATE = __BUILD_DATE__;

// Alternativ: Statisches Datum für Development
export const BUILD_DATE_FALLBACK = new Date().toLocaleDateString('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

// Verwende Build-Datum wenn verfügbar, sonst Fallback
export const getBuildDate = () => {
  try {
    return typeof BUILD_DATE !== 'undefined' && BUILD_DATE !== '__BUILD_DATE__' 
      ? BUILD_DATE 
      : BUILD_DATE_FALLBACK;
  } catch {
    return BUILD_DATE_FALLBACK;
  }
};

