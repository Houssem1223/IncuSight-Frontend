"use client";

import { createContext, useContext } from "react";

type DashboardThemeContextType = {
  darkMode: boolean;
  toggleDarkMode: () => void;
};

const DashboardThemeContext = createContext<DashboardThemeContextType | undefined>(undefined);

export function DashboardThemeProvider({
  children,
  darkMode,
  toggleDarkMode,
}: {
  children: React.ReactNode;
  darkMode: boolean;
  toggleDarkMode: () => void;
}) {
  return (
    <DashboardThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const context = useContext(DashboardThemeContext);

  if (!context) {
    throw new Error("useDashboardTheme must be used inside DashboardThemeProvider");
  }

  return context;
}
