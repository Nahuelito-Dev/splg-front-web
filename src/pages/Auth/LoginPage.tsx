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
          backgroundColor: `${pallete.secondary.blackLike}EE`,
          boxShadow: '0 8px 16px rgba(0, 0, 0, 0.5)',
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
                placeholder="••••••"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 cursor-pointer"
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
