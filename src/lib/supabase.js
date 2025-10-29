import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL oder Anon Key fehlen! Bitte .env Datei überprüfen.')
}

// Konfiguration für statische Hosting-Plattformen (Netlify, Vercel)
// WebSockets funktionieren nicht auf statischen Hosts, daher deaktiviert
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    // Für statische Hosts: Realtime deaktivieren oder mit Fallback
    params: {
      eventsPerSecond: 2  // Reduziert für bessere Kompatibilität
    },
    // Timeout erhöhen für bessere Verbindungsstabilität
    timeout: 20000,
    // Heartbeat für Keep-Alive
    heartbeatIntervalMs: 30000
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Storage für bessere Session-Persistenz
    storage: window.localStorage,
    // Längere Session-Dauer
    storageKey: 'supabase.auth.token'
  },
  // Global settings
  global: {
    headers: {
      'x-client-info': 'rampenlicht-app'
    }
  }
})

