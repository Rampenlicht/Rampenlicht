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

  const userId = profile?.id;

  // ========== BALANCE LOGIC ==========
  const loadBalance = useCallback(async () => {
    if (!userId) return;

    setBalanceLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', userId)
      .maybeSingle();

    if (data && !error) {
      setBalance(data.balance);
    }
    setBalanceLoading(false);
  }, [userId]);

  // ========== TRANSACTIONS LOGIC ==========
  const loadTransactions = useCallback(async () => {
    if (!userId) return;

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
    setTransactionsLoading(false);
  }, [userId]);

  // ========== BALANCE REALTIME SETUP ==========
  useEffect(() => {
    if (!userId) return;

    loadBalance();

    let isSubscribed = false;
    let reconnectTimeoutRef = null;

    const setupBalanceChannel = () => {
      if (balanceChannelRef.current) {
        console.log('🧹 Entferne alten Balance-Channel...');
        supabase.removeChannel(balanceChannelRef.current);
        balanceChannelRef.current = null;
      }

      const channelName = `balance-${userId}`;
      console.log(`🔌 Erstelle neuen Balance-Channel: ${channelName}`);

      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },  // Keine Self-Broadcast nötig
            presence: { key: userId },
            private: false  // Public channel für bessere Performance
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
        .subscribe((status, err) => {
          console.log('📡 Realtime Status (Balance):', status);

          if (err) {
            console.error('❌ Realtime Fehler (Balance):', err);
          }

          if (status === 'SUBSCRIBED') {
            isSubscribed = true;
            setIsBalanceRealtimeConnected(true);
            console.log('✅ Realtime verbunden (Balance) – kein Polling nötig');

            // Stoppe Fallback-Polling
            if (balancePollIntervalRef.current) {
              clearInterval(balancePollIntervalRef.current);
              balancePollIntervalRef.current = null;
            }

            // Backup-Check alle 2 Minuten (statt 5)
            balancePollIntervalRef.current = setInterval(() => {
              console.log('🔄 Backup-Check (Balance Realtime aktiv)…');
              loadBalance();
            }, 120000); // 2 Minuten
          }

          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsBalanceRealtimeConnected(false);
            console.warn('⚠️ Realtime Fehler (Balance) – starte Fallback-Polling');

            // Sofort einmal laden
            loadBalance();

            // Dann Polling alle 3 Sekunden (statt 5)
            if (!balancePollIntervalRef.current) {
              balancePollIntervalRef.current = setInterval(() => {
                console.log('🔄 Polling Balance (Realtime inaktiv)…');
                loadBalance();
              }, 3000);
            }

            // Schnellerer Reconnect (1s statt 3s)
            if (reconnectTimeoutRef) {
              clearTimeout(reconnectTimeoutRef);
            }
            reconnectTimeoutRef = setTimeout(() => {
              console.log('🔄 Versuche Reconnect (Balance)…');
              setupBalanceChannel();
            }, 1000);
          }

          else if (status === 'CLOSED') {
            console.log('📴 Realtime geschlossen (Balance)');
            
            if (isSubscribed) {
              setIsBalanceRealtimeConnected(false);
              console.warn('⚠️ Balance-Verbindung unerwartet geschlossen – starte Fallback');

              // Sofort einmal laden
              loadBalance();

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
                setupBalanceChannel();
              }, 1000);
            }
          }
        });

      balanceChannelRef.current = channel;
    };

    setupBalanceChannel();

    // ========== PWA/iOS LIFECYCLE EVENTS ==========
    
    // 1. PWA PageShow Event - Wichtig für iOS Back/Forward Cache
    const handlePageShow = (event) => {
      if (event.persisted) {
        console.log('🔄 PWA aus Back/Forward Cache (Balance) - Force Reconnect');
        loadBalance();
        
        setTimeout(() => {
          if (!balanceChannelRef.current || balanceChannelRef.current.state === 'closed') {
            console.log('🔄 Force Reconnecting Balance nach BFCache...');
            setupBalanceChannel();
          }
        }, 500);
      }
    };
    
    // 2. PWA Resume Event (iOS-spezifisch)
    const handleResume = () => {
      console.log('▶️ PWA resumed (Balance), prüfe Connection...');
      
      setTimeout(() => {
        if (!balanceChannelRef.current || balanceChannelRef.current.state === 'closed') {
          console.log('🔄 Reconnecting Balance nach Resume...');
          setupBalanceChannel();
        } else {
          console.log('✅ Balance Channel noch aktiv');
        }
      }, 1000);
    };
    
    // 3. Visibility Change (Browser & PWA)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👀 App wieder sichtbar (Balance), aktualisiere...');
        loadBalance();
        
        if (balanceChannelRef.current && balanceChannelRef.current.state === 'closed') {
          console.log('🔄 Reconnecting Balance nach Visibility...');
          setupBalanceChannel();
        }
      }
    };
    
    // Event Listeners registrieren
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('resume', handleResume);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log('🧹 Cleanup: Entferne Balance-Channel & Timer');
      isSubscribed = false;
      
      if (reconnectTimeoutRef) {
        clearTimeout(reconnectTimeoutRef);
        reconnectTimeoutRef = null;
      }
      
      if (balanceChannelRef.current) {
        supabase.removeChannel(balanceChannelRef.current);
        balanceChannelRef.current = null;
      }
      
      if (balancePollIntervalRef.current) {
        clearInterval(balancePollIntervalRef.current);
        balancePollIntervalRef.current = null;
      }
      
      // Event Listeners entfernen
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('resume', handleResume);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, loadBalance]);

  // ========== TRANSACTIONS REALTIME SETUP ==========
  useEffect(() => {
    if (!userId) return;

    loadTransactions();

    let isSubscribed = false;
    let reconnectTimeoutRef = null;

    const setupTransactionsChannel = () => {
      if (transactionsChannelRef.current) {
        console.log('🧹 Entferne alten Transactions-Channel...');
        supabase.removeChannel(transactionsChannelRef.current);
        transactionsChannelRef.current = null;
      }

      const channelName = `transactions-${userId}`;
      console.log(`🔌 Erstelle neuen Transactions-Channel: ${channelName}`);

      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },  // Keine Self-Broadcast nötig
            presence: { key: userId },
            private: false  // Public channel für bessere Performance
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
            console.log('✅ Realtime verbunden (Transactions) – kein Polling nötig');

            // Stoppe Fallback-Polling
            if (transactionsPollIntervalRef.current) {
              clearInterval(transactionsPollIntervalRef.current);
              transactionsPollIntervalRef.current = null;
            }

            // Backup-Check alle 2 Minuten (statt 5)
            transactionsPollIntervalRef.current = setInterval(() => {
              console.log('🔄 Backup-Check (Transactions Realtime aktiv)…');
              loadTransactions();
            }, 120000); // 2 Minuten
          }

          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsTransactionsRealtimeConnected(false);
            console.warn('⚠️ Realtime Fehler (Transactions) – starte Fallback-Polling');

            // Sofort einmal laden
            loadTransactions();

            // Dann Polling alle 5 Sekunden (statt 10)
            if (!transactionsPollIntervalRef.current) {
              transactionsPollIntervalRef.current = setInterval(() => {
                console.log('🔄 Polling Transactions (Realtime inaktiv)…');
                loadTransactions();
              }, 5000);
            }

            // Schnellerer Reconnect (1s statt 3s)
            if (reconnectTimeoutRef) {
              clearTimeout(reconnectTimeoutRef);
            }
            reconnectTimeoutRef = setTimeout(() => {
              console.log('🔄 Versuche Reconnect (Transactions)…');
              setupTransactionsChannel();
            }, 1000);
          }

          else if (status === 'CLOSED') {
            console.log('📴 Realtime geschlossen (Transactions)');
            
            if (isSubscribed) {
              setIsTransactionsRealtimeConnected(false);
              console.warn('⚠️ Transactions-Verbindung unerwartet geschlossen – starte Fallback');

              // Sofort einmal laden
              loadTransactions();

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
                setupTransactionsChannel();
              }, 1000);
            }
          }
        });

      transactionsChannelRef.current = channel;
    };

    setupTransactionsChannel();

    // ========== PWA/iOS LIFECYCLE EVENTS ==========
    
    // 1. PWA PageShow Event - Wichtig für iOS Back/Forward Cache
    const handlePageShowTx = (event) => {
      if (event.persisted) {
        console.log('🔄 PWA aus Back/Forward Cache (Transactions) - Force Reconnect');
        loadTransactions();
        
        setTimeout(() => {
          if (!transactionsChannelRef.current || transactionsChannelRef.current.state === 'closed') {
            console.log('🔄 Force Reconnecting Transactions nach BFCache...');
            setupTransactionsChannel();
          }
        }, 500);
      }
    };
    
    // 2. PWA Resume Event (iOS-spezifisch)
    const handleResumeTx = () => {
      console.log('▶️ PWA resumed (Transactions), prüfe Connection...');
      
      setTimeout(() => {
        if (!transactionsChannelRef.current || transactionsChannelRef.current.state === 'closed') {
          console.log('🔄 Reconnecting Transactions nach Resume...');
          setupTransactionsChannel();
        } else {
          console.log('✅ Transactions Channel noch aktiv');
        }
      }, 1000);
    };
    
    // 3. Visibility Change (Browser & PWA)
    const handleVisibilityChangeTx = () => {
      if (!document.hidden) {
        console.log('👀 App wieder sichtbar (Transactions), aktualisiere...');
        loadTransactions();
        
        if (transactionsChannelRef.current && transactionsChannelRef.current.state === 'closed') {
          console.log('🔄 Reconnecting Transactions nach Visibility...');
          setupTransactionsChannel();
        }
      }
    };
    
    // Event Listeners registrieren (mit eindeutigen Namen)
    window.addEventListener('pageshow', handlePageShowTx);
    document.addEventListener('resume', handleResumeTx);
    document.addEventListener('visibilitychange', handleVisibilityChangeTx);

    return () => {
      console.log('🧹 Cleanup: Entferne Transactions-Channel & Timer');
      isSubscribed = false;
      
      if (reconnectTimeoutRef) {
        clearTimeout(reconnectTimeoutRef);
        reconnectTimeoutRef = null;
      }
      
      if (transactionsChannelRef.current) {
        supabase.removeChannel(transactionsChannelRef.current);
        transactionsChannelRef.current = null;
      }
      
      if (transactionsPollIntervalRef.current) {
        clearInterval(transactionsPollIntervalRef.current);
        transactionsPollIntervalRef.current = null;
      }
      
      // Event Listeners entfernen
      window.removeEventListener('pageshow', handlePageShowTx);
      document.removeEventListener('resume', handleResumeTx);
      document.removeEventListener('visibilitychange', handleVisibilityChangeTx);
    };
  }, [userId, loadTransactions]);

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
