import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Modal, FormInput, FormSelect, Form } from '../../../common/components/ui';
import { useDebounce } from '../../../hooks';
import type { CustomerAccountDetail } from '../../../services/api/types';
import { useCreateCustomerAccount, useUpdateCustomerAccount } from '../../../services/queries/finance';
import { useCustomers } from '../../../services/queries/customers';
import { isValidCuit, normalizeCuit } from '../../../utils/cuit';
import { notify } from '../../../utils/notifications';
import { accountStatusError, accountStatusOptions } from '../customerAccountStatus';
import { nonNegativeMoney, parseMoney, requiredText } from '../financeSchemas';

const schema = z.object({
  customerUserId: z.string(),
  businessName: requiredText('Ingresá la razón social', 120),
  taxId: z
    .string()
    .trim()
    .refine((v) => v === '' || isValidCuit(normalizeCuit(v)), 'No es un CUIT válido (11 dígitos y dígito verificador)'),
  taxCondition: z.enum(['registered', 'monotax', 'exempt', 'final_consumer'], { message: 'Elegí la condición' }),
  creditLimit: nonNegativeMoney('Ingresá el límite de crédito'),
  paymentTermsDays: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 365, 'Un plazo de 1 a 365 días'),
  status: z.enum(['active', 'blocked', 'closed']),
});
type Values = z.infer<typeof schema>;

const TAX_OPTIONS = [
  { value: 'registered', label: 'Responsable inscripto' },
  { value: 'monotax', label: 'Monotributo' },
  { value: 'exempt', label: 'Exento' },
  { value: 'final_consumer', label: 'Consumidor final' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Con cuenta es edición; sin ella, alta. */
  account: CustomerAccountDetail | null;
  /** Cliente con el que arranca el alta (cuando se habilita desde su ficha). */
  customer?: { userId: string; name: string };
}

/** Habilitar o modificar la cuenta corriente de un cliente (CU-235, CU-331). */
export const CustomerAccountFormModal = ({ open, onClose, account, customer }: Props) => {
  const create = useCreateCustomerAccount();
  const update = useUpdateCustomerAccount();
  const [term, setTerm] = useState('');
  const search = useDebounce(term, 300);
  const customers = useCustomers({ page: 0, pageSize: 20 }, search);
  const methods = useForm<Values>({ resolver: zodResolver(schema) });
  const { reset, setError } = methods;

  useEffect(() => {
    if (!open) return;
    setTerm('');
    reset({
      customerUserId: account?.customerUserId ?? customer?.userId ?? '',
      businessName: account?.businessName ?? customer?.name ?? '',
      taxId: account?.taxId ?? '',
      taxCondition: account?.taxCondition ?? 'registered',
      creditLimit: account ? String(account.creditLimit) : '0',
      paymentTermsDays: account ? String(account.paymentTermsDays) : '30',
      status: account?.status ?? 'active',
    });
  }, [open, account, customer, reset]);

  const onSubmit = (values: Values) => {
    const common = {
      businessName: values.businessName,
      taxId: values.taxId ? normalizeCuit(values.taxId) : undefined,
      taxCondition: values.taxCondition,
      creditLimit: parseMoney(values.creditLimit),
      paymentTermsDays: Number(values.paymentTermsDays),
    };
    const options = {
      onSuccess: () => {
        notify.success(account ? 'Cuenta actualizada' : 'Cuenta corriente habilitada');
        onClose();
      },
      onError: notify.error,
    };
    if (account) {
      const statusError = accountStatusError(account.status, values.status);
      if (statusError) {
        setError('status', { message: statusError });
        return;
      }
      update.mutate({ id: account.accountId, body: { ...common, status: values.status } }, options);
      return;
    }
    if (!values.customerUserId) {
      setError('customerUserId', { message: 'Elegí el cliente' });
      return;
    }
    create.mutate({ ...common, customerUserId: values.customerUserId }, options);
  };

  const customerOptions = [
    { value: '', label: customers.isFetching ? 'Buscando…' : 'Elegí un cliente' },
    ...(customers.data?.rows ?? []).map((c) => ({
      value: c.user_id,
      label: [c.user?.full_name, c.user?.email].filter(Boolean).join(' · ') || c.user_id.slice(-6),
    })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      closeBlocked={create.isPending || update.isPending}
      size="md"
      title={account ? 'Modificar la cuenta corriente' : 'Habilitar cuenta corriente'}
      description="Los términos valen sólo para esta distribuidora: el mismo cliente puede tener otros en otra."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="customer-account-form" loading={create.isPending || update.isPending}>
            {account ? 'Guardar cambios' : 'Habilitar cuenta'}
          </Button>
        </>
      }
    >
      <Form methods={methods} id="customer-account-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        {!account && !customer && (
          <>
            <Input
              label="Buscar cliente"
              placeholder="Nombre, correo o teléfono"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <FormSelect name="customerUserId" label="Cliente" required options={customerOptions} />
          </>
        )}
        <div className="sm:col-span-2">
          <FormInput name="businessName" label="Razón social" required maxLength={120} />
        </div>
        <FormInput name="taxId" label="CUIT" placeholder="30-71512345-9" hint="Se valida el dígito verificador." />
        <FormSelect name="taxCondition" label="Condición fiscal" options={TAX_OPTIONS} />
        <FormInput name="creditLimit" label="Límite de crédito" required inputMode="decimal" />
        <FormInput name="paymentTermsDays" label="Plazo de pago (días)" required type="number" min={1} max={365} />
        {account && (
          <div className="sm:col-span-2">
            <FormSelect name="status" label="Estado" options={accountStatusOptions(account.status)} />
          </div>
        )}
      </Form>
    </Modal>
  );
};
