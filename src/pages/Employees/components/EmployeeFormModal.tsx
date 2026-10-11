import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Modal, Select, TextArea } from '../../../common/components/ui';
import type { Employee } from '../../../services/api/types';
import { useCreateEmployee, useJobPositions, useUpdateEmployee } from '../../../services/queries/employees';
import { notify } from '../../../utils/notifications';
import { emptyEmployeeValues, employeeToValues, toEmployeeBody } from '../employeeBody';
import { DOCUMENT_TYPE_LABELS, EMPLOYMENT_TYPE_LABELS } from '../employeeLabels';
import { employeeEditSchema, employeeSchema, type EmployeeFormValues } from '../employeeSchema';

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con legajo es edición; sin legajo, alta. */
  employee: Employee | null;
}

export const EmployeeFormModal = ({ open, onClose, employee }: Props) => {
  const positions = useJobPositions(open);
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employee ? employeeEditSchema : employeeSchema),
    defaultValues: emptyEmployeeValues,
  });

  useEffect(() => {
    if (open) reset(employee ? employeeToValues(employee) : emptyEmployeeValues);
  }, [open, employee, reset]);

  const positionOptions = [
    { value: '', label: positions.isPending ? 'Cargando puestos…' : 'Elegí un puesto' },
    ...(positions.data ?? [])
      .filter((p) => p.isActive || p.positionId === employee?.position.positionId)
      .map((p) => ({ value: p.positionId, label: p.name })),
  ];

  const pending = create.isPending || update.isPending;
  const done = (message: string) => ({
    onSuccess: () => {
      notify.success(message);
      onClose();
    },
    onError: notify.error,
  });

  const onSubmit = handleSubmit((values) => {
    const body = toEmployeeBody(values);
    if (employee) update.mutate({ id: employee.employeeId, body }, done('Legajo actualizado'));
    else create.mutate(body, done('Legajo creado'));
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={employee ? 'Editar legajo' : 'Nuevo legajo'}
      description={employee ? `Legajo ${employee.fileNumber}` : 'Datos de la persona y su puesto en la distribuidora.'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="employee-form" loading={pending} disabled={Boolean(employee) && !isDirty}>
            {employee ? 'Guardar cambios' : 'Crear legajo'}
          </Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Nombre" required error={errors.firstName?.message} {...register('firstName')} />
        <Input label="Apellido" required error={errors.lastName?.message} {...register('lastName')} />
        <Select
          label="Tipo de documento"
          required
          options={toOptions(DOCUMENT_TYPE_LABELS)}
          {...register('documentType')}
        />
        <Input
          label="Número de documento"
          required
          error={errors.documentNumber?.message}
          {...register('documentNumber')}
        />
        <Select
          label="Puesto"
          required
          options={positionOptions}
          error={errors.positionId?.message}
          {...register('positionId')}
        />
        <Select
          label="Modalidad"
          required
          options={toOptions(EMPLOYMENT_TYPE_LABELS)}
          {...register('employmentType')}
        />
        <Input
          label="Fecha de ingreso"
          required
          type="date"
          error={errors.hireDate?.message}
          {...register('hireDate')}
        />
        <Input
          label="Número de legajo"
          required={Boolean(employee)}
          hint={employee ? undefined : 'Si lo dejás vacío toma el siguiente correlativo'}
          error={errors.fileNumber?.message}
          {...register('fileNumber')}
        />
        <Input label="CUIL" placeholder="20123456786" error={errors.cuil?.message} {...register('cuil')} />
        <Input label="Fecha de nacimiento" type="date" error={errors.birthDate?.message} {...register('birthDate')} />
        <Input
          label="Teléfono"
          type="tel"
          placeholder="+5493764000000"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label="Email personal"
          type="email"
          error={errors.personalEmail?.message}
          {...register('personalEmail')}
        />
        <div className="sm:col-span-2">
          <Input label="Domicilio" error={errors.addressLine?.message} {...register('addressLine')} />
        </div>
        <Input label="Ciudad" error={errors.city?.message} {...register('city')} />
        <Input label="Provincia" error={errors.province?.message} {...register('province')} />
        <Input label="Código postal" error={errors.postalCode?.message} {...register('postalCode')} />
        <fieldset className="grid gap-4 rounded-xl border border-outline p-4 sm:col-span-2 sm:grid-cols-3">
          <legend className="px-1 text-sm font-medium text-ink">Contacto de emergencia</legend>
          <Input label="Nombre" error={errors.emergencyContactName?.message} {...register('emergencyContactName')} />
          <Input
            label="Teléfono"
            type="tel"
            error={errors.emergencyContactPhone?.message}
            {...register('emergencyContactPhone')}
          />
          <Input
            label="Vínculo"
            error={errors.emergencyContactRelationship?.message}
            {...register('emergencyContactRelationship')}
          />
        </fieldset>
        <div className="sm:col-span-2">
          <TextArea label="Notas" rows={3} error={errors.notes?.message} {...register('notes')} />
        </div>
      </form>
    </Modal>
  );
};
