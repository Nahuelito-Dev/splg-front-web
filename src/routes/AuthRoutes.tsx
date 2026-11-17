import { Route } from 'react-router-dom';
import { SentryRoutes } from '../observability/routing';
import { LoginPage } from '../pages/Auth/LoginPage';

export const AuthRoutes = () => {
  return (
    <SentryRoutes>
      <Route path="login" element={<LoginPage />} />
      <Route path="*" element={<LoginPage />} />
    </SentryRoutes>
  );
};
