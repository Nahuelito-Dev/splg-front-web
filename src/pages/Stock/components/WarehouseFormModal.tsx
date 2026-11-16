import { zodResolver } from '@hookform/resolvers/zod';
import type { LatLngTuple } from '../../../common/components/map/latLng';
import { MapPinOff } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal, FormInput, FormCheckbox, FormSelect, Form } from '../../../common/components/ui';
import { AddressLocationPicker } from '../../Customers/components/details/AddressLocationPicker';
import type { WarehouseV2 } from '../../../services/api/types';
import { useCreateWarehouse, useUpdateWarehouse } from '../../../services/queries/stock';
import { notify } from '../../../utils/notifications';
import {
  coordinateText,
  locationOf,
  warehouseCreateBody,
  warehouseSchema,
  warehouseUpdateBody,
  type WarehouseFormValues,
} from './warehouseSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con galpón es edición; sin él, alta. */
  warehouse: WarehouseV2 | null;
}

const KIND_OPTIONS = [
  { value: 'depot', label: 'Galpón' },
  { value: 'branch', label: 'Sucursal' },
];

/** Un punto que el mapa puede dibujar; uno fuera de rango queda sólo en los campos, con su error. */
const isInRange = ({ latitude, longitude }: { latitude: number; longitude: number }) =>
  Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

/** Alta o edición de un galpón (depósito), con su ubicación en el mapa. */
export const WarehouseFormModal = ({ open, onClose, warehouse }: Props) => {
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();
  const saving = createWarehouse.isPending || updateWarehouse.isPending;
  const methods = useForm<WarehouseFormValues>({ resolver: zodResolver(warehouseSchema) });
  const { reset, watch, setValue } = methods;
  const point = locationOf({ latitude: watch('latitude') ?? '', longitude: watch('longitude') ?? '' });
  const pin: LatLngTuple | null = point && isInRange(point) ? [point.latitude, point.longitude] : null;
  const place = (latitude: string, longitude: string) => {
    const options = { shouldDirty: true, shouldValidate: true };
    setValue('latitude', latitude, options);
    setValue('longitude', longitude, options);
  };

  useEffect(() => {
    if (!open) return;
    reset({
      name: warehouse?.name ?? '',
      code: warehouse?.code ?? '',
      kind: warehouse?.kind ?? 'depot',
      address: warehouse?.address ?? '',
      isDefault: warehouse?.isDefault ?? false,
      latitude: coordinateText(warehouse?.latitude),
      longitude: coordinateText(warehouse?.longitude),
    });
  }, [open, warehouse, reset]);

  const onSubmit = (values: WarehouseFormValues) => {
    const options = {
      onSuccess: () => {
        notify.success(warehouse ? 'Galpón actualizado' : 'Galpón creado');
        onClose();
      },
      onError: notify.error,
    };
    if (warehouse)
      updateWarehouse.mutate({ id: warehouse.warehouseId, body: warehouseUpdateBody(values, warehouse) }, options);
    else createWarehouse.mutate(warehouseCreateBody(values), options);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={warehouse ? 'Editar galpón' : 'Nuevo galpón'}
      description="Un lugar donde la distribuidora guarda garrafas."
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="warehouse-form" loading={saving}>
            {warehouse ? 'Guardar cambios' : 'Crear galpón'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id="warehouse-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <FormInput name="name" label="Nombre" required maxLength={80} />
        <FormInput name="code" label="Código" required maxLength={12} hint="Corto y único; se guarda en mayúsculas." />
        <FormSelect name="kind" label="Tipo" options={KIND_OPTIONS} />
        <FormInput name="address" label="Dirección" maxLength={300} />
        <div className="sm:col-span-2">
          <FormCheckbox
            name="isDefault"
            label="Galpón predeterminado"
            hint="Es el que usa la entrega cuando el camión no tiene stock. No puede estar inactivo."
          />
        </div>
        <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <legend className="mb-1 text-sm font-semibold text-ink">Ubicación</legend>
          <p className="text-xs text-muted sm:col-span-2">
            Es el punto de salida de las hojas de ruta. Hacé clic en el mapa o arrastrá el pin; también podés escribir
            las coordenadas. Sin ubicación, la hoja sale del centro de las paradas.
          </p>
          <div className="sm:col-span-2">
            <AddressLocationPicker
              value={pin}
              onChange={([lat, lng]) => place(coordinateText(lat), coordinateText(lng))}
              ariaLabel="Mapa para elegir la ubicación del galpón"
              emptyHint="Hacé clic en el mapa para marcar dónde está el galpón."
            />
          </div>
          <FormInput name="latitude" label="Latitud" inputMode="decimal" placeholder="-27.367100" hint="De -90 a 90" />
          <FormInput
            name="longitude"
            label="Longitud"
            inputMode="decimal"
            placeholder="-55.896100"
            hint="De -180 a 180"
          />
          {point && (
            <div className="sm:col-span-2">
              <Button size="sm" variant="secondary" icon={<MapPinOff />} onClick={() => place('', '')}>
                Quitar ubicación
              </Button>
            </div>
          )}
        </fieldset>
      </Form>
    </Modal>
  );
};
