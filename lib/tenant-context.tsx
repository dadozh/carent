"use client";

import { createContext, useContext, useState } from "react";

interface TenantContextValue {
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
  currency: string;
}

const TenantContext = createContext<TenantContextValue>({ logoUrl: null, setLogoUrl: () => {}, currency: "EUR" });

export function TenantProvider({
  initialLogoUrl,
  initialCurrency,
  children,
}: {
  initialLogoUrl: string | null;
  initialCurrency: string;
  children: React.ReactNode;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  return (
    <TenantContext.Provider value={{ logoUrl, setLogoUrl, currency: initialCurrency }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextValue {
  return useContext(TenantContext);
}

export function useCurrency(): string {
  return useContext(TenantContext).currency;
}
