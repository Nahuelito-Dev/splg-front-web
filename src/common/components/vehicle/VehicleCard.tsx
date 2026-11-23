import type { ReactNode } from 'react';
import type { Label } from '../../../utils/statusLabels';
import { Badge, cx } from '../ui';
import { VehiclePhoto } from './VehiclePhoto';
import { vehicleName } from './vehicleLabels';

interface Props {
  carId: string;
  patent: string | null | undefined;
  /** Marca y modelo, o lo que describa al vehículo. */
  description?: string | null;
  typeCar?: string | null;
  photoUrl: string | null | undefined;
  status?: Label;
  /** `card`: foto grande (listados y seguimiento). `row`: foto chica a la izquierda (dentro de otra tarjeta). */
  variant?: 'card' | 'row';
  /** Con él, la tarjeta se elige con un clic o con el teclado. */
  onSelect?: () => void;
  /** Qué hace elegirla, para el nombre accesible: «Ver el detalle de», «Abrir la ficha de». */
  selectLabel?: string;
  selected?: boolean;
  /** Botones propios (editar, dar de baja): quedan fuera del área que elige. */
  actions?: ReactNode;
  /** Lo que va debajo de la foto (card) o del nombre (row): chofer, carga, paradas… */
  children?: ReactNode;
  photoRenewable?: boolean;
  className?: string;
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

/**
 * Un vehículo: la patente grande, su estado y la foto. Es la misma pieza en el seguimiento, el listado de vehículos,
 * la ficha del chofer, los recursos de la hoja de ruta y el pedido.
 */
export const VehicleCard = ({
  carId,
  patent,
  description,
  typeCar,
  photoUrl,
  status,
  variant = 'card',
  onSelect,
  selectLabel = 'Ver',
  selected = false,
  actions,
  children,
  photoRenewable = true,
  className,
}: Props) => {
  const row = variant === 'row';
  const name = vehicleName(patent);

  const heading = (
    <span className="flex min-w-0 items-start justify-between gap-2">
      <span className="min-w-0">
        <span
          className={cx(
            'block truncate font-mono font-bold uppercase tracking-wide text-ink',
            row ? 'text-[15px]' : 'text-lg',
          )}
        >
          {name}
        </span>
        {(description || typeCar) && (
          <span className="block truncate text-xs text-muted">
            {[description, typeCar].filter(Boolean).join(' · ')}
          </span>
        )}
      </span>
      {status && <Badge label={status} className="shrink-0" />}
    </span>
  );

  const photo = (
    <span
      className={cx(
        'block shrink-0 overflow-hidden border border-outline-soft',
        row ? 'h-16 w-24 rounded-lg' : 'aspect-[16/9] w-full rounded-xl',
      )}
    >
      <VehiclePhoto carId={carId} url={photoUrl} typeCar={typeCar} renewable={photoRenewable} />
    </span>
  );

  const body = row ? (
    <span className="flex min-w-0 items-center gap-3">
      {photo}
      <span className="block min-w-0 flex-1">{heading}</span>
    </span>
  ) : (
    <span className="grid gap-3">
      {heading}
      {photo}
    </span>
  );

  return (
    <article
      data-testid="vehicle-card"
      data-selected={selected || undefined}
      aria-label={`Vehículo ${name}`}
      className={cx(
        'relative min-w-0 rounded-card border bg-surface text-left transition-colors',
        row ? 'p-3' : 'p-4 shadow-card',
        selected ? 'border-primary ring-2 ring-primary/30' : 'border-outline',
        onSelect && !selected && 'pointer-hover:hover:border-primary-edge',
        className,
      )}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={`${selectLabel} ${name}`}
          className={cx('block w-full rounded-lg text-left', FOCUS)}
        >
          {body}
        </button>
      ) : (
        body
      )}
      {children && <div className={cx('min-w-0', row ? 'mt-2' : 'mt-3')}>{children}</div>}
      {actions && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-1 border-t border-outline-soft pt-2">
          {actions}
        </div>
      )}
    </article>
  );
};
