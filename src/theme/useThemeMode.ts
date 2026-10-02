import { useContext } from 'react';
import { ThemeModeContext } from './themeModeContextValue';

export const useThemeMode = () => {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode debe usarse dentro de un <ThemeModeProvider>');
  }
  return context;
};
