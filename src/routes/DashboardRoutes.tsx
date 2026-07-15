import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppDispatch } from '../hooks';
import { logOut } from '../store/auth';
import { DashboardLayout } from '../common/layout';

// Componentes Principales
import { Home, Leads } from '../pages';
import { LeadsDetailsView } from '../pages/Leads/components/LeadsDetailsView';
import { Customers } from '../pages/Customers/Customers';
import { Cylinders } from '../pages/Gascilinders/Cylinders';
import { CylinderDetails } from '../pages/Gascilinders/components/CylinderDetails';
import { Deliveries } from '../pages/Deilverys';
import { DeliveryDetails } from '../pages/Deilverys/components';
import { Cars } from '../pages/Cars/Cars'; // <--- NUEVO IMPORT
import { Configuration } from '../pages/Configuration/Configuration';
import { Orders } from '../pages/Orders';
import { CustomerDetails } from '../pages/Customers/components/CustomerDetails';
import { Claims } from '../pages/Claims';
import { Incidents } from '../pages/Incidents';
import { Reports } from '../pages/Reports/Reports';
import { Tracking } from '../pages/Tracking';
import { Distributors } from '../pages/Distributors';

export const DashboardRoutes = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const expireTimestampString = localStorage.getItem('expireTimestamp');

    if (expireTimestampString) {
      const parsedDate = new Date(parseInt(expireTimestampString!, 10));
      if (parsedDate < new Date()) {
        dispatch(logOut({}));
      }
    }
  }, [dispatch]);

  return (
    <DashboardLayout>
      <Routes>
        {/* 1. Dashboard General */}
        <Route path="home" element={<Home />} />

        {/* 2. Usuarios del Sistema */}
        <Route path="users" element={<Leads />} />
        <Route path="users/details/:leadId" element={<LeadsDetailsView />} />

        {/* 3. Clientes */}
        <Route path="customers" element={<Customers />} />
        <Route path="customers/details/:id" element={<CustomerDetails />} />

        {/* 4. Garrafas / Productos */}
        <Route path="cylinders" element={<Cylinders />} />
        <Route path="cylinders/details/:id" element={<CylinderDetails />} />

        {/* 5. Repartidores (Deliveries) */}
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="deliveries/details/:id" element={<DeliveryDetails />} />

        {/* 6. Vehículos (Cars) - NUEVA RUTA */}
        <Route path="cars" element={<Cars />} />
        <Route path="configuracion" element={<Configuration />} />

        {/* 7. Ordenes (Pendiente) */}
        <Route path="ordenes" element={<Orders />} />

        {/* 8. Tracking en vivo de choferes */}
        <Route path="tracking" element={<Tracking />} />

        <Route path="claims" element={<Claims />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="reports" element={<Reports />} />

        {/* Gestión de empresas (multi-distribuidora) — super_admin */}
        <Route path="distributors" element={<Distributors />} />

        {/* Ruta por defecto */}
        <Route path="/*" element={<Navigate to="/home" />} />
      </Routes>
    </DashboardLayout>
  );
};
