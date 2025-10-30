import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL oder Anon Key fehlen! Bitte .env Datei überprüfen.')
}

// Prüfe, ob WebSockets vom Server unterstützt werden
const isWebSocketSupported = () => {
  // Netlify, statische Hosts und manche Server unterstützen keine WebSockets
  const hostname = window.location.hostname;
  const isNetlify = hostname.includes('netlify.app');
  const isStaticHost = hostname.includes('pages.dev') || hostname.includes('vercel.app');
  
  // Wenn explizit deaktiviert via ENV
  if (import.meta.env.VITE_ENABLE_REALTIME === 'false') {
    console.warn('⚠️ Realtime ist via ENV deaktiviert - verwende Polling');
    return false;
  }
  
  if (isNetlify || isStaticHost) {
    console.warn('⚠️ Statischer Host erkannt - WebSockets nicht verfügbar');
    return false;
  }
  
  return true;
};

const websocketSupported = isWebSocketSupported();

// Konfiguration mit verbesserter PWA-Unterstützung und WebSocket-Detection
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: websocketSupported ? {
    params: {
      eventsPerSecond: 10  // Erhöht für bessere Responsiveness
    },
    // Timeout erhöhen für bessere Verbindungsstabilität
    timeout: 30000,
    // Heartbeat für Keep-Alive (wichtig für PWA!)
    heartbeatIntervalMs: 15000,
    // Reconnect-Logik mit Limit
    reconnectAfterMs: (tries) => {
      // Nach 3 Versuchen aufgeben (WebSocket funktioniert nicht)
      if (tries > 3) {
        console.error('❌ WebSocket-Verbindung fehlgeschlagen nach 3 Versuchen');
        console.warn('💡 Verwende Polling als Fallback');
        return null; // Kein weiterer Reconnect
      }
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, tries), 4000);
    }
  } : {
    // Realtime deaktiviert - Polling wird verwendet
    params: {
      eventsPerSecond: 0
    }
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Storage für bessere Session-Persistenz
    storage: window.localStorage,
    storageKey: 'supabase.auth.token'
  },
  // Global settings
  global: {
    headers: {
      'x-client-info': 'rampenlicht-pwa'
    }
  }
})

// Status-Variable für WebSocket-Support
let realtimeAvailable = websocketSupported;

/**
 * Prüft, ob Realtime verfügbar ist
 */
export const isRealtimeAvailable = () => realtimeAvailable;

/**
 * Setzt Realtime-Verfügbarkeit (wird von Komponenten aufgerufen)
 */
export const setRealtimeAvailable = (available) => {
  realtimeAvailable = available;
  if (!available) {
    console.warn('⚠️ Realtime nicht verfügbar - Polling aktiviert');
  }
};

// PWA Lifecycle Management
let activeChannels = new Map();

/**
 * Registriert einen Channel für PWA-Lifecycle-Management
 */
export const registerChannel = (key, channel) => {
  console.log(`📝 Registriere Channel: ${key}`);
  activeChannels.set(key, channel);
};

/**
 * Entfernt einen Channel aus dem Registry
 */
export const unregisterChannel = (key) => {
  console.log(`🗑️ Unregistriere Channel: ${key}`);
  activeChannels.delete(key);
};

/**
 * Schließt alle aktiven Channels
 */
export const closeAllChannels = async () => {
  const channels = supabase.getChannels();
  console.log(`🧹 Schließe ${channels.length} aktive Channels...`);
  
  for (const channel of channels) {
    try {
      await supabase.removeChannel(channel);
      console.log(`✅ Channel geschlossen: ${channel.topic}`);
    } catch (error) {
      console.error(`❌ Fehler beim Schließen von ${channel.topic}:`, error);
    }
  }
  
  activeChannels.clear();
  console.log('✅ Alle Channels geschlossen!');
};

/**
 * Zeigt alle aktiven Channels (für Debugging)
 */
export const debugChannels = () => {
  const channels = supabase.getChannels();
  console.log(`📊 Aktive Channels: ${channels.length}`);
  
  channels.forEach((ch, index) => {
    console.log(`${index + 1}. Topic: ${ch.topic} | State: ${ch.state}`);
  });
  
  return channels;
};

/**
 * PWA Visibility Change Handler
 * Wird aufgerufen, wenn die PWA in den Vordergrund/Hintergrund wechselt
 */
export const handlePWAVisibilityChange = async () => {
  if (document.hidden) {
    console.log('🌙 PWA in den Hintergrund - Channels bleiben aktiv');
  } else {
    console.log('☀️ PWA im Vordergrund - Prüfe Channels...');
    
    const channels = supabase.getChannels();
    const closedChannels = channels.filter(ch => ch.state === 'closed');
    
    if (closedChannels.length > 0) {
      console.log(`⚠️ ${closedChannels.length} geschlossene Channels gefunden`);
      console.log('💡 Komponenten sollten automatisch reconnecten');
    } else {
      console.log(`✅ Alle ${channels.length} Channels sind aktiv`);
    }
  }
};

/**
 * PWA Page Lifecycle Events (für iOS)
 */
export const handlePWAPageShow = (event) => {
  if (event.persisted) {
    console.log('🔄 PWA aus Back/Forward Cache wiederhergestellt');
    console.log('💡 Reconnecting alle Channels...');
    
    // Trigger reconnect für alle aktiven Channels
    const channels = supabase.getChannels();
    channels.forEach(ch => {
      if (ch.state === 'closed') {
        console.log(`🔄 Channel ${ch.topic} ist geschlossen, wird reconnected`);
      }
    });
  }
};

/**
 * Service Worker Message Handler
 */
export const handleServiceWorkerMessage = (event) => {
  if (event.data && event.data.type === 'PWA_ACTIVATED') {
    console.log('🚀 PWA Service Worker aktiviert');
  }
};

// Global für Debugging verfügbar machen
if (typeof window !== 'undefined') {
  window.supabaseDebug = {
    closeAll: closeAllChannels,
    showAll: debugChannels,
    reconnectAll: async () => {
      console.log('🔄 Reconnecting alle Channels...');
      await closeAllChannels();
      window.location.reload();
    },
    getChannels: () => supabase.getChannels()
  };
  
  console.log('💡 Debug-Tools verfügbar: window.supabaseDebug');
}

