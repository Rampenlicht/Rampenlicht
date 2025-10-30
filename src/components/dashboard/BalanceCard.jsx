import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom'; 
import { Html5Qrcode } from 'html5-qrcode'; 
import { supabase } from '../../lib/supabase';

const BalanceCard = ({ userId, role }) => {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSendMoneyModal, setShowSendMoneyModal] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Send Money State
  const [sendToIdentifier, setSendToIdentifier] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendingMoney, setSendingMoney] = useState(false);
  const [scanningQR, setScanningQR] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  
  // QR Scanner Refs
  const qrScannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const channelRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const loadBalance = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', userId)
      .maybeSingle();

    if (data && !error) {
      setBalance(data.balance);
    }
    setLoading(false);
  }, [userId]);

  // QR-Scanner stoppen
  const stopQRScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        // Prüfe, ob der Scanner läuft, bevor wir ihn stoppen
        const isRunning = html5QrCodeRef.current.getState() === 2; // 2 = SCANNING
        
        if (isRunning) {
          console.log('🛑 Stoppe Scanner...');
          await html5QrCodeRef.current.stop();
          console.log('✅ Scanner gestoppt');
        } else {
          console.log('ℹ️ Scanner läuft nicht, überspringe Stop');
        }
        
        html5QrCodeRef.current = null;
      } catch (error) {
        console.error('Fehler beim Stoppen des QR-Scanners:', error);
        html5QrCodeRef.current = null;
      }
    }
    
    // DOM-Cleanup
    const qrReaderElement = document.getElementById('qr-reader');
    if (qrReaderElement) {
      qrReaderElement.innerHTML = '';
    }
  }, []);

  // QR-Scanner starten
  const startQRScanner = useCallback(async () => {
    if (!qrScannerRef.current) return;

    try {
      console.log('🔵 Initialisiere Scanner...');
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      const cameras = await Html5Qrcode.getCameras();
      console.log('📷 Verfügbare Kameras:', cameras.length);
      
      if (cameras && cameras.length) {
        let selectedCamera = cameras[0];
        
        for (const camera of cameras) {
          const label = camera.label.toLowerCase();
          if (label.includes('back') || label.includes('hinten') || label.includes('rear')) {
            selectedCamera = camera;
            console.log('✅ Rückkamera gefunden:', camera.label);
            break;
          }
        }
        
        if (cameras.length > 1 && selectedCamera === cameras[0]) {
          selectedCamera = cameras[1];
          console.log('📷 Zweite Kamera verwendet:', selectedCamera.label);
        }
        
        console.log('🎬 Starte Kamera:', selectedCamera.label);
        
        await html5QrCode.start(
          { deviceId: { exact: selectedCamera.id } },
          {
            fps: 10,
            qrbox: { width: 192, height: 192 },
            aspectRatio: 1.0
          },
          (decodedText) => {
            console.log('✅ QR-Code gescannt:', decodedText);
            setSendToIdentifier(decodedText.toUpperCase());
            stopQRScanner();
            setShowQRScanner(false);
            setScanningQR(false);
            setSendSuccess(`QR-Code erfolgreich gescannt: ${decodedText}`);
          },
          (errorMessage) => {
            // Ignorieren während des Scannens
          }
        );
        
        console.log('✅ Scanner läuft!');
      } else {
        throw new Error('Keine Kamera gefunden');
      }
    } catch (error) {
      console.error('❌ Fehler beim Starten des QR-Scanners:', error);
      
      let errorMsg = 'Kamera konnte nicht gestartet werden. ';
      
      if (error.name === 'NotAllowedError' || error.message.includes('Permission')) {
        errorMsg = 'Kamera-Zugriff verweigert. Bitte erlauben Sie den Zugriff in den Safari-Einstellungen.';
      } else if (error.name === 'NotFoundError') {
        errorMsg = 'Keine Kamera gefunden. Bitte geben Sie die ID manuell ein.';
      } else if (error.name === 'NotReadableError') {
        errorMsg = 'Kamera wird bereits verwendet. Bitte schließen Sie andere Apps.';
      } else {
        errorMsg += 'Bitte gib die ID manuell ein.';
      }
      
      setSendError(errorMsg);
      setShowQRScanner(false);
      setScanningQR(false);
    }
  }, [stopQRScanner]);

  // QR-Code Scanner starten (Button-Klick)
  const handleQRScan = () => {
    console.log('🔵 Scanner-Button geklickt');
    setSendError('');
    setShowQRScanner(true);
    setScanningQR(true);
  };

  // Geld senden
  const handleSendMoney = async () => {
    setSendError('');
    setSendSuccess('');

    if (!sendToIdentifier || !sendAmount) {
      setSendError('Bitte füllen Sie alle Felder aus');
      return;
    }

    const amount = parseFloat(sendAmount);

    if (isNaN(amount) || amount <= 0) {
      setSendError('Bitte geben Sie einen gültigen Betrag ein');
      return;
    }

    if (amount > balance) {
      setSendError('Nicht genügend Guthaben verfügbar');
      return;
    }

    setSendingMoney(true);

    try {
      // Empfänger-Profil finden
      const { data: recipientProfile, error: findError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('qrcode_id', sendToIdentifier.toUpperCase())
        .maybeSingle();

      if (findError || !recipientProfile) {
        setSendError('Empfänger nicht gefunden. Bitte überprüfen Sie die ID.');
        setSendingMoney(false);
        return;
      }

      if (recipientProfile.id === userId) {
        setSendError('Sie können kein Geld an sich selbst senden');
        setSendingMoney(false);
        return;
      }

      // Transaktion für Sender
      const senderTransaction = {
        user_id: userId,
        amount: -amount,
        type: 'send',
        timestamp: new Date().toISOString(),
        sender_id: userId,
        receiver_id: recipientProfile.id,
        description: `Geld gesendet an ${recipientProfile.name || recipientProfile.email}`
      };

      const { error: senderTransactionError } = await supabase
        .from('transactions')
        .insert(senderTransaction);

      if (senderTransactionError) {
        console.error('Sender Transaction Error:', senderTransactionError);
        throw senderTransactionError;
      }

      // Transaktion für Empfänger
      const recipientTransaction = {
        user_id: recipientProfile.id,
        amount: amount,
        type: 'receive',
        timestamp: new Date().toISOString(),
        sender_id: userId,
        receiver_id: recipientProfile.id,
        description: `Geld empfangen`
      };

      const { error: recipientTransactionError } = await supabase
        .from('transactions')
        .insert(recipientTransaction);

      if (recipientTransactionError) {
        console.error('Recipient Transaction Error:', recipientTransactionError);
        throw recipientTransactionError;
      }

      // Guthaben des Empfängers laden
      const { data: currentRecipient, error: recipientBalanceError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', recipientProfile.id)
        .maybeSingle();

      if (recipientBalanceError) throw recipientBalanceError;

      // Guthaben aktualisieren (Sender)
      const { error: updateSenderError } = await supabase
        .from('profiles')
        .update({ balance: balance - amount })
        .eq('id', userId);

      if (updateSenderError) throw updateSenderError;

      // Guthaben aktualisieren (Empfänger)
      const { error: updateRecipientError } = await supabase
        .from('profiles')
        .update({ balance: (currentRecipient?.balance || 0) + amount })
        .eq('id', recipientProfile.id);

      if (updateRecipientError) throw updateRecipientError;

      setSendSuccess(`€${amount.toFixed(2)} erfolgreich an ${recipientProfile.name || recipientProfile.email} gesendet!`);
      
      // Balance neu laden
      await loadBalance();

      // Modal nach 2 Sekunden schließen
      setTimeout(() => {
        setShowSendMoneyModal(false);
        setSendToIdentifier('');
        setSendAmount('');
        setSendSuccess('');
      }, 2000);

    } catch (error) {
      console.error('Fehler beim Senden:', error);
      setSendError(`Fehler beim Senden: ${error.message || 'Bitte versuchen Sie es erneut.'}`);
    } finally {
      setSendingMoney(false);
    }
  };

  // Scanner-Lifecycle Management
  useEffect(() => {
    if (showQRScanner && scanningQR) {
      setTimeout(() => startQRScanner(), 100);
    }
    
    return () => {
      if (html5QrCodeRef.current) {
        stopQRScanner();
      }
    };
  }, [showQRScanner, scanningQR, startQRScanner, stopQRScanner]);

  // Balance laden und Realtime Setup mit Fallback
  useEffect(() => {
    if (!userId) return;

    loadBalance();

    let isSubscribed = false;
    let reconnectTimeoutRef = null;

    const setupRealtimeChannel = () => {
      // Alten Channel entfernen, falls vorhanden
      if (channelRef.current) {
        console.log('🧹 Entferne alten Balance-Channel...');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
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
            console.log('✅ Realtime Update erhalten:', payload);
            if (payload.new?.balance !== undefined) {
              setBalance(payload.new.balance);
            }
          }
        )
        .subscribe((status, err) => {
          console.log('📡 Realtime Status (Balance):', status);

          if (err) {
            console.error('❌ Realtime Fehler:', err);
          }

          if (status === 'SUBSCRIBED') {
            isSubscribed = true;
            setIsRealtimeConnected(true);
            console.log('✅ Realtime verbunden (Balance) – kein Polling nötig');

            // Stoppe altes Polling, falls aktiv
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            // Backup-Polling alle 5 Minuten (falls Server-Event verpasst wird)
            pollIntervalRef.current = setInterval(() => {
              console.log('🔄 Backup-Check (Realtime aktiv)…');
              loadBalance();
            }, 300000); // 5 Minuten
          }

          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            // Nur reconnecten bei echten Fehlern
            setIsRealtimeConnected(false);
            console.warn('⚠️ Realtime Fehler – starte Fallback-Polling');

            // Fallback-Polling aktivieren
            if (!pollIntervalRef.current) {
              pollIntervalRef.current = setInterval(() => {
                console.log('🔄 Polling Balance (Realtime inaktiv)…');
                loadBalance();
              }, 5000); // alle 5 Sekunden
            }

            // Reconnect-Versuch nach kurzer Pause
            if (reconnectTimeoutRef) {
              clearTimeout(reconnectTimeoutRef);
            }
            reconnectTimeoutRef = setTimeout(() => {
              console.log('🔄 Versuche Reconnect…');
              setupRealtimeChannel();
            }, 3000);
          }

          else if (status === 'CLOSED') {
            console.log('📴 Realtime geschlossen (Balance)');
            
            // Nur reconnecten, wenn wir vorher connected waren
            if (isSubscribed) {
              setIsRealtimeConnected(false);
              console.warn('⚠️ Verbindung unerwartet geschlossen – starte Fallback');

              // Fallback-Polling aktivieren
              if (!pollIntervalRef.current) {
                pollIntervalRef.current = setInterval(() => {
                  console.log('🔄 Polling Balance (Realtime inaktiv)…');
                  loadBalance();
                }, 5000);
              }

              // Reconnect-Versuch
              if (reconnectTimeoutRef) {
                clearTimeout(reconnectTimeoutRef);
              }
              reconnectTimeoutRef = setTimeout(() => {
                console.log('🔄 Versuche Reconnect nach unerwarteter Trennung…');
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
      console.log('🧹 Cleanup: Entferne Balance-Channel & Timer');
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
  }, [userId, loadBalance]);

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
          {!isRealtimeConnected && (
            <button 
              onClick={loadBalance}
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
      <button
        onClick={() => setShowSendMoneyModal(true)}
        className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
        <span>Geld senden</span>
      </button>

      {/* Send Money Modal */}
      {showSendMoneyModal && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full relative" style={{ zIndex: 100000 }}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Geld senden</h3>
                <button
                  onClick={() => {
                    stopQRScanner();
                    setShowQRScanner(false);
                    setScanningQR(false);
                    setShowSendMoneyModal(false);
                    setSendError('');
                    setSendSuccess('');
                    setSendToIdentifier('');
                    setSendAmount('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="px-6 py-6 space-y-4">
              {sendError && (
                <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                  {sendError}
                </div>
              )}

              {sendSuccess && (
                <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
                  {sendSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Empfänger-ID
                </label>
                <div className="flex space-x-2">
            <input
              type="text"
                    value={sendToIdentifier}
                    onChange={(e) => setSendToIdentifier(e.target.value.toUpperCase())}
                    placeholder="z.B. A1B2C3D4"
                    disabled={scanningQR}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={scanningQR ? () => {
                      stopQRScanner();
                      setShowQRScanner(false);
                      setScanningQR(false);
                    } : handleQRScan}
                    type="button"
                    className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center ${
                      scanningQR 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {scanningQR ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                      </svg>
                    )}
                  </button>
                </div>
                
                {/* QR-Scanner Container */}
                {scanningQR && (
                  <div ref={qrScannerRef} className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 text-center">
                      Halte den QR-Code vor die Kamera
                    </p>
                    <div id="qr-reader" className="w-full" style={{ boxSizing: 'content-box' }}></div>
                  </div>
                )}
                
                {!scanningQR && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Gib die ID manuell ein oder scanne den QR-Code
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Betrag (€)
                </label>
            <input
              type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  max={balance || 0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Verfügbares Guthaben: €{parseFloat(balance || 0).toFixed(2)}
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex space-x-3">
              <button
                onClick={() => {
                  stopQRScanner();
                  setShowQRScanner(false);
                  setScanningQR(false);
                  setShowSendMoneyModal(false);
                  setSendError('');
                  setSendSuccess('');
                  setSendToIdentifier('');
                  setSendAmount('');
                }}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSendMoney}
                disabled={sendingMoney || !sendAmount || !sendToIdentifier}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {sendingMoney ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Senden...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Senden</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default BalanceCard;
