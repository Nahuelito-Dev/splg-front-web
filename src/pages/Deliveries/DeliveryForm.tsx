import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useCrumbLeaf } from '../../common/components';
import {
  Card,
  EmptyState,
  ErrorState,
  Form,
  FormActions,
  FormCheckbox,
  FormInput,
  FormLoadWarning,
  FormSection,
  FormSelect,
  type LoadWarning,
  LoadingState,
  PageContainer,
  PageHeader,
} from '../../common/components/ui';
import { checkAccountFree } from '../../common/forms/checkAccountFree';
import { usePermissions, useReturnPath, useUnsavedChangesGuard } from '../../hooks';
import type { Delivery } from '../../services/api/types';
import {
  useCreateDelivery,
  useDelivery,
  useDistributorOptions,
  useInvalidateDelivery,
  useSetDeliveryEnabled,
  useUpdateDeliveryAccount,
  useValidateDelivery,
} from '../../services/queries/deliveries';
import { notify } from '../../utils/notifications';
import {
  deliveryCreateSchema,
  deliveryEditSchema,
  type DeliveryCreateValues,
  type DeliveryEditValues,
} from './deliveryFormSchemas';

const LIST_PATH = '/deliveries';

/** Alta (`/deliveries/new`) y edición (`/deliveries/:id/edit`) de un chofer. */
export const DeliveryForm = () => {
  const { id } = useParams<{ id: string }>();
  // Editar a un chofer pide la distribuidora (X-Distributor); el alta no: el administrador general la elige en el formulario.
  const { canOperate, operateHint } = usePermissions();
  const { data: delivery, isPending, error, refetch } = useDelivery(id);
  const title = id ? 'Editar chofer' : 'Nuevo chofer';
  useCrumbLeaf(id && delivery ? 'Editar' : undefined);

  if (id && !canOperate) {
    return (
      <PageContainer size="sm">
        <PageHeader title={title} />
        <Card className="p-6">
          <EmptyState title="Elegí una distribuidora" description={operateHint} />
        </Card>
      </PageContainer>
    );
  }
  // Un error de recarga con datos en caché no desmonta el formulario: se avisa en línea y se puede reintentar.
  if (id && (isPending || !delivery)) {
    return (
      <PageContainer size="sm">
        <PageHeader title={title} />
        {isPending ? (
          <LoadingState />
        ) : (
          <Card className="p-6">
            <ErrorState error={error} resource="El chofer" onRetry={() => void refetch()} />
          </Card>
        )}
      </PageContainer>
    );
  }
  const warning = id && error ? { text: 'No pudimos actualizar el chofer.', retry: () => void refetch() } : undefined;
  return delivery && id ? (
    <EditDeliveryForm key={delivery.delivery_id} delivery={delivery} warning={warning} />
  ) : (
    <CreateDeliveryForm />
  );
};

const CreateDeliveryForm = () => {
  const navigate = useNavigate();
  const returnPath = useReturnPath(LIST_PATH);
  const { isSuperAdmin } = usePermissions();
  const createDelivery = useCreateDelivery();
  const { data: distributors } = useDistributorOptions(isSuperAdmin);
  const methods = useForm<DeliveryCreateValues>({
    resolver: zodResolver(deliveryCreateSchema),
    defaultValues: { full_name: '', phone_number: '', email: '', password: '', confirmPassword: '', distributorId: '' },
  });
  const guard = useUnsavedChangesGuard(methods.formState.isDirty);

  // Si se sale de la página mientras corre check-exists, no se da de alta nada.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const onSubmit = async ({ confirmPassword: _, distributorId, ...account }: DeliveryCreateValues) => {
    if (!(await checkAccountFree(account, methods.setError)) || !mounted.current) return;
    createDelivery.mutate(
      { ...account, distributorId: distributorId || undefined, validated: false, isActive: true },
      {
        onSuccess: () => {
          notify.success('Chofer creado');
          guard.release();
          navigate(returnPath, { replace: true });
        },
        onError: notify.error,
      },
    );
  };

  return (
    <PageContainer size="sm">
      <PageHeader
        title="Nuevo chofer"
        description="Se crea la cuenta con la que el chofer entra a la app. Queda pendiente de validar."
      />
      <Form methods={methods} onSubmit={onSubmit} id="delivery-create" className="space-y-6">
        <FormSection title="Datos del chofer">
          <FormInput name="full_name" label="Nombre completo" required autoComplete="name" />
          <FormInput name="phone_number" label="Teléfono" required type="tel" placeholder="+5493764000000" />
          <div className="sm:col-span-2">
            <FormInput name="email" label="Email" required type="email" autoComplete="email" />
          </div>
        </FormSection>
        <FormSection title="Contraseña" subtitle="Con esta cuenta el chofer entra a la app.">
          <FormInput name="password" label="Contraseña" required type="password" autoComplete="new-password" />
          <FormInput
            name="confirmPassword"
            label="Repetir contraseña"
            required
            type="password"
            autoComplete="new-password"
          />
        </FormSection>
        {isSuperAdmin && (
          <FormSection title="Empresa" columns={1}>
            <FormSelect
              name="distributorId"
              label="Empresa (distribuidora)"
              hint="Sin elegir, la API usa la que estés viendo (“Ver como”)."
              options={[
                { value: '', label: '— Usar la empresa activa —' },
                ...(distributors ?? []).map((d) => ({ value: d.distributor_id, label: d.name })),
              ]}
            />
          </FormSection>
        )}
        <FormActions
          onCancel={() => navigate(returnPath)}
          saving={methods.formState.isSubmitting || createDelivery.isPending}
          submitLabel="Crear chofer"
        />
      </Form>
    </PageContainer>
  );
};

const EditDeliveryForm = ({ delivery, warning }: { delivery: Delivery; warning?: LoadWarning }) => {
  const navigate = useNavigate();
  const returnPath = useReturnPath(`/deliveries/details/${delivery.delivery_id}`);
  const updateAccount = useUpdateDeliveryAccount();
  const validateDelivery = useValidateDelivery();
  const invalidateDelivery = useInvalidateDelivery();
  const setEnabled = useSetDeliveryEnabled();
  const saving =
    updateAccount.isPending || validateDelivery.isPending || invalidateDelivery.isPending || setEnabled.isPending;
  const methods = useForm<DeliveryEditValues>({
    resolver: zodResolver(deliveryEditSchema),
    defaultValues: {
      full_name: delivery.user?.full_name ?? '',
      phone_number: delivery.user?.phone_number ?? '',
      password: '',
      confirmPassword: '',
      validated: delivery.validated,
      isActive: delivery.isEnabled,
    },
  });
  const { isDirty, dirtyFields } = methods.formState;
  const guard = useUnsavedChangesGuard(isDirty);

  const onSubmit = async ({ full_name, phone_number, password, validated, isActive }: DeliveryEditValues) => {
    const tasks: Promise<unknown>[] = [];
    if (dirtyFields.full_name || dirtyFields.phone_number || dirtyFields.password) {
      tasks.push(
        updateAccount.mutateAsync({
          userId: delivery.user_id,
          changes: { full_name, phone_number, ...(password && { password }) },
        }),
      );
    }
    if (dirtyFields.validated) {
      const mutate = validated ? validateDelivery : invalidateDelivery;
      tasks.push(mutate.mutateAsync(delivery.delivery_id));
    }
    // La habilitación va por su propio endpoint: al deshabilitar, la API también lo desconecta.
    if (dirtyFields.isActive) {
      tasks.push(setEnabled.mutateAsync({ id: delivery.delivery_id, isEnabled: isActive }));
    }
    try {
      await Promise.all(tasks);
      notify.success('Chofer actualizado');
      guard.release();
      navigate(returnPath, { replace: true });
    } catch (error) {
      notify.error(error);
    }
  };

  return (
    <PageContainer size="sm">
      <PageHeader title="Editar chofer" description={delivery.user?.email ?? undefined} />
      {warning && <FormLoadWarning text={warning.text} onRetry={warning.retry} />}
      <Form methods={methods} onSubmit={onSubmit} id="delivery-edit" className="space-y-6">
        <FormSection title="Datos de la cuenta">
          <FormInput name="full_name" label="Nombre completo" required autoComplete="name" />
          <FormInput name="phone_number" label="Teléfono" required type="tel" />
        </FormSection>
        <FormSection title="Estado operativo">
          <FormCheckbox name="validated" label="Validado por la distribuidora" />
          <FormCheckbox name="isActive" label="Habilitado por la distribuidora" />
        </FormSection>
        <FormSection title="Contraseña nueva (opcional)" subtitle="Dejala vacía para no cambiarla.">
          <FormInput name="password" label="Contraseña nueva" type="password" autoComplete="new-password" />
          <FormInput name="confirmPassword" label="Repetir contraseña" type="password" autoComplete="new-password" />
        </FormSection>
        <FormActions
          onCancel={() => navigate(returnPath)}
          saving={saving}
          submitLabel="Guardar cambios"
          submitDisabled={!isDirty}
        />
      </Form>
    </PageContainer>
  );
};
