import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector, useForm } from '../../hooks';
import { startLoginWithEmailAndPassword } from '../../store/auth/thunks';
import { YennigasLogo } from '../../common/components/YennigasLogo'; // Ajusta la ruta

const formData = {
  email: '',
  password: '',
};

export const LoginPage = () => {
  const dispatch = useAppDispatch();
  const { status } = useAppSelector((state) => state.auth);
  const { formState, onInputChange } = useForm(formData);
  const isAuthenticating = useMemo(() => status === 'checking', [status]);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    dispatch(startLoginWithEmailAndPassword(formState));
  };

  if (status === 'authenticated') return <Navigate to="/home" />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1014]">
      {/* Fondo con un degradado sutil para darle profundidad como en la app */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black z-0"></div>

      <div className="relative z-10 rounded-2xl p-8 shadow-2xl max-w-md w-full bg-[#1A1D23] border border-slate-800">
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Logo Section */}
          <div className="mb-10 text-center">
            <div className="mb-6 flex justify-center">
              <YennigasLogo textSize="text-6xl" />
            </div>
            <h3 className="text-white text-2xl font-bold tracking-tight">
              Bienvenido
            </h3>
            <p className="text-slate-400 text-sm mt-2">
              Ingresa a tu cuenta para gestionar pedidos.
            </p>
          </div>

          {/* User Input */}
          <div className="space-y-1">
            <label className="text-slate-300 text-xs font-bold uppercase ml-1">
              Email
            </label>
            <div className="relative flex items-center">
              <input
                name="email"
                type="email"
                required
                value={formState.email}
                onChange={onInputChange}
                className="w-full text-sm text-white bg-[#0f1014] border border-slate-700 px-4 py-3.5 rounded-xl focus:outline-none focus:border-[#f43f5e] focus:ring-1 focus:ring-[#f43f5e] transition-all placeholder-slate-600"
                placeholder="usuario@yennigas.com"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="text-slate-300 text-xs font-bold uppercase ml-1">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formState.password}
                onChange={onInputChange}
                className="w-full text-sm text-white bg-[#0f1014] border border-slate-700 px-4 py-3.5 rounded-xl focus:outline-none focus:border-[#f43f5e] focus:ring-1 focus:ring-[#f43f5e] transition-all placeholder-slate-600"
                placeholder="••••••"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 cursor-pointer text-slate-500 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.98 8.223A9.953 9.953 0 0112 4c4.016 0 7.48 2.132 9.21 5.333M17.545 17.545A9.978 9.978 0 0112 20c-4.017 0-7.481-2.132-9.21-5.333M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9.172 9.172a4 4 0 005.656 5.656"
                    />
                  </svg>
                )}
              </span>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full shadow-lg shadow-pink-500/30 py-3.5 px-4 text-sm font-bold tracking-wide rounded-xl text-white bg-[#f43f5e] hover:bg-pink-600 focus:outline-none transition-transform active:scale-95"
              disabled={isAuthenticating}
            >
              {isAuthenticating ? 'Ingresando...' : 'INICIAR SESIÓN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
