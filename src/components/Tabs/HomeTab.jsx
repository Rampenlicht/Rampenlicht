import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import User from '../dashboard/home/User';
import Balance from '../dashboard/home/Balance';
import LastTransactions from '../dashboard/home/LastTransactions';

const HomeTab = ({ profile }) => {
  const [balance, setBalance] = useState(profile?.balance || 0);
  const [transactions, setTransactions] = useState([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const userId = profile?.id;

  // Einfache, stabile Implementation wie im Realtime-Test
  useEffect(() => {
    if (!userId) return;

    console.log('🎯 Starte einfache Realtime-Subscriptions');

    // 1. Initiale Daten laden
    const loadInitialData = async () => {
      // Balance laden
      const { data: balanceData } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single();
      
      if (balanceData) setBalance(balanceData.balance);

      // Transactions laden
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (transactionsData) setTransactions(transactionsData);
    };

    loadInitialData();

    // 2. Einfache Realtime Subscriptions
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

    const transactionsChannel = supabase
      .channel(`transactions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public', 
          table: 'transactions',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('✅ Transaction Update:', payload);
          setIsRealtimeConnected(true);
          
          // Einfach neu laden statt komplexer State-Updates
          const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false })
            .limit(5);
            
          if (data) setTransactions(data);
        }
      )
      .subscribe((status) => {
        console.log('📡 Transactions Channel Status:', status);
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    // 3. Einfaches Cleanup
    return () => {
      console.log('🧹 Einfaches Cleanup');
      supabase.removeChannel(balanceChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, [userId]);

  // Einfache Refresh-Funktionen
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
        newTransactionIds={new Set()} // Vereinfacht
      />
    </div>
  );
};

export default HomeTab;