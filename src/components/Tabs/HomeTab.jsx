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
  
  // Flags für erstmaliges Laden und Realtime-Initialisierung
  const initialLoadRef = useRef({
    balance: false,
    transactions: false,
    realtimeInitialized: false
  });

  const userId = profile?.id;

  // ========== BALANCE LOGIC ==========
  const loadBalance = useCallback(async () => {
    if (!userId) return;

    setBalanceLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
        .maybeSingle();

      if (data && !error) {
        setBalance(data.balance);
      }
    } catch (error) {
      console.error('Fehler beim Laden des Balance:', error);
    } finally {
      setBalanceLoading(false);
    }
  }, [userId]);

  // ========== TRANSACTIONS LOGIC ==========
  const loadTransactions = useCallback(async () => {
    if (!userId) return;

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

      if (data && !error) {
        setTransactions(data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Transaktionen:', error);
    } finally {
      setTransactionsLoading(false);
    }
  }, [userId]);

  // ========== INITIAL DATA LOAD ==========
  useEffect(() => {
    if (!userId) return;

    const loadInitialData = async () => {
      console.log('🚀 Starte initiales Laden der Daten...');
      
      // Setze Loading-States zurück
      setTransactionsLoading(true);
      setBalanceLoading(true);

      try {
        // Paralleles Laden von Balance und Transactions
        await Promise.all([
          loadBalance(),
          loadTransactions()
        ]);
        
        console.log('✅ Initiales Laden abgeschlossen');
        
        // Markiere initiales Laden als abgeschlossen
        initialLoadRef.current.balance = true;
        initialLoadRef.current.transactions = true;
        
        // Starte Realtime SOFORT nach erfolgreichem Laden
        initializeRealtime();
        
      } catch (error) {
        console.error('❌ Fehler beim initialen Laden:', error);
      }
    };

    loadInitialData();
  }, [userId, loadBalance, loadTransactions]);

  // ========== REALTIME INITIALIZATION ==========
  const initializeRealtime = useCallback(() => {
    if (!userId || initialLoadRef.current.realtimeInitialized) {
      return;
    }

    console.log('🎯 Initialisiere Realtime-Connections...');
    initialLoadRef.current.realtimeInitialized = true;

    // Starte beide Realtime-Connections
    setupBalanceChannel();
    setupTransactionsChannel();
  }, [userId]);

  // ========== BALANCE CHANNEL SETUP ==========
  const setupBalanceChannel = useCallback(() => {
    if (!userId || balanceChannelRef.current) return;

    let isSubscribed = false;
    let reconnectTimeoutRef = null;

    const setupChannel = () => {
      if (balanceChannelRef.current) {
        supabase.removeChannel(balanceChannelRef.current);
        balanceChannelRef.current = null;
      }

      const channelName = `balance-${userId}-${Date.now()}`;
      console.log(`🔌 Erstelle Balance-Realtime-Channel: ${channelName}`);

      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: userId },
            private: false,
            // Wichtig für zuverlässige Verbindungen
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
            console.log('✅ Balance Realtime Update:', payload);
            if (payload.new?.balance !== undefined) {
              setBalance(payload.new.balance);
            }
          }
        )
        .subscribe(async (status, err) => {
          console.log('📡 Realtime Status (Balance):', status);

          if (err) {
            console.error('❌ Realtime Fehler (Balance):', err);
          }

          if (status === 'SUBSCRIBED') {
            isSubscribed = true;
            setIsBalanceRealtimeConnected(true);
            console.log('✅ Realtime verbunden (Balance)');

            // Stoppe Fallback-Polling
            if (balancePollIntervalRef.current) {
              clearInterval(balancePollIntervalRef.current);
              balancePollIntervalRef.current = null;
            }

            // Backup-Check alle 2 Minuten
            balancePollIntervalRef.current = setInterval(() => {
              console.log('🔄 Backup-Check (Balance Realtime aktiv)…');
              loadBalance();
            }, 120000);
          }

          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsBalanceRealtimeConnected(false);
            console.warn('⚠️ Realtime Fehler (Balance) – starte Fallback-Polling');

            // Polling alle 3 Sekunden
            if (!balancePollIntervalRef.current) {
              balancePollIntervalRef.current = setInterval(() => {
                console.log('🔄 Polling Balance (Realtime inaktiv)…');
                loadBalance();
              }, 3000);
            }

            // Schnellerer Reconnect (1s)
            if (reconnectTimeoutRef) {
              clearTimeout(reconnectTimeoutRef);
            }
            reconnectTimeoutRef = setTimeout(() => {
              console.log('🔄 Versuche Reconnect (Balance)…');
              setupChannel();
            }, 1000);
          }

          else if (status === 'CLOSED') {
            console.log('📴 Realtime geschlossen (Balance)');
            
            if (isSubscribed) {
              setIsBalanceRealtimeConnected(false);
              console.warn('⚠️ Balance-Verbindung unerwartet geschlossen – starte Fallback');

              // Polling alle 3 Sekunden
              if (!balancePollIntervalRef.current) {
                balancePollIntervalRef.current = setInterval(() => {
                  console.log('🔄 Polling Balance (Realtime inaktiv)…');
                  loadBalance();
                }, 3000);
              }

              // Schneller Reconnect (1s)
              if (reconnectTimeoutRef) {
                clearTimeout(reconnectTimeoutRef);
              }
              reconnectTimeoutRef = setTimeout(() => {
                console.log('🔄 Versuche Reconnect nach unerwarteter Trennung (Balance)…');
                setupChannel();
              }, 1000);
            }
          }
        });

      balanceChannelRef.current = channel;
    };

    setupChannel();
  }, [userId, loadBalance]);

  // ========== TRANSACTIONS CHANNEL SETUP ==========
  const setupTransactionsChannel = useCallback(() => {
    if (!userId || transactionsChannelRef.current) return;

    let isSubscribed = false;
    let reconnectTimeoutRef = null;

    const setupChannel = () => {
      if (transactionsChannelRef.current) {
        supabase.removeChannel(transactionsChannelRef.current);
        transactionsChannelRef.current = null;
      }

      const channelName = `transactions-${userId}-${Date.now()}`;
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
            console.log('✅ Neue Transaktion erhalten:', payload);
            setTransactions((prev) => [payload.new, ...prev].slice(0, 5));
            setNewTransactionIds((prev) => new Set(prev).add(payload.new.id));
            
            setTimeout(() => {
              setNewTransactionIds((prev) => {
                const next = new Set(prev);
                next.delete(payload.new.id);
                return next;
              });
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
            console.log('🗑️ Transaktion gelöscht:', payload);
            setTransactions((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        )
        .subscribe((status, err) => {
          console.log('📡 Realtime Status (Transactions):', status);

          if (err) {
            console.error('❌ Realtime Fehler (Transactions):', err);
          }

          if (status === 'SUBSCRIBED') {
            isSubscribed = true;
            setIsTransactionsRealtimeConnected(true);
            console.log('✅ Realtime verbunden (Transactions)');

            // Stoppe Fallback-Polling
            if (transactionsPollIntervalRef.current) {
              clearInterval(transactionsPollIntervalRef.current);
              transactionsPollIntervalRef.current = null;
            }

            // Backup-Check alle 2 Minuten
            transactionsPollIntervalRef.current = setInterval(() => {
              console.log('🔄 Backup-Check (Transactions Realtime aktiv)…');
              loadTransactions();
            }, 120000);
          }

          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsTransactionsRealtimeConnected(false);
            console.warn('⚠️ Realtime Fehler (Transactions) – starte Fallback-Polling');

            // Polling alle 5 Sekunden
            if (!transactionsPollIntervalRef.current) {
              transactionsPollIntervalRef.current = setInterval(() => {
                console.log('🔄 Polling Transactions (Realtime inaktiv)…');
                loadTransactions();
              }, 5000);
            }

            // Schnellerer Reconnect (1s)
            if (reconnectTimeoutRef) {
              clearTimeout(reconnectTimeoutRef);
            }
            reconnectTimeoutRef = setTimeout(() => {
              console.log('🔄 Versuche Reconnect (Transactions)…');
              setupChannel();
            }, 1000);
          }

          else if (status === 'CLOSED') {
            console.log('📴 Realtime geschlossen (Transactions)');
            
            if (isSubscribed) {
              setIsTransactionsRealtimeConnected(false);
              console.warn('⚠️ Transactions-Verbindung unerwartet geschlossen – starte Fallback');

              // Polling alle 5 Sekunden
              if (!transactionsPollIntervalRef.current) {
                transactionsPollIntervalRef.current = setInterval(() => {
                  console.log('🔄 Polling Transactions (Realtime inaktiv)…');
                  loadTransactions();
                }, 5000);
              }

              // Schneller Reconnect (1s)
              if (reconnectTimeoutRef) {
                clearTimeout(reconnectTimeoutRef);
              }
              reconnectTimeoutRef = setTimeout(() => {
                console.log('🔄 Versuche Reconnect nach unerwarteter Trennung (Transactions)…');
                setupChannel();
              }, 1000);
            }
          }
        });

      transactionsChannelRef.current = channel;
    };

    setupChannel();
  }, [userId, loadTransactions]);

  // ========== CLEANUP ==========
  useEffect(() => {
    return () => {
      console.log('🧹 Global Cleanup: Entferne alle Channels & Timer');
      
      // Balance Cleanup
      if (balanceChannelRef.current) {
        supabase.removeChannel(balanceChannelRef.current);
        balanceChannelRef.current = null;
      }
      if (balancePollIntervalRef.current) {
        clearInterval(balancePollIntervalRef.current);
        balancePollIntervalRef.current = null;
      }
      
      // Transactions Cleanup
      if (transactionsChannelRef.current) {
        supabase.removeChannel(transactionsChannelRef.current);
        transactionsChannelRef.current = null;
      }
      if (transactionsPollIntervalRef.current) {
        clearInterval(transactionsPollIntervalRef.current);
        transactionsPollIntervalRef.current = null;
      }
      
      // Reset Flags
      initialLoadRef.current.realtimeInitialized = false;
    };
  }, []);

  // ========== PWA VISIBILITY HANDLING ==========
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👀 App wieder sichtbar, prüfe Realtime-Connections...');
        
        // Prüfe Balance Connection
        if (balanceChannelRef.current && balanceChannelRef.current.state !== 'subscribed') {
          console.log('🔄 Reconnecting Balance nach Visibility Change...');
          setupBalanceChannel();
        }
        
        // Prüfe Transactions Connection
        if (transactionsChannelRef.current && transactionsChannelRef.current.state !== 'subscribed') {
          console.log('🔄 Reconnecting Transactions nach Visibility Change...');
          setupTransactionsChannel();
        }
        
        // Aktualisiere Daten
        loadBalance();
        loadTransactions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setupBalanceChannel, setupTransactionsChannel, loadBalance, loadTransactions]);

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