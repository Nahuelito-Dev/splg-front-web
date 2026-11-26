import { useFormContext } from 'react-hook-form';
import { FormSelect } from '../../common/components/ui';
import { useRouteServiceTime } from '../../services/queries/routeSheets';
import type { ProcessFormValues } from '../Configuration/processRules';
import { SERVICE_MODE_KEY, serviceModeFromValue, serviceTimeSummary } from './serviceTimeLabels';

const MODE_OPTIONS = [
  { value: '0', label: 'Fijo: siempre los minutos por parada de arriba' },
  { value: '1', label: 'Aprendido: lo que tardan los choferes en entregar' },
];

const MODE_HINTS: Record<'fixed' | 'learned', string> = {
  fixed: 'Todas las paradas se planifican con los minutos fijos. Es lo que rige por omisión.',
  learned:
    'La propuesta usa la mediana de lo que tardaron los choferes entre «Llegué» y la entrega. Con pocas entregas usa el valor fijo. Cambia las horas que se les prometen a los clientes.',
};

interface Props {
  disabled: boolean;
}

/**
 * El tiempo de atención por parada: lo que aprendieron las entregas frente a lo que rige hoy, y el selector del modo.
 * Va dentro del formulario de los parámetros (el campo `serviceMinutesMode`).
 */
export const ServiceTimeCard = ({ disabled }: Props) => {
  const { watch } = useFormContext<ProcessFormValues>();
  const { data, isPending, isError } = useRouteServiceTime();
  const mode = serviceModeFromValue(watch(SERVICE_MODE_KEY));
  return (
    <section
      aria-labelledby="service-time-title"
      className="grid gap-3 rounded-card border border-outline-soft bg-surface-sunken px-4 py-3 sm:col-span-2"
    >
      <div>
        <h3 id="service-time-title" className="text-[13px] font-semibold text-ink">
          Tiempo de atención por parada
        </h3>
        <p className="mt-1 text-[13px] text-ink-2" role="status">
          {isPending
            ? 'Calculando el tiempo sugerido…'
            : isError || !data
              ? 'No se pudo leer el tiempo sugerido; el modo se puede cambiar igual.'
              : serviceTimeSummary(data)}
        </p>
      </div>
      <FormSelect
        name={SERVICE_MODE_KEY}
        label="Cómo se calculan los minutos"
        options={MODE_OPTIONS}
        disabled={disabled}
        hint={MODE_HINTS[mode]}
      />
    </section>
  );
};
