"use client";
import { createContext, useContext } from "react";
const WalletCtx = createContext<any>(null);
export const useWallet = () => useContext(WalletCtx);
export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
