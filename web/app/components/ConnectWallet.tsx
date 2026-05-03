"use client";
import { useState, useEffect, useCallback } from "react";

declare global { interface Window { ethereum?: any } }

const NETWORKS = {
  "0x40da": { name: "0G Galileo", short: "Testnet", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  "0x411d": { name: "0G Mainnet", short: "Mainnet", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
} as const;

const NETWORK_CONFIG = {
  testnet: { chainId: "0x40da", chainName: "0G Galileo Testnet", nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 }, rpcUrls: ["https://evmrpc-testnet.0g.ai"], blockExplorerUrls: ["https://chainscan-galileo.0g.ai"] },
  mainnet: { chainId: "0x411d", chainName: "0G Mainnet", nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 }, rpcUrls: ["https://evmrpc.0g.ai"], blockExplorerUrls: ["https://chainscan.0g.ai"] },
};

export default function ConnectWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [netOpen, setNetOpen] = useState(false);
  const [error, setError] = useState("");

  const updateChain = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      const c = await window.ethereum.request({ method: "eth_chainId" });
      setChainId(c);
      if (account) {
        const b = await window.ethereum.request({ method: "eth_getBalance", params: [account, "latest"] });
        setBalance((parseInt(b, 16) / 1e18).toFixed(4));
      }
    } catch {}
  }, [account]);

  const connect = useCallback(async () => {
    if (!window.ethereum) { setError("No wallet detected"); return; }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]); setOpen(false); setError("");
      await updateChain();
    } catch (e: any) { setError(e.message); }
  }, [updateChain]);

  const disconnect = useCallback(() => { setAccount(null); setChainId(null); setBalance(null); }, []);

  const switchNetwork = useCallback(async (net: "testnet" | "mainnet") => {
    if (!window.ethereum) return;
    const cfg = NETWORK_CONFIG[net];
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: cfg.chainId }] });
    } catch (e: any) {
      if (e.code === 4902) await window.ethereum.request({ method: "wallet_addEthereumChain", params: [cfg] });
    }
    setNetOpen(false); updateChain();
  }, [updateChain]);

  useEffect(() => {
    if (!window.ethereum) return;
    window.ethereum.request({ method: "eth_accounts" }).then((a: string[]) => { if (a.length > 0) { setAccount(a[0]); updateChain(); } });
    window.ethereum.on("accountsChanged", (a: string[]) => { setAccount(a[0] || null); if (!a[0]) { setChainId(null); setBalance(null); } });
    window.ethereum.on("chainChanged", () => updateChain());
  }, [updateChain]);

  // Load ethers from CDN for balance formatting (lightweight)
  useEffect(() => { if (account) updateChain(); }, [account, updateChain]);

  const netInfo = chainId ? NETWORKS[chainId as keyof typeof NETWORKS] : null;

  if (account) {
    return (
      <div className="flex items-center gap-2">
        {/* Balance */}
        {balance && <span className="text-[11px] text-gray-500 font-mono hidden sm:inline">{balance} 0G</span>}

        {/* Network badge + switcher */}
        <div className="relative">
          <button
            onClick={() => setNetOpen(!netOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all ${netInfo ? `${netInfo.color} ${netInfo.bg} ${netInfo.border}` : "text-gray-400 bg-white/5 border-white/10"}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {netInfo?.short || "Unknown"}
            <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {netOpen && (
            <div className="absolute top-full mt-1 right-0 bg-[#11141e] border border-[#1e2234] rounded-lg p-1 shadow-xl z-50 min-w-[160px]" onClick={e => e.stopPropagation()}>
              {(["testnet", "mainnet"] as const).map(n => (
                <button key={n} onClick={() => switchNetwork(n)}
                  className={`w-full text-left px-3 py-2 rounded text-xs flex items-center gap-2 hover:bg-white/5 transition-colors ${chainId === NETWORK_CONFIG[n].chainId ? "text-emerald-400" : "text-gray-400"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${chainId === NETWORK_CONFIG[n].chainId ? "bg-emerald-400" : "bg-gray-600"}`} />
                  {n === "testnet" ? "0G Galileo Testnet" : "0G Mainnet"}
                  {chainId === NETWORK_CONFIG[n].chainId && <span className="ml-auto text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Account */}
        <div className="relative">
          <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-gray-300 font-mono hover:bg-white/[0.06] transition-all">
            {account.slice(0,6)}...{account.slice(-4)}
            <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {open && (
            <div className="absolute top-full mt-1 right-0 bg-[#11141e] border border-[#1e2234] rounded-lg p-1 shadow-xl z-50 min-w-[180px]" onClick={e => e.stopPropagation()}>
              <div className="px-3 py-2 text-[10px] text-gray-500 border-b border-[#1e2234]">
                <p className="font-mono text-gray-400 text-xs">{account.slice(0,10)}...{account.slice(-8)}</p>
                {balance && <p className="mt-0.5">{balance} 0G</p>}
              </div>
              <button onClick={() => { disconnect(); setOpen(false); }} className="w-full text-left px-3 py-2 rounded text-xs text-red-400 hover:bg-red-500/10 transition-colors">Disconnect</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="px-4 py-2 bg-[#e8734a] text-black font-semibold rounded-lg hover:bg-[#f08c6a] transition-all text-sm">Connect Wallet</button>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-[#11141e] border border-[#1e2234] rounded-xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-center">
              <span className="text-4xl">🔗</span>
              <h3 className="text-lg font-bold text-white mt-2">Connect Wallet</h3>
              <p className="text-xs text-gray-500 mt-1">Choose 0G Galileo Testnet or Mainnet</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={connect} className="p-4 rounded-xl border border-[#1e2234] hover:border-[#e8734a]/30 bg-[#0a0c14] text-left hover:bg-[#e8734a]/5 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🦊</span>
                  <div><p className="text-sm font-medium text-gray-200">Browser Wallet</p><p className="text-[10px] text-gray-500">MetaMask · Rabby · Coinbase</p></div>
                </div>
              </button>
            </div>
            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
            <div className="text-[10px] text-gray-600 text-center space-y-0.5">
              <p>Need testnet 0G? <a href="https://faucet.0g.ai" target="_blank" className="text-[#e8734a] hover:underline">faucet.0g.ai</a></p>
            </div>
            <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-300 w-full text-center">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
