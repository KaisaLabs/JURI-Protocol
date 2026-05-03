"use client";
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

declare global { interface Window { ethereum?: any } }

export default function ConnectWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const connect = useCallback(async () => {
    if (!window.ethereum) { setError("No wallet detected"); return; }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const chain = await window.ethereum.request({ method: "eth_chainId" });
      setAccount(accounts[0]);
      setChainId(parseInt(chain, 16));
      setOpen(false); setError("");
    } catch (e: any) { setError(e.message); }
  }, []);

  const switchTo0G = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x40da" }] });
    } catch {
      await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{
        chainId: "0x40da", chainName: "0G Galileo Testnet",
        nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
        rpcUrls: ["https://evmrpc-testnet.0g.ai"],
        blockExplorerUrls: ["https://chainscan-galileo.0g.ai"],
      }]});
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts: string[]) => {
        if (accounts.length > 0) { setAccount(accounts[0]); window.ethereum.request({ method: "eth_chainId" }).then((c: string) => setChainId(parseInt(c, 16))); }
      });
      window.ethereum.on("accountsChanged", (a: string[]) => setAccount(a[0] || null));
      window.ethereum.on("chainChanged", (c: string) => setChainId(parseInt(c, 16)));
    }
  }, []);

  const is0G = chainId === 16602;

  if (account) {
    return (
      <div className="flex items-center gap-2">
        {!is0G && (
          <button onClick={switchTo0G} className="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-1 rounded">
            Switch to 0G
          </button>
        )}
        {is0G && <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded">0G Galileo</span>}
        <span className="text-xs text-gray-400 font-mono">{account.slice(0,6)}...{account.slice(-4)}</span>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="px-4 py-2 bg-[#c9a84c] text-black font-semibold rounded-lg hover:bg-[#d4b55a] transition-all text-sm">
        Connect Wallet
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-[#14141f] border border-[#2a2a3a] rounded-xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">Connect to 0G Galileo</h3>
            <p className="text-xs text-gray-400">Connect your wallet to start investigating DeFi exploits</p>
            <button onClick={connect} className="w-full p-3 rounded-lg border border-[#2a2a3a] hover:border-[#c9a84c]/40 bg-[#0a0a0f] text-sm text-gray-200 hover:bg-[#c9a84c]/5 transition-all">
              🦊 Connect Browser Wallet
            </button>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="text-[10px] text-gray-600 space-y-1">
              <p>• Need 0G testnet tokens? <a href="https://faucet.0g.ai" target="_blank" className="text-[#c9a84c]">faucet.0g.ai</a></p>
              <p>• Chain ID: 16602 | RPC: evmrpc-testnet.0g.ai</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-300 w-full">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
