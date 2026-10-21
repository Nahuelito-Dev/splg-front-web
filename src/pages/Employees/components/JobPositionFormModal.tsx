import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal, FormInput, FormCheckbox, FormSelect, Form } from '../../../common/components/ui';
import type { JobPosition } from '../../../services/api/types';
import { useCreateJobPosition, useUpdateJobPosition } from '../../../services/queries/employees';
import { notify } from '../../../utils/notifications';
import { jobPositionSchema, type JobPositionFormValues } from '../employeeAccessSchemas';
import { POSITION_CATEGORY_LABELS } from '../employeeLabels';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con puesto es edición; sin él, alta. */
  position: JobPosition | null;
}

const CATEGORY_OPTIONS = Object.entries(POSITION_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

/** Alta o edición de un puesto (CU-176): el nombre es libre, la categoría manda las reglas. */
export const JobPositionFormModal = ({ open, onClose, position }: Props) => {
  const create = useCreateJobPosition();
  const update = useUpdateJobPosition();
  const methods = useForm<JobPositionFormValues>({ resolver: zodResolver(jobPositionSchema) });
  const { reset } = methods;

  useEffect(() => {
    if (!open) return;
    reset({
      name: position?.name ?? '',
      category: position?.category ?? 'driver',
      isActive: position?.isActive ?? true,
    });
  }, [open, position, reset]);

  const onSubmit = (body: JobPositionFormValues) => {
    if (create.isPending || update.isPending) return;
    const options = {
      onSuccess: () => {
        notify.success(position ? 'Puesto actualizado' : 'Puesto creado');
        onClose();
      },
      onError: notify.error,
    };
    if (position) update.mutate({ id: position.positionId, body }, options);
    else create.mutate(body, options);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={position ? 'Editar puesto' : 'Nuevo puesto'}
      description="La categoría define el rol de acceso y la documentación; el nombre es libre."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="job-position-form" loading={create.isPending || update.isPending}>
            {position ? 'Guardar cambios' : 'Crear puesto'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id="job-position-form" onSubmit={onSubmit} className="grid gap-4">
        <FormInput name="name" label="Nombre" required maxLength={80} />
        <FormSelect name="category" label="Categoría" required options={CATEGORY_OPTIONS} />
        {position && <FormCheckbox name="isActive" label="Puesto vigente" />}
      </Form>
    </Modal>
  );
};
