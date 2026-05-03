"use client";
import { useState, useEffect, useCallback, useRef } from "react";

declare global { interface Window { ethereum?: any } }

const NETWORK_CONFIG = {
  testnet: { chainId: "0x40da", name: "0G Galileo Testnet", short: "Testnet", color: "text-emerald-400", rpc: "https://evmrpc-testnet.0g.ai", explorer: "https://chainscan-galileo.0g.ai" },
  mainnet: { chainId: "0x411d", name: "0G Mainnet", short: "Mainnet", color: "text-amber-400", rpc: "https://evmrpc.0g.ai", explorer: "https://chainscan.0g.ai" },
} as const;

const CHAIN_CONFIG = (net: typeof NETWORK_CONFIG[keyof typeof NETWORK_CONFIG]) => ({
  chainId: net.chainId, chainName: net.name,
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: [net.rpc], blockExplorerUrls: [net.explorer],
});

export default function ConnectWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [netOpen, setNetOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const netRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (netRef.current && !netRef.current.contains(e.target as Node)) setNetOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchChain = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      const c = await window.ethereum.request({ method: "eth_chainId" });
      setChainId(c);
    } catch {}
  }, []);

  const fetchBalance = useCallback(async (addr: string) => {
    if (!window.ethereum) return;
    try {
      const b = await window.ethereum.request({ method: "eth_getBalance", params: [addr, "latest"] });
      setBalance((parseInt(b, 16) / 1e18).toFixed(4));
    } catch {}
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) { setError("No wallet detected. Install MetaMask or Rabby."); return; }
    try {
      const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setModalOpen(false);
        setError("");
        await fetchChain();
        await fetchBalance(accounts[0]);
      }
    } catch (e: any) {
      if (e.code === 4001) setError("Connection rejected");
      else setError(e.message || "Connection failed");
    }
  }, [fetchChain, fetchBalance]);

  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setBalance(null);
    setMenuOpen(false);
    // Note: browser wallets don't have a "disconnect" RPC — this clears local state
  }, []);

  const switchNetwork = useCallback(async (key: "testnet" | "mainnet") => {
    if (!window.ethereum) return;
    const net = NETWORK_CONFIG[key];
    const cfg = CHAIN_CONFIG(net);
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: cfg.chainId }] });
    } catch (e: any) {
      if (e.code === 4902) {
        await window.ethereum.request({ method: "wallet_addEthereumChain", params: [cfg] });
      }
    }
    setNetOpen(false);
    setTimeout(() => fetchChain(), 500);
    if (account) setTimeout(() => fetchBalance(account), 1000);
  }, [fetchChain, fetchBalance, account]);

  // Init + event listeners
  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then((a: string[]) => {
      if (a.length > 0) { setAccount(a[0]); fetchChain(); fetchBalance(a[0]); }
    });
    const onAccounts = (a: string[]) => {
      if (a.length > 0) { setAccount(a[0]); fetchBalance(a[0]); }
      else { setAccount(null); setChainId(null); setBalance(null); }
    };
    const onChain = () => { fetchChain(); if (account) fetchBalance(account); };
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum?.removeListener?.("accountsChanged", onAccounts);
      window.ethereum?.removeListener?.("chainChanged", onChain);
    };
  }, [fetchChain, fetchBalance, account]);

  // Chain info
  const netInfo = Object.values(NETWORK_CONFIG).find(n => n.chainId === chainId);
  const currentNet = Object.entries(NETWORK_CONFIG).find(([, v]) => v.chainId === chainId)?.[0];

  if (account) {
    return (
      <div className="flex items-center gap-2">
        {balance && <span className="text-[11px] text-gray-500 font-mono hidden sm:inline">{parseFloat(balance).toFixed(3)} 0G</span>}

        {/* Network badge */}
        <div className="relative" ref={netRef}>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setNetOpen(p => !p); setMenuOpen(false); }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-all cursor-pointer ${
              netInfo ? `${netInfo.color} bg-white/[0.03] border-white/[0.08]` : "text-gray-400 bg-white/[0.02] border-white/[0.06]"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${netInfo ? "bg-current" : "bg-gray-500"}`} />
            {netInfo?.short || "Unknown"}
            <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {netOpen && (
            <div className="absolute top-full mt-1.5 right-0 bg-surface border border-border rounded-lg shadow-xl z-50 min-w-[175px] overflow-hidden">
              {(Object.entries(NETWORK_CONFIG) as [key: "testnet" | "mainnet", value: typeof NETWORK_CONFIG["testnet"]][]).map(([key, net]) => (
                <button
                  key={key}
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); switchNetwork(key); }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center gap-2.5 transition-colors cursor-pointer ${
                    currentNet === key ? `${net.color} bg-white/[0.03]` : "text-gray-400 hover:bg-white/[0.03] hover:text-gray-200"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${currentNet === key ? "bg-current" : "bg-gray-600"}`} />
                  {net.name}
                  {currentNet === key && <span className="ml-auto text-[10px] opacity-70">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Account dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(p => !p); setNetOpen(false); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-[11px] text-gray-300 font-mono hover:bg-white/[0.06] transition-all cursor-pointer"
          >
            {account.slice(0,6)}...{account.slice(-4)}
            <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {menuOpen && (
            <div className="absolute top-full mt-1.5 right-0 bg-surface border border-border rounded-lg shadow-xl z-50 min-w-[190px] overflow-hidden">
              <div className="px-3.5 py-2.5 text-[10px] text-gray-500 border-b border-border">
                <p className="font-mono text-gray-300 text-xs break-all">{account}</p>
                {balance && <p className="mt-1">{parseFloat(balance).toFixed(4)} 0G</p>}
                {netInfo && <p className="mt-0.5">{netInfo.name}</p>}
              </div>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); disconnect(); }}
                className="w-full text-left px-3.5 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-2"
              >
                <span>🔌</span> Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setModalOpen(true); }} className="px-4 py-2 bg-primary text-black font-semibold rounded-lg hover:bg-primary-hover transition-all text-sm cursor-pointer">
        Connect Wallet
      </button>
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full space-y-4 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <span className="text-4xl">🔗</span>
              <h3 className="text-lg font-bold text-white mt-2">Connect Wallet</h3>
              <p className="text-xs text-gray-500 mt-1">Connect to 0G Galileo Testnet or Mainnet</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); connect(); }}
              className="w-full p-4 rounded-xl border border-border hover:border-primary/40 bg-surface-alt text-left hover:bg-primary/5 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🦊</span>
                <div><p className="text-sm font-medium text-gray-200">Browser Wallet</p><p className="text-[10px] text-gray-500">MetaMask · Rabby · Coinbase Wallet</p></div>
              </div>
            </button>
            {error && <p className="text-xs text-red-400 text-center bg-red-500/5 border border-red-500/10 rounded-lg p-2">{error}</p>}
            <div className="text-[10px] text-gray-600 text-center space-y-0.5">
              <p>Need testnet tokens? <a href="https://faucet.0g.ai" target="_blank" className="text-primary hover:underline">faucet.0g.ai</a></p>
            </div>
            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setModalOpen(false); }} className="text-xs text-gray-500 hover:text-gray-300 w-full text-center cursor-pointer">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
