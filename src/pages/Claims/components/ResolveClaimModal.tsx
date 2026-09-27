import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge, Button, DetailList, Modal, Select, TextArea } from '../../../common/components/ui';
import type { Claim } from '../../../services/api/types';
import { useResolveClaim } from '../../../services/queries/claims';
import { notify } from '../../../utils/notifications';
import { formatDateTime, formatShortId } from '../../../utils/format';
import { CLAIM_STATUS, labelOf } from '../../../utils/statusLabels';

const resolveSchema = z.object({
  resolution: z.string().trim().min(1, 'Escribí una nota de resolución'),
  status: z.enum(['resolved', 'in_process', 'rejected']),
});

type ResolveValues = z.infer<typeof resolveSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  claim: Claim | null;
}

export const ResolveClaimModal = ({ open, onClose, claim }: Props) => {
  const resolveClaim = useResolveClaim();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResolveValues>({
    resolver: zodResolver(resolveSchema),
    defaultValues: { status: 'resolved' },
  });

  useEffect(() => {
    if (open && claim) reset({ resolution: claim.resolutionNote ?? '', status: 'resolved' });
  }, [open, claim, reset]);

  if (!claim) return null;

  const onSubmit = handleSubmit((body) =>
    resolveClaim.mutate(
      { id: claim.claim_id, body },
      {
        onSuccess: () => {
          notify.success('Reclamo actualizado');
          onClose();
        },
        onError: notify.error,
      },
    ),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Gestionar reclamo"
      description={`${formatShortId(claim.claim_id)} · Pedido ${formatShortId(claim.order_id)}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="claim-resolve" loading={resolveClaim.isPending}>
            Confirmar resolución
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-outline bg-tinta-50 p-3">
            <h3 className="text-xs font-semibold uppercase text-muted">Cliente</h3>
            <p className="font-medium text-ink">{claim.customer?.full_name ?? '—'}</p>
            <p className="text-sm text-muted">{claim.customer?.phone_number ?? '—'}</p>
            <p className="text-xs text-muted">{claim.customer?.email ?? ''}</p>
          </div>
          <div className="rounded-xl border border-outline bg-tinta-50 p-3">
            <h3 className="text-xs font-semibold uppercase text-muted">Motivo</h3>
            <p className="font-medium text-ink">{claim.reason}</p>
            <p className="text-sm italic text-muted">“{claim.description}”</p>
          </div>
        </div>

        {/* Todo lo que trae ClaimResponseDto y no se ve ya arriba: estado, fecha y los
            tres ids técnicos (el cliente y el pedido se ven con nombre arriba). */}
        <DetailList
          items={[
            { label: 'Estado', value: <Badge label={labelOf(CLAIM_STATUS, claim.status)} /> },
            { label: 'Alta', value: formatDateTime(claim.createdAt) },
            { label: 'Id del reclamo', value: claim.claim_id, mono: true },
            { label: 'Id del pedido', value: claim.order_id, mono: true },
            { label: 'Id del cliente', value: claim.customer_id, mono: true },
            { label: 'Id de la distribuidora', value: claim.distributor_id, mono: true },
          ]}
        />

        {claim.photoUrl ? (
          <img
            src={claim.photoUrl}
            alt="Evidencia del reclamo"
            className="h-56 w-full rounded-xl border border-outline object-cover"
          />
        ) : (
          <p className="rounded-xl border border-dashed border-outline p-4 text-center text-sm text-muted">
            Sin foto adjunta
          </p>
        )}

        <form id="claim-resolve" onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
          <TextArea
            label="Nota de resolución"
            required
            rows={4}
            error={errors.resolution?.message}
            {...register('resolution')}
          />
          <Select
            label="Nuevo estado"
            options={[
              { value: 'resolved', label: 'Resuelto (cerrar caso)' },
              {
                value: 'in_process',
                label: 'En proceso (seguir investigando)',
              },
              { value: 'rejected', label: 'Rechazado (no procede)' },
            ]}
            {...register('status')}
          />
        </form>
      </div>
    </Modal>
  );
};
