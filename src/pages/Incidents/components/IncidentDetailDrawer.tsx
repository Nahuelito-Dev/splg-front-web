import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { usePermissions } from '../../../hooks';
import { Badge, Button, DetailList, Drawer, TextArea } from '../../../common/components/ui';
import type { Incident } from '../../../services/api/types';
import { useResolveIncident } from '../../../services/queries/incidents';
import { useUser } from '../../../services/queries/users';
import { notify } from '../../../utils/notifications';
import { INCIDENT_STATUS, INCIDENT_TYPE, labelOf } from '../../../utils/statusLabels';
import { formatDateTime, formatShortId } from '../../../utils/format';

const resolveSchema = z.object({
  resolutionNote: z.string().trim().min(1, 'Escribí cómo se resolvió la incidencia'),
});

type ResolveValues = z.infer<typeof resolveSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  incident: Incident | null;
}

/**
 * El detalle de una incidencia. Si está abierta, además se resuelve acá; si ya
 * se resolvió, se ve cómo y cuándo.
 */
export const IncidentDetailDrawer = ({ open, onClose, incident }: Props) => {
  const { canOperate, operateHint } = usePermissions();
  const resolveIncident = useResolveIncident();
  // `IncidentResponseDto.reported_by` es sólo un uuid: la API no lo trae resuelto
  // (a diferencia de `order.customer`), así que se busca aparte con GET
  // /users/:id. Ese endpoint lo puede pedir cualquier admin para gente de su
  // propia distribuidora (que es siempre el caso acá: reporta un chofer o un
  // admin de la misma empresa), y el super admin, para cualquiera.
  const reporter = useUser(incident?.reported_by);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResolveValues>({ resolver: zodResolver(resolveSchema) });

  useEffect(() => {
    if (open && incident) reset({ resolutionNote: incident.resolution_note ?? '' });
  }, [open, incident, reset]);

  if (!incident) return null;
  const isOpen = incident.status === 'open';

  const onSubmit = handleSubmit((body) =>
    resolveIncident.mutate(
      { id: incident.incident_id, body },
      {
        onSuccess: () => {
          notify.success('Incidencia resuelta');
          onClose();
        },
        onError: notify.error,
      },
    ),
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isOpen ? 'Resolver incidencia' : 'Incidencia resuelta'}
      description={`${formatShortId(incident.incident_id)} · Pedido ${formatShortId(incident.order_id)} · ${formatDateTime(incident.createdAt)}`}
      size="md"
      footer={
        isOpen ? (
          <>
            {operateHint && <p className="mr-auto self-center text-sm text-muted">{operateHint}</p>}
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="incident-resolve"
              disabled={!canOperate}
              title={operateHint}
              loading={resolveIncident.isPending}
            >
              Marcar como resuelta
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-outline bg-surface-hover p-3">
            <h3 className="text-xs font-semibold uppercase text-muted">Cliente</h3>
            <p className="font-medium text-ink">{incident.order?.customer?.full_name ?? '—'}</p>
            <p className="text-sm text-muted">{incident.order?.customer?.phone_number ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-outline bg-surface-hover p-3">
            <h3 className="mb-1 text-xs font-semibold uppercase text-muted">Problema</h3>
            <Badge label={labelOf(INCIDENT_TYPE, incident.type)} />
            <p className="mt-1 text-sm text-muted">{incident.description}</p>
          </div>
        </div>

        <div className="rounded-xl border border-outline bg-surface-hover p-3">
          <h3 className="text-xs font-semibold uppercase text-muted">Reportada por</h3>
          <p className="font-medium text-ink">
            {reporter.isLoading ? 'Buscando…' : (reporter.data?.full_name ?? 'Usuario no encontrado')}
          </p>
          <p className="font-mono text-xs text-muted">{incident.reported_by}</p>
        </div>

        {/* Todo lo que trae IncidentResponseDto y no se ve ya arriba (cliente, tipo,
            descripción, quién la reportó): estado y los tres ids técnicos. */}
        <DetailList
          items={[
            { label: 'Estado', value: <Badge label={labelOf(INCIDENT_STATUS, incident.status)} /> },
            { label: 'Alta', value: formatDateTime(incident.createdAt) },
            { label: 'Id de la incidencia', value: incident.incident_id, mono: true },
            { label: 'Id del pedido', value: incident.order_id, mono: true },
            { label: 'Id de la distribuidora', value: incident.distributor_id, mono: true },
          ]}
        />

        {incident.photo_url && (
          <img
            src={incident.photo_url}
            alt="Evidencia de la incidencia"
            className="h-56 w-full rounded-xl border border-outline object-cover"
          />
        )}

        {isOpen ? (
          <form id="incident-resolve" onSubmit={(e) => void onSubmit(e)} noValidate>
            <TextArea
              label="Nota de resolución"
              required
              rows={4}
              placeholder="Ej: se reprogramó la entrega / se repuso la garrafa dañada"
              error={errors.resolutionNote?.message}
              {...register('resolutionNote')}
            />
          </form>
        ) : (
          <DetailList
            items={[
              { label: 'Resuelta', value: formatDateTime(incident.resolvedAt) },
              { label: 'Cómo se resolvió', value: incident.resolution_note ?? '—', wide: true },
            ]}
          />
        )}
      </div>
    </Drawer>
  );
};
