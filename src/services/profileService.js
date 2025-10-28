import { supabase } from '../lib/supabase'

export const profileService = {
  // Profil anhand User-ID abrufen
  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Fehler beim Abrufen des Profils:', error)
      return { data: null, error }
    }
  },

  // Profil anhand QR-Code-ID abrufen
  async getProfileByQRCode(qrcodeId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('qrcode_id', qrcodeId)
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Fehler beim Abrufen des Profils per QR-Code:', error)
      return { data: null, error }
    }
  },

  // Profil aktualisieren
  async updateProfile(userId, updates) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Profils:', error)
      return { data: null, error }
    }
  },

  // Balance hinzufügen/abziehen
  async updateBalance(userId, amount) {
    try {
      // Aktuelles Profil abrufen
      const { data: profile, error: fetchError } = await this.getProfile(userId)
      if (fetchError) throw fetchError

      const newBalance = parseFloat(profile.balance) + parseFloat(amount)

      const { data, error } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Balance:', error)
      return { data: null, error }
    }
  },

  // Balance per QR-Code aktualisieren
  async updateBalanceByQRCode(qrcodeId, amount) {
    try {
      // Profil per QR-Code finden
      const { data: profile, error: fetchError } = await this.getProfileByQRCode(qrcodeId)
      if (fetchError) throw fetchError

      const newBalance = parseFloat(profile.balance) + parseFloat(amount)

      const { data, error } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('qrcode_id', qrcodeId)
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Balance:', error)
      return { data: null, error }
    }
  },

  // Alle Profile abrufen (nur für Admins)
  async getAllProfiles() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Fehler beim Abrufen aller Profile:', error)
      return { data: null, error }
    }
  },

  // Rolle ändern (nur für Admins)
  async updateRole(userId, newRole) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select()
        .single()
      
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Fehler beim Ändern der Rolle:', error)
      return { data: null, error }
    }
  }
}

