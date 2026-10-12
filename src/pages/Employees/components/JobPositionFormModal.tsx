import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Input, Modal, Select } from '../../../common/components/ui';
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JobPositionFormValues>({ resolver: zodResolver(jobPositionSchema) });

  useEffect(() => {
    if (!open) return;
    reset({
      name: position?.name ?? '',
      category: position?.category ?? 'driver',
      isActive: position?.isActive ?? true,
    });
  }, [open, position, reset]);

  const onSubmit = handleSubmit((body) => {
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
  });

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
      <form id="job-position-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4" noValidate>
        <Input label="Nombre" required maxLength={80} error={errors.name?.message} {...register('name')} />
        <Select
          label="Categoría"
          required
          options={CATEGORY_OPTIONS}
          error={errors.category?.message}
          {...register('category')}
        />
        {position && <Checkbox label="Puesto vigente" {...register('isActive')} />}
      </form>
    </Modal>
  );
};
