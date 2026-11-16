import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, CardHeader, FormInput, Form } from '../../../common/components/ui';
import { getCurrentIdToken, reauthenticateWithPassword } from '../../../firebase/providers';
import { toApiError } from '../../../services/api/errors';
import { useChangeEmail } from '../../../services/queries/email';
import { notify } from '../../../utils/notifications';
import { changeEmailSchema, type ChangeEmailValues } from './accountSchemas';

interface Props {
  currentEmail: string;
  /** El correo cambió: la sesión de Firebase quedó con el viejo, así que hay que volver a entrar. */
  onChanged: () => void;
}

/**
 * POST /email/change-email con el idToken de la sesión actual (la API lo valida contra
 * `currentEmail`: sólo sirve para la propia cuenta). Si el token no alcanza, se pide la
 * contraseña actual, se revalida con Firebase y se reintenta.
 */
export const ChangeEmailForm = ({ currentEmail, onChanged }: Props) => {
  const changeEmail = useChangeEmail();
  const [needsPassword, setNeedsPassword] = useState(false);
  const schema = useMemo(() => changeEmailSchema(currentEmail), [currentEmail]);
  const methods = useForm<ChangeEmailValues>({ resolver: zodResolver(schema) });
  const { setError } = methods;

  const send = async (newEmail: string, force: boolean) => {
    const idToken = await getCurrentIdToken(force);
    if (!idToken) {
      notify.error('No hay una sesión activa. Volvé a iniciar sesión.');
      return;
    }
    changeEmail.mutate(
      { currentEmail, newEmail, idToken },
      {
        onSuccess: () => {
          notify.success('Correo actualizado. Entrá de nuevo con el correo nuevo.');
          onChanged();
        },
        onError: (error) => {
          const { status } = toApiError(error);
          if ((status === 400 || status === 401) && !force) {
            setNeedsPassword(true);
            setError('password', { message: 'Confirmá tu contraseña actual para autorizar el cambio' });
            return;
          }
          notify.error(error);
        },
      },
    );
  };

  const onSubmit = async ({ newEmail, password }: ChangeEmailValues) => {
    if (needsPassword) {
      if (!password) {
        setError('password', { message: 'Ingresá tu contraseña actual' });
        return;
      }
      const failure = await reauthenticateWithPassword(password);
      if (failure) {
        setError('password', { message: failure });
        return;
      }
    }
    await send(newEmail, needsPassword);
  };

  return (
    <Card className="p-6">
      <CardHeader title="Correo de acceso" className="" />
      <p className="mt-1 text-[13px] text-muted">
        Hoy entrás con <span className="font-medium text-ink">{currentEmail}</span>. Al cambiarlo se cierra la sesión.
      </p>
      <Form methods={methods} onSubmit={onSubmit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <FormInput name="newEmail" label="Correo nuevo" required type="email" autoComplete="email" />
        {needsPassword && (
          <FormInput
            name="password"
            label="Contraseña actual"
            required
            type="password"
            autoComplete="current-password"
          />
        )}
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" loading={changeEmail.isPending}>
            Cambiar correo
          </Button>
        </div>
      </Form>
    </Card>
  );
};
