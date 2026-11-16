import { zodResolver } from '@hookform/resolvers/zod';
import { Smartphone, Star, ThumbsUp } from 'lucide-react';
import { useId } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Button,
  Card,
  CardHeader,
  cx,
  ErrorState,
  Form,
  FormTextArea,
  PersonAvatar,
  Skeleton,
  Switch,
} from '../../../common/components/ui';
import { useCompanyDisplayName } from '../../../common/components/useCompanyDisplayName';
import { fillVariables } from '../../../features/chat/variables';
import { CSAT_MESSAGE_MAX, DEFAULT_CSAT_MESSAGE, TEMPLATE_VARIABLES } from '../../../services/api/inbox';
import type { ChatSettings, CsatGroup, CsatSummary } from '../../../services/api/types';
import { useChatSettings, useCsatSummary, useUpdateChatSettings } from '../../../services/queries/inbox';
import { notify } from '../../../utils/notifications';
import { charCount, surveySchema, type SurveyValues } from './settingsSchemas';

const toValues = (s: ChatSettings): SurveyValues => ({
  csatEnabled: s.csatEnabled,
  csatMessage: s.csatMessage ?? '',
});

/** Mientras la empresa no escribió uno propio, la API da el de omisión en `effectiveCsatMessage`. */
const defaultMessage = (s: ChatSettings) => (s.csatMessage === null ? s.effectiveCsatMessage : DEFAULT_CSAT_MESSAGE);

const HELP = `Podés usar ${TEMPLATE_VARIABLES.map((v) => `{{${v}}}`).join(' · ')}. Vacío: el texto de siempre.`;

/** Cómo le llega al cliente: el pedido, firmado por la empresa, y los cinco botones para calificar. */
const SurveyPreview = ({ text, companyName, off }: { text: string; companyName: string; off: boolean }) => (
  <section
    aria-label="Vista previa de la encuesta: así la ve el cliente"
    className={cx('rounded-xl border border-outline bg-bg p-3 sm:p-4', off && 'opacity-60')}
  >
    <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-ink">
      <Smartphone aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
      Así la ve el cliente al cerrar{off && <span className="font-medium text-muted"> · apagada</span>}
    </p>
    <div className="flex items-end gap-2">
      <PersonAvatar name={companyName} userId={null} size="sm" decorative className="h-7 w-7 shrink-0 text-[11px]" />
      <div className="min-w-0 rounded-2xl border border-outline bg-surface px-3 py-2 text-sm text-ink">
        <p className="whitespace-pre-wrap break-words">{text}</p>
        <div className="mt-2 flex flex-wrap gap-1" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className="grid h-8 w-8 place-items-center rounded-lg border border-outline text-xs font-semibold text-ink-2"
            >
              {n}
            </span>
          ))}
        </div>
      </div>
    </div>
    <p className="mt-3 text-[11px] text-muted">Toca un número del 1 al 5 y puede dejar un comentario corto (48 h).</p>
  </section>
);

const SurveyForm = ({
  settings,
  canEdit,
  companyName,
}: {
  settings: ChatSettings;
  canEdit: boolean;
  companyName: string;
}) => {
  const update = useUpdateChatSettings();
  const id = useId();
  const methods = useForm<SurveyValues>({ resolver: zodResolver(surveySchema), defaultValues: toValues(settings) });
  const { control, reset, watch, formState, setValue } = methods;
  const values = watch();
  const fallback = defaultMessage(settings);
  const count = charCount(values.csatMessage.trim());
  const preview = fillVariables(values.csatMessage.trim() || fallback, {
    'cliente.nombre': 'Ana',
    'pedido.numero': '1024',
    'empresa.nombre': companyName,
    'horario.proximo': 'mañana a las 9:00',
  }).text;

  const onSubmit = (v: SurveyValues) =>
    update.mutate(
      {
        csatEnabled: v.csatEnabled,
        // Apagada, el texto no se manda: queda el guardado (lo escondido no puede dar un 400).
        ...(v.csatEnabled ? { csatMessage: v.csatMessage.trim() || null } : {}),
      },
      { onSuccess: () => notify.success('Encuesta guardada'), onError: (error) => notify.error(error) },
    );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Form methods={methods} onSubmit={onSubmit} className="grid content-start gap-4">
        <Controller
          control={control}
          name="csatEnabled"
          render={({ field }) => (
            <div className="flex items-center gap-3">
              <Switch
                label="Pedir que califiquen al cerrar"
                checked={field.value}
                onChange={field.onChange}
                disabled={!canEdit}
              />
              <span className="text-sm font-medium text-ink" aria-hidden="true">
                Pedir que califiquen al cerrar
              </span>
            </div>
          )}
        />
        <p className="-mt-2 text-xs text-muted">
          Sólo en las conversaciones con clientes. Si en vez de calificar vuelve a escribir, se abre otra conversación.
        </p>
        {values.csatEnabled && (
          <div className="grid gap-1">
            <FormTextArea
              id={id}
              name="csatMessage"
              label="Texto del pedido"
              placeholder={fallback}
              rows={3}
              disabled={!canEdit}
              aria-describedby={[formState.errors.csatMessage ? `${id}-error` : null, `${id}-help`, `${id}-count`]
                .filter(Boolean)
                .join(' ')}
            />
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <p id={`${id}-help`} className="min-w-0 flex-1 text-xs text-muted">
                {HELP}
              </p>
              <p
                id={`${id}-count`}
                className={cx('shrink-0 text-xs tabular-nums', count > CSAT_MESSAGE_MAX ? 'text-danger' : 'text-muted')}
              >
                {count}/{CSAT_MESSAGE_MAX}
              </p>
            </div>
            {values.csatMessage.trim() && canEdit && (
              <button
                type="button"
                onClick={() => setValue('csatMessage', '', { shouldDirty: true, shouldValidate: true })}
                className="w-fit rounded text-xs font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                Volver al texto de siempre
              </button>
            )}
          </div>
        )}
        {canEdit && (
          <div className="flex justify-end gap-2 border-t border-outline-soft pt-4">
            <Button
              variant="secondary"
              aria-label="Descartar los cambios de la encuesta"
              onClick={() => reset(toValues(settings))}
              disabled={!formState.isDirty || update.isPending}
            >
              Descartar
            </Button>
            <Button
              type="submit"
              aria-label="Guardar la encuesta"
              loading={update.isPending}
              disabled={!formState.isDirty}
            >
              Guardar
            </Button>
          </div>
        )}
      </Form>
      <div className="xl:sticky xl:top-4 xl:self-start">
        <SurveyPreview text={preview} companyName={companyName} off={!values.csatEnabled} />
      </div>
    </div>
  );
};

const percent = (value: number | null) => (value === null ? '–' : `${Math.round(value * 100)} %`);
const average = (value: number | null) =>
  value === null ? '–' : value.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const GroupRow = ({ label, group }: { label: string; group: CsatGroup }) => (
  <tr className="border-t border-outline-soft">
    <th scope="row" className="py-1.5 pr-2 text-left font-medium text-ink">
      {label}
    </th>
    <td className="py-1.5 text-right tabular-nums">{group.answered}</td>
    <td className="py-1.5 text-right tabular-nums">{average(group.average)}</td>
    <td className="py-1.5 text-right tabular-nums">{percent(group.csat)}</td>
  </tr>
);

/** Los números del último mes (el tablero completo es otra pantalla). */
const SurveyResultsView = ({ data }: { data: CsatSummary }) => {
  // Las respondidas que no atendió nadie (`servedBy: none`) no entran en ninguna de las dos filas.
  const unattended = Math.max(data.answered - data.assistant.answered - data.team.answered, 0);
  if (data.requested === 0) {
    return <p className="text-sm text-muted">Todavía no se pidió ninguna calificación en el último mes.</p>;
  }
  return (
    <div className="grid gap-3">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Respondidas', `${data.answered} de ${data.requested}`],
          ['Promedio', data.average === null ? '–' : `${average(data.average)} / 5`],
          ['Satisfechos (4 y 5)', percent(data.csat)],
          ['Vencidas', String(data.expired)],
        ].map(([term, value]) => (
          <div key={term} className="rounded-lg border border-outline-soft bg-surface-muted px-3 py-2">
            <dt className="text-[11px] font-medium text-muted">{term}</dt>
            <dd className="text-base font-semibold tabular-nums text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[260px] text-xs text-ink-2">
          <caption className="sr-only">Calificaciones según quién atendió</caption>
          <thead>
            <tr className="text-muted">
              <th scope="col" className="pb-1 text-left font-medium">
                Quién atendió
              </th>
              <th scope="col" className="pb-1 text-right font-medium">
                Respondidas
              </th>
              <th scope="col" className="pb-1 text-right font-medium">
                Promedio
              </th>
              <th scope="col" className="pb-1 text-right font-medium">
                Satisfechos
              </th>
            </tr>
          </thead>
          <tbody>
            <GroupRow label="Sólo el asistente" group={data.assistant} />
            <GroupRow label="El equipo" group={data.team} />
          </tbody>
        </table>
      </div>
      {unattended > 0 && (
        <p className="text-[11px] text-muted">
          {unattended === 1
            ? '1 respondida es de una conversación que nadie llegó a atender.'
            : `${unattended} respondidas son de conversaciones que nadie llegó a atender.`}
        </p>
      )}
    </div>
  );
};

/** La tarjeta chica de resultados (`GET /v2/conversations/csat`, último mes). Pide atender a los clientes. */
export const SurveyResults = ({ enabled }: { enabled: boolean }) => {
  const { data, error, isPending, refetch } = useCsatSummary(enabled);
  return (
    <section
      aria-labelledby="csat-results-title"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 rounded-xl border border-outline p-3 sm:p-4"
    >
      <h3 id="csat-results-title" className="flex items-center gap-1.5 text-sm font-semibold text-ink">
        <Star aria-hidden="true" className="h-4 w-4 text-warn" />
        Cómo calificaron el último mes
      </h3>
      {!enabled ? (
        <p className="text-sm text-muted">Los resultados los ve quien atiende los mensajes de los clientes.</p>
      ) : isPending ? (
        <div className="grid gap-2" role="status" aria-label="Cargando los resultados">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error || !data ? (
        <ErrorState error={error} resource="El resumen de la encuesta" onRetry={() => void refetch()} />
      ) : (
        <SurveyResultsView data={data} />
      )}
    </section>
  );
};

/**
 * La encuesta de satisfacción al cerrar una conversación con un cliente: prenderla, el texto (con vista previa) y los
 * resultados del último mes.
 */
export const SurveyCard = ({ canEdit, canSeeResults }: { canEdit: boolean; canSeeResults: boolean }) => {
  const { data, error, isPending, refetch } = useChatSettings();
  const companyName = useCompanyDisplayName() ?? 'tu empresa';
  return (
    <Card className="p-5 sm:p-6">
      <CardHeader
        title="Encuesta de satisfacción"
        subtitle="Al cerrar una conversación con un cliente, le pedimos que califique la atención del 1 al 5."
        icon={<ThumbsUp className="h-4 w-4" />}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
        {isPending ? (
          <div className="grid gap-2" role="status" aria-label="Cargando la encuesta">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : error || !data ? (
          <ErrorState error={error} resource="La configuración" onRetry={() => void refetch()} />
        ) : (
          <SurveyForm
            key={JSON.stringify(toValues(data))}
            settings={data}
            canEdit={canEdit}
            companyName={companyName}
          />
        )}
        <SurveyResults enabled={canSeeResults} />
      </div>
    </Card>
  );
};
