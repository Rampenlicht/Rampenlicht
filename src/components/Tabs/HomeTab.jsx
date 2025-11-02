import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import User from '../dashboard/home/User';
import Balance from '../dashboard/home/Balance';
import LastTransactions from '../dashboard/home/LastTransactions';

const HomeTab = ({ profile }) => {
  const [balance, setBalance] = useState(profile?.balance || 0);
  const [transactions, setTransactions] = useState([]);
  
  // 📡 Eigener Status pro Channel für präziseres Feedback
  const [balanceChannelStatus, setBalanceChannelStatus] = useState(null);
  const [txChannelStatus, setTxChannelStatus] = useState(null);

  // Abgeleiteter Status: Nur "echt" verbunden, wenn beide Channels laufen
  const isRealtimeConnected = 
    balanceChannelStatus === 'SUBSCRIBED' && 
    txChannelStatus === 'SUBSCRIBED';

  const userId = profile?.id;

  // 🔄 Nur Transaktionen neu laden
  const refreshTransactions = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(5);
      if (data) setTransactions(data);
    } catch (error) {
      console.error('Fehler beim Laden der Transaktionen:', error);
    }
  }, [userId]);

  // 🔄 Alle initialen Daten laden
  const refreshAllData = useCallback(async () => {
    if (!userId) return;
    console.log('🔄 Lade alle initialen Daten...');
    try {
      // Balance
      const { data: balanceData } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .single();
      if (balanceData) setBalance(balanceData.balance);

      // Transactions
      await refreshTransactions(); // Bestehende Funktion wiederverwenden
    } catch (error) {
      console.error('Fehler beim initialen Daten laden:', error);
    }
  }, [userId, refreshTransactions]);

  // 🚀 INIT & REALTIME EFFECT
  useEffect(() => {
    if (!userId) return;

    // 1. Initiale Daten laden
    refreshAllData();

    // 2. Balance Channel Setup
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
          console.log('✅ Balance Update (Realtime):', payload.new.balance);
          setBalance(payload.new.balance);
        }
      )
      .subscribe((status, err) => {
        console.log(`📡 Balance Channel Status: ${status}`, err || '');
        setBalanceChannelStatus(status);
        // Bei erfolgreicher Wiederverbindung (z.B. nach Hintergrund)
        // zur Sicherheit Balance neu laden
        if (status === 'SUBSCRIBED') {
          // Optional: refreshBalance() aufrufen, um verpasste Änderungen abzuholen
          // (obwohl Supabase das eigtl. cachen sollte)
        }
      });
    
    // 

    // 3. Transactions Channel Setup
    const transactionsChannel = supabase
      .channel(`transactions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Nur auf INSERT hören
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('✅ Neue Transaktion (Realtime):', payload.new);
          // Neue Transaktion effizient vorne anfügen
          setTransactions((currentTransactions) => 
            [payload.new, ...currentTransactions].slice(0, 5) // auf 5 limitieren
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE', // Optional: Auf UPDATE/DELETE hören
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`
        },
        () => {
          console.log('✅ Transaktion Update/Delete (Realtime) - Lade neu...');
          // Bei komplexeren Änderungen die Liste neu laden
          refreshTransactions();
        }
      )
      .subscribe((status, err) => {
        console.log(`📡 Transactions Channel Status: ${status}`, err || '');
        setTxChannelStatus(status);
        // Bei erfolgreicher Wiederverbindung Transaktionen neu laden
        // um sicherzustellen, dass nichts verpasst wurde
        if (status === 'SUBSCRIBED') {
          refreshTransactions();
        }
      });

    // 4. 🧹 CLEANUP
    return () => {
      console.log('🧹 Realtime-Cleanup');
      supabase.removeChannel(balanceChannel);
      supabase.removeChannel(transactionsChannel);
    };

    // Dieser Effect soll nur laufen, wenn die userId sich ändert.
    // Die Callbacks (refreshAllData, refreshTransactions) sind stabil dank useCallback.
  }, [userId, refreshAllData, refreshTransactions]);


  // 🔄 REFRESH FUNCTION (für Button)
  const refreshBalanceManually = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .single();
    if (data) setBalance(data.balance);
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
        onRefresh={refreshBalanceManually} // Manuelle Refresh-Funktion übergeben
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
