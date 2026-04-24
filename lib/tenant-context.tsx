"use client";

import { createContext, useContext, useState } from "react";

interface TenantContextValue {
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
}

const TenantContext = createContext<TenantContextValue>({ logoUrl: null, setLogoUrl: () => {} });

export function TenantProvider({
  initialLogoUrl,
  children,
}: {
  initialLogoUrl: string | null;
  children: React.ReactNode;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  return <TenantContext.Provider value={{ logoUrl, setLogoUrl }}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  return useContext(TenantContext);
}
