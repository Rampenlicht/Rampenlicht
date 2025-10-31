import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import User from '../dashboard/home/User';
import Balance from '../dashboard/home/Balance';
import LastTransactions from '../dashboard/home/LastTransactions';
import QRDisplay from '../dashboard/home/QRDisplay';

const HomeTab = ({ profile }) => {
  // Balance State
  const [balance, setBalance] = useState(profile?.balance || 0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [isBalanceRealtimeConnected, setIsBalanceRealtimeConnected] = useState(false);
  
  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [isTransactionsRealtimeConnected, setIsTransactionsRealtimeConnected] = useState(false);
  const [newTransactionIds, setNewTransactionIds] = useState(new Set());
  
  // Refs
  const balanceChannelRef = useRef(null);
  const transactionsChannelRef = useRef(null);
  const balancePollIntervalRef = useRef(null);
  const transactionsPollIntervalRef = useRef(null);
  
  // Flags für Verbindungsversuche
  const connectionAttemptsRef = useRef({
    balance: {
      attempted: false,
      failed: false,
      attempts: 0
    },
    transactions: {
      attempted: false,
      failed: false,
      attempts: 0
    }
  });

  // Cleanup-Flag um zu verhindern, dass nach Cleanup noch Callbacks ausgeführt werden
  const isMountedRef = useRef(true);

  const userId = profile?.id;

  // ========== BALANCE LOGIC ==========
  const loadBalance = useCallback(async () => {
    if (!userId || !isMountedRef.current) return;

    setBalanceLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error && isMountedRef.current) {
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Balance:', error);
    } finally {
      if (isMountedRef.current) {
        setBalanceLoading(false);
      }
    }
  }, [userId]);

  // ========== TRANSACTIONS LOGIC ==========
  const loadTransactions = useCallback(async () => {
    if (!userId || !isMountedRef.current) return;

    setTransactionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          sender:sender_id (id, name, email),
          receiver:receiver_id (id, name, email)
        `)
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (data && !error && isMountedRef.current) {
        setTransactions(data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Transaktionen:', error);
    } finally {
      if (isMountedRef.current) {
        setTransactionsLoading(false);
      }
    }
  }, [userId]);

  // ========== START POLLING ==========
  const startBalancePolling = useCallback(() => {
    if (balancePollIntervalRef.current || !isMountedRef.current) {
      return;
    }

    console.log('🔄 Starte Balance-Polling (Realtime fehlgeschlagen)...');
    connectionAttemptsRef.current.balance.failed = true;

    // Sofort einmal laden
    loadBalance();

    // Dann regelmäßiges Polling
    balancePollIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        console.log('🔄 Polling Balance...');
        loadBalance();
      }
    }, 3000);
  }, [loadBalance]);

  const startTransactionsPolling = useCallback(() => {
    if (transactionsPollIntervalRef.current || !isMountedRef.current) {
      return;
    }

    console.log('🔄 Starte Transactions-Polling (Realtime fehlgeschlagen)...');
    connectionAttemptsRef.current.transactions.failed = true;

    // Sofort einmal laden
    loadTransactions();

    // Dann regelmäßiges Polling
    transactionsPollIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        console.log('🔄 Polling Transactions...');
        loadTransactions();
      }
    }, 5000);
  }, [loadTransactions]);

  // ========== STOP POLLING ==========
  const stopBalancePolling = useCallback(() => {
    if (balancePollIntervalRef.current) {
      console.log('🛑 Stoppe Balance-Polling');
      clearInterval(balancePollIntervalRef.current);
      balancePollIntervalRef.current = null;
      connectionAttemptsRef.current.balance.failed = false;
    }
  }, []);

  const stopTransactionsPolling = useCallback(() => {
    if (transactionsPollIntervalRef.current) {
      console.log('🛑 Stoppe Transactions-Polling');
      clearInterval(transactionsPollIntervalRef.current);
      transactionsPollIntervalRef.current = null;
      connectionAttemptsRef.current.transactions.failed = false;
    }
  }, []);

  // ========== CLEANUP CHANNELS ==========
  const cleanupBalanceChannel = useCallback(() => {
    if (balanceChannelRef.current) {
      console.log('🧹 Entferne Balance-Channel');
      supabase.removeChannel(balanceChannelRef.current);
      balanceChannelRef.current = null;
    }
    setIsBalanceRealtimeConnected(false);
  }, []);

  const cleanupTransactionsChannel = useCallback(() => {
    if (transactionsChannelRef.current) {
      console.log('🧹 Entferne Transactions-Channel');
      supabase.removeChannel(transactionsChannelRef.current);
      transactionsChannelRef.current = null;
    }
    setIsTransactionsRealtimeConnected(false);
  }, []);

  // ========== BALANCE CHANNEL SETUP ==========
  const setupBalanceChannel = useCallback(() => {
    if (!userId || balanceChannelRef.current || !isMountedRef.current) return;

    console.log('🎯 Versuche Balance-Realtime-Verbindung...');
    connectionAttemptsRef.current.balance.attempted = true;
    connectionAttemptsRef.current.balance.attempts++;

    // Stoppe Polling falls aktiv (für Reconnect-Versuche)
    stopBalancePolling();

    const setupChannel = () => {
      // Cleanup vor neuen Versuch
      if (balanceChannelRef.current) {
        cleanupBalanceChannel();
      }

      const channelName = `balance-${userId}`;
      console.log(`🔌 Erstelle Balance-Realtime-Channel: ${channelName}`);

      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: userId },
            private: false,
            reconnect: true,
            timeout: 10000
          },
        })
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`,
          },
          (payload) => {
            if (!isMountedRef.current) return;
            console.log('✅ Balance Realtime Update:', payload);
            if (payload.new?.balance !== undefined) {
              setBalance(payload.new.balance);
            }
          }
        )
        .subscribe(async (status, err) => {
          if (!isMountedRef.current) return;

          console.log('📡 Realtime Status (Balance):', status);

          if (err) {
            console.error('❌ Realtime Fehler (Balance):', err);
          }

          if (status === 'SUBSCRIBED') {
            setIsBalanceRealtimeConnected(true);
            console.log('✅ Realtime verbunden (Balance) - Kein Polling nötig');

            // Stoppe Polling falls aktiv
            stopBalancePolling();
          }

          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsBalanceRealtimeConnected(false);
            console.warn('⚠️ Realtime Fehler (Balance) - Channel konnte nicht verbinden');
            
            // Starte Polling NUR wenn Channel-Verbindung fehlschlägt
            if (!balancePollIntervalRef.current && isMountedRef.current) {
              startBalancePolling();
            }
          }

          else if (status === 'CLOSED') {
            console.log('📴 Realtime geschlossen (Balance)');
            setIsBalanceRealtimeConnected(false);
            
            // Starte Polling NUR wenn die Verbindung unerwartet geschlossen wird
            // und wir noch mounted sind
            if (!balancePollIntervalRef.current && isMountedRef.current) {
              console.log('🔄 Balance-Verbindung verloren - starte Polling');
              startBalancePolling();
            }
          }
        });

      balanceChannelRef.current = channel;
    };

    setupChannel();
  }, [userId, loadBalance, startBalancePolling, stopBalancePolling, cleanupBalanceChannel]);

  // ========== TRANSACTIONS CHANNEL SETUP ==========
  const setupTransactionsChannel = useCallback(() => {
    if (!userId || transactionsChannelRef.current || !isMountedRef.current) return;

    console.log('🎯 Versuche Transactions-Realtime-Verbindung...');
    connectionAttemptsRef.current.transactions.attempted = true;
    connectionAttemptsRef.current.transactions.attempts++;

    // Stoppe Polling falls aktiv (für Reconnect-Versuche)
    stopTransactionsPolling();

    const setupChannel = () => {
      // Cleanup vor neuen Versuch
      if (transactionsChannelRef.current) {
        cleanupTransactionsChannel();
      }

      const channelName = `transactions-${userId}`;
      console.log(`🔌 Erstelle Transactions-Realtime-Channel: ${channelName}`);

      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: userId },
            private: false,
            reconnect: true,
            timeout: 10000
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!isMountedRef.current) return;
            console.log('✅ Neue Transaktion erhalten:', payload);
            setTransactions((prev) => [payload.new, ...prev].slice(0, 5));
            setNewTransactionIds((prev) => new Set(prev).add(payload.new.id));
            
            setTimeout(() => {
              if (isMountedRef.current) {
                setNewTransactionIds((prev) => {
                  const next = new Set(prev);
                  next.delete(payload.new.id);
                  return next;
                });
              }
            }, 3000);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!isMountedRef.current) return;
            console.log('🔄 Transaktion aktualisiert:', payload);
            setTransactions((prev) =>
              prev.map((t) => (t.id === payload.new.id ? payload.new : t))
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (!isMountedRef.current) return;
            console.log('🗑️ Transaktion gelöscht:', payload);
            setTransactions((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        )
        .subscribe((status, err) => {
          if (!isMountedRef.current) return;

          console.log('📡 Realtime Status (Transactions):', status);

          if (err) {
            console.error('❌ Realtime Fehler (Transactions):', err);
          }

          if (status === 'SUBSCRIBED') {
            setIsTransactionsRealtimeConnected(true);
            console.log('✅ Realtime verbunden (Transactions) - Kein Polling nötig');

            // Stoppe Polling falls aktiv
            stopTransactionsPolling();
          }

          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsTransactionsRealtimeConnected(false);
            console.warn('⚠️ Realtime Fehler (Transactions) - Channel konnte nicht verbinden');
            
            // Starte Polling NUR wenn Channel-Verbindung fehlschlägt
            if (!transactionsPollIntervalRef.current && isMountedRef.current) {
              startTransactionsPolling();
            }
          }

          else if (status === 'CLOSED') {
            console.log('📴 Realtime geschlossen (Transactions)');
            setIsTransactionsRealtimeConnected(false);
            
            // Starte Polling NUR wenn die Verbindung unerwartet geschlossen wird
            if (!transactionsPollIntervalRef.current && isMountedRef.current) {
              console.log('🔄 Transactions-Verbindung verloren - starte Polling');
              startTransactionsPolling();
            }
          }
        });

      transactionsChannelRef.current = channel;
    };

    setupChannel();
  }, [userId, loadTransactions, startTransactionsPolling, stopTransactionsPolling, cleanupTransactionsChannel]);

  // ========== INITIAL DATA LOAD & REALTIME SETUP ==========
  useEffect(() => {
    if (!userId) return;

    isMountedRef.current = true;

    const loadInitialData = async () => {
      console.log('🚀 Starte initiales Laden der Daten...');
      
      setTransactionsLoading(true);
      setBalanceLoading(true);

      try {
        // Paralleles Laden von Balance und Transactions
        await Promise.all([
          loadBalance(),
          loadTransactions()
        ]);
        
        if (!isMountedRef.current) return;
        
        console.log('✅ Initiales Laden abgeschlossen');
        
        // STARTE REALTIME VERSUCH NACH ERFOLGREICHEM LADEN
        console.log('🎯 Starte Realtime-Verbindungsversuche...');
        setupBalanceChannel();
        setupTransactionsChannel();
        
      } catch (error) {
        console.error('❌ Fehler beim initialen Laden:', error);
        
        if (!isMountedRef.current) return;
        
        // Falls initiales Laden fehlschlägt, starte Polling als Fallback
        if (!balancePollIntervalRef.current) {
          startBalancePolling();
        }
        if (!transactionsPollIntervalRef.current) {
          startTransactionsPolling();
        }
      }
    };

    loadInitialData();

    // Cleanup beim Verlassen der Komponente
    return () => {
      console.log('🧹 Komponenten-Cleanup: Stopping alles...');
      isMountedRef.current = false;
      
      stopBalancePolling();
      stopTransactionsPolling();
      cleanupBalanceChannel();
      cleanupTransactionsChannel();
      
      // Reset Flags
      connectionAttemptsRef.current = {
        balance: { attempted: false, failed: false, attempts: 0 },
        transactions: { attempted: false, failed: false, attempts: 0 }
      };
    };
  }, [
    userId, 
    loadBalance, 
    loadTransactions, 
    setupBalanceChannel, 
    setupTransactionsChannel,
    startBalancePolling,
    startTransactionsPolling,
    stopBalancePolling,
    stopTransactionsPolling,
    cleanupBalanceChannel,
    cleanupTransactionsChannel
  ]);

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
        loading={balanceLoading}
        isRealtimeConnected={isBalanceRealtimeConnected}
        onRefresh={loadBalance}
      />
      
      <LastTransactions 
        transactions={transactions}
        loading={transactionsLoading}
        isRealtimeConnected={isTransactionsRealtimeConnected}
        newTransactionIds={newTransactionIds}
      />
    </div>
  );
};

export default HomeTab;