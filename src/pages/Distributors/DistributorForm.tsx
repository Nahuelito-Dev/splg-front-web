import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useCrumbLeaf } from '../../common/components';
import {
  Card,
  EmptyState,
  ErrorState,
  Form,
  FormActions,
  FormInput,
  FormLoadWarning,
  FormSection,
  type LoadWarning,
  LoadingState,
  PageContainer,
  PageHeader,
} from '../../common/components/ui';
import { usePermissions, useReturnPath, useUnsavedChangesGuard } from '../../hooks';
import type { CreateDistributorBody, Distributor, UpdateDistributorBody } from '../../services/api/types';
import { useCreateDistributor, useDistributor, useUpdateDistributor } from '../../services/queries/distributors';
import { notify } from '../../utils/notifications';
import {
  distributorCreateSchema,
  distributorEditSchema,
  type DistributorCreateValues,
  type DistributorEditValues,
} from './distributorFormSchemas';

const LIST_PATH = '/distributors';

const emptyToUndefined = (value: string) => (value.trim() === '' ? undefined : value.trim());

/** Alta (`/distributors/new`) y edición (`/distributors/:id/edit`) de una empresa, sólo para el administrador general. */
export const DistributorForm = () => {
  const { id } = useParams<{ id: string }>();
  const { isSuperAdmin } = usePermissions();
  const { data: distributor, isPending, error, refetch } = useDistributor(id, isSuperAdmin);
  const title = id ? 'Editar empresa' : 'Nueva empresa';
  useCrumbLeaf(id && distributor ? 'Editar' : undefined);

  if (!isSuperAdmin) {
    return (
      <PageContainer size="sm">
        <EmptyState title="Sin acceso" description="Sólo el administrador general gestiona las distribuidoras." />
      </PageContainer>
    );
  }
  // Un error de recarga con datos en caché no desmonta el formulario: se avisa en línea y se puede reintentar.
  if (id && (isPending || !distributor)) {
    return (
      <PageContainer size="sm">
        <PageHeader title={title} />
        {isPending ? (
          <LoadingState fullPage />
        ) : (
          <Card className="p-6">
            <ErrorState error={error} resource="La empresa" onRetry={() => void refetch()} />
          </Card>
        )}
      </PageContainer>
    );
  }
  const warning = id && error ? { text: 'No pudimos actualizar la empresa.', retry: () => void refetch() } : undefined;
  return distributor && id ? (
    <EditDistributorForm key={distributor.distributor_id} distributor={distributor} warning={warning} />
  ) : (
    <CreateDistributorForm />
  );
};

const BusinessFields = () => (
  <>
    <FormInput name="legal_name" label="Razón social" />
    <FormInput name="tax_id" label="CUIT" placeholder="30-12345678-9" />
  </>
);

const ContactSection = () => (
  <FormSection title="Contacto">
    <FormInput name="email" label="Email" type="email" />
    <FormInput name="phone" label="Teléfono" type="tel" />
  </FormSection>
);

const CreateDistributorForm = () => {
  const navigate = useNavigate();
  const returnPath = useReturnPath(LIST_PATH);
  const createDistributor = useCreateDistributor();
  const methods = useForm<DistributorCreateValues>({
    resolver: zodResolver(distributorCreateSchema),
    defaultValues: { name: '', slug: '', legal_name: '', tax_id: '', email: '', phone: '' },
  });
  const guard = useUnsavedChangesGuard(methods.formState.isDirty);

  const onSubmit = (values: DistributorCreateValues) => {
    const body: CreateDistributorBody = {
      name: values.name,
      slug: values.slug,
      legal_name: emptyToUndefined(values.legal_name),
      tax_id: emptyToUndefined(values.tax_id),
      email: emptyToUndefined(values.email),
      phone: emptyToUndefined(values.phone),
    };
    createDistributor.mutate(body, {
      onSuccess: (created) => {
        notify.success('Empresa creada');
        guard.release();
        navigate(`${LIST_PATH}/${created.distributor_id}`, { replace: true });
      },
      onError: notify.error,
    });
  };

  return (
    <PageContainer size="sm">
      <PageHeader
        title="Nueva empresa"
        description="Cada empresa opera aislada: sus choferes, clientes, pedidos y catálogo."
      />
      <Form methods={methods} onSubmit={onSubmit} id="distributor-create" className="space-y-6">
        <FormSection title="Datos de la empresa">
          <FormInput name="name" label="Nombre" required placeholder="Jeny Gas" />
          <FormInput
            name="slug"
            label="Slug"
            required
            placeholder="jeny-gas"
            hint="Minúsculas, números y guiones. No se cambia después."
          />
          <BusinessFields />
        </FormSection>
        <ContactSection />
        <FormActions
          onCancel={() => navigate(returnPath)}
          saving={createDistributor.isPending}
          submitLabel="Crear empresa"
        />
      </Form>
    </PageContainer>
  );
};

const EditDistributorForm = ({ distributor, warning }: { distributor: Distributor; warning?: LoadWarning }) => {
  const navigate = useNavigate();
  const returnPath = useReturnPath(`${LIST_PATH}/${distributor.distributor_id}`);
  const updateDistributor = useUpdateDistributor();
  const methods = useForm<DistributorEditValues>({
    resolver: zodResolver(distributorEditSchema),
    defaultValues: {
      name: distributor.name,
      legal_name: distributor.legal_name ?? '',
      tax_id: distributor.tax_id ?? '',
      email: distributor.email ?? '',
      phone: distributor.phone ?? '',
    },
  });
  const guard = useUnsavedChangesGuard(methods.formState.isDirty);

  const onSubmit = (values: DistributorEditValues) => {
    const changes: UpdateDistributorBody = {
      name: values.name,
      legal_name: emptyToUndefined(values.legal_name),
      tax_id: emptyToUndefined(values.tax_id),
      email: emptyToUndefined(values.email),
      phone: emptyToUndefined(values.phone),
    };
    updateDistributor.mutate(
      { id: distributor.distributor_id, changes },
      {
        onSuccess: () => {
          notify.success('Empresa actualizada');
          guard.release();
          navigate(returnPath, { replace: true });
        },
        onError: notify.error,
      },
    );
  };

  return (
    <PageContainer size="sm">
      <PageHeader title="Editar empresa" description={distributor.slug} />
      {warning && <FormLoadWarning text={warning.text} onRetry={warning.retry} />}
      <Form methods={methods} onSubmit={onSubmit} id="distributor-edit" className="space-y-6">
        <FormSection title="Datos de la empresa">
          <FormInput name="name" label="Nombre" required />
          <BusinessFields />
        </FormSection>
        <ContactSection />
        <FormActions
          onCancel={() => navigate(returnPath)}
          saving={updateDistributor.isPending}
          submitLabel="Guardar cambios"
          submitDisabled={!methods.formState.isDirty}
        />
      </Form>
    </PageContainer>
  );
};
