import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { profileService } from '../../services/profileService';
import BottomNav from '../../components/BottomNav';
import HeaderFix from '../../components/HeaderFix';
import HomeTab from '../Tabs/HomeTab';

function UserDashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [profile, setProfile] = useState(null);
  const { user, signOut } = useAuth();

  useEffect(() => {
    // Profil laden
    const loadProfile = async () => {
      if (user) {
        const { data } = await profileService.getProfile(user.id);
        if (data) {
          setProfile(data);
        }
      }
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    // Dark Mode aus localStorage laden
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedDarkMode);
  }, []);

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

  const renderContent = () => {
    if (!profile) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      );
    }

    switch (activeTab) {
      case 'home':
        return <HomeTab profile={profile} />;
      case 'verlauf':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Verlauf
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Ihre Transaktionshistorie
            </p>
          </div>
        );
      case 'profil':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Profil
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              E-Mail: {user?.email}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              Rolle: {profile.role}
            </p>
            <button
              onClick={signOut}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Abmelden
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300" style={{ paddingTop: 'max(5rem, calc(5rem + env(safe-area-inset-top)))', paddingBottom: 'max(5rem, calc(5rem + env(safe-area-inset-bottom)))' }}>
      {/* Header */}
      <HeaderFix activeTab={activeTab} />

      {/* Dark Mode Toggle Button */}
      <button
        onClick={toggleDarkMode}
        className="fixed top-5 right-5 p-3 rounded-lg bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-200 z-50"
        aria-label="Dark Mode umschalten"
      >
        {darkMode ? (
          <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 py-8">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} role="user" />
    </div>
  );
}

export default UserDashboard;