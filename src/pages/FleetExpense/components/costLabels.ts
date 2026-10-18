import type { CarCostDetail } from '../../../services/api/types';

/** Los cinco rubros del costo de un vehículo, en el orden en que se muestran. */
export const COST_RUBROS: Array<{ key: 'maintenance' | 'insurance' | 'fuel' | 'fines' | 'accidents'; label: string }> =
  [
    { key: 'maintenance', label: 'Mantenimiento' },
    { key: 'insurance', label: 'Seguros' },
    { key: 'fuel', label: 'Combustible' },
    { key: 'fines', label: 'Multas' },
    { key: 'accidents', label: 'Siniestros' },
  ];

export const KM_SOURCE_LABEL: Record<CarCostDetail['kmSource'], string> = {
  usage_log: 'Registro de uso diario',
  odometer: 'Diferencia de kilometraje entre cargas',
  none: 'Sin kilómetros en el período',
};
