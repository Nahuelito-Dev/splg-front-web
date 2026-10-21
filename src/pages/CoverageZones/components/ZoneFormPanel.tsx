import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Button, cx, FormCheckbox, FormInput, Form } from '../../../common/components/ui';
import type { CoverageZone } from '../../../services/api/types';
import {
  useCoverageZones,
  useCreateCoverageZone,
  useUpdateCoverageZone,
} from '../../../services/queries/coverageZones';
import { DEFAULT_ZONE_COLOR } from '../../../theme/zoneColors';
import { notify } from '../../../utils/notifications';
import { hasEnoughVertices, MIN_POLYGON_VERTICES, toDateInputValue } from '../coverageZoneUtils';
import {
  findZoneConflict,
  nextZonePriority,
  SURCHARGE_TYPE_OPTIONS,
  zoneSchema,
  type ZoneFormValues,
} from '../zoneSchema';
import { ZoneColorPicker } from './ZoneColorPicker';

interface Props {
  /** Con zona es edición de esa zona; sin zona, alta con el `polygon` recién dibujado. */
  zone: CoverageZone | null;
  polygon: number[][] | null;
  /** Las zonas de la distribuidora: para avisar antes de enviar si el nombre o la prioridad ya están usados. */
  zones: readonly CoverageZone[];
  onSaved: () => void;
  onCancel: () => void;
}

const defaultsFor = (zone: CoverageZone | null, zones: readonly CoverageZone[]): ZoneFormValues => ({
  name: zone?.name ?? '',
  label: zone?.label ?? '',
  surchargeType: zone?.surchargeType ?? 'percentage',
  surchargeValue: zone?.surchargeValue ?? 0,
  color: zone?.color ?? DEFAULT_ZONE_COLOR,
  priority: zone?.priority ?? nextZonePriority(zones),
  validFrom: toDateInputValue(zone?.validFrom ?? null),
  validUntil: toDateInputValue(zone?.validUntil ?? null),
  isActive: zone?.isActive ?? true,
});

/**
 * Alta/edición de una zona. El formulario asume que ya se está dibujando o
 * editando el polígono en `<ZoneMap>`: `polygon` llega actualizado en cada
 * ajuste de vértice y es lo que se manda al guardar.
 */
export const ZoneFormPanel = ({ zone, polygon, zones, onSaved, onCancel }: Props) => {
  const zonesQuery = useCoverageZones();
  const createZone = useCreateCoverageZone();
  const updateZone = useUpdateCoverageZone();
  const saving = createZone.isPending || updateZone.isPending;
  const canSubmit = hasEnoughVertices(polygon);

  const methods = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneSchema),
    defaultValues: defaultsFor(zone, zones),
  });
  const { control, watch, setError } = methods;

  const surchargeType = watch('surchargeType');

  const onSubmit = async (values: ZoneFormValues) => {
    if (!canSubmit) {
      notify.error(new Error(`Dibujá el polígono en el mapa (mínimo ${MIN_POLYGON_VERTICES} vértices)`));
      return;
    }
    // Con las zonas de ahora; si no se pueden traer, decide el back.
    const fresh = (await zonesQuery.refetch()).data?.rows ?? zones;
    const conflict = findZoneConflict(values, fresh, zone?.coverage_zone_id);
    if (conflict) {
      setError(conflict.field, { message: conflict.message });
      return;
    }
    const payload = {
      name: values.name,
      polygon: polygon as number[][],
      surchargeType: values.surchargeType,
      surchargeValue: values.surchargeValue,
      label: values.label.trim() || undefined,
      color: values.color,
      priority: values.priority,
      validFrom: values.validFrom || undefined,
      validUntil: values.validUntil || undefined,
      isActive: values.isActive,
    };
    const options = {
      onSuccess: () => {
        notify.success(zone ? 'Zona actualizada' : 'Zona creada');
        onSaved();
      },
      onError: notify.error,
    };
    if (zone) updateZone.mutate({ id: zone.coverage_zone_id, changes: payload }, options);
    else createZone.mutate(payload, options);
  };

  return (
    <Form methods={methods} onSubmit={onSubmit} className="space-y-4">
      <FormInput name="name" label="Nombre" required />
      <FormInput name="label" label="Etiqueta (opcional)" placeholder="Zona centro" />

      <div className="grid grid-cols-2 gap-3">
        <Controller
          control={control}
          name="surchargeType"
          render={({ field }) => (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink">Tipo de recargo</span>
              <div
                role="radiogroup"
                aria-label="Tipo de recargo"
                className="inline-flex rounded-lg border border-outline p-1"
              >
                {SURCHARGE_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={field.value === option.value}
                    onClick={() => field.onChange(option.value)}
                    className={cx(
                      'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      field.value === option.value ? 'bg-primary text-on-primary' : 'text-ink-2 hover:bg-surface-hover',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        />
        <FormInput
          name="surchargeValue"
          label={surchargeType === 'percentage' ? 'Recargo (%)' : 'Recargo ($)'}
          type="number"
          step="any"
          min={0}
        />
      </div>

      <Controller
        control={control}
        name="color"
        render={({ field, fieldState }) => (
          <ZoneColorPicker value={field.value} onChange={field.onChange} error={fieldState.error?.message} />
        )}
      />

      <FormInput
        name="priority"
        label="Prioridad"
        type="number"
        step={1}
        min={0}
        hint="Entre zonas superpuestas gana la de mayor prioridad."
      />

      <div className="grid grid-cols-2 gap-3">
        <FormInput name="validFrom" label="Vigente desde" type="date" />
        <FormInput
          name="validUntil"
          label="Vigente hasta"
          type="date"
          hint={zone ? 'Vacío: no se toca la vigencia actual.' : undefined}
        />
      </div>

      <FormCheckbox name="isActive" label="Zona activa" />

      {!canSubmit && <p className="text-xs text-warn">Dibujá el polígono en el mapa antes de guardar.</p>}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" loading={saving} disabled={!canSubmit}>
          {zone ? 'Guardar cambios' : 'Crear zona'}
        </Button>
      </div>
    </Form>
  );
};
