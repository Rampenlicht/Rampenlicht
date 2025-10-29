import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { APP_VERSION, getBuildDate } from '../../config/version';

const ProfilTab = ({ profile }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Einstellungen State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState('');
  
  // Dark Mode State
  const [darkModePreference, setDarkModePreference] = useState('auto');
  
  // Statistiken State
  const [statistics, setStatistics] = useState({
    aufladungen: 0,
    kaeufe: 0,
    ueberweisungen: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Dark Mode laden
  useEffect(() => {
    const savedPreference = localStorage.getItem('darkModePreference') || 'auto';
    setDarkModePreference(savedPreference);
  }, []);

  // Statistiken laden
  useEffect(() => {
    const loadStatistics = async () => {
      if (!user?.id) return;

      setLoadingStats(true);
      try {
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('type')
          .eq('user_id', user.id);

        if (error) throw error;

        // Transaktionen nach Typ zählen
        const stats = {
          aufladungen: 0,
          kaeufe: 0,
          ueberweisungen: 0
        };

        transactions?.forEach(transaction => {
          if (transaction.type === 'add') {
            stats.aufladungen++;
          } else if (transaction.type === 'remove') {
            stats.kaeufe++;
          } else if (transaction.type === 'send') {
            stats.ueberweisungen++;
          }
        });

        setStatistics(stats);
      } catch (error) {
        console.error('Fehler beim Laden der Statistiken:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadStatistics();
  }, [user?.id]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout-Fehler:', error);
      setIsLoggingOut(false);
    }
  };

  // Dark Mode ändern
  const handleDarkModeChange = (preference) => {
    setDarkModePreference(preference);
    localStorage.setItem('darkModePreference', preference);

    if (preference === 'light') {
      localStorage.setItem('darkMode', 'false');
      document.documentElement.classList.remove('dark');
    } else if (preference === 'dark') {
      localStorage.setItem('darkMode', 'true');
      document.documentElement.classList.add('dark');
    } else {
      // Auto - basierend auf System-Einstellung
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      localStorage.setItem('darkMode', String(prefersDark));
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  // Email ändern
  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    setUpdateError('');
    setUpdateSuccess('');
    setIsUpdating(true);

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      setUpdateSuccess('Bestätigungs-E-Mail wurde gesendet! Bitte prüfen Sie Ihr Postfach.');
      setTimeout(() => {
        setShowEmailModal(false);
        setNewEmail('');
        setUpdateSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Email-Update Fehler:', error);
      setUpdateError(error.message || 'Fehler beim Aktualisieren der E-Mail');
    } finally {
      setIsUpdating(false);
    }
  };

  // Passwort ändern
  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setUpdateError('');
    setUpdateSuccess('');

    if (!currentPassword) {
      setUpdateError('Bitte geben Sie Ihr aktuelles Passwort ein');
      return;
    }

    if (newPassword !== confirmPassword) {
      setUpdateError('Neue Passwörter stimmen nicht überein!');
      return;
    }

    if (newPassword.length < 6) {
      setUpdateError('Neues Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    if (currentPassword === newPassword) {
      setUpdateError('Neues Passwort muss sich vom alten unterscheiden');
      return;
    }

    setIsUpdating(true);

    try {
      // Schritt 1: Aktuelles Passwort überprüfen durch Re-Authentication
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (signInError) {
        setUpdateError('Aktuelles Passwort ist falsch!');
        setIsUpdating(false);
        return;
      }

      // Schritt 2: Neues Passwort setzen
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setUpdateSuccess('Passwort erfolgreich geändert!');
      setTimeout(() => {
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setUpdateSuccess('');
      }, 2000);
    } catch (error) {
      console.error('Password-Update Fehler:', error);
      setUpdateError(error.message || 'Fehler beim Aktualisieren des Passworts');
    } finally {
      setIsUpdating(false);
    }
  };

  // Formatiere Datum
  const formatDate = (dateString) => {
    if (!dateString) return 'Unbekannt';
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Profil Header */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-xl transition-colors duration-300">
        <div className="flex items-center space-x-4 mb-6">
          {/* Avatar */}
          <div className="h-20 w-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          
          {/* Name & Email */}
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
              {profile?.name || 'Benutzer'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {user?.email}
            </p>
          </div>
        </div>

        {/* Role Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Rolle</span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            profile?.role === 'cashier' 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
          }`}>
            {profile?.role === 'cashier' ? 'Kassierer' : 'Benutzer'}
          </span>
        </div>
      </div>

      {/* Einstellungen */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-xl transition-colors duration-300">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Einstellungen
        </h3>
        
        <div className="space-y-3">
          {/* E-Mail ändern */}
          <button
            onClick={() => setShowEmailModal(true)}
            className="w-full flex items-center justify-between py-3 px-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">E-Mail ändern</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Passwort ändern */}
          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full flex items-center justify-between py-3 px-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Passwort ändern</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Sicheres Passwort festlegen
                </p>
              </div>
            </div>
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Dark Mode Einstellung */}
          <div className="py-3 px-4">
            <div className="flex items-center space-x-3 mb-3">
              <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">Design</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Wähle dein bevorzugtes Theme
                </p>
              </div>
            </div>
            
            {/* Dark Mode Options */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button
                onClick={() => handleDarkModeChange('auto')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  darkModePreference === 'auto'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => handleDarkModeChange('light')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  darkModePreference === 'light'
                    ? 'bg-yellow-500 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                ☀️ Hell
              </button>
              <button
                onClick={() => handleDarkModeChange('dark')}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  darkModePreference === 'dark'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                🌙 Dunkel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiken */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-xl transition-colors duration-300">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Transaktions-Statistiken
        </h3>
        
        {loadingStats ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {/* Aufladungen */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-center mb-2">
                <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 text-center">
                {statistics.aufladungen}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1 text-center">Aufladungen</p>
            </div>

            {/* Käufe/Abbuchungen */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-center mb-2">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 text-center">
                {statistics.kaeufe}
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1 text-center">Käufe</p>
            </div>

            {/* Überweisungen */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-center mb-2">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 text-center">
                {statistics.ueberweisungen}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1 text-center">Überweisungen</p>
            </div>
          </div>
        )}
      </div>

      {/* Logout Button */}
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-xl transition-colors duration-300">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-red-400 disabled:to-red-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center space-x-3 group"
        >
          {isLoggingOut ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Wird abgemeldet...</span>
            </>
          ) : (
            <>
              <svg className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Abmelden</span>
            </>
          )}
        </button>
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-3">
          Du wirst zur Anmeldeseite weitergeleitet
        </p>
      </div>

      {/* App Info */}
      <div className="text-center space-y-1">
        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
          🎭 Rampenlicht App
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Digitale Guthaben-Verwaltung
        </p>
        <div className="flex items-center justify-center space-x-3 mt-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            v{APP_VERSION}
          </p>
          <span className="text-gray-300 dark:text-gray-600">•</span>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {getBuildDate()}
          </p>
        </div>
      </div>

      {/* E-Mail ändern Modal */}
      {showEmailModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowEmailModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">E-Mail ändern</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {updateError && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
                {updateError}
              </div>
            )}

            {updateSuccess && (
              <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-4">
                {updateSuccess}
              </div>
            )}

            <form onSubmit={handleEmailUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Aktuelle E-Mail
                </label>
                <input
                  type="email"
                  value={user?.email}
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Neue E-Mail
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="neue@email.de"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                ℹ️ Sie erhalten eine Bestätigungs-E-Mail an die neue Adresse.
              </p>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isUpdating ? 'Wird geändert...' : 'E-Mail ändern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Passwort ändern Modal */}
      {showPasswordModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowPasswordModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Passwort ändern</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {updateError && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4">
                {updateError}
              </div>
            )}

            {updateSuccess && (
              <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-4">
                {updateSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Aktuelles Passwort
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
                />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Neues Passwort
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Neues Passwort bestätigen
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                🔒 Mindestens 6 Zeichen erforderlich
              </p>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isUpdating ? 'Wird geändert...' : 'Passwort ändern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilTab;

