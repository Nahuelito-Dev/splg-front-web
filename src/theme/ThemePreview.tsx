import type { CSSProperties } from 'react';
import brand from './brand.json';
import type { ThemeModeTokens } from '../services/api/types';

interface Props {
  tokens: ThemeModeTokens;
  mode: 'light' | 'dark';
  name: string;
  logoUrl: string | null;
}

/** Superficies fijas del panel (no se tematizan): contra ellas se ve el tema. */
const SURFACE = {
  light: {
    bg: brand.canvas,
    card: '#FFFFFF',
    ink: brand.tinta['900'],
    muted: brand.tinta['500'],
    line: brand.tinta['200'],
  },
  dark: {
    bg: brand.dark.canvas,
    card: brand.dark.surface,
    ink: brand.dark.ink,
    muted: brand.dark.muted,
    line: brand.dark.outline,
  },
} as const;

/**
 * Vista previa de un tema: barra con el logo y el nombre, botón, chip, enlace y acento, en claro u oscuro. Los colores
 * son datos (tokens de la API) y por eso la pieza vive en `src/theme`: fuera de acá, sólo roles.
 */
export const ThemePreview = ({ tokens, mode, name, logoUrl }: Props) => {
  const s = SURFACE[mode];
  const box: CSSProperties = { background: s.bg, color: s.ink, borderColor: s.line };
  return (
    <div
      className="overflow-hidden rounded-card border"
      style={box}
      aria-label={`Vista previa en modo ${mode === 'light' ? 'claro' : 'oscuro'}`}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: brand.sidebar.bg }}>
        <span
          className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-[8px] text-[11px] font-bold"
          style={{
            backgroundImage: `linear-gradient(135deg, ${tokens.gradientFrom}, ${tokens.gradientTo})`,
            color: tokens.onPrimary,
          }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-full w-full object-contain" style={{ background: '#FFFFFF' }} />
          ) : (
            name.slice(0, 2).toUpperCase()
          )}
        </span>
        <span className="truncate text-sm font-bold" style={{ color: '#FFFFFF' }}>
          {name}
        </span>
      </div>
      <div className="space-y-3 p-3">
        <div className="space-y-2 rounded-[10px] border p-3" style={{ background: s.card, borderColor: s.line }}>
          <p className="text-[13px]" style={{ color: s.muted }}>
            Pedido <span style={{ color: tokens.primary, fontWeight: 600 }}>#1042</span> ·{' '}
            <span style={{ color: tokens.accent, fontWeight: 600 }}>express</span>
          </p>
          <span
            className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ background: tokens.primarySoft, color: tokens.primaryStrong }}
          >
            En camino
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className="inline-flex h-9 items-center rounded-[10px] border px-3.5 text-[13px] font-semibold"
            style={{
              backgroundImage: `linear-gradient(180deg, ${tokens.gradientFrom}, ${tokens.gradientTo})`,
              borderColor: tokens.gradientEdge,
              color: tokens.onPrimary,
            }}
          >
            Guardar cambios
          </span>
          <span
            className="inline-flex h-9 items-center rounded-[10px] border px-3.5 text-[13px] font-semibold"
            style={{ borderColor: tokens.primary, color: mode === 'light' ? tokens.primaryStrong : tokens.primary }}
          >
            Secundario
          </span>
        </div>
      </div>
    </div>
  );
};
