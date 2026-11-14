import { zodResolver } from '@hookform/resolvers/zod';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge, Button, Card, CardHeader, FormInput, Form } from '../../../common/components/ui';
import { errorMessage } from '../../../services/api/errors';
import type { ResultadoDeEnvio, User } from '../../../services/api/types';
import { useSendTestNotification, useUserNotificationTokens } from '../../../services/queries/notifications';
import { AccountPicker } from '../../Platform/components/AccountPicker';
import type { Label } from '../../../utils/statusLabels';
import { notificationTestSchema, type NotificationTestFormValues } from './notificationTestSchema';

const resultLabel = (result: ResultadoDeEnvio): Label =>
  result.success ? { text: 'Push enviado', tone: 'success' } : { text: 'No se pudo enviar', tone: 'danger' };

/**
 * POST /notifications/send-test: manda un push real por FCM. La API no
 * recibe un usuario, sólo un token de dispositivo: buscar una cuenta acá es
 * sólo para sacarle uno de sus tokens guardados (GET
 * /notifications/user/:userId) y ahorrar tener que copiarlo de otro lado; el
 * campo token siempre se puede escribir a mano.
 */
export const NotificationTestCard = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [result, setResult] = useState<ResultadoDeEnvio | null>(null);
  const tokens = useUserNotificationTokens(selectedUser?.user_id);
  const sendTest = useSendTestNotification();
  const methods = useForm<NotificationTestFormValues>({
    resolver: zodResolver(notificationTestSchema),
    defaultValues: { title: 'Prueba', body: 'Probando notificaciones push desde el panel' },
  });
  const { setValue, watch } = methods;

  const currentToken = watch('token');

  const onSubmit = (values: NotificationTestFormValues) => {
    setResult(null);
    sendTest.mutate(values, {
      onSuccess: setResult,
      onError: (error) => setResult({ success: false, error: errorMessage(error) }),
    });
  };

  return (
    <Card className="space-y-4 p-5">
      <CardHeader
        title="Probar las notificaciones push"
        subtitle="Manda un push real por Firebase Cloud Messaging a un token de dispositivo puntual."
        className=""
      />

      {/* Sólo cuentas de la plataforma y administradores: la plataforma no elige clientes ni choferes. */}
      <AccountPicker
        selected={selectedUser}
        onSelect={setSelectedUser}
        label="Buscar una cuenta de la plataforma o un administrador"
        placeholder="Opcional, para sacarle un token guardado…"
      />

      {selectedUser && (
        <div className="text-xs text-muted">
          {tokens.isLoading
            ? 'Buscando tokens guardados…'
            : tokens.data && tokens.data.tokens.length > 0
              ? 'Tokens guardados de este usuario (tocá uno para usarlo):'
              : 'Este usuario no tiene ningún token de push guardado.'}
        </div>
      )}
      {tokens.data && tokens.data.tokens.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tokens.data.tokens.map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => setValue('token', token, { shouldValidate: true })}
              className={`truncate rounded-full border px-2.5 py-1 font-mono text-[11px] ${
                currentToken === token
                  ? 'border-primary bg-primary-soft text-primary-strong'
                  : 'border-outline bg-surface text-muted hover:bg-surface-hover'
              }`}
              title={token}
            >
              {token.length > 24 ? `${token.slice(0, 24)}…` : token}
            </button>
          ))}
        </div>
      )}

      <Form methods={methods} onSubmit={onSubmit} className="space-y-3">
        <FormInput name="token" label="Token de FCM del dispositivo" placeholder="Pegalo acá o elegí uno de arriba" />
        <div className="grid gap-3 sm:grid-cols-2">
          <FormInput name="title" label="Título" required />
          <FormInput name="body" label="Cuerpo" required />
        </div>
        <Button type="submit" icon={<Send />} loading={sendTest.isPending}>
          Enviar push de prueba
        </Button>
      </Form>

      {result && (
        <div className="space-y-1 rounded-xl border border-outline bg-surface-hover p-3.5">
          <Badge label={resultLabel(result)} />
          {result.messageId && <p className="text-xs text-muted">Id del mensaje en FCM: {result.messageId}</p>}
          {result.error && <p className="text-xs text-muted">{result.error}</p>}
        </div>
      )}
    </Card>
  );
};
