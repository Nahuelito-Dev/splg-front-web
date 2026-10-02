import { useEffect, useMemo, useState } from 'react';
import { Button, Modal, Select, TextArea } from '../../../common/components/ui';
import { useCars } from '../../../services/queries/cars';
import { useAssignVehicle, useFleetExpirations } from '../../../services/queries/fleet';
import { notify } from '../../../utils/notifications';

interface Props {
  open: boolean;
  onClose: () => void;
  deliveryId: string;
  /** El vehículo actual, preseleccionado si se está cambiando (no asignando por primera vez). */
  currentCarId?: string;
}

/**
 * Selector de un vehículo de la flota para ponerlo en uso de un chofer (PUT
 * `/delivery/:id/vehicle`). Marca los vehículos inhabilitados por documentación vencida
 * (CU-136/137) con `GET /fleet/expirations?withinDays=0`: alcanza para detectarlos porque
 * sólo lo vencido (no lo "por vencer") inhabilita, y lo vencido siempre entra en la ventana
 * sin importar `withinDays`. La validación real la hace siempre el back al confirmar.
 */
export const AssignVehicleModal = ({ open, onClose, deliveryId, currentCarId }: Props) => {
  const { data: cars = [] } = useCars();
  const { data: expirations } = useFleetExpirations(0, open);
  const assignVehicle = useAssignVehicle();
  const [carId, setCarId] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setCarId(currentCarId ?? '');
      setNote('');
    }
  }, [open, currentCarId]);

  const lockedCarIds = useMemo(
    () => new Set((expirations?.vehicles ?? []).filter((v) => v.isLocked).map((v) => v.carId)),
    [expirations],
  );

  const options = useMemo(
    () => [
      { value: '', label: 'Elegí un vehículo…' },
      ...cars.map((car) => ({
        value: car.car_id,
        label: `${car.car_patent ?? 'Sin patente'} — ${[car.car_brand, car.car_model].filter(Boolean).join(' ') || 'Sin marca/modelo'}${lockedCarIds.has(car.car_id) ? ' (inhabilitado)' : ''}`,
      })),
    ],
    [cars, lockedCarIds],
  );

  const selectedIsLocked = carId !== '' && lockedCarIds.has(carId);

  const handleConfirm = () => {
    if (!carId) return;
    assignVehicle.mutate(
      { deliveryId, body: { carId, note: note.trim() || undefined } },
      {
        onSuccess: () => {
          notify.success('Vehículo puesto en uso');
          onClose();
        },
        onError: notify.error,
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={currentCarId ? 'Cambiar vehículo' : 'Asignar vehículo'}
      description="La flota es de la distribuidora: podés poner en uso cualquiera de sus vehículos."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} loading={assignVehicle.isPending} disabled={!carId || selectedIsLocked}>
            {currentCarId ? 'Cambiar' : 'Asignar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Select label="Vehículo" options={options} value={carId} onChange={(e) => setCarId(e.target.value)} required />
        {selectedIsLocked && (
          <p role="alert" className="text-xs text-danger">
            Ese vehículo está inhabilitado por documentación vencida: no se puede poner en uso.
          </p>
        )}
        <TextArea
          label="Nota"
          hint="Opcional: motivo u observación de la asignación."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
      </div>
    </Modal>
  );
};
