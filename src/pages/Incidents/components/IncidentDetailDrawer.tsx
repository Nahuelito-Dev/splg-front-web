import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { usePermissions } from '../../../hooks';
import {
  AuditHistoryLink,
  Badge,
  Button,
  DetailList,
  Drawer,
  EntityPhoto,
  FormTextArea,
  Form,
  PersonAvatar,
} from '../../../common/components/ui';
import type { Incident } from '../../../services/api/types';
import { useResolveIncident } from '../../../services/queries/incidents';
import { useUser } from '../../../services/queries/users';
import { notify } from '../../../utils/notifications';
import { INCIDENT_STATUS, INCIDENT_TYPE, labelOf } from '../../../utils/statusLabels';
import { formatDateTime, formatShortId } from '../../../utils/format';
import { ResolveUnpaidAction } from '../../Orders/components/details/ResolveUnpaidAction';

const resolveSchema = z.object({
  resolutionNote: z.string().trim().min(1, 'Escribí cómo se resolvió la incidencia'),
});

type ResolveValues = z.infer<typeof resolveSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  incident: Incident | null;
  /** Editar y descartar las maneja la página (abren su propio modal). */
  onEdit?: (incident: Incident) => void;
  onDiscard?: (incident: Incident) => void;
}

/**
 * El detalle de una incidencia. Si está abierta, además se resuelve acá; si ya
 * se resolvió, se ve cómo y cuándo.
 */
export const IncidentDetailDrawer = ({ open, onClose, incident, onEdit, onDiscard }: Props) => {
  const { canOperate, operateHint } = usePermissions();
  const resolveIncident = useResolveIncident();
  // `IncidentResponseDto.reported_by` es sólo un uuid: la API no lo trae resuelto
  // (a diferencia de `order.customer`), así que se busca aparte con GET
  // /users/:id. Ese endpoint lo puede pedir cualquier admin para gente de su
  // propia distribuidora (que es siempre el caso acá: reporta un chofer o un
  // admin de la misma empresa), y el super admin, para cualquiera.
  const reporter = useUser(incident?.reported_by);
  const methods = useForm<ResolveValues>({ resolver: zodResolver(resolveSchema) });
  const { reset } = methods;

  useEffect(() => {
    if (open && incident) reset({ resolutionNote: incident.resolution_note ?? '' });
  }, [open, incident, reset]);

  if (!incident) return null;
  const isOpen = incident.status === 'open';
  const unpaidOrder =
    incident.type === 'unpaid_collection' && incident.order?.paymentStatus === 'unpaid' ? incident.order : null;

  const onSubmit = (body: ResolveValues) =>
    resolveIncident.mutate(
      { id: incident.incident_id, body: { ...body, status: 'resolved' } },
      {
        onSuccess: () => {
          notify.success('Incidencia resuelta');
          onClose();
        },
        onError: notify.error,
      },
    );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        isOpen ? 'Resolver incidencia' : `Incidencia ${labelOf(INCIDENT_STATUS, incident.status).text.toLowerCase()}`
      }
      description={`${formatShortId(incident.incident_id)} · Pedido ${formatShortId(incident.order_id)} · ${formatDateTime(incident.createdAt)}`}
      size="md"
      footer={
        isOpen ? (
          <>
            {operateHint && <p className="mr-auto self-center text-sm text-muted">{operateHint}</p>}
            {unpaidOrder && (
              <ResolveUnpaidAction
                order={{
                  order_id: unpaidOrder.order_id,
                  total_amount: Number(unpaidOrder.totalAmount),
                  paymentMethodDetail: unpaidOrder.paymentMethod,
                }}
              />
            )}
            {onEdit && incident.type !== 'unpaid_collection' && (
              <Button variant="secondary" disabled={!canOperate} title={operateHint} onClick={() => onEdit(incident)}>
                Editar
              </Button>
            )}
            {onDiscard && !unpaidOrder && (
              <Button variant="danger" disabled={!canOperate} title={operateHint} onClick={() => onDiscard(incident)}>
                Descartar
              </Button>
            )}
            {!unpaidOrder && (
              <Button
                type="submit"
                form="incident-resolve"
                disabled={!canOperate}
                title={operateHint}
                loading={resolveIncident.isPending}
              >
                Marcar como resuelta
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-outline bg-surface-hover p-3">
            <h3 className="text-xs font-semibold uppercase text-muted">Cliente</h3>
            <div className="flex items-center gap-2">
              <PersonAvatar
                name={incident.order?.customer?.full_name ?? 'Cliente'}
                userId={incident.order?.customer?.user_id}
                size="sm"
                decorative
              />
              <p className="font-medium text-ink">{incident.order?.customer?.full_name ?? '—'}</p>
            </div>
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
          <div className="flex items-center gap-2">
            <PersonAvatar
              name={reporter.data?.full_name ?? 'Usuario'}
              userId={incident.reported_by}
              size="sm"
              decorative
            />
            <p className="font-medium text-ink">
              {reporter.isLoading ? 'Buscando…' : (reporter.data?.full_name ?? 'Usuario no encontrado')}
            </p>
          </div>
          <p className="font-mono text-xs text-muted">{incident.reported_by}</p>
        </div>

        {/* Todo lo que trae IncidentResponseDto y no se ve ya arriba (cliente, tipo,
            descripción, quién la reportó): estado y los tres ids técnicos. */}
        <AuditHistoryLink entity="Incident" recordId={incident.incident_id} />

        <DetailList
          items={[
            { label: 'Estado', value: <Badge label={labelOf(INCIDENT_STATUS, incident.status)} /> },
            { label: 'Alta', value: formatDateTime(incident.createdAt) },
            { label: 'Id de la incidencia', value: incident.incident_id, mono: true },
            { label: 'Id del pedido', value: incident.order_id, mono: true },
            { label: 'Id de la distribuidora', value: incident.distributor_id, mono: true },
          ]}
        />

        <EntityPhoto
          kind="incident"
          id={incident.incident_id}
          url={incident.photo_url}
          subject="de la incidencia"
          canEdit={canOperate}
          blockedReason={isOpen ? operateHint : 'La incidencia ya no está abierta: no se puede cambiar la foto.'}
        />

        {unpaidOrder ? (
          <p className="rounded-xl border border-outline bg-surface-hover p-3 text-sm text-muted">
            El pedido sigue impago: la incidencia se cierra sola al resolver el cobro con «Resolver impago».
          </p>
        ) : isOpen ? (
          <Form methods={methods} id="incident-resolve" onSubmit={onSubmit}>
            <FormTextArea
              name="resolutionNote"
              label="Nota de resolución"
              required
              rows={4}
              placeholder="Ej: se reprogramó la entrega / se repuso la garrafa dañada"
            />
          </Form>
        ) : (
          <DetailList
            items={[
              {
                label: incident.status === 'discarded' ? 'Descartada' : 'Resuelta',
                value: formatDateTime(incident.resolvedAt),
              },
              {
                label: incident.status === 'discarded' ? 'Motivo del descarte' : 'Cómo se resolvió',
                value: incident.resolution_note ?? '—',
                wide: true,
              },
            ]}
          />
        )}
      </div>
    </Drawer>
  );
};
