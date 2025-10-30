import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  // Wenn bereits eingeloggt, automatisch weiterleiten
  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      if (user) {
        console.log('Benutzer bereits eingeloggt, lade Profil...');
        const { data: profile } = await profileService.getProfile(user.id);
        
        if (profile) {
          console.log('Weiterleitung basierend auf Rolle:', profile.role);
          if (profile.role === 'cashier') {
            navigate('/dashboards/cashier', { replace: true });
          } else {
            navigate('/dashboards/user', { replace: true });
          }
        }
      }
    };

    redirectIfLoggedIn();
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: authData, error: signInError } = await signIn(email, password);
      
      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Ungültige E-Mail oder Passwort');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse');
        } else {
          setError(signInError.message);
        }
        return;
      }

      // Profil laden und basierend auf Rolle weiterleiten
      if (authData?.user) {
        console.log('User ID:', authData.user.id);
        const { data: profile, error: profileError } = await profileService.getProfile(authData.user.id);
        
        console.log('Profil geladen:', profile);
        console.log('Profil Fehler:', profileError);
        
        if (profile) {
          console.log('Benutzer-Rolle:', profile.role);
          
          // Weiterleitung basierend auf Rolle
          if (profile.role === 'cashier') {
            console.log('Weiterleitung zu Cashier Dashboard');
            navigate('/dashboards/cashier');
          } else {
            console.log('Weiterleitung zu User Dashboard');
            navigate('/dashboards/user');
          }
        } else {
          console.warn('Kein Profil gefunden! Fehler:', profileError);
          setError('Profil konnte nicht geladen werden. Bitte kontaktieren Sie den Support.');
        }
      }
    } catch (err) {
      console.error('Login-Fehler:', err);
      setError('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-5 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-10 w-full max-w-md transition-colors duration-300">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white text-center mb-8">
          Anmelden
        </h1>
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              E-Mail
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre@email.de"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
            />
          </div>
          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Passwort
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transform hover:-translate-y-0.5 transition-all duration-200 shadow-lg hover:shadow-xl disabled:transform-none"
          >
            {loading ? 'Wird angemeldet...' : 'Anmelden'}
          </button>
        </form>
        <p className="text-center text-gray-600 dark:text-gray-400 mt-6">
          Noch kein Konto?{' '}
          <Link 
            to="/register" 
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
          >
            Jetzt registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;

