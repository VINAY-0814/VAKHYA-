/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeMode = "light" | "dark";

interface ThemeContextProps {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Check if there is a saved preference, otherwise default to "light" (Aurora Daylight)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("vakhya_theme_mode");
    if (saved === "light" || saved === "dark") {
      return saved as ThemeMode;
    }
    return "light"; // Aurora Daylight is the new flagship light gradient default
  });

  useEffect(() => {
    // Apply the chosen theme as a data-theme attribute on the HTML element
    const root = document.documentElement;
    root.setAttribute("data-theme", themeMode);
    localStorage.setItem("vakhya_theme_mode", themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
