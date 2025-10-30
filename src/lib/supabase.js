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
      eventsPerSecond: 10  // Balance zwischen Geschwindigkeit und Performance
    },    
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