import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useCrumbLeaf } from '../../common/components';
import {
  Card,
  EmptyState,
  ErrorState,
  Form,
  FormLoadWarning,
  type LoadWarning,
  FormActions,
  FormInput,
  FormSection,
  FormSelect,
  FormTextArea,
  LoadingState,
  PageContainer,
  PageHeader,
} from '../../common/components/ui';
import { usePermissions, useReturnPath, useUnsavedChangesGuard } from '../../hooks';
import type { Employee } from '../../services/api/types';
import { useCreateEmployee, useEmployee, useJobPositions, useUpdateEmployee } from '../../services/queries/employees';
import { notify } from '../../utils/notifications';
import { emptyEmployeeValues, employeeToValues, toEmployeeBody } from './employeeBody';
import { DOCUMENT_TYPE_LABELS, EMPLOYMENT_TYPE_LABELS, employeeFullName } from './employeeLabels';
import { employeeEditSchema, employeeSchema, type EmployeeFormValues } from './employeeSchema';

const toOptions = (labels: Record<string, string>) =>
  Object.entries(labels).map(([value, label]) => ({ value, label }));

/** Alta (`/employees/new`) y edición (`/employees/:id/edit`) del legajo. */
export const EmployeeForm = () => {
  const { id } = useParams<{ id: string }>();
  const { canWrite, writeHint } = usePermissions();
  if (canWrite) return <EmployeeFormLoader id={id} />;
  const title = id ? 'Editar legajo' : 'Nuevo legajo';
  return (
    <PageContainer size="sm">
      <PageHeader title={title} />
      <Card className="p-6">
        <EmptyState title="Elegí una distribuidora" description={writeHint} />
      </Card>
    </PageContainer>
  );
};

const EmployeeFormLoader = ({ id }: { id?: string }) => {
  const { data: employee, isPending, error, refetch } = useEmployee(id);
  // Los puestos tienen que estar antes de dibujar el combo: un <select> no conserva un valor cuyas opciones llegan después.
  const positions = useJobPositions();
  const title = id ? 'Editar legajo' : 'Nuevo legajo';
  useCrumbLeaf(id && employee ? 'Editar' : undefined);

  const loading = positions.isPending || (Boolean(id) && isPending);
  const failure =
    positions.error && !positions.data
      ? { error: positions.error, resource: 'Los puestos', retry: () => void positions.refetch() }
      : id && !employee
        ? { error, resource: 'El legajo', retry: () => void refetch() }
        : null;
  // Un error de recarga con datos en caché no desmonta el formulario: se avisa en línea y se puede reintentar.
  const warning = positions.error
    ? { text: 'No pudimos actualizar los puestos.', retry: () => void positions.refetch() }
    : id && error
      ? { text: 'No pudimos actualizar el legajo.', retry: () => void refetch() }
      : undefined;
  if (loading || failure) {
    return (
      <PageContainer size="sm">
        <PageHeader title={title} />
        {failure && !loading ? (
          <Card className="p-6">
            <ErrorState error={failure.error} resource={failure.resource} onRetry={failure.retry} />
          </Card>
        ) : (
          <LoadingState fullPage />
        )}
      </PageContainer>
    );
  }
  // `key`: al pasar de una edición a otra el formulario se arma de nuevo con el legajo que corresponde.
  return (
    <EmployeeFormBody key={employee?.employeeId ?? 'new'} warning={warning} employee={id ? employee : undefined} />
  );
};

const EmployeeFormBody = ({ employee, warning }: { employee?: Employee; warning?: LoadWarning }) => {
  const navigate = useNavigate();
  const positions = useJobPositions();
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const detailPath = employee ? `/employees/details/${employee.employeeId}` : '/employees';
  const returnPath = useReturnPath(detailPath);
  const methods = useForm<EmployeeFormValues>({
    resolver: zodResolver(employee ? employeeEditSchema : employeeSchema),
    defaultValues: employee ? employeeToValues(employee) : emptyEmployeeValues,
  });
  const guard = useUnsavedChangesGuard(methods.formState.isDirty);
  const saving = create.isPending || update.isPending;

  const current = employee?.position;
  const positionOptions = [
    { value: '', label: positions.isPending ? 'Cargando puestos…' : 'Elegí un puesto' },
    ...(positions.data ?? [])
      .filter((p) => p.isActive || p.positionId === current?.positionId)
      .map((p) => ({ value: p.positionId, label: p.name })),
  ];
  // En edición el puesto actual siempre tiene su opción, aunque la lista no lo traiga.
  if (current && !positionOptions.some((o) => o.value === current.positionId)) {
    positionOptions.push({ value: current.positionId, label: current.name });
  }

  const finish = (message: string, path: string) => {
    notify.success(message);
    guard.release();
    navigate(path, { replace: true });
  };

  const onSubmit = (values: EmployeeFormValues) => {
    const body = toEmployeeBody(values);
    if (employee) {
      update.mutate(
        { id: employee.employeeId, body },
        { onSuccess: () => finish('Legajo actualizado', returnPath), onError: notify.error },
      );
    } else {
      create.mutate(body, {
        onSuccess: (created) => finish('Legajo creado', `/employees/details/${created.employeeId}`),
        onError: notify.error,
      });
    }
  };

  return (
    <PageContainer size="sm">
      <PageHeader
        title={employee ? 'Editar legajo' : 'Nuevo legajo'}
        description={
          employee
            ? `${employeeFullName(employee)} · legajo ${employee.fileNumber}`
            : 'Datos de la persona y su puesto en la distribuidora.'
        }
      />
      {warning && <FormLoadWarning text={warning.text} onRetry={warning.retry} />}
      <Form methods={methods} onSubmit={onSubmit} id="employee-form" className="space-y-6">
        <FormSection title="Datos personales">
          <FormInput name="firstName" label="Nombre" required autoComplete="given-name" />
          <FormInput name="lastName" label="Apellido" required autoComplete="family-name" />
          <FormSelect
            name="documentType"
            label="Tipo de documento"
            required
            options={toOptions(DOCUMENT_TYPE_LABELS)}
          />
          <FormInput name="documentNumber" label="Número de documento" required />
          <FormInput name="cuil" label="CUIL" placeholder="20123456786" hint="Once dígitos, sin guiones" />
          <FormInput name="birthDate" label="Fecha de nacimiento" type="date" />
        </FormSection>
        <FormSection title="Datos laborales" subtitle="El puesto y la modalidad definen su lugar en la distribuidora.">
          <FormSelect name="positionId" label="Puesto" required options={positionOptions} />
          <FormSelect name="employmentType" label="Modalidad" required options={toOptions(EMPLOYMENT_TYPE_LABELS)} />
          <FormInput name="hireDate" label="Fecha de ingreso" required type="date" />
          <FormInput
            name="fileNumber"
            label="Número de legajo"
            required={Boolean(employee)}
            hint={employee ? undefined : 'Si lo dejás vacío toma el siguiente correlativo'}
          />
        </FormSection>
        <FormSection title="Contacto y domicilio">
          <FormInput name="phone" label="Teléfono" type="tel" placeholder="+5493764000000" />
          <FormInput name="personalEmail" label="Email personal" type="email" />
          <div className="sm:col-span-2">
            <FormInput name="addressLine" label="Domicilio" />
          </div>
          <FormInput name="city" label="Ciudad" />
          <FormInput name="province" label="Provincia" />
          <FormInput name="postalCode" label="Código postal" />
        </FormSection>
        <FormSection title="Contacto de emergencia" subtitle="A quién avisar si le pasa algo en el trabajo.">
          <FormInput name="emergencyContactName" label="Nombre" />
          <FormInput name="emergencyContactPhone" label="Teléfono" type="tel" />
          <FormInput name="emergencyContactRelationship" label="Vínculo" />
        </FormSection>
        <FormSection title="Notas" columns={1}>
          <FormTextArea name="notes" label="Notas" rows={3} />
        </FormSection>
        <FormActions
          onCancel={() => navigate(returnPath)}
          saving={saving}
          submitLabel={employee ? 'Guardar cambios' : 'Crear legajo'}
          submitDisabled={Boolean(employee) && !methods.formState.isDirty}
        />
      </Form>
    </PageContainer>
  );
};
