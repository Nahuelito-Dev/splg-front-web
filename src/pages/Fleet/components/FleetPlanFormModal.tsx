import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, Select } from '../../../common/components/ui';
import type { FleetPlan } from '../../../services/api/types';
import { useCreateFleetPlan, useUpdateFleetPlan } from '../../../services/queries/fleet';
import { notify } from '../../../utils/notifications';
import { fleetPlanSchema, type FleetPlanFormValues } from './fleetPlanSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con plan es edición; sin él, alta. */
  plan: FleetPlan | null;
}

const SUBJECT_OPTIONS = [
  { value: 'vehicle', label: 'Vehículo' },
  { value: 'driver', label: 'Chofer' },
];

const TRIGGER_OPTIONS = [
  { value: 'by_km', label: 'Por kilometraje' },
  { value: 'by_time', label: 'Por tiempo' },
  { value: 'by_fixed_date', label: 'Fecha fija' },
];

const CRITICALITY_OPTIONS = [
  { value: 'blocking', label: 'Bloqueante' },
  { value: 'non_blocking', label: 'No bloqueante' },
];

/** Alta o edición de un plan de mantenimiento/habilitación (CU-105/140). */
export const FleetPlanFormModal = ({ open, onClose, plan }: Props) => {
  const isEditing = Boolean(plan);
  const createPlan = useCreateFleetPlan();
  const updatePlan = useUpdateFleetPlan();
  const saving = createPlan.isPending || updatePlan.isPending;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FleetPlanFormValues>({ resolver: zodResolver(fleetPlanSchema) });

  useEffect(() => {
    if (!open) return;
    reset({
      name: plan?.name ?? '',
      subject: plan?.subject ?? 'vehicle',
      trigger: plan?.trigger ?? 'by_time',
      intervalKm: plan?.intervalKm ?? undefined,
      intervalMonths: plan?.intervalMonths ?? undefined,
      leadTimeDays: plan?.leadTimeDays ?? 30,
      criticality: plan?.criticality ?? 'blocking',
      carType: plan?.carType ?? '',
      isActive: plan?.isActive ?? true,
    });
  }, [open, plan, reset]);

  const trigger = watch('trigger');
  const subject = watch('subject');

  const onSubmit = handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        notify.success(isEditing ? 'Plan actualizado' : 'Plan creado');
        onClose();
      },
      onError: notify.error,
    };
    const body = {
      name: values.name,
      subject: values.subject,
      trigger: values.trigger,
      intervalKm: values.trigger === 'by_km' ? values.intervalKm : undefined,
      intervalMonths: values.trigger === 'by_time' ? values.intervalMonths : undefined,
      leadTimeDays: values.leadTimeDays,
      criticality: values.criticality,
      carType: values.subject === 'vehicle' ? values.carType : undefined,
      isActive: values.isActive,
    };
    if (plan) {
      updatePlan.mutate({ id: plan.planId, body }, options);
    } else {
      createPlan.mutate(body, options);
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar plan' : 'Nuevo plan'}
      description="Regla de mantenimiento o habilitación de la flota."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="fleet-plan-form" loading={saving}>
            {isEditing ? 'Guardar cambios' : 'Crear plan'}
          </Button>
        </>
      }
    >
      <form id="fleet-plan-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <div className="sm:col-span-2">
          <Input
            label="Nombre"
            placeholder="Seguro del vehículo"
            maxLength={120}
            error={errors.name?.message}
            {...register('name')}
          />
        </div>
        <Select
          label="A qué aplica"
          options={SUBJECT_OPTIONS}
          error={errors.subject?.message}
          {...register('subject')}
        />
        <Select
          label="Dispara el vencimiento"
          options={TRIGGER_OPTIONS}
          error={errors.trigger?.message}
          {...register('trigger')}
        />
        {trigger === 'by_km' && (
          <Input
            label="Cada (km)"
            type="number"
            min={1}
            step={1}
            error={errors.intervalKm?.message}
            {...register('intervalKm')}
          />
        )}
        {trigger === 'by_time' && (
          <Input
            label="Cada (meses)"
            type="number"
            min={1}
            step={1}
            error={errors.intervalMonths?.message}
            {...register('intervalMonths')}
          />
        )}
        <Input
          label="Avisa con (días de anticipación)"
          type="number"
          min={0}
          step={1}
          error={errors.leadTimeDays?.message}
          {...register('leadTimeDays')}
        />
        <Select
          label="Criticidad"
          options={CRITICALITY_OPTIONS}
          hint="Bloqueante: sin esto vigente, no puede salir a operar."
          error={errors.criticality?.message}
          {...register('criticality')}
        />
        {subject === 'vehicle' && (
          <Input
            label="Tipo de vehículo"
            placeholder="Moto, camioneta… (vacío = todos)"
            maxLength={60}
            error={errors.carType?.message}
            {...register('carType')}
          />
        )}
      </form>
    </Modal>
  );
};
