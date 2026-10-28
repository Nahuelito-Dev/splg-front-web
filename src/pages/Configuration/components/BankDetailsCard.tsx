import { zodResolver } from '@hookform/resolvers/zod';
import { Landmark } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, CardHeader, ErrorState, Form, FormInput, Skeleton } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import { errorMessage } from '../../../services/api/errors';
import type { BankDetails } from '../../../services/api/types';
import { useBankDetails, useUpdateBankDetails } from '../../../services/queries/bankDetails';
import { notify } from '../../../utils/notifications';
import {
  bankDetailsSchema,
  bankDetailsValues,
  toBankDetailsBody,
  type BankDetailsFormValues,
} from '../bankDetailsRules';

interface FormProps {
  details: BankDetails;
  canWrite: boolean;
  writeHint?: string;
}

const BankDetailsForm = ({ details, canWrite, writeHint }: FormProps) => {
  const update = useUpdateBankDetails();
  const [serverError, setServerError] = useState<string | null>(null);
  const methods = useForm<BankDetailsFormValues>({
    resolver: zodResolver(bankDetailsSchema),
    mode: 'onChange',
    defaultValues: bankDetailsValues(details),
  });
  const {
    reset,
    formState: { isDirty, isValid },
  } = methods;

  const submit = (values: BankDetailsFormValues) => {
    setServerError(null);
    update.mutate(toBankDetailsBody(values), {
      onSuccess: (saved) => {
        reset(bankDetailsValues(saved));
        notify.success('Datos bancarios guardados');
      },
      onError: (error) => setServerError(errorMessage(error)),
    });
  };

  return (
    <Form methods={methods} onSubmit={submit} className="mt-3 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          name="cbu"
          label="CBU"
          inputMode="numeric"
          maxLength={22}
          autoComplete="off"
          disabled={!canWrite}
          hint="22 dígitos"
        />
        <FormInput name="alias" label="Alias" autoComplete="off" disabled={!canWrite} hint="6 a 20 caracteres" />
        <div className="sm:col-span-2">
          <FormInput name="holder" label="Titular de la cuenta" autoComplete="off" disabled={!canWrite} />
        </div>
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-danger">
          {serverError}
        </p>
      )}
      <Button type="submit" loading={update.isPending} disabled={!canWrite || !isValid || !isDirty} title={writeHint}>
        Guardar datos bancarios
      </Button>
    </Form>
  );
};

/** Datos que ve el cliente cuando paga por transferencia (`GET/PUT /v2/distributor/bank-details`). */
export const BankDetailsCard = () => {
  const { needsDistributor, canWrite, writeHint } = usePermissions();
  const { data, isPending, error, refetch } = useBankDetails({ enabled: !needsDistributor });

  return (
    <Card className="p-6">
      <CardHeader
        title="Datos bancarios"
        icon={<Landmark />}
        subtitle="Es la cuenta a la que el cliente transfiere cuando elige pagar por transferencia. Lo que dejes vacío no se muestra."
        className=""
      />
      {needsDistributor ? (
        <p className="mt-2 text-sm text-muted">
          Elegí una distribuidora con «Ver como» para ver y cambiar estos datos.
        </p>
      ) : error ? (
        <ErrorState error={error} resource="Los datos bancarios" onRetry={() => void refetch()} />
      ) : isPending ? (
        <Skeleton className="mt-3 h-32 w-full" />
      ) : (
        <BankDetailsForm details={data} canWrite={canWrite} writeHint={writeHint} />
      )}
    </Card>
  );
};
