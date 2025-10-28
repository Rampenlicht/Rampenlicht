import { supabase } from '../lib/supabase'

export const authService = {
  // Registrierung
  async signUp(email, password, userData = {}) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Registrierungsfehler:', error)
      return { data: null, error }
    }
  },

  // Login
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Login-Fehler:', error)
      return { data: null, error }
    }
  },

  // Logout
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Logout-Fehler:', error)
      return { error }
    }
  },

  // Aktuellen Benutzer abrufen
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return { user, error: null }
    } catch (error) {
      console.error('Fehler beim Abrufen des Benutzers:', error)
      return { user: null, error }
    }
  },

  // Session abrufen
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      return { session, error: null }
    } catch (error) {
      console.error('Fehler beim Abrufen der Session:', error)
      return { session: null, error }
    }
  },

  // Auth State Changes überwachen
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

