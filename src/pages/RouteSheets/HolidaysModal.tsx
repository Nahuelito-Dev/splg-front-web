import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarOff, Trash2 } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, ErrorState, Form, FormInput, LoadingState, Modal } from '../../common/components/ui';
import { errorMessage, toApiError } from '../../services/api/errors';
import { ROUTE_SHEET_CODES } from '../../services/api/routeSheets';
import type { RoutePlanningHoliday } from '../../services/api/types';
import {
  useCreateRoutePlanningHoliday,
  useDeleteRoutePlanningHoliday,
  useRoutePlanningHolidays,
} from '../../services/queries/routeSheets';
import { argentinaDay } from '../../utils/format';
import { confirm, notify } from '../../utils/notifications';
import { dayLabel } from './routeSheetLabels';
import { buildHolidaySchema, type HolidayValues } from './routeSheetSchemas';

interface Props {
  canWrite: boolean;
  writeHint?: string;
  onClose: () => void;
}

/**
 * Los feriados de la distribuidora: esos días no se reparte. La propuesta automática no arma el plan y la
 * reprogramación los saltea; un feriado nuevo no toca un plan ya abierto. En modo soporte se leen y no se cargan.
 */
export const HolidaysModal = ({ canWrite, writeHint, onClose }: Props) => {
  const formId = useId();
  const holidays = useRoutePlanningHolidays();
  const create = useCreateRoutePlanningHoliday();
  const remove = useDeleteRoutePlanningHoliday();
  const [serverError, setServerError] = useState<string | null>(null);
  const today = argentinaDay(new Date());
  const schema = useMemo(() => buildHolidaySchema(today), [today]);
  const methods = useForm<HolidayValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: '', description: '' },
  });

  const submit = (values: HolidayValues) => {
    setServerError(null);
    create.mutate(
      { date: values.date, description: values.description.trim() },
      {
        onSuccess: (saved) => {
          notify.success(`Feriado cargado: el ${dayLabel(saved.date)} no se reparte`);
          methods.reset({ date: '', description: '' });
        },
        onError: (error) => {
          const { code } = toApiError(error);
          if (code === ROUTE_SHEET_CODES.holidayExists) {
            methods.setError('date', { message: 'Ese día ya está cargado como feriado' });
          } else if (code === ROUTE_SHEET_CODES.holidayPast) {
            methods.setError('date', { message: 'No se carga un feriado en un día pasado' });
          } else setServerError(errorMessage(error));
        },
      },
    );
  };

  const handleRemove = async (holiday: RoutePlanningHoliday) => {
    const ok = await confirm({
      title: `¿Quitar el feriado del ${dayLabel(holiday.date)}?`,
      text: 'Es una baja lógica: el día vuelve a ser hábil y se puede volver a cargar.',
      confirmText: 'Quitar feriado',
      danger: true,
    });
    if (!ok) return;
    remove.mutate(holiday.holidayId, {
      onSuccess: () => notify.success(`El ${dayLabel(holiday.date)} vuelve a ser día de reparto`),
      onError: (error) => notify.error(error),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      closeBlocked={create.isPending}
      size="md"
      title="Feriados"
      description="Los días que no se reparte, además de los que no están en los días hábiles de los parámetros."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      {canWrite ? (
        <Form
          methods={methods}
          id={formId}
          onSubmit={submit}
          className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-start"
        >
          <FormInput name="date" label="Día" type="date" min={today} />
          <FormInput
            name="description"
            label="Descripción"
            placeholder="Por ejemplo: Día de la Soberanía"
            maxLength={120}
          />
          <Button type="submit" className="sm:mt-6" loading={create.isPending}>
            Agregar
          </Button>
        </Form>
      ) : (
        <p className="text-[13px] text-muted">{writeHint ?? 'Sólo lectura.'}</p>
      )}
      {serverError && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {serverError}
        </p>
      )}
      <div className="mt-4">
        {holidays.isPending ? (
          <LoadingState label="Cargando los feriados…" />
        ) : holidays.isError ? (
          <ErrorState error={holidays.error} resource="Los feriados" onRetry={() => void holidays.refetch()} />
        ) : holidays.data.length === 0 ? (
          <p className="flex items-center gap-2 text-[13px] text-muted">
            <CalendarOff aria-hidden="true" className="h-4 w-4" />
            No hay feriados cargados de hoy en adelante.
          </p>
        ) : (
          <ul aria-label="Feriados cargados" className="divide-y divide-outline-soft">
            {holidays.data.map((holiday) => (
              <li key={holiday.holidayId} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                <span className="min-w-0">
                  <b className="font-semibold capitalize text-ink">{dayLabel(holiday.date)}</b>
                  <span className="block truncate text-muted">{holiday.description}</span>
                </span>
                {canWrite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    aria-label={`Quitar el feriado del ${dayLabel(holiday.date)}`}
                    disabled={remove.isPending}
                    onClick={() => void handleRemove(holiday)}
                  >
                    Quitar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};
