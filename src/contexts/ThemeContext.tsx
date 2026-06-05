import React, { createContext, useContext, useState, ReactNode } from 'react';
import themeService, { ThemeType } from '../utils/themeService';

interface ThemeContextType {
  theme: ThemeType;
  themeSettings: any;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(themeService.getCurrentTheme());
  const [themeSettings, setThemeSettings] = useState(themeService.getCurrentThemeSettings());

  const setTheme = (newTheme: ThemeType) => {
    themeService.setTheme(newTheme);
    setThemeState(newTheme);
    setThemeSettings(themeService.getCurrentThemeSettings());
  };

  const value: ThemeContextType = { theme, themeSettings, setTheme };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
