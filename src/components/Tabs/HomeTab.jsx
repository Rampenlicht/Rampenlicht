import { useEffect, useState, useRef, useCallback } from 'react';
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
  const isInitializedRef = useRef(false);

  // 🔄 VISIBILITY CHANGE DETECTION
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
      
      if (visible) {
        console.log('👀 App wurde sichtbar - reconnecte...');
        refreshAllData();
        reconnectChannels();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 🔄 ALLE DATEN NEU LADEN
  const refreshAllData = useCallback(async () => {
    if (!userId) return;

    try {
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
    } catch (error) {
      console.error('Fehler beim Daten laden:', error);
    }
  }, [userId]);

  // 🎯 REALTIME CHANNELS SETUP (nur einmal beim Start)
  const setupRealtimeChannels = useCallback(() => {
    if (!userId || isInitializedRef.current) return;
    
    isInitializedRef.current = true;
    console.log('🎯 Starte Realtime-Subscriptions');

    // Alte Channels entfernen falls vorhanden
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Balance Channel
    const balanceChannel = supabase
      .channel(`balance-${userId}`)
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
      });

    // Transactions Channel  
    const transactionsChannel = supabase
      .channel(`transactions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'transactions',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('✅ Transaction Update - refresh data');
          setIsRealtimeConnected(true);
          refreshAllData();
        }
      )
      .subscribe((status) => {
        console.log('📡 Transactions Channel Status:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    channelsRef.current = [balanceChannel, transactionsChannel];
  }, [userId, refreshAllData]);

  // 🔥 RECONNECT CHANNELS (nur bei Visibility Change)
  const reconnectChannels = useCallback(() => {
    if (!userId) return;
    
    console.log('🔄 Reconnecting channels...');
    isInitializedRef.current = false;
    setupRealtimeChannels();
  }, [userId, setupRealtimeChannels]);

  // 🚀 INIT EFFECT (nur einmal beim Mount)
  useEffect(() => {
    if (!userId) return;

    // Initiale Daten laden
    refreshAllData();
    
    // Channels setup (nur einmal)
    setupRealtimeChannels();

    // 🧹 CLEANUP
    return () => {
      console.log('🧹 Komponenten-Cleanup');
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      isInitializedRef.current = false;
    };
  }, [userId, refreshAllData, setupRealtimeChannels]);

  // 🔄 REFRESH FUNCTIONS
  const refreshBalance = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();
    if (data) setBalance(data.balance);
  }, [userId]);

  const refreshTransactions = useCallback(async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(5);
    if (data) setTransactions(data);
  }, [userId]);

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