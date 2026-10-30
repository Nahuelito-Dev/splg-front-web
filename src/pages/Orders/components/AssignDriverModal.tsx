import { useEffect, useMemo, useState } from 'react';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import {
  AffectedList,
  Badge,
  Button,
  cx,
  EmptyState,
  LoadingState,
  Modal,
  PersonAvatar,
  SearchInput,
} from '../../../common/components/ui';
import { useDebounce, usePermissions } from '../../../hooks';
import { errorMessage } from '../../../services/api/errors';
import { useEnabledDeliveries } from '../../../services/queries/orders';
import { driverStatus } from '../../../utils/statusLabels';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (deliveryId: string) => void;
  assigning: boolean;
  /** La empresa del pedido: con ella el administrador general sin «Ver como» lista sólo los choferes de ese pedido. */
  distributorId?: string;
  /** Asignación en lote: cuántos pedidos van al chofer elegido. */
  count?: number;
  /** Qué pedidos se van a afectar (lote): se listan antes de confirmar. */
  affected?: string[];
  /** El rechazo del back a la última asignación (documentación vencida, moto requerida en express…). */
  error?: unknown;
}

/** Sobreescribe a mano la asignación automática de un pedido. */
export const AssignDriverModal = ({
  open,
  onClose,
  onConfirm,
  assigning,
  distributorId,
  count = 1,
  affected,
  error,
}: Props) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim());
  const { needsDistributor } = usePermissions();
  // Sin empresa conocida, el administrador general vería choferes de todas y la API rechaza los de otra (404).
  const unscoped = needsDistributor && !distributorId;
  const { data, isPending } = useEnabledDeliveries(debouncedSearch, {
    distributorId: needsDistributor ? distributorId : undefined,
    enabled: open && !unscoped,
  });
  const [selected, setSelected] = useState('');
  // Un rechazo anterior (de otro pedido, de otra apertura o de otra elección) no se vuelve a mostrar.
  const [dismissedError, setDismissedError] = useState<unknown>(null);
  const shownError = error != null && error !== dismissedError ? errorMessage(error) : null;

  useEffect(() => {
    if (open) {
      setSelected('');
      setSearch('');
      setDismissedError(error ?? null);
    }
    // Sólo al abrir: el error que ya estaba entonces es de un intento anterior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Asignables = habilitados y validados, en línea o no; los en línea primero.
  const drivers = useMemo(() => {
    if (!data) return undefined;
    const rows = data.rows
      .filter((driver) => driver.isEnabled && driver.validated)
      .sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable));
    // El aviso de «Mostrando X de Y» es sólo para cuando la página del back no trajo a todos.
    return { rows, truncated: data.total > data.rows.length };
  }, [data]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      // Mientras se asigna no se cierra: el resultado tiene que verse en este pedido, no en el próximo que se abra.
      closeBlocked={assigning}
      title="Asignación manual"
      description={
        count > 1
          ? `Asigna los ${count} pedidos al mismo chofer y pisa la asignación automática.`
          : 'Sobreescribe la asignación automática del pedido.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={assigning}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(selected)} loading={assigning} disabled={!selected}>
            Confirmar
          </Button>
        </>
      }
    >
      {affected && (
        <div className="mb-3">
          <AffectedList items={affected} />
        </div>
      )}
      <SearchInput
        label="Buscar chofer"
        placeholder="Nombre, teléfono o patente"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3"
      />
      {unscoped ? (
        <EmptyState
          title="Elegí una distribuidora"
          description="Para asignar un chofer, elegí la distribuidora del pedido con «Ver como» en la barra superior."
        />
      ) : isPending ? (
        <LoadingState label="Buscando choferes…" />
      ) : !drivers || drivers.rows.length === 0 ? (
        <EmptyState
          title="No hay choferes habilitados y validados"
          description={
            debouncedSearch
              ? 'Ningún chofer habilitado y validado coincide con la búsqueda.'
              : 'Habilitá y validá a un chofer para poder asignarlo a mano.'
          }
        />
      ) : (
        <div className="space-y-2">
          {drivers.truncated && (
            <p className="text-xs text-muted">
              Se muestran los primeros {drivers.rows.length} choferes. Buscá por nombre, teléfono o patente para
              encontrar al resto.
            </p>
          )}
          {drivers.rows.map((driver) => (
            <label
              key={driver.delivery_id}
              className={cx(
                'flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-colors',
                selected === driver.delivery_id
                  ? 'border-primary bg-primary-soft'
                  : 'border-outline hover:border-primary/50',
              )}
            >
              <span className="flex min-w-0 items-center gap-3">
                <PersonAvatar
                  name={driver.user?.full_name ?? 'Chofer'}
                  userId={driver.user_id}
                  fallback={
                    <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-surface text-primary-strong shadow-sm">
                      <TwoWheelerIcon fontSize="small" />
                    </span>
                  }
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{driver.user?.full_name ?? 'Sin nombre'}</span>
                  <span className="block text-xs text-muted">{driver.user?.phone_number ?? '—'}</span>
                  <Badge label={driverStatus(driver)} className="mt-1" />
                </span>
              </span>
              <input
                type="radio"
                name="delivery"
                value={driver.delivery_id}
                checked={selected === driver.delivery_id}
                onChange={() => {
                  setSelected(driver.delivery_id);
                  setDismissedError(error ?? null);
                }}
                className="h-4 w-4 shrink-0 accent-[theme(colors.primary.DEFAULT)]"
              />
            </label>
          ))}
        </div>
      )}
      {shownError && (
        <p role="alert" className="mt-3 rounded-xl border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
          {shownError}
        </p>
      )}
    </Modal>
  );
};
