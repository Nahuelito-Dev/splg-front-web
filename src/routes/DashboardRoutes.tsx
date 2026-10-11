import { Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppDispatch } from '../hooks';
import { logOut } from '../store/auth';
import { DashboardLayout } from '../common/layout';
import { RouteProgressBar } from '../common/layout/RouteProgressBar';
import { LoadingState } from '../common/components/ui';
import { lazyPage } from './lazyPage';

// Cada página se carga recién al entrar (un chunk por ruta).
const Home = lazyPage(() => import('../pages/Home/Home'), 'Home');
const Account = lazyPage(() => import('../pages/Account/Account'), 'Account');
const Users = lazyPage(() => import('../pages/Users/Users'), 'Users');
const UserDetails = lazyPage(() => import('../pages/Users/UserDetails'), 'UserDetails');
const Customers = lazyPage(() => import('../pages/Customers/Customers'), 'Customers');
const CustomerDetails = lazyPage(() => import('../pages/Customers/CustomerDetails'), 'CustomerDetails');
const Employees = lazyPage(() => import('../pages/Employees/Employees'), 'Employees');
const EmployeeDetails = lazyPage(() => import('../pages/Employees/EmployeeDetails'), 'EmployeeDetails');
const Addresses = lazyPage(() => import('../pages/Addresses/Addresses'), 'Addresses');
const GasCylinders = lazyPage(() => import('../pages/GasCylinders/GasCylinders'), 'GasCylinders');
const GasCylinderDetails = lazyPage(() => import('../pages/GasCylinders/GasCylinderDetails'), 'GasCylinderDetails');
const PhysicalCylinders = lazyPage(() => import('../pages/PhysicalCylinders/PhysicalCylinders'), 'PhysicalCylinders');
const CylinderDetails = lazyPage(() => import('../pages/PhysicalCylinders/CylinderDetails'), 'CylinderDetails');
const Deliveries = lazyPage(() => import('../pages/Deliveries/Deliveries'), 'Deliveries');
const DeliveryDetails = lazyPage(() => import('../pages/Deliveries/DeliveryDetails'), 'DeliveryDetails');
const Cars = lazyPage(() => import('../pages/Cars/Cars'), 'Cars');
const CarDetails = lazyPage(() => import('../pages/Cars/CarDetails'), 'CarDetails');
const FleetExpirations = lazyPage(() => import('../pages/Fleet/FleetExpirations'), 'FleetExpirations');
const FleetPlans = lazyPage(() => import('../pages/Fleet/FleetPlans'), 'FleetPlans');
const FleetPlanDetails = lazyPage(() => import('../pages/Fleet/FleetPlanDetails'), 'FleetPlanDetails');
const FleetTasks = lazyPage(() => import('../pages/Fleet/FleetTasks'), 'FleetTasks');
const FleetTaskDetail = lazyPage(() => import('../pages/Fleet/FleetTaskDetail'), 'FleetTaskDetail');
const Configuration = lazyPage(() => import('../pages/Configuration/Configuration'), 'Configuration');
const Orders = lazyPage(() => import('../pages/Orders/Orders'), 'Orders');
const OrderDetails = lazyPage(() => import('../pages/Orders/OrderDetails'), 'OrderDetails');
const OrderInvoice = lazyPage(() => import('../pages/Orders/OrderInvoice'), 'OrderInvoice');
const NewOrder = lazyPage(() => import('../pages/Orders/NewOrder'), 'NewOrder');
const Claims = lazyPage(() => import('../pages/Claims/Claims'), 'Claims');
const Incidents = lazyPage(() => import('../pages/Incidents/Incidents'), 'Incidents');
const CoverageZones = lazyPage(() => import('../pages/CoverageZones/CoverageZones'), 'CoverageZones');
const Reservations = lazyPage(() => import('../pages/Reservations/Reservations'), 'Reservations');
const Reports = lazyPage(() => import('../pages/Reports/Reports'), 'Reports');
const Tracking = lazyPage(() => import('../pages/Tracking/Tracking'), 'Tracking');
const Distributors = lazyPage(() => import('../pages/Distributors/Distributors'), 'Distributors');
const DistributorDetails = lazyPage(() => import('../pages/Distributors/DistributorDetails'), 'DistributorDetails');
const Admins = lazyPage(() => import('../pages/Admins/Admins'), 'Admins');
const AdminDetails = lazyPage(() => import('../pages/Admins/AdminDetails'), 'AdminDetails');
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
      <Suspense
        fallback={
          <>
            <RouteProgressBar />
            <LoadingState />
          </>
        }
      >
        <Routes>
          {/* 1. Dashboard General */}
          <Route path="home" element={<Home />} />

          {/* Mi cuenta: perfil, correo y contraseña del admin logueado */}
          <Route path="account" element={<Account />} />

          {/* 2. Usuarios del Sistema */}
          <Route path="users" element={<Users />} />
          <Route path="users/details/:leadId" element={<UserDetails />} />

          {/* 3. Clientes */}
          <Route path="customers" element={<Customers />} />
          <Route path="customers/details/:id" element={<CustomerDetails />} />

          {/* Direcciones de entrega de todos los clientes — super_admin */}
          <Route path="addresses" element={<Addresses />} />

          {/* 4. Garrafas / Productos (catálogo) */}
          <Route path="cylinders" element={<GasCylinders />} />
          <Route path="cylinders/details/:id" element={<GasCylinderDetails />} />

          {/* 4b. Envases físicos (garrafas serializadas, ciclo de canje) */}
          <Route path="physical-cylinders" element={<PhysicalCylinders />} />
          <Route path="physical-cylinders/:id" element={<CylinderDetails />} />

          {/* Legajos del personal */}
          <Route path="employees" element={<Employees />} />
          <Route path="employees/details/:id" element={<EmployeeDetails />} />

          {/* 5. Repartidores (Deliveries) */}
          <Route path="deliveries" element={<Deliveries />} />
          <Route path="deliveries/details/:id" element={<DeliveryDetails />} />

          {/* 6. Vehículos (Cars) - NUEVA RUTA */}
          <Route path="cars" element={<Cars />} />
          <Route path="cars/details/:id" element={<CarDetails />} />
          <Route path="settings" element={<Configuration />} />

          {/* Documentación de la flota: vencimientos (CU-139), planes (CU-105/140) y tareas */}
          <Route path="fleet/expirations" element={<FleetExpirations />} />
          <Route path="fleet/plans" element={<FleetPlans />} />
          <Route path="fleet/plans/:id" element={<FleetPlanDetails />} />
          <Route path="fleet/tasks" element={<FleetTasks />} />
          <Route path="fleet/tasks/:id" element={<FleetTaskDetail />} />

          {/* 7. Ordenes */}
          <Route path="orders" element={<Orders />} />
          <Route path="orders/new" element={<NewOrder />} />
          <Route path="orders/:id" element={<OrderDetails />} />
          <Route path="orders/:id/remito" element={<OrderInvoice />} />

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
          <Route path="distributors/:id" element={<DistributorDetails />} />
          {/* Gestión de admins por empresa — super_admin */}
          <Route path="admins" element={<Admins />} />
          <Route path="admins/:id" element={<AdminDetails />} />

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
