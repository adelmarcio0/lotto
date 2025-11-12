"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { createFhevmInstance } from "@/fhevm/internal/fhevm";
import { GenericStringInMemoryStorage } from "@/fhevm/GenericStringStorage";
import { useLotto } from "@/hooks/useLotto";

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e1f22 0%, #2b2d30 50%, #323437 100%)',
    padding: '32px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  tabBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '32px',
    borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '0',
  },
  tab: {
    padding: '16px 32px',
    fontSize: '1rem',
    fontWeight: '700',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    background: 'transparent',
    color: '#9ca3af',
    borderBottom: '3px solid transparent',
    position: 'relative' as const,
  },
  tabActive: {
    color: '#ffffff',
    borderBottomColor: '#dc2626',
  },
  description: {
    color: '#9ca3af',
    fontSize: '0.9rem',
    lineHeight: '1.6',
    marginBottom: '20px',
    padding: '16px',
    background: 'rgba(37, 99, 235, 0.1)',
    borderLeft: '3px solid #2563eb',
    borderRadius: '4px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '48px',
    background: 'linear-gradient(135deg, #dc2626 0%, #2563eb 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontSize: '3rem',
    fontWeight: '800',
    textTransform: 'uppercase' as const,
    letterSpacing: '2px',
    textShadow: '0 0 30px rgba(220, 38, 38, 0.3)',
  },
  statusBar: {
    background: 'rgba(43, 45, 48, 0.8)',
    backdropFilter: 'blur(10px)',
    borderRadius: '16px',
    padding: '20px 28px',
    marginBottom: '32px',
    border: '1px solid rgba(220, 38, 38, 0.2)',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
  },
  statusItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    fontSize: '0.95rem',
  },
  statusLabel: {
    color: '#9ca3af',
    fontWeight: '500',
  },
  statusValue: {
    color: '#e8e8e8',
    fontWeight: '600',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
  },
  statusMessage: {
    marginTop: '16px',
    padding: '14px 18px',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  statusError: {
    background: 'rgba(220, 38, 38, 0.15)',
    color: '#fca5a5',
    border: '1px solid rgba(220, 38, 38, 0.3)',
  },
  statusInfo: {
    background: 'rgba(37, 99, 235, 0.15)',
    color: '#93c5fd',
    border: '1px solid rgba(37, 99, 235, 0.3)',
  },
  section: {
    background: 'rgba(50, 52, 55, 0.6)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '32px',
    marginBottom: '24px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    transition: 'all 0.3s ease',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '24px',
    color: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconRed: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
    boxShadow: '0 0 20px rgba(220, 38, 38, 0.6)',
    animation: 'pulse 2s infinite',
  },
  iconBlue: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
    boxShadow: '0 0 20px rgba(37, 99, 235, 0.6)',
    animation: 'pulse 2s infinite',
  },
  inputGroup: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  input: {
    flex: '1',
    minWidth: '120px',
    padding: '14px 20px',
    fontSize: '1.1rem',
    fontWeight: '600',
    borderRadius: '12px',
    border: '2px solid rgba(220, 38, 38, 0.3)',
    background: 'rgba(30, 31, 34, 0.8)',
    color: '#f3f4f6',
    outline: 'none',
    transition: 'all 0.3s ease',
  },
  button: {
    padding: '14px 32px',
    fontSize: '1rem',
    fontWeight: '700',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
  },
  buttonPrimary: {
    background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    color: '#ffffff',
  },
  buttonSecondary: {
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    color: '#ffffff',
  },
  buttonDisabled: {
    background: 'rgba(75, 85, 99, 0.5)',
    color: '#6b7280',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  infoGrid: {
    display: 'grid',
    gap: '16px',
    marginTop: '20px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    background: 'rgba(30, 31, 34, 0.6)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  infoLabel: {
    color: '#9ca3af',
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  infoValue: {
    color: '#f3f4f6',
    fontSize: '1rem',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  resultWin: {
    color: '#34d399',
    fontSize: '1.3rem',
    fontWeight: '800',
    textShadow: '0 0 10px rgba(52, 211, 153, 0.5)',
  },
  resultLose: {
    color: '#f87171',
    fontSize: '1.3rem',
    fontWeight: '800',
    textShadow: '0 0 10px rgba(248, 113, 113, 0.5)',
  },
  roundBadge: {
    display: 'inline-block',
    padding: '8px 20px',
    background: 'linear-gradient(135deg, #dc2626, #2563eb)',
    borderRadius: '20px',
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
  },
};

export default function Page() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | undefined>(undefined);
  const [readonlyProvider, setReadonlyProvider] = useState<ethers.JsonRpcProvider | undefined>(undefined);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | undefined>(undefined);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [instance, setInstance] = useState<any>(undefined);
  const [num, setNum] = useState<number>(1);
  const [status, setStatus] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'buy' | 'myticket' | 'admin'>('buy');
  const storage = useMemo(() => new GenericStringInMemoryStorage(), []);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const setup = async () => {
      if (!window.ethereum) {
        setStatus("MetaMask not detected. Please install MetaMask to continue.");
        return;
      }
      try {
        const p = new ethers.BrowserProvider(window.ethereum);
        setProvider(p);
        const s = await p.getSigner();
        setSigner(s);
        const net = await p.getNetwork();
        setChainId(Number(net.chainId));
        setReadonlyProvider(p as unknown as ethers.JsonRpcProvider);
        setStatus("Wallet connected successfully!");
      } catch (e: any) {
        setStatus(`Wallet connection failed: ${e?.message || String(e)}`);
      }
    };
    setup();
  }, []);

  useEffect(() => {
    if (!provider) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus("Initializing FHEVM secure environment...");
    createFhevmInstance({ provider: window.ethereum!, signal: ctrl.signal })
      .then((inst) => {
        setInstance(inst);
        setStatus("FHEVM initialized successfully! Ready to play.");
      })
      .catch((e) => setStatus(`FHEVM initialization failed: ${e?.message || String(e)}`));
    return () => ctrl.abort();
  }, [provider]);

  const lotto = useLotto({ instance, fhevmDecryptionSignatureStorage: storage, chainId, signer, readonlyProvider });

  const isError = status.toLowerCase().includes('failed') || status.toLowerCase().includes('error');

  return (
    <div style={styles.container}>
      <main style={styles.main}>
        <h1 style={styles.header}>
          🎰 FHEVM Lottery
        </h1>

        <div style={styles.statusBar}>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Network Chain ID:</span>
            <span style={styles.statusValue}>{chainId ?? "Not Connected"}</span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Smart Contract:</span>
            <span style={styles.statusValue}>{lotto.contractAddress ? `${lotto.contractAddress.slice(0, 10)}...${lotto.contractAddress.slice(-8)}` : "Not Deployed"}</span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>Current Round:</span>
            <span style={styles.statusValue}>#{lotto.currentRound ?? "..."}</span>
          </div>
          {status && (
            <div style={{...styles.statusMessage, ...(isError ? styles.statusError : styles.statusInfo)}}>
              {status}
            </div>
          )}
        </div>

        <div style={styles.tabBar}>
          <button 
            style={{...styles.tab, ...(activeTab === 'buy' ? styles.tabActive : {})}}
            onClick={() => setActiveTab('buy')}
          >
            🎫 Buy Ticket
          </button>
          <button 
            style={{...styles.tab, ...(activeTab === 'myticket' ? styles.tabActive : {})}}
            onClick={() => setActiveTab('myticket')}
          >
            🎟️ My Ticket
          </button>
          {lotto.isOwner && (
            <button 
              style={{...styles.tab, ...(activeTab === 'admin' ? styles.tabActive : {})}}
              onClick={() => setActiveTab('admin')}
            >
              ⚙️ Admin
            </button>
          )}
        </div>

        {activeTab === 'buy' && (
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <span style={styles.iconRed}></span>
              Purchase Lottery Ticket
            </h3>
            <div style={styles.description}>
              💡 Choose a number between 1 and 99. Your selection will be encrypted using FHEVM before being submitted to the blockchain, ensuring complete privacy. Only you can decrypt your ticket number later.
            </div>
            <div style={styles.inputGroup}>
              <input 
                type="number" 
                min={1} 
                max={99} 
                value={num} 
                onChange={(e) => setNum(Number(e.target.value))}
                style={styles.input}
                placeholder="Enter number (1-99)"
              />
              <button 
                disabled={!lotto.canBuy} 
                onClick={() => lotto.buyTicket(num)}
                style={{
                  ...styles.button,
                  ...(lotto.canBuy ? styles.buttonPrimary : styles.buttonDisabled),
                }}
              >
                🎫 Buy Ticket
              </button>
            </div>
          </section>
        )}

        {activeTab === 'myticket' && (
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <span style={styles.iconRed}></span>
              My Latest Ticket
            </h3>
            <div style={styles.description}>
              💡 View and decrypt your most recent lottery ticket. First fetch the encrypted data from the blockchain, then use your private key to decrypt both your chosen number and whether you won. All decryption happens client-side for maximum privacy.
            </div>
            
            <div style={styles.infoGrid}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Ticket Token ID:</span>
                <span style={styles.infoValue}>{lotto.lastTokenId ?? "No ticket yet"}</span>
              </div>
            </div>

            <div style={{...styles.inputGroup, marginTop: '20px'}}>
              <button 
                disabled={!lotto.canRead} 
                onClick={() => lotto.refreshHandles()}
                style={{
                  ...styles.button,
                  ...(lotto.canRead ? styles.buttonSecondary : styles.buttonDisabled),
                }}
              >
                📥 Fetch Data
              </button>
              <button 
                disabled={!lotto.canDecryptTicketNumber}
                onClick={lotto.decryptTicketNumber}
                style={{
                  ...styles.button,
                  ...(lotto.canDecryptTicketNumber ? styles.buttonSecondary : styles.buttonDisabled),
                }}
              >
                🔓 Decrypt My Number
              </button>
              <button 
                disabled={!lotto.canDecrypt} 
                onClick={lotto.decryptResult}
                style={{
                  ...styles.button,
                  ...(lotto.canDecrypt ? styles.buttonPrimary : styles.buttonDisabled),
                }}
              >
                🔓 Decrypt Result
              </button>
            </div>

            <div style={styles.infoGrid}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Ticket Handle:</span>
                <span style={styles.infoValue}>{lotto.ticketHandle ? `${lotto.ticketHandle.slice(0, 10)}...` : "N/A"}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Result Handle:</span>
                <span style={styles.infoValue}>{lotto.resultHandle ? `${lotto.resultHandle.slice(0, 10)}...` : "N/A"}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>My Number:</span>
                <span style={styles.infoValue}>{typeof lotto.clearTicketNumber === 'number' ? lotto.clearTicketNumber : "Hidden"}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Result:</span>
                <span style={lotto.clearResult === undefined ? styles.infoValue : (lotto.clearResult ? styles.resultWin : styles.resultLose)}>
                  {lotto.clearResult === undefined ? "Pending" : (lotto.clearResult ? "🎉 WINNER!" : "Try Again")}
                </span>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'admin' && lotto.isOwner && (
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <span style={styles.iconBlue}></span>
              Admin Controls
            </h3>
            <div style={styles.description}>
              💡 <strong>Draw & Next Round:</strong> Generate an encrypted random winning number (1-99) and advance to the next round. All tickets from the current round will be evaluated against this winning number.
              <br/><br/>
              <strong>Reveal Process:</strong> After drawing, you can decrypt the winning number privately, then optionally reveal it publicly on-chain for transparency. The commitment mechanism ensures the revealed number matches the encrypted one used for draws.
            </div>
            
            <div style={styles.inputGroup}>
              <button 
                disabled={!lotto.canDraw} 
                onClick={lotto.draw}
                style={{
                  ...styles.button,
                  ...(lotto.canDraw ? styles.buttonSecondary : styles.buttonDisabled),
                }}
              >
                🎲 Draw & Next Round
              </button>
            </div>

            <div style={{...styles.infoGrid, marginTop: '20px'}}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Last Drawn Round:</span>
                <span style={styles.infoValue}>{lotto.lastDrawnRound ?? "..."}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Public Winning Number:</span>
                <span style={styles.infoValue}>{typeof lotto.clearWinning === 'number' && lotto.winningRevealed ? lotto.clearWinning : "Not revealed yet"}</span>
              </div>
            </div>

            <div style={{...styles.inputGroup, marginTop: '16px'}}>
              <button 
                disabled={!lotto.canFetchWinning}
                onClick={() => lotto.fetchWinningHandle()}
                style={{
                  ...styles.button,
                  ...(lotto.canFetchWinning ? styles.buttonSecondary : styles.buttonDisabled),
                }}
              >
                📥 Fetch Winning Handle
              </button>
              <button 
                disabled={!lotto.canDecryptWinning}
                onClick={lotto.decryptWinning}
                style={{
                  ...styles.button,
                  ...(lotto.canDecryptWinning ? styles.buttonPrimary : styles.buttonDisabled),
                }}
              >
                🔓 Decrypt Winning
              </button>
              <button 
                disabled={!lotto.canRevealWinning}
                onClick={lotto.revealWinning}
                style={{
                  ...styles.button,
                  ...(lotto.canRevealWinning ? styles.buttonPrimary : styles.buttonDisabled),
                }}
              >
                🚀 Reveal Publicly
              </button>
            </div>
          </section>
        )}

        {lotto.message && (
          <section style={{
            ...styles.statusMessage,
            ...(lotto.message.toLowerCase().includes('fail') ? styles.statusError : styles.statusInfo),
          }}>
            {lotto.message}
          </section>
        )}
      </main>
      
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        
        input[type="number"]:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }
        
        button:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }
        
        button:not(:disabled):active {
          transform: translateY(0);
        }
        
        section {
          animation: fadeIn 0.5s ease-in;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        input[type=number] {
          -moz-appearance: textfield;
        }
        
        /* Tab styles */
        [style*="tabBar"] button:hover {
          color: #e5e7eb;
        }
      `}</style>
    </div>
  );
}


