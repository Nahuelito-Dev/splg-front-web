import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Badge, Button, Card, Input } from '../../../common/components/ui';
import { useTestEmailService } from '../../../services/queries/email';
import type { PruebaDeEmail } from '../../../services/api/types';
import { errorMessage } from '../../../services/api/errors';
import type { Label } from '../../../utils/statusLabels';
import { emailTestSchema, type EmailTestFormValues } from './emailTestSchema';

const resultLabel = (result: PruebaDeEmail): Label =>
  result.success ? { text: 'Envío correcto', tone: 'success' } : { text: 'Falló el envío', tone: 'danger' };

/**
 * POST /email/test: manda un correo real con Resend y ejercita el cache de
 * links de reseteo en Redis. El correo tiene que ser el de una cuenta que
 * exista en Firebase Auth (`generatePasswordResetLink` la busca ahí, no en
 * nuestra base) — si no existe, la API contesta `success: false` en vez de
 * un error HTTP.
 */
export const EmailTestCard = () => {
  const [result, setResult] = useState<PruebaDeEmail | null>(null);
  const testEmail = useTestEmailService();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailTestFormValues>({ resolver: zodResolver(emailTestSchema) });

  const onSubmit = handleSubmit(({ email }) => {
    setResult(null);
    testEmail.mutate(
      { email },
      {
        onSuccess: setResult,
        onError: (error) => setResult({ success: false, message: errorMessage(error) }),
      },
    );
  });

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h3 className="text-sm font-semibold text-ink">Probar el correo</h3>
        <p className="text-xs text-muted">
          Manda un correo de prueba real a la dirección que pongas. Tiene que ser una cuenta que ya exista en Firebase
          Auth: si no existe, la prueba contesta que falló sin romper nada.
        </p>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3 sm:flex-row sm:items-end" noValidate>
        <div className="flex-1">
          <Input
            label="Correo de destino"
            type="email"
            placeholder="admin@splg.com"
            required
            error={errors.email?.message}
            {...register('email')}
          />
        </div>
        <Button type="submit" icon={<Mail />} loading={testEmail.isPending}>
          Enviar prueba
        </Button>
      </form>

      {result && (
        <div className="space-y-1.5 rounded-xl border border-outline bg-tinta-50 p-3.5">
          <div className="flex items-center gap-2">
            <Badge label={resultLabel(result)} />
            <p className="text-[13px] text-ink">{result.message}</p>
          </div>
          {result.resendStatus && <p className="text-xs text-muted">Resend: {result.resendStatus}</p>}
          {result.cacheStats && (
            <p className="text-xs text-muted">
              Cache de links en Redis: {result.cacheStats.cacheEnabled ? 'activo' : 'inactivo'}
              {' · '}
              {result.cacheStats.resetLinksEqual ? 'el segundo link salió del cache' : 'generó un link nuevo'}
            </p>
          )}
        </div>
      )}
    </Card>
  );
};
