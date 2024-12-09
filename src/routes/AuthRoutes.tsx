import { Route, Routes } from 'react-router-dom';
import { LoginPage } from '../pages/Auth';

export const AuthRoutes = () => {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="*" element={<LoginPage />} />
    </Routes>
  );
};
