import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL oder Anon Key fehlt. Bitte .env Datei konfigurieren.')
}else{
  console.log('✅ Supabase URL und Anon Key konfiguriert.')
}

// Optimierte Konfiguration für schnelle & zuverlässige Realtime-Verbindung
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  realtime: {
    params: {
      eventsPerSecond: 50  // Balance zwischen Geschwindigkeit und Performance
    },
    timeout: 10000,  // Kürzerer Timeout (10s statt 30s) für schnellere Fehler-Erkennung
    heartbeatIntervalMs: 5000,  // Heartbeat alle 5 Sekunden (schneller!)
    
    // Aggressiveres Reconnect mit schnellerem Start
    reconnectAfterMs: (tries) => {
      if (tries === 0) return 500;  // Erster Versuch nach 500ms
      return Math.min(500 * Math.pow(2, tries), 5000);  // Max 5s statt 10s
    },
    
    // Zusätzliche Optimierungen
    logger: (level, message, data) => {
      // Nur wichtige Logs anzeigen
      if (level === 'error' || level === 'info') {
        console.log(`[Realtime ${level}]`, message, data);
      }
    }
  },
  
  // Globale DB-Optimierungen
  db: {
    schema: 'public'
  },
  
  // Auth-Persistierung optimieren
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})