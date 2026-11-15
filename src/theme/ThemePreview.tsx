import type { CSSProperties } from 'react';
import brand from './brand.json';
import type { ThemeModeTokens } from '../services/api/types';

interface Props {
  tokens: ThemeModeTokens;
  mode: 'light' | 'dark';
  name: string;
  logoUrl: string | null;
}

/** La tinta no se tematiza: el texto del panel es el mismo con cualquier tema. */
const INK = {
  light: { ink: brand.tinta['900'], muted: brand.tinta['500'] },
  dark: { ink: brand.dark.ink, muted: brand.dark.muted },
} as const;

const MENU_ITEMS = ['Inicio', 'Pedidos', 'Clientes'] as const;

/**
 * Vista previa de un tema: el menú lateral (con su fondo, el ítem activo y el título de sección), el fondo del panel,
 * una tarjeta, botón, chip, enlace y acento, en claro u oscuro. Los colores son datos (tokens de la API) y por eso la
 * pieza vive en `src/theme`: fuera de acá, sólo roles.
 */
export const ThemePreview = ({ tokens, mode, name, logoUrl }: Props) => {
  const ink = INK[mode];
  const box: CSSProperties = { background: tokens.canvas, color: ink.ink, borderColor: tokens.outline };
  return (
    <div
      className="flex overflow-hidden rounded-card border"
      style={box}
      aria-label={`Vista previa en modo ${mode === 'light' ? 'claro' : 'oscuro'}`}
    >
      <div
        className="flex w-[118px] shrink-0 flex-col gap-2 border-r px-2 py-2.5"
        style={{ background: tokens.side, borderColor: tokens.sideLine }}
        aria-label="Menú lateral"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-[7px] text-[10px] font-bold"
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
          <span className="truncate text-[12px] font-bold" style={{ color: '#FFFFFF' }}>
            {name}
          </span>
        </div>
        <span
          className="px-1 pt-1 text-[9.5px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: tokens.sideMuted }}
        >
          Operación
        </span>
        {MENU_ITEMS.map((item, index) => {
          const active = index === 1;
          return (
            <span
              key={item}
              className="relative flex items-center gap-1.5 rounded-[7px] px-1.5 py-1 text-[11.5px] font-medium"
              style={
                active
                  ? {
                      backgroundImage: `linear-gradient(90deg, ${tokens.primary}29, transparent)`,
                      color: '#FFFFFF',
                    }
                  : { color: tokens.sideText }
              }
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-[3px]"
                style={{ background: active ? tokens.sideAccent : tokens.sideText }}
              />
              {item}
            </span>
          );
        })}
        <span
          className="mt-auto rounded-[7px] border px-1.5 py-1 text-[10.5px]"
          style={{ background: tokens.sideRaised, borderColor: tokens.sideLine, color: tokens.sideText }}
        >
          Administrador
        </span>
      </div>
      <div className="min-w-0 flex-1 space-y-3 p-3">
        <div
          className="space-y-2 rounded-[10px] border p-3"
          style={{ background: tokens.surface, borderColor: tokens.outline }}
        >
          <p className="text-[13px]" style={{ color: ink.muted }}>
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
            style={{
              background: tokens.surface,
              borderColor: tokens.primary,
              color: mode === 'light' ? tokens.primaryStrong : tokens.primary,
            }}
          >
            Secundario
          </span>
        </div>
      </div>
    </div>
  );
};
