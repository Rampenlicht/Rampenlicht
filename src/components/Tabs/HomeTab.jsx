import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import User from '../dashboard/home/User';
import Balance from '../dashboard/home/Balance';
import LastTransactions from '../dashboard/home/LastTransactions';

const HomeTab = ({ profile }) => {
  const [balance, setBalance] = useState(profile?.balance || 0);
  const [transactions, setTransactions] = useState([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [connectedChannels, setConnectedChannels] = useState(0);
  const [totalChannels, setTotalChannels] = useState(0);

  const userId = profile?.id;
  const channelsRef = useRef([]);
  const isInitializedRef = useRef(false);
  const wasInBackgroundRef = useRef(false);
  const connectionCheckRef = useRef(null);

  // 🔄 VISIBILITY CHANGE MIT CHECKS
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👀 App wieder sichtbar - prüfe Verbindung...');
        
        // Progressiven Reconnect: Erst warten, dann prüfen, dann reconnecten
        setTimeout(() => {
          checkConnectionHealth();
        }, 1500);
        
      } else {
        console.log('📱 App im Hintergrund');
        wasInBackgroundRef.current = true;
        
        // Clear connection checks im Hintergrund
        if (connectionCheckRef.current) {
          clearTimeout(connectionCheckRef.current);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 🩺 CONNECTION HEALTH CHECK
  const checkConnectionHealth = useCallback(() => {
    if (!channelsRef.current.length) return;

    const connectedCount = channelsRef.current.filter(channel => 
      channel._subscriptionState === 'SUBSCRIBED'
    ).length;

    const totalCount = channelsRef.current.length;
    const healthPercentage = (connectedCount / totalCount) * 100;

    console.log(`📊 Connection Health: ${connectedCount}/${totalCount} (${healthPercentage.toFixed(0)}%)`);

    setConnectedChannels(connectedCount);
    setTotalChannels(totalCount);
    setIsRealtimeConnected(healthPercentage > 50); // Mind. 50% verbunden

    // Nur reconnecten wenn weniger als 70% der Channels verbunden sind
    if (healthPercentage < 70 && wasInBackgroundRef.current) {
      console.log('🔄 Schlechte Verbindung - starte optimierten Reconnect...');
      optimizedReconnect();
    } else if (healthPercentage >= 70) {
      console.log('✅ Gute Verbindung - kein Reconnect nötig');
      // Trotzdem Daten aktualisieren
      refreshAllData();
    }

    wasInBackgroundRef.current = false;
  }, []);

  // 🚀 OPTIMIERTER RECONNECT
  const optimizedReconnect = useCallback(() => {
    if (!userId) return;
    
    console.log('🚀 Starte optimierten Reconnect...');
    isInitializedRef.current = false;

    // Schritt 1: Alte Channels langsam entfernen
    channelsRef.current.forEach((channel, index) => {
      setTimeout(() => {
        supabase.removeChannel(channel);
      }, index * 200); // Gestaffeltes Cleanup
    });

    channelsRef.current = [];

    // Schritt 2: Neue Channels gestaffelt erstellen
    setTimeout(() => {
      setupRealtimeChannels();
    }, 500);
  }, [userId]);

  // 🔄 ALLE DATEN NEU LADEN
  const refreshAllData = useCallback(async () => {
    if (!userId) return;

    try {
      console.log('🔄 Lade Daten nach Reconnect...');
      
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

  // 🎯 REALTIME CHANNELS MIT STAGGERED CONNECT
  const setupRealtimeChannels = useCallback(() => {
    if (!userId || isInitializedRef.current) return;
    
    isInitializedRef.current = true;
    console.log('🎯 Starte gestaffelte Channel-Connections');

    channelsRef.current = [];

    // WICHTIGE CHANNELS ZUERST (Balance)
    setTimeout(() => {
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
          updateConnectionStatus();
        });

      channelsRef.current.push(balanceChannel);
    }, 0);

    // WENIGER WICHTIGE CHANNELS SPÄTER (Transactions)
    setTimeout(() => {
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
            console.log('✅ Transaction Update');
            setIsRealtimeConnected(true);
            // Debounced refresh für Performance
            setTimeout(() => refreshAllData(), 300);
          }
        )
        .subscribe((status) => {
          console.log('📡 Transactions Channel Status:', status);
          updateConnectionStatus();
        });

      channelsRef.current.push(transactionsChannel);
    }, 800); // 800ms Verzögerung

    setTotalChannels(2); // Wir haben 2 Channels
  }, [userId, refreshAllData]);

  // 📊 UPDATE CONNECTION STATUS
  const updateConnectionStatus = useCallback(() => {
    if (!channelsRef.current.length) return;

    const connectedCount = channelsRef.current.filter(channel => 
      channel._subscriptionState === 'SUBSCRIBED'
    ).length;

    setConnectedChannels(connectedCount);
    setIsRealtimeConnected(connectedCount > 0);

    console.log(`📈 Connection Progress: ${connectedCount}/${channelsRef.current.length}`);
  }, []);

  // 🚀 INIT EFFECT
  useEffect(() => {
    if (!userId) return;

    // Initiale Daten laden
    refreshAllData();
    
    // Gestaffelte Channel-Connections starten
    setupRealtimeChannels();

    // 🧹 CLEANUP
    return () => {
      console.log('🧹 Komponenten-Cleanup');
      
      // Clear timeouts
      if (connectionCheckRef.current) {
        clearTimeout(connectionCheckRef.current);
      }
      
      // Channels entfernen
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      
      isInitializedRef.current = false;
      wasInBackgroundRef.current = false;
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
        connectionInfo={`${connectedChannels}/${totalChannels}`}
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