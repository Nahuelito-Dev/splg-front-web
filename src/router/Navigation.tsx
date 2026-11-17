import { Route, Navigate } from 'react-router-dom';
import { useCheckAuth } from '../hooks';
import { AuthRoutes } from '../routes/AuthRoutes';
import { DashboardRoutes } from '../routes/DashboardRoutes';
import { CheckingAuth } from '../common/components/Spinner';
import { SentryRoutes } from '../observability/routing';

export const Navigation = () => {
  const { status } = useCheckAuth();
  if (status === 'checking') {
    return <CheckingAuth />;
  }

  return (
    <SentryRoutes>
      {status === 'authenticated' ? (
        <Route path="/*" element={<DashboardRoutes />} />
      ) : (
        <Route path="/auth/*" element={<AuthRoutes />} />
      )}
      <Route path="/*" element={<Navigate to={'/auth/login'} />} />
    </SentryRoutes>
  );
};
