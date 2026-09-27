import { Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppDispatch } from '../hooks';
import { logOut } from '../store/auth';
import { DashboardLayout } from '../common/layout';
import { LoadingState } from '../common/components/ui';
import { lazyPage } from './lazyPage';

// Cada página se carga recién al entrar (un chunk por ruta).
const Home = lazyPage(() => import('../pages/Home/Home'), 'Home');
const Users = lazyPage(() => import('../pages/Users/Users'), 'Users');
const UserDetails = lazyPage(() => import('../pages/Users/UserDetails'), 'UserDetails');
const Customers = lazyPage(() => import('../pages/Customers/Customers'), 'Customers');
const CustomerDetails = lazyPage(() => import('../pages/Customers/CustomerDetails'), 'CustomerDetails');
const GasCylinders = lazyPage(() => import('../pages/GasCylinders/GasCylinders'), 'GasCylinders');
const GasCylinderDetails = lazyPage(() => import('../pages/GasCylinders/GasCylinderDetails'), 'GasCylinderDetails');
const PhysicalCylinders = lazyPage(() => import('../pages/PhysicalCylinders/PhysicalCylinders'), 'PhysicalCylinders');
const Deliveries = lazyPage(() => import('../pages/Deliveries/Deliveries'), 'Deliveries');
const DeliveryDetails = lazyPage(() => import('../pages/Deliveries/DeliveryDetails'), 'DeliveryDetails');
const Cars = lazyPage(() => import('../pages/Cars/Cars'), 'Cars');
const Configuration = lazyPage(() => import('../pages/Configuration/Configuration'), 'Configuration');
const Orders = lazyPage(() => import('../pages/Orders/Orders'), 'Orders');
const OrderDetails = lazyPage(() => import('../pages/Orders/OrderDetails'), 'OrderDetails');
const Claims = lazyPage(() => import('../pages/Claims/Claims'), 'Claims');
const Incidents = lazyPage(() => import('../pages/Incidents/Incidents'), 'Incidents');
const CoverageZones = lazyPage(() => import('../pages/CoverageZones/CoverageZones'), 'CoverageZones');
const Reservations = lazyPage(() => import('../pages/Reservations/Reservations'), 'Reservations');
const Reports = lazyPage(() => import('../pages/Reports/Reports'), 'Reports');
const Tracking = lazyPage(() => import('../pages/Tracking/Tracking'), 'Tracking');
const Distributors = lazyPage(() => import('../pages/Distributors/Distributors'), 'Distributors');
const Admins = lazyPage(() => import('../pages/Admins/Admins'), 'Admins');
const Ratings = lazyPage(() => import('../pages/Ratings/Ratings'), 'Ratings');
const Audit = lazyPage(() => import('../pages/Audit/Audit'), 'Audit');
const System = lazyPage(() => import('../pages/System/System'), 'System');

export const DashboardRoutes = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const expireTimestampString = localStorage.getItem('expireTimestamp');

    if (expireTimestampString) {
      const parsedDate = new Date(parseInt(expireTimestampString, 10));
      if (parsedDate < new Date()) {
        dispatch(logOut({}));
      }
    }
  }, [dispatch]);

  return (
    <DashboardLayout>
      <Suspense fallback={<LoadingState />}>
        <Routes>
          {/* 1. Dashboard General */}
          <Route path="home" element={<Home />} />

          {/* 2. Usuarios del Sistema */}
          <Route path="users" element={<Users />} />
          <Route path="users/details/:leadId" element={<UserDetails />} />

          {/* 3. Clientes */}
          <Route path="customers" element={<Customers />} />
          <Route path="customers/details/:id" element={<CustomerDetails />} />

          {/* 4. Garrafas / Productos (catálogo) */}
          <Route path="cylinders" element={<GasCylinders />} />
          <Route path="cylinders/details/:id" element={<GasCylinderDetails />} />

          {/* 4b. Envases físicos (garrafas serializadas, ciclo de canje) */}
          <Route path="physical-cylinders" element={<PhysicalCylinders />} />

          {/* 5. Repartidores (Deliveries) */}
          <Route path="deliveries" element={<Deliveries />} />
          <Route path="deliveries/details/:id" element={<DeliveryDetails />} />

          {/* 6. Vehículos (Cars) - NUEVA RUTA */}
          <Route path="cars" element={<Cars />} />
          <Route path="settings" element={<Configuration />} />

          {/* 7. Ordenes (Pendiente) */}
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetails />} />

          {/* 8. Tracking en vivo de choferes */}
          <Route path="tracking" element={<Tracking />} />

          <Route path="claims" element={<Claims />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="coverage-zones" element={<CoverageZones />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="reports" element={<Reports />} />
          <Route path="ratings" element={<Ratings />} />

          {/* Gestión de empresas (multi-distribuidora) — super_admin */}
          <Route path="distributors" element={<Distributors />} />
          {/* Gestión de admins por empresa — super_admin */}
          <Route path="admins" element={<Admins />} />

          {/* Auditoría (CU-152) — admin y super_admin */}
          <Route path="audit" element={<Audit />} />

          {/* Estado de la plataforma y herramientas de soporte — super_admin */}
          <Route path="system" element={<System />} />

          {/* Ruta por defecto */}
          <Route path="/*" element={<Navigate to="/home" />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
};
