import { Button, Card, CardHeader } from '../../../common/components/ui';
import { useSendPasswordReset } from '../../../services/queries/email';
import { notify } from '../../../utils/notifications';

/** POST /email/password-reset al propio correo: llega el enlace para elegir una contraseña nueva. */
export const PasswordResetCard = ({ email }: { email: string }) => {
  const sendReset = useSendPasswordReset();
  return (
    <Card className="p-6">
      <CardHeader title="Contraseña" className="" />
      <p className="mt-1 text-[13px] text-muted">
        Te mandamos a <span className="font-medium text-ink">{email}</span> un enlace para elegir una nueva.
      </p>
      <div className="mt-4 flex justify-end">
        <Button
          variant="secondary"
          loading={sendReset.isPending}
          onClick={() =>
            sendReset.mutate(email, {
              onSuccess: () => notify.success('Revisá tu correo: te enviamos el enlace'),
              onError: notify.error,
            })
          }
        >
          Restablecer contraseña
        </Button>
      </div>
    </Card>
  );
};
