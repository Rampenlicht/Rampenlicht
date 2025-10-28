import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const BalanceCard = ({ userId, role }) => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSendMoneyModal, setShowSendMoneyModal] = useState(false);

  const loadBalance = async () => {
    if (!userId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .maybeSingle();

    if (data && !error) {
      setBalance(data.balance);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;

    loadBalance();

    let realtimeConnected = false;
    let pollInterval = null;

    // Realtime Subscription für automatische Updates
    const channel = supabase
      .channel(`balance-changes-${userId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: userId }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          console.log('✅ Realtime Update erhalten:', payload);
          realtimeConnected = true;
          if (payload.new && payload.new.balance !== undefined) {
            setBalance(payload.new.balance);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Realtime Status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime verbunden!');
          realtimeConnected = true;
          // Wenn Realtime funktioniert, Polling-Intervall verlängern
          if (pollInterval) {
            clearInterval(pollInterval);
          }
          pollInterval = setInterval(() => {
            console.log('🔄 Fallback Polling (Realtime aktiv)...');
            loadBalance();
          }, 60000); // Alle 60 Sekunden als Backup
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.log('❌ Realtime Fehler, nutze Polling:', status);
          realtimeConnected = false;
          // Bei Fehler: Aggressives Polling
          if (pollInterval) {
            clearInterval(pollInterval);
          }
          pollInterval = setInterval(() => {
            console.log('🔄 Polling Balance (Realtime inaktiv)...');
            loadBalance();
          }, 5000); // Alle 5 Sekunden
        }
      });

    // Initial: Polling alle 10 Sekunden starten
    pollInterval = setInterval(() => {
      if (!realtimeConnected) {
        console.log('🔄 Initial Polling...');
        loadBalance();
      }
    }, 10000);

    // Visibility Change Handler - Update beim Tab-Wechsel
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👀 App wieder sichtbar, aktualisiere Balance...');
        loadBalance();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Page Focus Handler - Update bei App-Fokus (wichtig für iOS)
    const handleFocus = () => {
      console.log('🎯 App fokussiert, aktualisiere Balance...');
      loadBalance();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      console.log('🧹 Cleanup: Removing channel and intervals');
      supabase.removeChannel(channel);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId]);

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/20 shadow-lg transition-colors duration-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aktuelles Guthaben</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {loading ? (
              <span className="animate-pulse">--,--</span>
            ) : (
              `€${parseFloat(balance || 0).toFixed(2)}`
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={loadBalance}
            className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg flex items-center justify-center transition-colors duration-200"
            title="Guthaben aktualisieren"
          >
            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
      <button 
        onClick={() => setShowSendMoneyModal(true)}
        className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        <span>Geld senden</span>
      </button>

      {/* TODO: SendMoneyModal Komponente hier einbauen wenn showSendMoneyModal true ist */}
      {showSendMoneyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSendMoneyModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Geld senden</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Diese Funktion kommt bald...</p>
            <button 
              onClick={() => setShowSendMoneyModal(false)}
              className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white py-2 rounded-lg transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceCard;

