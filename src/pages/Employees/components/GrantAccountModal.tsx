import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Modal, FormInput, Form } from '../../../common/components/ui';
import type { Employee } from '../../../services/api/types';
import { useGrantEmployeeAccount } from '../../../services/queries/employees';
import { notify } from '../../../utils/notifications';
import { grantAccountBody, grantAccountSchema, type GrantAccountFormValues } from '../employeeAccessSchemas';

interface Props {
  open: boolean;
  onClose: () => void;
  employee: Employee;
}

const EMPTY: GrantAccountFormValues = { email: '', password: '', phoneNumber: '' };

/** Cuenta de acceso desde el legajo (CU-182): sólo los choferes la tienen, con el rol y el perfil de reparto. */
export const GrantAccountModal = ({ open, onClose, employee }: Props) => {
  const grant = useGrantEmployeeAccount();
  const methods = useForm<GrantAccountFormValues>({ resolver: zodResolver(grantAccountSchema), defaultValues: EMPTY });
  const { reset } = methods;

  // Se vacía al abrir y al cerrar: la contraseña no queda en el formulario ni en la mutación.
  useEffect(() => {
    reset(EMPTY);
    grant.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reset]);

  const onSubmit = (values: GrantAccountFormValues) => {
    if (grant.isPending) return;
    grant.mutate(
      { id: employee.employeeId, body: grantAccountBody(values) },
      {
        onSuccess: () => {
          reset(EMPTY);
          grant.reset();
          notify.success('Cuenta de acceso creada');
          onClose();
        },
        onError: notify.error,
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear cuenta de acceso"
      description="El chofer entra a la app con este correo y esta contraseña. Después puede cambiarla."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="employee-grant-account" loading={grant.isPending}>
            Crear cuenta
          </Button>
        </>
      }
    >
      <Form methods={methods} id="employee-grant-account" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormInput name="email" label="Correo" required type="email" />
        </div>
        <FormInput
          name="password"
          label="Contraseña"
          required
          type="password"
          autoComplete="new-password"
          hint="Al menos 6 caracteres."
        />
        <FormInput
          name="phoneNumber"
          label="Teléfono (opcional)"
          placeholder="+5493764000000"
          hint="Formato internacional. Si lo dejás vacío se usa el del legajo."
        />
      </Form>
    </Modal>
  );
};
