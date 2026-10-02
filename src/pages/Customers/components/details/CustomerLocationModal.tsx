import { useEffect, useState } from 'react';
import type { LatLngTuple } from 'leaflet';
import { Button, Modal } from '../../../../common/components/ui';
import type { Customer } from '../../../../services/api/types';
import { useUpdateCustomerLocation } from '../../../../services/queries/customers';
import { notify } from '../../../../utils/notifications';
import { AddressLocationPicker } from './AddressLocationPicker';

interface Props {
  open: boolean;
  onClose: () => void;
  customer: Customer;
}

/** "lat,lng" tal como lo guarda `lat_lang`, a un punto del mapa. */
const parseLatLang = (value: string | null): LatLngTuple | null => {
  if (!value) return null;
  const [lat, lng] = value.split(',').map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
};

/**
 * CU-094: corrige la última ubicación conocida del cliente. A diferencia de
 * la cuenta y las direcciones, la escribe cualquier admin (de empresa o
 * general), no sólo el administrador general.
 */
export const CustomerLocationModal = ({ open, onClose, customer }: Props) => {
  const updateLocation = useUpdateCustomerLocation();
  const [point, setPoint] = useState<LatLngTuple | null>(null);

  useEffect(() => {
    if (open) setPoint(parseLatLang(customer.lat_lang));
  }, [open, customer.lat_lang]);

  const handleSubmit = () => {
    if (!point) return;
    const latLng = `${point[0]},${point[1]}`;
    updateLocation.mutate(
      { id: customer.customer_id, latLng },
      {
        onSuccess: () => {
          notify.success('Ubicación actualizada');
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
      title="Editar ubicación"
      description="La última posición conocida del dispositivo del cliente, no una dirección de entrega."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!point} loading={updateLocation.isPending}>
            Guardar ubicación
          </Button>
        </>
      }
    >
      <AddressLocationPicker value={point} onChange={setPoint} />
    </Modal>
  );
};
