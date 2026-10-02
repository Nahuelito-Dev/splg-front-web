import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Modal } from '../../../common/components/ui';
import type { CreateDistributorBody, Distributor, UpdateDistributorBody } from '../../../services/api/types';
import { activeDistributor } from '../../../services/api/activeDistributor';
import { useCreateDistributor, useUpdateDistributor } from '../../../services/queries/distributors';
import { notify } from '../../../utils/notifications';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const emptyToUndefined = (value: string) => (value.trim() === '' ? undefined : value.trim());

const optionalText = z.string().trim().optional();
const optionalEmail = z.union([z.literal(''), z.string().trim().email('Email inválido')]);

const businessFields = {
  name: z.string().trim().min(2, 'Ingresá el nombre'),
  legal_name: optionalText,
  tax_id: optionalText,
  email: optionalEmail,
  phone: optionalText,
};

const createSchema = z.object({
  ...businessFields,
  slug: z.string().trim().regex(SLUG_RE, 'Minúsculas, números y guiones (ej: jeny-gas)'),
});
const editSchema = z.object(businessFields);

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con empresa es edición de sus datos; sin empresa, alta. */
  distributor: Distributor | null;
}

export const DistributorFormModal = ({ open, onClose, distributor }: Props) =>
  distributor ? (
    <EditDistributorForm open={open} onClose={onClose} distributor={distributor} />
  ) : (
    <CreateDistributorForm open={open} onClose={onClose} />
  );

const CreateDistributorForm = ({ open, onClose }: Omit<Props, 'distributor'>) => {
  const createDistributor = useCreateDistributor();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateValues>({ resolver: zodResolver(createSchema) });

  useEffect(() => {
    if (open) reset({ name: '', slug: '', legal_name: '', tax_id: '', email: '', phone: '' });
  }, [open, reset]);

  const onSubmit = handleSubmit((values) => {
    const body: CreateDistributorBody = {
      name: values.name,
      slug: values.slug,
      legal_name: emptyToUndefined(values.legal_name ?? ''),
      tax_id: emptyToUndefined(values.tax_id ?? ''),
      email: emptyToUndefined(values.email),
      phone: emptyToUndefined(values.phone ?? ''),
    };
    createDistributor.mutate(body, {
      onSuccess: () => {
        notify.success('Empresa creada');
        onClose();
      },
      onError: notify.error,
    });
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva empresa"
      description="Cada empresa opera aislada: sus choferes, clientes, pedidos y catálogo."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="distributor-create" loading={createDistributor.isPending}>
            Crear empresa
          </Button>
        </>
      }
    >
      <form id="distributor-create" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Nombre" required placeholder="Jeny Gas" error={errors.name?.message} {...register('name')} />
        <Input
          label="Slug"
          required
          placeholder="jeny-gas"
          hint="Minúsculas, números y guiones"
          error={errors.slug?.message}
          {...register('slug')}
        />
        <Input label="Razón social" error={errors.legal_name?.message} {...register('legal_name')} />
        <Input label="CUIT" placeholder="30-12345678-9" error={errors.tax_id?.message} {...register('tax_id')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Teléfono" type="tel" error={errors.phone?.message} {...register('phone')} />
      </form>
    </Modal>
  );
};

const EditDistributorForm = ({
  open,
  onClose,
  distributor,
}: Omit<Props, 'distributor'> & { distributor: Distributor }) => {
  const updateDistributor = useUpdateDistributor();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<EditValues>({ resolver: zodResolver(editSchema) });

  useEffect(() => {
    if (open) {
      reset({
        name: distributor.name,
        legal_name: distributor.legal_name ?? '',
        tax_id: distributor.tax_id ?? '',
        email: distributor.email ?? '',
        phone: distributor.phone ?? '',
      });
    }
  }, [open, distributor, reset]);

  const onSubmit = handleSubmit((values) => {
    const changes: UpdateDistributorBody = {
      name: values.name,
      legal_name: emptyToUndefined(values.legal_name ?? ''),
      tax_id: emptyToUndefined(values.tax_id ?? ''),
      email: emptyToUndefined(values.email),
      phone: emptyToUndefined(values.phone ?? ''),
    };
    updateDistributor.mutate(
      { id: distributor.distributor_id, changes },
      {
        onSuccess: (updated) => {
          // Si es la empresa que se está viendo "como", el header X-Distributor tiene que seguir su slug.
          if (activeDistributor.get() === distributor.slug && updated.slug !== distributor.slug) {
            activeDistributor.set(updated.slug);
          }
          notify.success('Empresa actualizada');
          onClose();
        },
        onError: notify.error,
      },
    );
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar empresa"
      description={distributor.slug}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="distributor-edit" loading={updateDistributor.isPending} disabled={!isDirty}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id="distributor-edit" onSubmit={(e) => void onSubmit(e)} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Nombre" required error={errors.name?.message} {...register('name')} />
        <Input label="Razón social" error={errors.legal_name?.message} {...register('legal_name')} />
        <Input label="CUIT" error={errors.tax_id?.message} {...register('tax_id')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Teléfono" type="tel" error={errors.phone?.message} {...register('phone')} />
      </form>
    </Modal>
  );
};
