import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCrumbLeaf } from '../../common/components';
import {
  Card,
  EmptyState,
  ErrorState,
  Form,
  FormLoadWarning,
  type LoadWarning,
  FormActions,
  FormCheckbox,
  FormInput,
  FormSection,
  FormSelect,
  FormTextArea,
  LoadingState,
  PageContainer,
  PageHeader,
} from '../../common/components/ui';
import { usePermissions, useReturnPath, useUnsavedChangesGuard } from '../../hooks';
import type { VehicleAccident } from '../../services/api/types';
import {
  useCreateVehicleAccident,
  useUpdateVehicleAccident,
  useVehicleAccident,
} from '../../services/queries/fleetExpense';
import { notify } from '../../utils/notifications';
import { ACCIDENT_STATUS, labelOf } from '../../utils/statusLabels';
import { useCarOptions } from './components/useCarOptions';
import { fromLocalInput, toLocalInput } from './fleetExpenseDates';
import { accidentSchema, nextAccidentStatuses, type AccidentFormValues } from './fleetExpenseSchemas';

const LIST_PATH = '/fleet/accidents';

const EMPTY: AccidentFormValues = {
  carId: '',
  occurredAt: '',
  location: '',
  address: '',
  description: '',
  injuries: false,
  thirdPartiesInvolved: false,
  hazmatRelease: false,
  policeReportNumber: '',
  insurerClaimNumber: '',
  vehicleUnusable: false,
  status: 'reported',
};

const accidentToValues = (accident: VehicleAccident): AccidentFormValues => ({
  carId: accident.carId,
  occurredAt: toLocalInput(accident.occurredAt),
  location: accident.location ?? '',
  address: accident.address ?? '',
  description: accident.description,
  injuries: accident.injuries,
  thirdPartiesInvolved: accident.thirdPartiesInvolved,
  hazmatRelease: accident.hazmatRelease,
  policeReportNumber: accident.policeReportNumber ?? '',
  insurerClaimNumber: accident.insurerClaimNumber ?? '',
  vehicleUnusable: accident.vehicleUnusable,
  status: accident.status === 'closed' ? 'repairing' : accident.status,
});

/** Alta (`/fleet/accidents/new`, CU-201) y edición (`/fleet/accidents/:id/edit`, CU-327) de un siniestro. */
export const VehicleAccidentForm = () => {
  const { id } = useParams<{ id: string }>();
  const { canWrite, writeHint } = usePermissions();
  if (canWrite) return <VehicleAccidentFormLoader id={id} />;
  const title = id ? 'Editar siniestro' : 'Nuevo siniestro';
  return (
    <PageContainer size="sm">
      <PageHeader title={title} />
      <Card className="p-6">
        <EmptyState title="Elegí una distribuidora" description={writeHint} />
      </Card>
    </PageContainer>
  );
};

const VehicleAccidentFormLoader = ({ id }: { id?: string }) => {
  const { data: accident, isPending, error, refetch } = useVehicleAccident(id);
  // Los vehículos tienen que estar antes de dibujar el combo: un <select> no conserva un valor cuyas opciones llegan después.
  const cars = useCarOptions();
  const title = id ? 'Editar siniestro' : 'Nuevo siniestro';
  useCrumbLeaf(id && accident ? 'Editar' : undefined);

  const loading = cars.isPending || (Boolean(id) && isPending);
  const failure =
    cars.error && !cars.hasData
      ? { error: cars.error, resource: 'Los vehículos', retry: () => void cars.refetch() }
      : id && !accident
        ? { error, resource: 'El siniestro', retry: () => void refetch() }
        : null;
  // Un error de recarga con datos en caché no desmonta el formulario: se avisa en línea y se puede reintentar.
  const warning = cars.error
    ? { text: 'No pudimos actualizar los vehículos.', retry: () => void cars.refetch() }
    : id && error
      ? { text: 'No pudimos actualizar el siniestro.', retry: () => void refetch() }
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
          <LoadingState />
        )}
      </PageContainer>
    );
  }
  // `key`: al pasar de una edición a otra el formulario se arma de nuevo con el registro que corresponde.
  return (
    <VehicleAccidentFormBody
      key={accident?.accidentId ?? 'new'}
      warning={warning}
      accident={id ? accident : undefined}
    />
  );
};

/** El formulario. Con `?carId=` (se abre desde la ficha de un vehículo) el vehículo queda fijo. */
const VehicleAccidentFormBody = ({ accident, warning }: { accident?: VehicleAccident; warning?: LoadWarning }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fixedCarId = accident ? undefined : (searchParams.get('carId') ?? undefined);
  const returnPath = useReturnPath(LIST_PATH);
  const isEditing = Boolean(accident);
  const create = useCreateVehicleAccident();
  const update = useUpdateVehicleAccident();
  const { options: baseOptions } = useCarOptions('Elegí un vehículo');
  // En edición el vehículo actual siempre tiene su opción, aunque la lista no lo traiga.
  const currentCar = accident;
  const carOptions =
    currentCar && !baseOptions.some((o) => o.value === currentCar.carId)
      ? [...baseOptions, { value: currentCar.carId, label: currentCar.carPatent ?? 'Vehículo actual' }]
      : baseOptions;
  const methods = useForm<AccidentFormValues>({
    resolver: zodResolver(accidentSchema),
    defaultValues: accident
      ? accidentToValues(accident)
      : { ...EMPTY, carId: fixedCarId ?? '', occurredAt: toLocalInput(new Date()) },
  });
  const guard = useUnsavedChangesGuard(methods.formState.isDirty);
  const unusable = methods.watch('vehicleUnusable');
  const hazmat = methods.watch('hazmatRelease');
  const saving = create.isPending || update.isPending;
  const statusOptions = (accident ? nextAccidentStatuses(accident.status) : []).map((value) => ({
    value,
    label: labelOf(ACCIDENT_STATUS, value).text,
  }));

  const onSubmit = (values: AccidentFormValues) => {
    const body = {
      occurredAt: fromLocalInput(values.occurredAt) ?? new Date().toISOString(),
      location: values.location || null,
      address: values.address || null,
      description: values.description,
      injuries: values.injuries,
      thirdPartiesInvolved: values.thirdPartiesInvolved,
      hazmatRelease: values.hazmatRelease,
      policeReportNumber: values.policeReportNumber || null,
      insurerClaimNumber: values.insurerClaimNumber || null,
    };
    const options = {
      onSuccess: () => {
        notify.success(isEditing ? 'Siniestro actualizado' : 'Siniestro registrado');
        guard.release();
        navigate(returnPath, { replace: true });
      },
      onError: notify.error,
    };
    if (accident) {
      const status = values.status === accident.status || values.status === 'reported' ? undefined : values.status;
      update.mutate({ id: accident.accidentId, body: { ...body, status } }, options);
    } else create.mutate({ ...body, carId: values.carId, vehicleUnusable: values.vehicleUnusable }, options);
  };

  return (
    <PageContainer size="sm">
      <PageHeader
        title={isEditing ? 'Editar siniestro' : 'Nuevo siniestro'}
        description={isEditing ? (accident?.carPatent ?? undefined) : 'Nace denunciado.'}
      />
      {warning && <FormLoadWarning text={warning.text} onRetry={warning.retry} />}
      <Form methods={methods} onSubmit={onSubmit} id="accident-form" className="space-y-6">
        <FormSection title="Qué pasó">
          <div className="sm:col-span-2">
            <FormSelect
              name="carId"
              label="Vehículo"
              required
              options={carOptions}
              disabled={isEditing || Boolean(fixedCarId)}
            />
          </div>
          <FormInput name="occurredAt" label="Cuándo ocurrió" type="datetime-local" required />
          {isEditing && (
            <FormSelect
              name="status"
              label="Estado"
              options={statusOptions}
              hint="Avanza de a un paso; el cierre se hace aparte."
            />
          )}
          <div className="sm:col-span-2">
            <FormTextArea name="description" label="Qué pasó" required maxLength={2000} />
          </div>
        </FormSection>
        <FormSection title="Lugar">
          <FormInput
            name="location"
            label="Punto en el mapa"
            placeholder="-27.3671,-55.8961"
            hint="Latitud y longitud."
          />
          <FormInput name="address" label="Dirección" maxLength={300} />
        </FormSection>
        <FormSection title="Gravedad">
          <FormCheckbox name="injuries" label="Hubo heridos" />
          <FormCheckbox name="thirdPartiesInvolved" label="Hay terceros involucrados" />
          <FormCheckbox name="hazmatRelease" label="Fuga o derrame de gas" />
          {!isEditing && <FormCheckbox name="vehicleUnusable" label="El vehículo quedó inutilizable" />}
          {hazmat && (
            <p
              role="alert"
              className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm text-warn sm:col-span-2"
            >
              Se avisa de inmediato por correo a los administradores.
            </p>
          )}
          {!isEditing && unusable && (
            <p
              role="alert"
              className="rounded-lg border border-warn bg-warn-soft px-3 py-2 text-sm text-warn sm:col-span-2"
            >
              El vehículo pasa a fuera de servicio y se libera a su chofer. Si el chofer tiene un pedido en curso o una
              carga de camión abierta, hay que resolverlo antes. Se vuelve a la flota con «Reactivar».
            </p>
          )}
        </FormSection>
        <FormSection title="Trámites" subtitle="Los números de la denuncia y del reclamo, si ya existen.">
          <FormInput name="policeReportNumber" label="Denuncia policial" maxLength={40} />
          <FormInput name="insurerClaimNumber" label="Reclamo al seguro" maxLength={40} />
        </FormSection>
        <FormActions
          onCancel={() => navigate(returnPath)}
          saving={saving}
          submitLabel={isEditing ? 'Guardar cambios' : 'Registrar siniestro'}
        />
      </Form>
    </PageContainer>
  );
};
