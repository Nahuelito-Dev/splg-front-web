import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal, FormInput, FormTextArea, FormSelect, Form } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import type { FleetTaskUpdateBody } from '../../../services/api/fleet';
import type { FleetPlan, FleetTask } from '../../../services/api/types';
import { useCreateFleetTask, useFleetPlans, useUpdateFleetTask } from '../../../services/queries/fleet';
import { toApiError } from '../../../services/api/errors';
import { scheduledDayOf } from '../../../utils/format';
import { notify } from '../../../utils/notifications';
import { fleetTaskCreateSchema, type FleetTaskCreateValues } from './fleetTaskSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  subject: 'vehicle' | 'driver' | 'employee';
  ownerId: string;
  /** Sólo para subject="vehicle": filtra los planes a los que aplica el tipo de este vehículo. */
  carType?: string | null;
  /** Con tarea es edición (el plan queda fijo); sin ella, alta. */
  task: FleetTask | null;
}

/** El turno se guarda como instante: el día que se muestra y se edita es el de Buenos Aires, no el de UTC. */
const scheduledDay = (task: FleetTask | null) => (task?.scheduledAt ? scheduledDayOf(task.scheduledAt) : '');

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
  const { needsDistributor } = usePermissions();
  // Los planes se piden al abrir: el modal queda montado en las listas y, sin «Ver como», la API los rechaza.
  const {
    data: plans = [],
    error: plansError,
    refetch: refetchPlans,
  } = useFleetPlans({ subject, isActive: true }, { enabled: open && !needsDistributor });
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

  const methods = useForm<FleetTaskCreateValues>({
    // La edición manda el mismo esquema: `planId` ya viene de la tarea (el plan no se cambia).
    resolver: zodResolver(fleetTaskCreateSchema),
  });
  const { reset, watch, getValues, setValue, setError } = methods;

  useEffect(() => {
    if (!open) return;
    reset({
      planId: task?.planId ?? '',
      validFrom: task?.validFrom ? task.validFrom.slice(0, 10) : '',
      cost: task?.cost ?? undefined,
      dueAt: task?.dueAt ? task.dueAt.slice(0, 10) : '',
      dueKm: task?.dueKm ?? undefined,
      provider: task?.provider ?? '',
      referenceNumber: task?.referenceNumber ?? '',
      category: task?.category ?? '',
      notes: task?.notes ?? '',
      scheduledAt: scheduledDay(task),
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

  const onSubmit = (values: FleetTaskCreateValues) => {
    const options = {
      onSuccess: () => {
        notify.success(isEditing ? 'Tarea actualizada' : 'Tarea agregada');
        onClose();
      },
      onError: (error: unknown) => {
        const { status, messages } = toApiError(error);
        if (status === 400 && messages.length === 1 && messages[0].startsWith('scheduledAt')) {
          const text = messages[0].replace(/^scheduledAt:\s*/, '');
          setError('scheduledAt', { message: text.charAt(0).toUpperCase() + text.slice(1) });
        } else notify.error(error);
      },
    };
    if (task) {
      // Edición: un campo vacío LIMPIA el dato (la API lo acepta con `null`/`''`), no se omite.
      const changes: FleetTaskUpdateBody = {
        validFrom: values.validFrom || null,
        cost: values.cost ?? null,
        dueAt: values.dueAt || null,
        dueKm: values.dueKm ?? null,
        provider: values.provider ?? '',
        referenceNumber: values.referenceNumber ?? '',
        category: values.category ?? '',
        notes: values.notes ?? '',
        // El turno mueve la ventana confirmada del taller en el back: sólo se manda si lo tocaron.
        ...((values.scheduledAt ?? '') !== scheduledDay(task) && { scheduledAt: values.scheduledAt || null }),
      };
      updateTask.mutate({ id: task.taskId, changes }, options);
    } else {
      createTask.mutate(
        {
          planId: values.planId,
          validFrom: values.validFrom || undefined,
          cost: values.cost,
          dueAt: values.dueAt || undefined,
          dueKm: values.dueKm,
          provider: values.provider,
          referenceNumber: values.referenceNumber,
          category: values.category,
          notes: values.notes,
          scheduledAt: values.scheduledAt || undefined,
          ...(subject === 'vehicle'
            ? { carId: ownerId }
            : subject === 'employee'
              ? { employeeId: ownerId }
              : { deliveryId: ownerId }),
        },
        options,
      );
    }
  };

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
      <Form methods={methods} id="fleet-task-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
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
              <FormSelect
                name="planId"
                label="Plan"
                required
                options={planOptions}
                hint={
                  planOptions.length === 0 ? 'No hay planes activos para esto todavía.' : triggerHint(plan?.trigger)
                }
              />
            </div>
          ))}
        <FormInput
          name="validFrom"
          label="Vigente desde"
          type="date"
          hint="Inicio de la vigencia (póliza, habilitación)."
        />
        <FormInput
          name="dueAt"
          label="Vence el"
          type="date"
          required={plan?.documentKind === 'hazmat_vehicle_permit'}
          hint={
            plan?.documentKind === 'hazmat_vehicle_permit'
              ? 'La habilitación necesita su vencimiento: vencida, el vehículo queda inhabilitado.'
              : triggerHint(plan?.trigger)
          }
        />
        <FormInput name="dueKm" label="Vence a los (km)" type="number" min={0} step={1} />
        <FormInput name="provider" label="Proveedor" placeholder="Aseguradora, taller o gestoría" maxLength={120} />
        <FormInput
          name="referenceNumber"
          label="Número de referencia"
          placeholder="Nº de póliza, licencia u otro"
          maxLength={60}
        />
        {subject === 'driver' && <FormInput name="category" label="Categoría" placeholder="B1" maxLength={10} />}
        <FormInput
          name="cost"
          label="Importe"
          type="number"
          step="0.01"
          min={0}
          hint="La prima de la póliza o lo que cuesta: entra en el costo del vehículo."
        />
        <FormInput name="scheduledAt" label="Turno agendado" type="date" />
        <div className="sm:col-span-2">
          <FormTextArea name="notes" label="Notas" maxLength={2000} />
        </div>
      </Form>
    </Modal>
  );
};
