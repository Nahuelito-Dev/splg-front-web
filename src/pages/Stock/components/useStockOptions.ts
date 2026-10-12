import { useMemo } from 'react';
import type { SelectOption } from '../../../common/components/ui';
import type { Car, Delivery } from '../../../services/api/types';
import { useCars } from '../../../services/queries/cars';
import { useDeliveryOptions } from '../../../services/queries/deliveries';
import { useGasCylinderTypes } from '../../../services/queries/gasCylinders';
import { useWarehouses } from '../../../services/queries/stock';

const PLACEHOLDER: SelectOption = { value: '', label: 'Elegí una opción' };

/** Las garrafas del catálogo como opciones de un combo. `failed` evita mostrar «no hay» cuando la consulta falló. */
export const useCylinderOptions = () => {
  const query = useGasCylinderTypes();
  const options = useMemo(
    () => (query.data?.rows ?? []).map((c) => ({ value: c.gas_cylinder_id, label: c.type })),
    [query.data],
  );
  return { options, failed: query.isError, loading: query.isPending, refetch: query.refetch, error: query.error };
};

/** Los galpones vigentes como opciones. */
export const useWarehouseOptions = () => {
  const query = useWarehouses(false);
  const options = useMemo(
    () =>
      (query.data ?? []).map((w) => ({
        value: w.warehouseId,
        label: w.isDefault ? `${w.name} (predeterminado)` : w.name,
      })),
    [query.data],
  );
  return {
    options,
    warehouses: query.data ?? [],
    failed: query.isError,
    loading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
};

/** Los vehículos de la flota. */
export const useCarOptions = () => {
  const query = useCars();
  const options = useMemo(
    () =>
      (query.data ?? []).map((c: Car) => ({
        value: c.car_id,
        label: `${c.car_patent} · ${c.car_brand} ${c.car_model}`,
      })),
    [query.data],
  );
  return { options, failed: query.isError, loading: query.isPending, error: query.error, refetch: query.refetch };
};

/** Los choferes (hasta 100). */
export const useDriverOptions = () => {
  const query = useDeliveryOptions();
  const options = useMemo(
    () =>
      (query.data?.rows ?? []).map((d: Delivery) => ({
        value: d.delivery_id,
        label: d.user?.full_name ?? d.delivery_id,
      })),
    [query.data],
  );
  return { options, failed: query.isError, loading: query.isPending, error: query.error, refetch: query.refetch };
};

/** Antepone «Elegí una opción» a un combo. */
export const withPlaceholder = (options: SelectOption[], label = PLACEHOLDER.label): SelectOption[] => [
  { value: '', label },
  ...options,
];
