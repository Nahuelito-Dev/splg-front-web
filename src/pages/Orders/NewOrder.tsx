import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button, Card, PageHeader, Select, TextArea } from '../../common/components/ui';
import type { Customer } from '../../services/api/types';
import { useUserAddresses } from '../../services/queries/userAddresses';
import { useCreateOrder } from '../../services/queries/orders';
import { notify } from '../../utils/notifications';
import { PAYMENT_METHOD } from '../../utils/statusLabels';
import { CustomerPicker } from './components/CustomerPicker';
import { NewOrderItems } from './components/NewOrderItems';
import { newOrderSchema, type NewOrderValues } from './components/newOrderSchema';

const PAYMENT_OPTIONS = Object.entries(PAYMENT_METHOD).map(([value, label]) => ({ value, label: label.text }));

/**
 * CU-072: alta telefónica. Cuando el cliente llama en vez de pedir desde la
 * app, el administrador carga el pedido a mano con los mismos datos que
 * exige `POST /orders` (sin turno ni reserva: eso sigue siendo `/reservations`).
 */
export const NewOrder = () => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const { data: addresses, isPending: loadingAddresses } = useUserAddresses(customer?.user_id);
  const createOrder = useCreateOrder();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<NewOrderValues>({
    resolver: zodResolver(newOrderSchema),
    defaultValues: { customerId: '', addressId: '', items: [], paymentMethod: 'cash', notes: '' },
  });

  const handleSelectCustomer = (picked: Customer) => {
    setCustomer(picked);
    setValue('customerId', picked.user_id);
    setValue('addressId', '');
  };

  const addressOptions = [
    { value: '', label: loadingAddresses ? 'Cargando direcciones…' : 'Elegí una dirección' },
    ...(addresses?.map((address) => ({
      value: address.address_id,
      label: `${address.street}, ${address.city}${address.isDefault ? ' (predeterminada)' : ''}`,
    })) ?? []),
  ];

  const onSubmit = handleSubmit((values) => {
    createOrder.mutate(
      {
        customerId: values.customerId,
        addressId: values.addressId,
        items: values.items,
        paymentMethod: values.paymentMethod,
        notes: values.notes,
      },
      {
        onSuccess: (order) => {
          notify.success('Pedido creado');
          navigate(`/orders/${order.order_id}`);
        },
        onError: notify.error,
      },
    );
  });

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <PageHeader
        title="Nuevo pedido telefónico"
        description="Alta manual para cuando el cliente llama en vez de pedir desde la app (CU-072)."
      />

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-5" noValidate>
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold text-ink">Cliente</h3>
          <CustomerPicker selected={customer} onSelect={handleSelectCustomer} />
          {errors.customerId?.message && (
            <p role="alert" className="text-xs text-danger">
              {errors.customerId.message}
            </p>
          )}
        </Card>

        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold text-ink">Entrega</h3>
          <Select
            label="Dirección"
            options={addressOptions}
            disabled={!customer}
            hint={!customer ? 'Elegí primero un cliente.' : undefined}
            error={errors.addressId?.message}
            {...register('addressId')}
          />
        </Card>

        <Card className="p-4">
          <NewOrderItems control={control} register={register} setValue={setValue} errors={errors} />
        </Card>

        <Card className="grid gap-4 p-4 sm:grid-cols-2">
          <Select
            label="Método de pago"
            options={PAYMENT_OPTIONS}
            error={errors.paymentMethod?.message}
            {...register('paymentMethod')}
          />
          <div className="sm:col-span-2">
            <TextArea label="Notas" maxLength={500} error={errors.notes?.message} {...register('notes')} />
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/orders')}>
            Cancelar
          </Button>
          <Button type="submit" loading={createOrder.isPending}>
            Crear pedido
          </Button>
        </div>
      </form>
    </div>
  );
};
