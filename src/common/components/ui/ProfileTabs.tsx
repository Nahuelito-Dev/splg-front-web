import type { KeyboardEvent, ReactNode } from 'react';
import { cx } from './cx';

export interface ProfileTabItem {
  key: string;
  label: string;
  /** Contador al lado de la etiqueta (pedidos, direcciones…). */
  badge?: string | number;
}

interface Props {
  tabs: ProfileTabItem[];
  value: string;
  onChange: (key: string) => void;
  /** Prefijo de los ids: sólo cambia si hay dos grupos de pestañas en la misma pantalla. */
  idBase?: string;
}

const tabId = (idBase: string, key: string) => `${idBase}-tab-${key}`;
const panelId = (idBase: string, key: string) => `${idBase}-panel-${key}`;

/**
 * Las pestañas de una ficha de perfil (Resumen/Pedidos/…), inspiradas en `user-profile-view` de Minimal.
 * Patrón ARIA de pestañas: una sola en el orden de tabulación y flechas, Inicio y Fin para moverse.
 */
export const ProfileTabs = ({ tabs, value, onChange, idBase = 'profile' }: Props) => {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = tabs.length - 1;
    const target =
      event.key === 'ArrowRight'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    const next = tabs[target];
    onChange(next.key);
    document.getElementById(tabId(idBase, next.key))?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Secciones de la ficha"
      className="flex gap-1 overflow-x-auto border-b border-outline"
    >
      {tabs.map((tab, index) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            id={tabId(idBase, tab.key)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={panelId(idBase, tab.key)}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cx(
              'relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-t-md px-3 py-2.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
              active ? 'text-primary-strong' : 'text-muted hover:text-ink',
            )}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={cx(
                  'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                  active ? 'bg-primary-soft text-on-primary-soft' : 'bg-surface-hover text-ink-2',
                )}
              >
                {tab.badge}
              </span>
            )}
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        );
      })}
    </div>
  );
};

interface PanelProps {
  tabKey: string;
  value: string;
  idBase?: string;
  children: ReactNode;
}

/** El contenido de una pestaña: sólo se monta la activa, enlazada a su botón. */
export const ProfileTabPanel = ({ tabKey, value, idBase = 'profile', children }: PanelProps) =>
  tabKey === value ? (
    <div role="tabpanel" id={panelId(idBase, tabKey)} aria-labelledby={tabId(idBase, tabKey)} tabIndex={0}>
      {children}
    </div>
  ) : null;
