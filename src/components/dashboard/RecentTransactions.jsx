import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const RecentTransactions = ({ userId }) => {
  const [transactions, setTransactions] = useState([]);
  const [newTransactionIds, setNewTransactionIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const loadTransactions = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(5);

      if (data && !error) {
        setTransactions(data);
      }
      setLoading(false);
    };

    loadTransactions();

    // Realtime Subscription für neue Transaktionen
    const channel = supabase
      .channel(`transactions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Neue Transaktion erhalten:', payload);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Neueste Transaktionen</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">Deine letzten 5 Transaktionen</p>
      </div>
      
      <div className="p-6">
        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((transaction) => {
              const isPositive = transaction.type === 'add';
              const isNegative = transaction.type === 'remove';
              const isSend = transaction.type === 'send';
              
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
                        isPositive 
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : isNegative || isSend
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : 'bg-blue-100 dark:bg-blue-900/30'
                      }`}>
                        <svg className={`h-4 w-4 ${
                          isPositive 
                            ? 'text-green-600 dark:text-green-400'
                            : isNegative || isSend
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {isPositive && (
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
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {isPositive && 'Aufladung'}
                          {isNegative && 'Abbuchung'}
                          {isSend && 'Überweisung'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        isPositive 
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {isPositive ? '+' : '-'}€{Math.abs(transaction.amount).toFixed(2)}
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

