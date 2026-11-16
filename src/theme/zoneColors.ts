/**
 * Paleta de colores predefinidos para pintar una zona de cobertura en el mapa
 * (además de poder cargar cualquier hex a mano). Son valores de la marca
 * (`brand.json`) con contraste suficiente sobre el fondo blanco del mapa; por
 * eso este archivo vive en `src/theme` (exento de `npm run colors`: son datos
 * de la app, no clases de Tailwind sueltas).
 */
import brand from './brand.json';

export interface ZoneColorOption {
  hex: string;
  label: string;
}

export const ZONE_COLOR_PRESETS: ZoneColorOption[] = [
  { hex: brand.llama['600'], label: 'Llama' },
  { hex: brand.gas['600'], label: 'Gas' },
  { hex: '#B54708', label: 'Ámbar' },
  { hex: '#175CD3', label: 'Azul' },
  { hex: '#067647', label: 'Verde' },
  { hex: '#6941C6', label: 'Violeta' },
  { hex: '#C11574', label: 'Magenta' },
  { hex: brand.tinta['700'], label: 'Grafito' },
];

/** El color por defecto cuando todavía no se eligió ninguno. */
export const DEFAULT_ZONE_COLOR = ZONE_COLOR_PRESETS[0].hex;
