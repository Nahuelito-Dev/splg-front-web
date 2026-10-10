import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Modal, Select, TextArea } from '../../../common/components/ui';
import type { Incident } from '../../../services/api/types';
import { useUpdateIncident } from '../../../services/queries/incidents';
import { notify } from '../../../utils/notifications';
import { INCIDENT_TYPE } from '../../../utils/statusLabels';

const TYPE_OPTIONS = Object.entries(INCIDENT_TYPE).map(([value, label]) => ({ value, label: label.text }));

const schema = z.object({
  type: z.enum(['damaged', 'out_of_stock', 'no_show', 'other']),
  description: z.string().trim().min(1, 'Describí lo que pasó'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  incident: Incident | null;
  onClose: () => void;
}

/** Corrige el tipo o la descripción de una incidencia abierta (la API no deja editar una cerrada). */
export const EditIncidentModal = ({ incident, onClose }: Props) => {
  const update = useUpdateIncident();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (incident) reset({ type: incident.type, description: incident.description });
  }, [incident, reset]);

  const onSubmit = handleSubmit((values) => {
    if (!incident) return;
    update.mutate(
      { id: incident.incident_id, body: values },
      {
        onSuccess: () => {
          notify.success('Incidencia actualizada');
          onClose();
        },
        onError: notify.error,
      },
    );
  });

  return (
    <Modal
      open={Boolean(incident)}
      onClose={onClose}
      title="Editar incidencia"
      description="Sólo se puede editar mientras está abierta."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="incident-edit" loading={update.isPending}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id="incident-edit" onSubmit={(e) => void onSubmit(e)} className="space-y-4" noValidate>
        <Select label="Tipo de problema" required options={TYPE_OPTIONS} {...register('type')} />
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
