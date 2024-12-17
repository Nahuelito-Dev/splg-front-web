import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector, useForm } from '../../hooks';
import { startLoginWithEmailAndPassword } from '../../store/auth/thunks';
import pallete from '../../theme/pallete';

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
    <div
      className="font-sans min-h-screen flex items-center justify-center"
      style={{ backgroundColor: pallete.secondary.blackLike }}
    >
      <div
        className="rounded-lg p-6 shadow-xl max-w-md w-full"
        style={{
          backgroundColor: `${pallete.secondary.blackLike}EE`, // Fondo oscuro de la tarjeta
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.5)', // Sombra para destacar
        }}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="mb-8 text-center">
            <img
              src="../gearth.png"
              alt="logo"
              className="w-40 mb-8 mx-auto block"
            />
            <h3 className="text-white text-3xl font-extrabold">Sign in</h3>
            <p className="text-gray-400 text-sm mt-4 leading-relaxed">
              Sign in to your account and explore a world of possibilities. Your
              journey begins here.
            </p>
          </div>

          <div>
            <label className="text-gray-200 text-sm mb-2 block">
              User name
            </label>
            <div className="relative flex items-center">
              <input
                name="email"
                type="email"
                required
                value={formState.email}
                onChange={onInputChange}
                className="w-full text-sm text-gray-800 border border-gray-700 bg-gray-50 px-4 py-3 rounded-lg outline-blue-600"
                placeholder="Enter user name"
              />
            </div>
          </div>
          <div>
            <label className="text-gray-200 text-sm mb-2 block">Password</label>
            <div className="relative flex items-center">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formState.password}
                onChange={onInputChange}
                className="w-full text-sm text-gray-800 border border-gray-700 bg-gray-50 px-4 py-3 rounded-lg outline-blue-600"
                placeholder="Enter password"
              />
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button
              type="submit"
              className="w-1/2 shadow-xl py-2 px-3 text-sm tracking-wide rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
              disabled={isAuthenticating}
            >
              Log in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
