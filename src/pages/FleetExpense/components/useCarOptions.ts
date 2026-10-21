import { useMemo } from 'react';
import type { SelectOption } from '../../../common/components/ui';
import { useCars } from '../../../services/queries/cars';

/** Los vehículos de la distribuidora como opciones de un combo («AB123CD · Fiat Fiorino»). */
export const useCarOptions = (placeholder?: string) => {
  const { data: cars, isPending, error, refetch } = useCars();
  const options = useMemo<SelectOption[]>(() => {
    const list = (cars ?? []).map((car) => ({
      value: car.car_id,
      label: [car.car_patent ?? 'Sin patente', [car.car_brand, car.car_model].filter(Boolean).join(' ')]
        .filter(Boolean)
        .join(' · '),
    }));
    return placeholder === undefined ? list : [{ value: '', label: placeholder }, ...list];
  }, [cars, placeholder]);
  return { cars: cars ?? [], options, isPending, error, refetch, hasData: cars !== undefined };
};
