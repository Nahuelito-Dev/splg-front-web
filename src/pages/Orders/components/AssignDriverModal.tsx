import { useEffect, useState } from 'react';
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler';
import { Button, cx, EmptyState, LoadingState, Modal, SearchInput } from '../../../common/components/ui';
import { useDebounce } from '../../../hooks';
import { useActiveDeliveries } from '../../../services/queries/orders';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (deliveryId: string) => void;
  assigning: boolean;
}

/** Sobreescribe a mano la asignación automática de un pedido. */
export const AssignDriverModal = ({ open, onClose, onConfirm, assigning }: Props) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search.trim());
  const { data: drivers, isPending } = useActiveDeliveries(debouncedSearch);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    if (open) {
      setSelected('');
      setSearch('');
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Asignación manual"
      description="Sobreescribe la asignación automática del pedido."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(selected)} loading={assigning} disabled={!selected}>
            Confirmar
          </Button>
        </>
      }
    >
      <SearchInput
        label="Buscar chofer"
        placeholder="Nombre, teléfono o patente"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3"
      />
      {isPending ? (
        <LoadingState label="Buscando choferes disponibles…" />
      ) : !drivers || drivers.rows.length === 0 ? (
        <EmptyState
          title="No hay choferes activos"
          description={
            debouncedSearch
              ? 'Ningún chofer activo coincide con la búsqueda.'
              : 'Activá algún chofer para poder asignarlo a mano.'
          }
        />
      ) : (
        <div className="space-y-2">
          {drivers.total > drivers.rows.length && (
            <p className="text-xs text-muted">
              Mostrando {drivers.rows.length} de {drivers.total} choferes activos. Buscá por nombre, teléfono o patente
              para encontrar al resto.
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
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-primary-strong shadow-sm">
                  <TwoWheelerIcon fontSize="small" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{driver.user?.full_name ?? 'Sin nombre'}</span>
                  <span className="block text-xs text-muted">{driver.user?.phone_number ?? '—'}</span>
                </span>
              </span>
              <input
                type="radio"
                name="delivery"
                value={driver.delivery_id}
                checked={selected === driver.delivery_id}
                onChange={() => setSelected(driver.delivery_id)}
                className="h-4 w-4 accent-[theme(colors.primary.DEFAULT)]"
              />
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
};
