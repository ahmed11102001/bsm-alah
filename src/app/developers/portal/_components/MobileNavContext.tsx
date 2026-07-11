"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface MobileNavContextType {
  isMobileNavOpen: boolean;
  setMobileNavOpen: (v: boolean) => void;
}

const MobileNavContext = createContext<MobileNavContextType | undefined>(undefined);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <MobileNavContext.Provider value={{ isMobileNavOpen, setMobileNavOpen }}>
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const context = useContext(MobileNavContext);
  if (context === undefined) {
    throw new Error("useMobileNav must be used within a MobileNavProvider");
  }
  return context;
  
}
