const Balance = ({ balance = 0, loading = false, isRealtimeConnected = false, onRefresh, onSendMoney }) => {
  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-white/20 dark:border-gray-700/20 shadow-lg transition-colors duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center space-x-2 mb-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aktuelles Guthaben</p>
            <div className="flex items-center space-x-1">
              <div className={`h-2 w-2 rounded-full ${isRealtimeConnected ? 'bg-green-500' : 'bg-orange-500'} animate-pulse`}></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isRealtimeConnected ? 'Live' : 'Polling'}
              </span>
            </div>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">
            {loading ? (
              <span className="animate-pulse">--,--</span>
            ) : (
              `€${parseFloat(balance || 0).toFixed(2)}`
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {!isRealtimeConnected && onRefresh && (
            <button 
              onClick={onRefresh}
              className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg flex items-center justify-center transition-colors duration-200"
              title="Guthaben aktualisieren"
            >
              <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
      
      {onSendMoney && (
        <button
          onClick={onSendMoney}
          className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <span>Geld senden</span>
        </button>
      )}
    </div>
  );
};

export default Balance;

