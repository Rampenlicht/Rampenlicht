import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import User from '../dashboard/home/User';
import Balance from '../dashboard/home/Balance';
import LastTransactions from '../dashboard/home/LastTransactions';

const HomeTab = ({ profile }) => {
  const [balance, setBalance] = useState(profile?.balance || 0);
  const [transactions, setTransactions] = useState([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const userId = profile?.id;
  const channelsRef = useRef([]);

  // 🔄 VISIBILITY CHANGE DETECTION
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
      
      if (visible) {
        console.log('👀 App wurde sichtbar - reconnecte...');
        // Sofortige Datenaktualisierung beim Zurückkehren
        refreshAllData();
        // Reconnect Channels
        reconnectChannels();
      } else {
        console.log('📱 App im Hintergrund - cleanup...');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 🔥 SOFORTIGER RECONNECT BEIM ZURÜCKKEHREN
  const reconnectChannels = () => {
    // Alte Channels entfernen
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Neue Channels erstellen
    setupRealtimeChannels();
  };

  // 🔄 ALLE DATEN NEU LADEN
  const refreshAllData = async () => {
    if (!userId) return;

    // Balance
    const { data: balanceData } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();
    if (balanceData) setBalance(balanceData.balance);

    // Transactions
    const { data: transactionsData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(5);
    if (transactionsData) setTransactions(transactionsData);
  };

  // 🎯 REALTIME CHANNELS SETUP
  const setupRealtimeChannels = () => {
    if (!userId) return;

    // Balance Channel
    const balanceChannel = supabase
      .channel(`balance-${userId}-${Date.now()}`) // Unique name
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          console.log('✅ Balance Update:', payload);
          setBalance(payload.new.balance);
          setIsRealtimeConnected(true);
        }
      )
      .subscribe((status) => {
        console.log('📡 Balance Channel Status:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
        
        // Bei Verbindungsproblemen reconnecten
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('🔄 Balance Channel closed, reconnecting...');
          setTimeout(() => reconnectChannels(), 1000);
        }
      });

    // Transactions Channel  
    const transactionsChannel = supabase
      .channel(`transactions-${userId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'transactions',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('✅ Transaction Update:', payload);
          setIsRealtimeConnected(true);
          await refreshAllData(); // Einfach alles neu laden
        }
      )
      .subscribe((status) => {
        console.log('📡 Transactions Channel Status:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
        
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('🔄 Transactions Channel closed, reconnecting...');
          setTimeout(() => reconnectChannels(), 1000);
        }
      });

    channelsRef.current = [balanceChannel, transactionsChannel];
  };

  // 🚀 INIT EFFECT
  useEffect(() => {
    if (!userId) return;

    console.log('🎯 Starte optimierte Realtime-Subscriptions');

    // Initiale Daten laden
    refreshAllData();
    
    // Channels setup
    setupRealtimeChannels();

    // 🔄 HEARTBEAT FÜR STABILE VERBINDUNG
    const heartbeatInterval = setInterval(() => {
      if (isVisible && isRealtimeConnected) {
        // Sende kleinen Ping um Verbindung aktiv zu halten
        console.log('💓 Heartbeat - connection active');
      }
    }, 30000); // Alle 30 Sekunden

    // 🧹 CLEANUP
    return () => {
      console.log('🧹 Komponenten-Cleanup');
      clearInterval(heartbeatInterval);
      
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [userId]);

  // 🔄 REFRESH FUNCTIONS
  const refreshBalance = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();
    if (data) setBalance(data.balance);
  };

  const refreshTransactions = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(5);
    if (data) setTransactions(data);
  };

  return (
    <div className="space-y-6">
      <User 
        name={profile?.name}
        email={profile?.email}
        qrcodeId={profile?.qrcode_id}
        userId={profile?.id}
        loading={false}
      />

      <Balance 
        balance={balance}
        loading={false}
        isRealtimeConnected={isRealtimeConnected}
        onRefresh={refreshBalance}
      />
      
      <LastTransactions 
        transactions={transactions}
        loading={false}
        isRealtimeConnected={isRealtimeConnected}
        newTransactionIds={new Set()}
      />
    </div>
  );
};

export default HomeTab;