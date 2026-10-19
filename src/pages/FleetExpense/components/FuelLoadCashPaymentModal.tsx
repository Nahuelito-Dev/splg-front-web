import { useEffect, useState } from 'react';
import { Button, Modal } from '../../../common/components/ui';
import type { FuelLoad } from '../../../services/api/types';
import { usePayFuelLoadFromCashBox } from '../../../services/queries/fleetExpense';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { CashBoxField } from '../../Orders/components/CashBoxField';
import { useOrderCashBoxes } from '../../Orders/components/useOrderCashBoxes';

interface Props {
  load: FuelLoad | null;
  onClose: () => void;
}

/** Asentar en una caja la carga que registró el chofer pagada de la caja: el importe sale de la caja elegida. */
export const FuelLoadCashPaymentModal = ({ load, onClose }: Props) => {
  const pay = usePayFuelLoadFromCashBox();
  const cashBoxes = useOrderCashBoxes(load !== null);
  const [cashBoxId, setCashBoxId] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setCashBoxId('');
    setTouched(false);
  }, [load]);

  const boxError = touched && !cashBoxId ? 'Elegí la caja de la que sale el efectivo' : undefined;
  const noBoxes = !cashBoxes.loading && !cashBoxes.failed && !cashBoxes.required;

  const submit = () => {
    setTouched(true);
    if (!load || !cashBoxId) return;
    pay.mutate(
      { id: load.fuelLoadId, body: { cashBoxId } },
      {
        onSuccess: () => {
          notify.success('Carga asentada en la caja');
          onClose();
        },
        onError: notify.error,
      },
    );
  };

  return (
    <Modal
      open={load !== null}
      onClose={onClose}
      closeBlocked={pay.isPending}
      title="Asentar en caja"
      description={load ? `${load.carPatent ?? 'Vehículo'} · ${formatCurrency(load.totalAmount)}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pay.isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={pay.isPending} disabled={noBoxes || cashBoxes.failed}>
            Asentar
          </Button>
        </>
      }
    >
      {noBoxes ? (
        <p className="text-sm text-muted">La distribuidora no tiene cajas de efectivo activas: creá una en Finanzas.</p>
      ) : cashBoxes.failed ? (
        <p role="alert" className="text-sm text-danger">
          No pudimos cargar las cajas: cerrá y probá de nuevo.
        </p>
      ) : (
        <CashBoxField
          boxes={cashBoxes.boxes}
          value={cashBoxId}
          onChange={setCashBoxId}
          error={boxError}
          hint="El importe de la carga sale de esta caja en efectivo. Si exige sesión, tiene que estar abierta."
        />
      )}
    </Modal>
  );
};
