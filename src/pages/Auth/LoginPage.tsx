import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { LogoSplg } from '../../common/components/LogoSplg';
import { Button, Card, IconButton, Input } from '../../common/components/ui';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { startLoginWithEmailAndPassword } from '../../store/auth/thunks';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Ingresá tu email').email('Email inválido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
});

type LoginValues = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const dispatch = useAppDispatch();
  const { status, errorMessage } = useAppSelector((state) => state.auth);
  const isAuthenticating = status === 'checking';
  const [showPassword, setShowPassword] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit((values) => {
    void dispatch(startLoginWithEmailAndPassword(values));
  });

  if (status === 'authenticated') return <Navigate to="/home" />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <LogoSplg variante="oscuro" size="lg" className="justify-center" />
          <div>
            <h1 className="text-xl font-bold text-ink">Bienvenido</h1>
            <p className="mt-1 text-sm text-muted">Ingresá a tu cuenta para gestionar la distribuidora.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)} noValidate>
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="usuario@splg.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="relative">
            <Input
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              className="pr-10"
              error={errors.password?.message}
              {...register('password')}
            />
            <IconButton
              label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              icon={showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
              className="absolute right-1 top-7 border-0 bg-transparent"
              onClick={() => setShowPassword((v) => !v)}
            />
          </div>

          {errorMessage && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {errorMessage}
            </p>
          )}

          <Button type="submit" className="w-full" loading={isAuthenticating}>
            Iniciar sesión
          </Button>

          <button
            type="button"
            onClick={() => setRecovering(true)}
            className="w-full text-center text-sm font-medium text-primary-strong hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      </Card>
      <ForgotPasswordModal open={recovering} onClose={() => setRecovering(false)} />
    </div>
  );
};
