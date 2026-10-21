import { zodResolver } from '@hookform/resolvers/zod';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Badge,
  Button,
  Card,
  IdentityCell,
  SearchInput,
  CardHeader,
  FormInput,
  Form,
} from '../../../common/components/ui';
import { useDebounce } from '../../../hooks';
import { errorMessage } from '../../../services/api/errors';
import type { ResultadoDeEnvio, User } from '../../../services/api/types';
import { useSendTestNotification, useUserNotificationTokens } from '../../../services/queries/notifications';
import { useUsers } from '../../../services/queries/users';
import type { Label } from '../../../utils/statusLabels';
import { notificationTestSchema, type NotificationTestFormValues } from './notificationTestSchema';

const resultLabel = (result: ResultadoDeEnvio): Label =>
  result.success ? { text: 'Push enviado', tone: 'success' } : { text: 'No se pudo enviar', tone: 'danger' };

/** Buscador de usuario para sacarle sus tokens de FCM guardados, si tiene. */
const UserPicker = ({ selected, onSelect }: { selected: User | null; onSelect: (user: User | null) => void }) => {
  const [term, setTerm] = useState('');
  const debouncedTerm = useDebounce(term);
  const canSearch = debouncedTerm.trim().length >= 2;
  const { data } = useUsers({ page: 0, pageSize: 5 }, debouncedTerm, { enabled: canSearch });
  const results = canSearch ? (data?.rows ?? []) : [];

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-outline bg-surface-hover p-3">
        <IdentityCell
          title={selected.full_name ?? 'Sin nombre'}
          subtitle={selected.email ?? selected.phone_number ?? selected.user_id}
          avatarName={selected.full_name ?? '?'}
        />
        <Button variant="secondary" size="sm" onClick={() => onSelect(null)}>
          Cambiar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <SearchInput
        label="Buscar usuario por nombre, correo o teléfono"
        placeholder="Buscar usuario (opcional, para sacarle un token guardado)…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      {results.length > 0 && (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-outline p-1.5">
          {results.map((user) => (
            <button
              key={user.user_id}
              type="button"
              onClick={() => onSelect(user)}
              className="flex w-full items-center rounded-lg px-2 py-1.5 text-left hover:bg-surface-hover"
            >
              <IdentityCell
                title={user.full_name ?? 'Sin nombre'}
                subtitle={user.email ?? user.phone_number ?? user.user_id}
                avatarName={user.full_name ?? '?'}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * POST /notifications/send-test: manda un push real por FCM. La API no
 * recibe un usuario, sólo un token de dispositivo: buscar un usuario acá es
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

      <UserPicker selected={selectedUser} onSelect={setSelectedUser} />

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
