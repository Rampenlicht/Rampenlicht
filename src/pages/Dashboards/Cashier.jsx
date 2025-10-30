import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import BottomNav from '../../components/BottomNav';

function CashierDashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const { user, signOut } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Kassierer Dashboard
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Willkommen im Kassierer-Bereich
            </p>
          </div>
        );
      case 'verlauf':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Verlauf
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Alle Transaktionen
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
            <p className="text-green-600 dark:text-green-400 font-semibold">
              Rolle: Kassierer
            </p>
            <button
              onClick={signOut}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Abmelden
            </button>
          </div>
        );
      case 'scanner':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              QR-Code Scanner
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Scannen Sie QR-Codes für Transaktionen
            </p>
          </div>
        );
      case 'user':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Benutzer-Verwaltung
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Benutzer suchen und verwalten
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300" style={{ paddingBottom: 'max(5rem, calc(5rem + env(safe-area-inset-bottom)))' }}>
      {/* Content */}
      <div className="max-w-lg mx-auto px-6 py-8">
        {renderContent()}
      </div>

      {/* Bottom Navigation - mit role="kassierer" */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} role="kassierer" />
    </div>
  );
}

export default CashierDashboard;