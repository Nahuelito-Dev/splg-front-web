import type { ReactNode } from 'react';
import { Button } from './Button';
import { MoreActionsMenu, type MenuAction } from './MoreActionsMenu';

interface Props {
  title: string;
  /** Línea chica sobre el título (la fecha, la empresa). */
  eyebrow?: string;
  description?: string;
  /** Botones o filtros a la derecha del título. */
  actions?: ReactNode;
  /**
   * Acciones de segundo orden. Con una sola se muestra como botón secundario; con dos o más (3 botones en total) van
   * en el menú ⋮ y en el encabezado queda sólo la primaria (`actions`).
   */
  secondaryActions?: MenuAction[];
  /** Etiquetas de estado al lado del título (el estado de un pedido, de una empresa). */
  badges?: ReactNode;
}

/** El encabezado de cada página: un solo h1 por pantalla. Las migas viven en la barra superior (ver `useCrumbLeaf`). */
export const PageHeader = ({ title, eyebrow, description, actions, secondaryActions = [], badges }: Props) => (
  <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && <p className="mb-1 text-xs font-medium text-muted">{eyebrow}</p>}
      {badges ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-[26px]">{title}</h1>
          {badges}
        </div>
      ) : (
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-[26px]">{title}</h1>
      )}
      {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
    </div>
    {(actions || secondaryActions.length > 0) && (
      <div className="flex flex-wrap items-center gap-2">
        {secondaryActions.length === 1 &&
          secondaryActions.map(({ label, icon, onClick, disabled, title: hint, blockedReason, tone }) => (
            <Button
              key={label}
              variant={tone === 'danger' ? 'danger' : 'secondary'}
              icon={icon}
              onClick={onClick}
              disabled={disabled}
              title={hint}
              blockedReason={blockedReason}
            >
              {label}
            </Button>
          ))}
        {secondaryActions.length > 1 && <MoreActionsMenu actions={secondaryActions} label="Más acciones" />}
        {actions}
      </div>
    )}
  </header>
);
