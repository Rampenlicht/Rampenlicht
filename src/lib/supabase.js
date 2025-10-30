import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL oder Anon Key fehlt. Bitte .env Datei konfigurieren.')
}

// Verbesserte Konfiguration für iOS PWA & Self-hosted
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  realtime: {
    params: {
      eventsPerSecond: 10  // Erhöht für bessere Responsiveness
    },
    timeout: 30000,
    heartbeatIntervalMs: 15000,  // Kürzere Heartbeats für PWA/iOS
    
    // Exponential Backoff für Reconnects
    reconnectAfterMs: (tries) => {
      return Math.min(1000 * Math.pow(2, tries), 10000);
    }
  }
})