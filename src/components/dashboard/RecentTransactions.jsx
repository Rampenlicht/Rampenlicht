import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

const RecentTransactions = ({ userId }) => {
  const [transactions, setTransactions] = useState([]);
  const [newTransactionIds, setNewTransactionIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  
  const channelRef = useRef(null);
  const pollIntervalRef = useRef(null);

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
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    loadTransactions();

    let isSubscribed = false;
    let reconnectTimeoutRef = null;

    const setupRealtimeChannel = () => {
      // Alten Channel entfernen, falls vorhanden
      if (channelRef.current) {
        console.log('🧹 Entferne alten Transactions-Channel...');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
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
            
            // Animation nach 3 Sekunden entfernen
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
            setIsRealtimeConnected(true);
            console.log('✅ Realtime verbunden (Transactions) – kein Polling nötig');

            // Stoppe altes Polling, falls aktiv
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            // Backup-Polling alle 5 Minuten
            pollIntervalRef.current = setInterval(() => {
              console.log('🔄 Backup-Check (Transactions Realtime aktiv)…');
              loadTransactions();
            }, 300000); // 5 Minuten
          }

          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsRealtimeConnected(false);
            console.warn('⚠️ Realtime Fehler (Transactions) – starte Fallback-Polling');

            // Fallback-Polling aktivieren
            if (!pollIntervalRef.current) {
              pollIntervalRef.current = setInterval(() => {
                console.log('🔄 Polling Transactions (Realtime inaktiv)…');
                loadTransactions();
              }, 10000); // alle 10 Sekunden
            }

            // Reconnect-Versuch nach kurzer Pause
            if (reconnectTimeoutRef) {
              clearTimeout(reconnectTimeoutRef);
            }
            reconnectTimeoutRef = setTimeout(() => {
              console.log('🔄 Versuche Reconnect (Transactions)…');
              setupRealtimeChannel();
            }, 3000);
          }

          else if (status === 'CLOSED') {
            console.log('📴 Realtime geschlossen (Transactions)');
            
            // Nur reconnecten, wenn wir vorher connected waren
            if (isSubscribed) {
              setIsRealtimeConnected(false);
              console.warn('⚠️ Transactions-Verbindung unerwartet geschlossen – starte Fallback');

              // Fallback-Polling aktivieren
              if (!pollIntervalRef.current) {
                pollIntervalRef.current = setInterval(() => {
                  console.log('🔄 Polling Transactions (Realtime inaktiv)…');
                  loadTransactions();
                }, 10000);
              }

              // Reconnect-Versuch
              if (reconnectTimeoutRef) {
                clearTimeout(reconnectTimeoutRef);
              }
              reconnectTimeoutRef = setTimeout(() => {
                console.log('🔄 Versuche Reconnect nach unerwarteter Trennung (Transactions)…');
                setupRealtimeChannel();
              }, 3000);
            }
          }
        });

      channelRef.current = channel;
    };

    // Initial starten
    setupRealtimeChannel();

    // Cleanup beim Unmount
    return () => {
      console.log('🧹 Cleanup: Entferne Transactions-Channel & Timer');
      isSubscribed = false;
      
      if (reconnectTimeoutRef) {
        clearTimeout(reconnectTimeoutRef);
        reconnectTimeoutRef = null;
      }
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [userId, loadTransactions]);

  if (loading) {
    return (
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl border border-white/20 dark:border-gray-700/20 shadow-lg transition-colors duration-300">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded animate-pulse w-1/2"></div>
        </div>
        <div className="p-6">
          <div className="animate-pulse h-20 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl border border-white/20 dark:border-gray-700/20 shadow-lg transition-colors duration-300">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Neueste Transaktionen</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Deine letzten 5 Transaktionen</p>
          </div>
          <div className="flex items-center space-x-1">
            <div className={`h-2 w-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`}></div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {isRealtimeConnected ? 'Live' : 'Polling'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((transaction) => {
              const isPositive = transaction.type === 'add';
              const isNegative = transaction.type === 'remove';
              const isSend = transaction.type === 'send';
              const isReceive = transaction.type === 'receive';
              
              // Name des Senders ermitteln (wenn Geld empfangen)
              const senderName = isReceive && transaction.sender 
                ? (transaction.sender.name || transaction.sender.email)
                : null;
              
              return (
                <div 
                  key={transaction.id} 
                  className={`${
                    newTransactionIds.has(transaction.id) 
                      ? 'bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 border-green-200 dark:border-green-700 animate-pulse' 
                      : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                  } rounded-lg border p-4 transition-all duration-500`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        isPositive || isReceive
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : isNegative || isSend
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        <svg className={`h-4 w-4 ${
                          isPositive || isReceive
                            ? 'text-green-600 dark:text-green-400'
                            : isNegative || isSend
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {(isPositive || isReceive) && (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                          )}
                          {(isNegative || isSend) && (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                          )}
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900 dark:text-white">
                          {isPositive && 'Guthaben aufgeladen'}
                          {isNegative && 'Guthaben abgebucht'}
                          {isSend && 'Geld gesendet'}
                          {isReceive && 'Geld empfangen'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {isPositive && 'Aufladung'}
                          {isNegative && 'Abbuchung'}
                          {isSend && 'Überweisung'}
                          {isReceive && senderName && `Von ${senderName}`}
                          {isReceive && !senderName && 'Überweisung'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        isPositive || isReceive
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {(isPositive || isReceive) ? '+' : '-'}€{Math.abs(transaction.amount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(transaction.timestamp).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="h-12 w-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="h-6 w-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Noch keine Transaktionen vorhanden</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentTransactions;
