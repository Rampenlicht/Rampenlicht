import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Dark Mode aus localStorage laden
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
  }, []);

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

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', String(newDarkMode));
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwörter stimmen nicht überein!');
      return;
    }

    if (formData.password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await signUp(
        formData.email, 
        formData.password,
        { name: formData.name }
      );
      
      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Diese E-Mail-Adresse ist bereits registriert');
        } else if (signUpError.message.includes('Password should be')) {
          setError('Passwort entspricht nicht den Anforderungen');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      // Erfolgreich registriert
      setSuccess('Registrierung erfolgreich! Sie können sich jetzt anmelden.');
      
      // Nach 2 Sekunden zum Login weiterleiten
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      console.error('Registrierungs-Fehler:', err);
      setError('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-5 transition-colors duration-300">
      {/* Dark Mode Toggle Button */}
      <button
        onClick={toggleDarkMode}
        className="absolute top-5 right-5 p-3 rounded-lg bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200"
        aria-label="Dark Mode umschalten"
      >
        {darkMode ? (
          // Sonne Icon (Light Mode)
          <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          // Mond Icon (Dark Mode)
          <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-10 w-full max-w-md transition-colors duration-300">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white text-center mb-8">
          Registrieren
        </h1>
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="name" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ihr Name"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
            />
          </div>
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
              name="email"
              value={formData.email}
              onChange={handleChange}
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
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
            />
          </div>
          <div>
            <label 
              htmlFor="confirmPassword" 
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Passwort bestätigen
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
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
            {loading ? 'Wird registriert...' : 'Registrieren'}
          </button>
        </form>
        <p className="text-center text-gray-600 dark:text-gray-400 mt-6">
          Bereits ein Konto?{' '}
          <Link 
            to="/login" 
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
          >
            Jetzt anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;

