import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, Input, Modal } from '../../../common/components/ui';
import { useSendPasswordReset } from '../../../services/queries/email';
import { notify } from '../../../utils/notifications';

const schema = z.object({
  email: z.string().trim().min(1, 'Ingresá tu email').email('Email inválido'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * CU-047: pide el correo de recuperación desde el login, sin sesión. La API
 * siempre contesta el mismo mensaje exista o no la cuenta (no revela
 * correos registrados), así que el panel muestra ese mismo mensaje genérico.
 */
export const ForgotPasswordModal = ({ open, onClose }: Props) => {
  const sendReset = useSendPasswordReset();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({ email: '' });
      setSent(false);
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(({ email }) =>
    sendReset.mutate(email, {
      onSuccess: () => setSent(true),
      onError: notify.error,
    }),
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Recuperar contraseña"
      description="Te mandamos un enlace para elegir una nueva, si el correo tiene una cuenta."
      footer={
        !sent && (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" form="forgot-password-form" loading={sendReset.isPending}>
              Enviar enlace
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <p className="text-sm text-ink" role="status">
          Si ese correo tiene una cuenta, te llega un enlace para recuperar la contraseña.
        </p>
      ) : (
        <form id="forgot-password-form" onSubmit={(e) => void onSubmit(e)} noValidate>
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="usuario@splg.com"
            error={errors.email?.message}
            {...register('email')}
          />
        </form>
      )}
    </Modal>
  );
};
