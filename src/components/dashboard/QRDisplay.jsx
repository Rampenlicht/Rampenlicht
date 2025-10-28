import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { profileService } from '../../services/profileService';

const QRDisplay = ({ userId, userName }) => {
  const [qrcodeId, setQrcodeId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQRCode = async () => {
      const { data: profile } = await profileService.getProfile(userId);
      if (profile) {
        setQrcodeId(profile.qrcode_id);
      }
      setLoading(false);
    };

    loadQRCode();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md text-center transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md text-center transition-colors duration-300">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Dein QR-Code</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Zeige diesen Code dem Kassierer zum Aufladen oder Abbuchungen
      </p>
      <div className="flex justify-center bg-white p-4 rounded-lg">
        <QRCodeSVG value={qrcodeId || userId} size={200} level="H" />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">{userName}</p>
      <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-2">
        ID: {qrcodeId || 'Lädt...'}
      </p>
    </div>
  );
};

export default QRDisplay;
