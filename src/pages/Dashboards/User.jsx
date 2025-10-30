import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { profileService } from '../../services/profileService';
import BottomNav from '../../components/dashboard/BottomNav';
import HeaderFix from '../../components/dashboard/HeaderFix';
import HomeTab from '../../components/Tabs/HomeTab';
import ProfilTab from '../../components/Tabs/ProfilTab';
function UserDashboard() {
  const [activeTab, setActiveTab] = useState('home');
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
        return <ProfilTab profile={profile} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300" style={{ paddingTop: '90px', paddingBottom: 'max(5rem, calc(5rem + env(safe-area-inset-bottom)))' }}>
      {/* Header */}
      <HeaderFix activeTab={activeTab} />

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