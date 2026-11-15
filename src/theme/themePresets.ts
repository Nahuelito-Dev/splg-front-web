import type { AppearanceFormValues } from '../pages/Configuration/appearanceRules';

export interface ThemePreset {
  name: string;
  primaryColor: string;
  accentColor: string;
}

/** Paletas listas para usar; el back conserva la última palabra sobre el contraste al previsualizar y guardar. */
export const THEME_PRESETS: readonly ThemePreset[] = [
  { name: 'Naranja SPLG', primaryColor: '#CD4B00', accentColor: '#A86A00' },
  { name: 'Amarillo gas', primaryColor: '#B58700', accentColor: '#A87900' },
  { name: 'Amarillo anaranjado', primaryColor: '#A85B00', accentColor: '#A96A00' },
  { name: 'Violeta', primaryColor: '#6D28D9', accentColor: '#7B43C5' },
  { name: 'Verde', primaryColor: '#0B6E3D', accentColor: '#247A48' },
  { name: 'Celeste', primaryColor: '#006C82', accentColor: '#087B94' },
  { name: 'Azul petróleo', primaryColor: '#075A6A', accentColor: '#087287' },
];

/** El formato que consume la misma validación local del selector libre. */
export const valuesOfPreset = (preset: ThemePreset): AppearanceFormValues => ({
  primaryColor: preset.primaryColor,
  customAccent: true,
  accentColor: preset.accentColor,
  displayName: '',
});
