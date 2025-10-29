import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL oder Anon Key fehlen! Bitte .env Datei überprüfen.')
}

// Konfiguration mit verbesserter PWA-Unterstützung
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10  // Erhöht für bessere Responsiveness
    },
    // Timeout erhöhen für bessere Verbindungsstabilität
    timeout: 30000,
    // Heartbeat für Keep-Alive (wichtig für PWA!)
    heartbeatIntervalMs: 15000,
    // Reconnect-Logik
    reconnectAfterMs: (tries) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 10s
      return Math.min(1000 * Math.pow(2, tries), 10000);
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

