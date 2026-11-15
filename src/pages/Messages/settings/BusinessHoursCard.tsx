import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarClock, CalendarOff, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorState,
  Form,
  FormInput,
  FormSelect,
  IconButton,
  Skeleton,
} from '../../../common/components/ui';
import { reopensAt } from '../../../features/chat/inbox/inboxLabels';
import type { ChatBusinessHours } from '../../../services/api/types';
import { useBusinessHours, useUpdateBusinessHours } from '../../../services/queries/inbox';
import { formatDay } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { businessHoursSchema, WEEKDAYS, type BusinessHoursValues } from './settingsSchemas';

/** Las zonas de la Argentina (la API acepta cualquiera válida; las del país alcanzan para una distribuidora). */
const TIMEZONES = [
  'America/Argentina/Buenos_Aires',
  'America/Argentina/Cordoba',
  'America/Argentina/Salta',
  'America/Argentina/Jujuy',
  'America/Argentina/Tucuman',
  'America/Argentina/Catamarca',
  'America/Argentina/La_Rioja',
  'America/Argentina/San_Juan',
  'America/Argentina/Mendoza',
  'America/Argentina/San_Luis',
  'America/Argentina/Rio_Gallegos',
  'America/Argentina/Ushuaia',
];
/** Lunes primero, como se lee una semana de trabajo. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const toValues = (hours: ChatBusinessHours): BusinessHoursValues => ({
  timezone: hours.timezone,
  days: hours.days.map(({ weekday, opensAt, closesAt }) => ({ weekday, opensAt, closesAt })),
  holidays: hours.holidays.map(({ date, reason }) => ({ date, reason })),
});

const HoursForm = ({ hours, canEdit }: { hours: ChatBusinessHours; canEdit: boolean }) => {
  const update = useUpdateBusinessHours();
  const methods = useForm<BusinessHoursValues>({
    resolver: zodResolver(businessHoursSchema),
    defaultValues: toValues(hours),
  });
  const { control, reset, formState } = methods;
  const days = useFieldArray({ control, name: 'days' });
  const holidays = useFieldArray({ control, name: 'holidays' });

  const onSubmit = (values: BusinessHoursValues) =>
    update.mutate(
      {
        timezone: values.timezone,
        days: [...values.days].sort((a, b) => a.weekday - b.weekday || a.opensAt.localeCompare(b.opensAt)),
        holidays: values.holidays.map((h) => ({ date: h.date, reason: h.reason.trim() })),
      },
      { onSuccess: () => notify.success('Horario guardado'), onError: (error) => notify.error(error) },
    );

  const zoneOptions = (TIMEZONES.includes(hours.timezone) ? TIMEZONES : [hours.timezone, ...TIMEZONES]).map((zone) => ({
    value: zone,
    label: zone.replace('America/Argentina/', '').replace(/_/g, ' '),
  }));

  return (
    <Form methods={methods} onSubmit={onSubmit} className="grid gap-5">
      <div className="max-w-xs">
        <FormSelect name="timezone" label="Zona horaria" options={zoneOptions} disabled={!canEdit} />
      </div>
      <fieldset className="grid gap-2" disabled={!canEdit}>
        <legend className="mb-1 text-sm font-medium text-ink">Franjas de atención</legend>
        {days.fields.length === 0 && (
          <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-ink-2">
            Sin franjas cargadas se atiende todo el día, todos los días: nunca sale la respuesta fuera de horario.
          </p>
        )}
        <ul className="grid gap-2">
          {WEEK_ORDER.map((weekday) => {
            const slots = days.fields
              .map((field, index) => ({ field, index }))
              .filter(({ field }) => field.weekday === weekday);
            return (
              <li
                key={weekday}
                className="grid gap-2 rounded-xl border border-outline-soft px-3 py-2 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-start"
              >
                <span className="pt-2 text-sm font-medium text-ink">{WEEKDAYS[weekday]}</span>
                <div className="grid gap-2">
                  {slots.length === 0 ? (
                    <span className="pt-2 text-xs text-muted">
                      {days.fields.length === 0 ? 'Todo el día' : 'No atiende'}
                    </span>
                  ) : (
                    slots.map(({ field, index }) => (
                      <div key={field.id} className="flex flex-wrap items-start gap-2">
                        <div className="w-28">
                          <FormInput name={`days.${index}.opensAt`} label="Abre" type="time" />
                        </div>
                        <div className="w-28">
                          <FormInput name={`days.${index}.closesAt`} label="Cierra" type="time" />
                        </div>
                        {canEdit && (
                          <div className="pt-7">
                            <IconButton
                              label={`Quitar la franja del ${WEEKDAYS[weekday].toLowerCase()}`}
                              icon={<Trash2 />}
                              tone="danger"
                              onClick={() => days.remove(index)}
                            />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Plus />}
                    onClick={() => days.append({ weekday, opensAt: '09:00', closesAt: '18:00' })}
                    aria-label={`Agregar una franja el ${WEEKDAYS[weekday].toLowerCase()}`}
                  >
                    Franja
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset className="grid gap-2" disabled={!canEdit}>
        <legend className="mb-1 flex items-center gap-2 text-sm font-medium text-ink">
          <CalendarOff aria-hidden="true" className="h-4 w-4 text-muted" />
          Días sin atención
        </legend>
        {holidays.fields.length === 0 && <p className="text-xs text-muted">Ninguno cargado (feriados, inventario…).</p>}
        <ul className="grid gap-2">
          {holidays.fields.map((field, index) => (
            <li key={field.id} className="flex flex-wrap items-start gap-2">
              <div className="w-40">
                <FormInput name={`holidays.${index}.date`} label="Fecha" type="date" />
              </div>
              <div className="min-w-[180px] flex-1">
                <FormInput name={`holidays.${index}.reason`} label="Motivo" placeholder="Ej: Navidad" maxLength={120} />
              </div>
              {canEdit && (
                <div className="pt-7">
                  <IconButton
                    label={`Quitar el día ${field.date ? formatDay(field.date) : 'sin fecha'}`}
                    icon={<Trash2 />}
                    tone="danger"
                    onClick={() => holidays.remove(index)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
        {canEdit && (
          <div>
            <Button
              size="sm"
              variant="secondary"
              icon={<Plus />}
              onClick={() => holidays.append({ date: '', reason: '' })}
            >
              Agregar día sin atención
            </Button>
          </div>
        )}
      </fieldset>

      {canEdit && (
        <div className="flex justify-end gap-2 border-t border-outline-soft pt-4">
          <Button
            variant="secondary"
            onClick={() => reset(toValues(hours))}
            disabled={!formState.isDirty || update.isPending}
          >
            Descartar
          </Button>
          <Button type="submit" loading={update.isPending} disabled={!formState.isDirty}>
            Guardar horario
          </Button>
        </div>
      )}
    </Form>
  );
};

/** Horario de atención de la bandeja: franjas por día, días sin atención y zona (§8.4). */
export const BusinessHoursCard = ({ canEdit }: { canEdit: boolean }) => {
  const { data, error, isPending, refetch } = useBusinessHours();
  return (
    <Card>
      <CardHeader
        title="Horario de atención"
        subtitle="Fuera de horario, al cliente le llega la respuesta automática una sola vez por período."
        icon={<CalendarClock className="h-4 w-4" />}
        badge={
          data && (
            <Badge
              label={
                data.openNow
                  ? { text: 'Atendiendo ahora', tone: 'success' }
                  : { text: reopensAt(data.nextOpenAt), tone: 'warn' }
              }
            />
          )
        }
      />
      {isPending ? (
        <div className="grid gap-2" role="status" aria-label="Cargando el horario">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : error || !data ? (
        <ErrorState error={error} resource="El horario" onRetry={() => void refetch()} />
      ) : (
        // Lo guardado cambió (acá o en otra pestaña): el formulario arranca de nuevo. Releer lo mismo no pisa lo que se escribe.
        <HoursForm key={JSON.stringify(toValues(data))} hours={data} canEdit={canEdit} />
      )}
    </Card>
  );
};
