import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Modal, TextArea } from '../../../common/components/ui';
import type { Claim } from '../../../services/api/types';
import { useUpdateClaim } from '../../../services/queries/claims';
import { notify } from '../../../utils/notifications';

const schema = z.object({
  reason: z.string().trim().min(1, 'Contá el motivo del reclamo'),
  description: z.string().trim().min(1, 'Describí el reclamo'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  claim: Claim | null;
  onClose: () => void;
}

/** Corrige el motivo o la descripción de un reclamo pendiente (la API rechaza editar uno que ya se tomó). */
export const EditClaimModal = ({ claim, onClose }: Props) => {
  const update = useUpdateClaim();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (claim) reset({ reason: claim.reason, description: claim.description });
  }, [claim, reset]);

  const onSubmit = handleSubmit((values) => {
    if (!claim) return;
    update.mutate(
      { id: claim.claim_id, body: values },
      {
        onSuccess: () => {
          notify.success('Reclamo actualizado');
          onClose();
        },
        onError: notify.error,
      },
    );
  });

  return (
    <Modal
      open={Boolean(claim)}
      onClose={onClose}
      title="Editar reclamo"
      description="Sólo se puede editar mientras está pendiente."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="claim-edit" loading={update.isPending}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id="claim-edit" onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        <Input label="Motivo" required error={errors.reason?.message} {...register('reason')} />
        <TextArea
          label="Descripción"
          required
          rows={4}
          error={errors.description?.message}
          {...register('description')}
        />
      </form>
    </Modal>
  );
};
