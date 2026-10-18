import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Checkbox, Input, Modal, Select } from '../../../common/components/ui';
import type { FleetPlan } from '../../../services/api/types';
import { useCreateFleetPlan, useUpdateFleetPlan } from '../../../services/queries/fleet';
import { notify } from '../../../utils/notifications';
import { POSITION_CATEGORY_LABELS } from '../../Employees/employeeLabels';
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
  { value: 'employee', label: 'Personal' },
];

const EMPLOYEE_DOCUMENT_KIND_OPTIONS = [
  { value: '', label: 'Sin detalle' },
  { value: 'hazmat_driver_course', label: 'Curso de mercancías peligrosas (certificado y emisor)' },
  { value: 'psychophysical', label: 'Examen psicofísico (fecha del examen)' },
  { value: 'art_coverage', label: 'Alta en la ART (aseguradora y póliza)' },
  { value: 'generic', label: 'Genérico' },
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

/** El tipo de documento sólo viaja si es de los que corresponden al sujeto del plan. */
const documentKindFor = (
  subject: FleetPlanFormValues['subject'],
  kind: FleetPlanFormValues['documentKind'],
): Exclude<FleetPlanFormValues['documentKind'], ''> | null | undefined => {
  const options = subject === 'employee' ? EMPLOYEE_DOCUMENT_KIND_OPTIONS : VEHICLE_DOCUMENT_KIND_OPTIONS;
  const valid = kind !== '' && options.some((o) => o.value === kind);
  if (subject === 'vehicle') return valid ? kind : null;
  if (subject === 'employee') return valid ? kind : undefined;
  return undefined;
};

/** Alta o edición de un plan de mantenimiento/habilitación (CU-105/140). */
const VEHICLE_DOCUMENT_KIND_OPTIONS = [
  { value: '', label: 'Otro' },
  { value: 'insurance', label: 'Seguro del vehículo' },
  { value: 'vtv', label: 'VTV' },
  { value: 'hazmat_vehicle_permit', label: 'Habilitación de mercancías peligrosas' },
  { value: 'service', label: 'Service o mantenimiento' },
];

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
      documentKind: plan?.documentKind ?? '',
      appliesToCategories: plan?.appliesToCategories ?? [],
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
      documentKind: documentKindFor(values.subject, values.documentKind),
      appliesToCategories: values.subject === 'employee' ? values.appliesToCategories : undefined,
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
        {subject === 'employee' && (
          <>
            <div className="sm:col-span-2">
              <Select
                label="Tipo de documento"
                options={EMPLOYEE_DOCUMENT_KIND_OPTIONS}
                hint="Define los datos que se piden al cargarlo."
                error={errors.documentKind?.message}
                {...register('documentKind')}
              />
            </div>
            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium text-ink">Aplica a los puestos de categoría</legend>
              <p className="mb-2 text-xs text-muted">Sin elegir ninguna, aplica a todo el personal.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(POSITION_CATEGORY_LABELS).map(([value, label]) => (
                  <Checkbox key={value} label={label} value={value} {...register('appliesToCategories')} />
                ))}
              </div>
            </fieldset>
          </>
        )}
        {subject === 'vehicle' && (
          <Input
            label="Tipo de vehículo"
            placeholder="Moto, camioneta… (vacío = todos)"
            maxLength={60}
            error={errors.carType?.message}
            {...register('carType')}
          />
        )}
        {subject === 'vehicle' && (
          <Select
            label="Qué documento es"
            options={VEHICLE_DOCUMENT_KIND_OPTIONS}
            hint="El sistema reconoce el seguro (su prima entra en el costo del vehículo) y la habilitación de mercancías peligrosas."
            error={errors.documentKind?.message}
            {...register('documentKind')}
          />
        )}
      </form>
    </Modal>
  );
};
