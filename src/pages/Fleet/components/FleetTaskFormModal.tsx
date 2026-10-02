import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, Select, TextArea } from '../../../common/components/ui';
import type { FleetTaskUpdateBody } from '../../../services/api/fleet';
import type { FleetPlan, FleetTask } from '../../../services/api/types';
import { useCreateFleetTask, useFleetPlans, useUpdateFleetTask } from '../../../services/queries/fleet';
import { notify } from '../../../utils/notifications';
import { fleetTaskCreateSchema, type FleetTaskCreateValues } from './fleetTaskSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  subject: 'vehicle' | 'driver';
  ownerId: string;
  /** Sólo para subject="vehicle": filtra los planes a los que aplica el tipo de este vehículo. */
  carType?: string | null;
  /** Con tarea es edición (el plan queda fijo); sin ella, alta. */
  task: FleetTask | null;
}

const appliesToCarType = (plan: FleetPlan, carType: string | null | undefined) =>
  plan.carType === null || !carType || plan.carType === carType;

/** Pistas de qué completar según qué dispara el vencimiento del plan elegido. */
const triggerHint = (trigger: FleetPlan['trigger'] | undefined) => {
  if (trigger === 'by_km') return 'Este plan vence por kilometraje.';
  if (trigger === 'by_time') return 'Este plan vence cada cierta cantidad de meses: cargá la próxima fecha límite.';
  return undefined;
};

export const FleetTaskFormModal = ({ open, onClose, subject, ownerId, carType, task }: Props) => {
  const isEditing = Boolean(task);
  const { data: plans = [], error: plansError, refetch: refetchPlans } = useFleetPlans({ subject, isActive: true });
  const planOptions = useMemo(
    () =>
      plans
        .filter((plan) => subject !== 'vehicle' || appliesToCarType(plan, carType))
        .map((plan) => ({ value: plan.planId, label: plan.name })),
    [plans, subject, carType],
  );
  const createTask = useCreateFleetTask();
  const updateTask = useUpdateFleetTask();
  const saving = createTask.isPending || updateTask.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<FleetTaskCreateValues>({
    // La edición manda el mismo esquema: `planId` ya viene de la tarea (el plan no se cambia).
    resolver: zodResolver(fleetTaskCreateSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset({
      planId: task?.planId ?? '',
      dueAt: task?.dueAt ? task.dueAt.slice(0, 10) : '',
      dueKm: task?.dueKm ?? undefined,
      provider: task?.provider ?? '',
      referenceNumber: task?.referenceNumber ?? '',
      category: task?.category ?? '',
      notes: task?.notes ?? '',
      scheduledAt: task?.scheduledAt ? task.scheduledAt.slice(0, 10) : '',
    });
  }, [open, task, reset]);

  // En el alta, apenas llegan los planes disponibles se preselecciona el primero (si el
  // usuario todavía no eligió ninguno): sin esto, el <select> queda mostrando un plan que
  // React Hook Form no tiene cargado hasta que se completa la consulta.
  useEffect(() => {
    if (!open || task || planOptions.length === 0) return;
    if (getValues('planId')) return;
    setValue('planId', planOptions[0].value);
  }, [open, task, planOptions, getValues, setValue]);

  const watchedPlanId = watch('planId');
  const plan = task?.plan ?? plans.find((p) => p.planId === watchedPlanId);

  const onSubmit = handleSubmit((values) => {
    const options = {
      onSuccess: () => {
        notify.success(isEditing ? 'Tarea actualizada' : 'Tarea agregada');
        onClose();
      },
      onError: notify.error,
    };
    if (task) {
      // Edición: un campo vacío LIMPIA el dato (la API lo acepta con `null`/`''`), no se omite.
      const changes: FleetTaskUpdateBody = {
        dueAt: values.dueAt || null,
        dueKm: values.dueKm ?? null,
        provider: values.provider ?? '',
        referenceNumber: values.referenceNumber ?? '',
        category: values.category ?? '',
        notes: values.notes ?? '',
        scheduledAt: values.scheduledAt || null,
      };
      updateTask.mutate({ id: task.taskId, changes }, options);
    } else {
      createTask.mutate(
        {
          planId: values.planId,
          dueAt: values.dueAt || undefined,
          dueKm: values.dueKm,
          provider: values.provider,
          referenceNumber: values.referenceNumber,
          category: values.category,
          notes: values.notes,
          scheduledAt: values.scheduledAt || undefined,
          ...(subject === 'vehicle' ? { carId: ownerId } : { deliveryId: ownerId }),
        },
        options,
      );
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar tarea' : 'Nueva tarea'}
      description={plan?.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="fleet-task-form" loading={saving}>
            {isEditing ? 'Guardar cambios' : 'Agregar tarea'}
          </Button>
        </>
      }
    >
      <form id="fleet-task-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        {!isEditing &&
          (plansError ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger sm:col-span-2">
              <span>No se pudieron cargar los planes.</span>
              <Button variant="secondary" size="sm" onClick={() => void refetchPlans()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <Select
                label="Plan"
                required
                options={planOptions}
                hint={
                  planOptions.length === 0 ? 'No hay planes activos para esto todavía.' : triggerHint(plan?.trigger)
                }
                error={errors.planId?.message}
                {...register('planId')}
              />
            </div>
          ))}
        <Input
          label="Vence el"
          type="date"
          hint={triggerHint(plan?.trigger)}
          error={errors.dueAt?.message}
          {...register('dueAt')}
        />
        <Input
          label="Vence a los (km)"
          type="number"
          min={0}
          step={1}
          error={errors.dueKm?.message}
          {...register('dueKm')}
        />
        <Input
          label="Proveedor"
          placeholder="Aseguradora, taller o gestoría"
          maxLength={120}
          error={errors.provider?.message}
          {...register('provider')}
        />
        <Input
          label="Número de referencia"
          placeholder="Nº de póliza, licencia u otro"
          maxLength={60}
          error={errors.referenceNumber?.message}
          {...register('referenceNumber')}
        />
        {subject === 'driver' && (
          <Input
            label="Categoría"
            placeholder="B1"
            maxLength={10}
            error={errors.category?.message}
            {...register('category')}
          />
        )}
        <Input label="Turno agendado" type="date" error={errors.scheduledAt?.message} {...register('scheduledAt')} />
        <div className="sm:col-span-2">
          <TextArea label="Notas" maxLength={2000} error={errors.notes?.message} {...register('notes')} />
        </div>
      </form>
    </Modal>
  );
};
