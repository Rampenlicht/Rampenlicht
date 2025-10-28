import { useEffect, useState } from 'react';
import { profileService } from '../../services/profileService';
import { QRCodeSVG } from 'qrcode.react';

const UserCard = ({ userId }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (userId) {
        const { data } = await profileService.getProfile(userId);
        if (data) {
          setProfile(data);
        }
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-xl transition-colors duration-300">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-2xl bg-gray-300 dark:bg-gray-600 h-16 w-16"></div>
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-xl transition-colors duration-300">
      <div className="flex items-center space-x-4 mb-6">
        {/* Avatar */}
        <div className="h-16 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
          <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
            Willkommen zurück!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {profile?.name || profile?.email}
          </p>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center space-y-2 flex-shrink-0">
          <div className="bg-white p-2 rounded-lg border border-gray-200 dark:border-gray-600">
            {profile?.qrcode_id ? (
              <QRCodeSVG 
                value={profile.qrcode_id} 
                size={80}
                level="H"
                className="rounded"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
                <svg className="h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                </svg>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            ID: {profile?.qrcode_id || userId.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserCard;

