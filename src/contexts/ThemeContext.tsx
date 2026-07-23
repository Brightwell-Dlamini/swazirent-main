// src/contexts/ThemeContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>('dark');

  // Read theme from localStorage only after mounting
  useEffect(() => {
    setMounted(true);
    
    // Use a more efficient method to get theme
    const root = document.documentElement;
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const systemPrefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    
    // Priority: saved theme > system preference > dark (default)
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'dark');
    setTheme(initialTheme);
    
    // Apply theme immediately to prevent flash
    if (initialTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  // Apply theme class to document when theme changes
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Memoize the value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    theme,
    toggleTheme,
    mounted,
  }), [theme, mounted]);

  // Prevent hydration mismatch by returning children without theme context initially
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: 'dark', toggleTheme, mounted: false }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
