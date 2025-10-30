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
            broadcast: { self: true },
            presence: { key: userId },
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

            if (balancePollIntervalRef.current) {
              clearInterval(balancePollIntervalRef.current);
              balancePollIntervalRef.current = null;
            }

            balancePollIntervalRef.current = setInterval(() => {
              console.log('🔄 Backup-Check (Balance Realtime aktiv)…');
              loadBalance();
            }, 300000); // 5 Minuten
          }

          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsBalanceRealtimeConnected(false);
            console.warn('⚠️ Realtime Fehler (Balance) – starte Fallback-Polling');

            if (!balancePollIntervalRef.current) {
              balancePollIntervalRef.current = setInterval(() => {
                console.log('🔄 Polling Balance (Realtime inaktiv)…');
                loadBalance();
              }, 5000);
            }

            if (reconnectTimeoutRef) {
              clearTimeout(reconnectTimeoutRef);
            }
            reconnectTimeoutRef = setTimeout(() => {
              console.log('🔄 Versuche Reconnect (Balance)…');
              setupBalanceChannel();
            }, 3000);
          }

          else if (status === 'CLOSED') {
            console.log('📴 Realtime geschlossen (Balance)');
            
            if (isSubscribed) {
              setIsBalanceRealtimeConnected(false);
              console.warn('⚠️ Balance-Verbindung unerwartet geschlossen – starte Fallback');

              if (!balancePollIntervalRef.current) {
                balancePollIntervalRef.current = setInterval(() => {
                  console.log('🔄 Polling Balance (Realtime inaktiv)…');
                  loadBalance();
                }, 5000);
              }

              if (reconnectTimeoutRef) {
                clearTimeout(reconnectTimeoutRef);
              }
              reconnectTimeoutRef = setTimeout(() => {
                console.log('🔄 Versuche Reconnect nach unerwarteter Trennung (Balance)…');
                setupBalanceChannel();
              }, 3000);
            }
          }
        });

      balanceChannelRef.current = channel;
    };

    setupBalanceChannel();

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
            broadcast: { self: true },
            presence: { key: userId }
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

            if (transactionsPollIntervalRef.current) {
              clearInterval(transactionsPollIntervalRef.current);
              transactionsPollIntervalRef.current = null;
            }

            transactionsPollIntervalRef.current = setInterval(() => {
              console.log('🔄 Backup-Check (Transactions Realtime aktiv)…');
              loadTransactions();
            }, 300000); // 5 Minuten
          }

          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsTransactionsRealtimeConnected(false);
            console.warn('⚠️ Realtime Fehler (Transactions) – starte Fallback-Polling');

            if (!transactionsPollIntervalRef.current) {
              transactionsPollIntervalRef.current = setInterval(() => {
                console.log('🔄 Polling Transactions (Realtime inaktiv)…');
                loadTransactions();
              }, 10000);
            }

            if (reconnectTimeoutRef) {
              clearTimeout(reconnectTimeoutRef);
            }
            reconnectTimeoutRef = setTimeout(() => {
              console.log('🔄 Versuche Reconnect (Transactions)…');
              setupTransactionsChannel();
            }, 3000);
          }

          else if (status === 'CLOSED') {
            console.log('📴 Realtime geschlossen (Transactions)');
            
            if (isSubscribed) {
              setIsTransactionsRealtimeConnected(false);
              console.warn('⚠️ Transactions-Verbindung unerwartet geschlossen – starte Fallback');

              if (!transactionsPollIntervalRef.current) {
                transactionsPollIntervalRef.current = setInterval(() => {
                  console.log('🔄 Polling Transactions (Realtime inaktiv)…');
                  loadTransactions();
                }, 10000);
              }

              if (reconnectTimeoutRef) {
                clearTimeout(reconnectTimeoutRef);
              }
              reconnectTimeoutRef = setTimeout(() => {
                console.log('🔄 Versuche Reconnect nach unerwarteter Trennung (Transactions)…');
                setupTransactionsChannel();
              }, 3000);
            }
          }
        });

      transactionsChannelRef.current = channel;
    };

    setupTransactionsChannel();

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
