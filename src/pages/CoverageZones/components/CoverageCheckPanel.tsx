import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge, Button, Input, CardHeader } from '../../../common/components/ui';
import { useCheckCoverage } from '../../../services/queries/coverageZones';
import { formatCurrency } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { formatSurcharge } from '../coverageZoneUtils';

/** Un número opcional: en el formulario el campo puede quedar vacío. */
const optionalNonNegative = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : value),
  z.coerce.number({ invalid_type_error: 'Ingresá un número' }).nonnegative('No puede ser negativo').optional(),
);

const schema = z.object({
  lat: z.coerce
    .number({ invalid_type_error: 'Ingresá un número' })
    .min(-90, 'Latitud inválida')
    .max(90, 'Latitud inválida'),
  lng: z.coerce
    .number({ invalid_type_error: 'Ingresá un número' })
    .min(-180, 'Longitud inválida')
    .max(180, 'Longitud inválida'),
  subtotal: optionalNonNegative,
});

type FormValues = z.infer<typeof schema>;

interface Props {
  pickedPoint: { lat: number; lng: number } | null;
  isPicking: boolean;
  onStartPicking: () => void;
  onStopPicking: () => void;
}

/**
 * Antes de aceptar un pedido: qué zona gana en un punto y cuánto se cobraría.
 * El punto se puede tipear o elegir con un clic en el mapa (`isPicking`).
 */
export const CoverageCheckPanel = ({ pickedPoint, isPicking, onStartPicking, onStopPicking }: Props) => {
  const checkCoverage = useCheckCoverage();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!pickedPoint) return;
    setValue('lat', pickedPoint.lat, { shouldValidate: true });
    setValue('lng', pickedPoint.lng, { shouldValidate: true });
    onStopPicking();
  }, [pickedPoint, setValue, onStopPicking]);

  const onSubmit = handleSubmit((values) => checkCoverage.mutate(values, { onError: notify.error }));

  const result = checkCoverage.data;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <CardHeader title="Probar un punto" as="h3" className="" />
        <Button type="button" variant="secondary" size="sm" onClick={isPicking ? onStopPicking : onStartPicking}>
          {isPicking ? 'Cancelar' : 'Elegir en el mapa'}
        </Button>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Latitud" type="number" step="any" error={errors.lat?.message} {...register('lat')} />
          <Input label="Longitud" type="number" step="any" error={errors.lng?.message} {...register('lng')} />
        </div>
        <Input
          label="Subtotal de garrafas (opcional)"
          type="number"
          step="any"
          min={0}
          error={errors.subtotal?.message}
          {...register('subtotal')}
        />
        <Button type="submit" variant="secondary" className="w-full" loading={checkCoverage.isPending}>
          Verificar
        </Button>
      </form>

      {result && (
        <div className="mt-4 rounded-lg border border-outline p-3 text-sm">
          <Badge
            label={result.covered ? { text: 'Cubierto', tone: 'success' } : { text: 'Sin cobertura', tone: 'danger' }}
          />
          {result.covered && result.zone && (
            <p className="mt-2 text-muted">
              Gana <strong className="text-ink">{result.zone.name}</strong> ·{' '}
              {formatSurcharge(result.zone.type, result.zone.value)}
              {result.amount !== undefined && ` · ${formatCurrency(result.amount)}`}
            </p>
          )}
          {result.covered && !result.zone && <p className="mt-2 text-muted">Sin zonas cargadas: sin recargo.</p>}
        </div>
      )}
    </div>
  );
};
