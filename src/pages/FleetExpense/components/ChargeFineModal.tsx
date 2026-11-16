import { useEffect, useMemo, useState } from 'react';
import { Button, Modal, Select } from '../../../common/components/ui';
import type { TrafficFine } from '../../../services/api/types';
import { useEmployees } from '../../../services/queries/employees';
import { useChargeTrafficFine } from '../../../services/queries/fleetExpense';
import { notify } from '../../../utils/notifications';

interface Props {
  fine: TrafficFine | null;
  onClose: () => void;
}

/**
 * Imputar una multa al chofer (CU-200): la asume el empleado y deja de ser un costo del vehículo. Por omisión, el
 * responsable deducido al registrarla. Hoy es sólo una marca: el descuento llegará con el módulo de caja.
 */
export const ChargeFineModal = ({ fine, onClose }: Props) => {
  const charge = useChargeTrafficFine();
  const { data } = useEmployees({ page: 0, pageSize: 100 }, { status: 'active' }, fine !== null);
  const [employeeId, setEmployeeId] = useState('');
  useEffect(() => {
    if (fine) setEmployeeId(fine.employeeId ?? '');
  }, [fine]);
  const options = useMemo(
    () => [
      { value: '', label: fine?.employeeId ? 'El responsable de la multa' : 'Elegí un empleado' },
      ...(data?.rows ?? []).map((e) => ({ value: e.employeeId, label: `${e.lastName}, ${e.firstName}` })),
    ],
    [data, fine],
  );
  const missing = !employeeId && !fine?.employeeId;

  const submit = () =>
    charge.mutate(
      { id: fine?.fineId ?? '', body: employeeId ? { employeeId } : {} },
      {
        onSuccess: () => {
          notify.success('Multa imputada al chofer');
          onClose();
        },
        onError: notify.error,
      },
    );

  return (
    <Modal
      open={fine !== null}
      onClose={onClose}
      closeBlocked={charge.isPending}
      title="Imputar al chofer"
      description={fine ? `Acta ${fine.actNumber}${fine.employeeName ? ` · ${fine.employeeName}` : ''}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={charge.isPending}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={charge.isPending} blockedReason={missing ? 'Elegí un empleado' : undefined}>
            Imputar
          </Button>
        </>
      }
    >
      <Select
        label="Empleado responsable"
        options={options}
        value={employeeId}
        onChange={(e) => setEmployeeId(e.target.value)}
        hint="La multa deja de contar como costo de la distribuidora."
      />
    </Modal>
  );
};
