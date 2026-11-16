import type { FleetPlan } from '../../services/api/types';
import { FLEET_PLAN_TRIGGER, labelOf } from '../../utils/statusLabels';

/** "Por kilometraje · cada 10000 km", "Por tiempo · cada 6 meses" o sólo el disparador si no hay intervalo. */
export const intervalText = (plan: Pick<FleetPlan, 'trigger' | 'intervalKm' | 'intervalMonths'>): string => {
  const trigger = labelOf(FLEET_PLAN_TRIGGER, plan.trigger).text;
  if (plan.trigger === 'by_km') return plan.intervalKm !== null ? `${trigger} · cada ${plan.intervalKm} km` : trigger;
  if (plan.trigger === 'by_time')
    return plan.intervalMonths !== null ? `${trigger} · cada ${plan.intervalMonths} meses` : trigger;
  return trigger;
};
