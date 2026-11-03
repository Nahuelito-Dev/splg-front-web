import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from '../common/layout';
import { RouteProgressBar } from '../common/layout/RouteProgressBar';
import { LoadingState } from '../common/components/ui';
import { RequireDistributor } from '../common/components/RequireDistributor';
import { lazyPage } from './lazyPage';

// Cada página se carga recién al entrar (un chunk por ruta).
const Home = lazyPage(() => import('../pages/Home/Home'), 'Home');
const Account = lazyPage(() => import('../pages/Account/Account'), 'Account');
const Users = lazyPage(() => import('../pages/Users/Users'), 'Users');
const UserDetails = lazyPage(() => import('../pages/Users/UserDetails'), 'UserDetails');
const Customers = lazyPage(() => import('../pages/Customers/Customers'), 'Customers');
const Repurchase = lazyPage(() => import('../pages/Customers/Repurchase/Repurchase'), 'Repurchase');
const CustomerDetails = lazyPage(() => import('../pages/Customers/CustomerDetails'), 'CustomerDetails');
const Employees = lazyPage(() => import('../pages/Employees/Employees'), 'Employees');
const JobPositions = lazyPage(() => import('../pages/Employees/JobPositions'), 'JobPositions');
const EmployeeForm = lazyPage(() => import('../pages/Employees/EmployeeForm'), 'EmployeeForm');
const EmployeeDetails = lazyPage(() => import('../pages/Employees/EmployeeDetails'), 'EmployeeDetails');
const Attendance = lazyPage(() => import('../pages/Attendance/Attendance'), 'Attendance');
const Leaves = lazyPage(() => import('../pages/Leaves/Leaves'), 'Leaves');
const Addresses = lazyPage(() => import('../pages/Addresses/Addresses'), 'Addresses');
const GasCylinders = lazyPage(() => import('../pages/GasCylinders/GasCylinders'), 'GasCylinders');
const GasCylinderDetails = lazyPage(() => import('../pages/GasCylinders/GasCylinderDetails'), 'GasCylinderDetails');
const PhysicalCylinders = lazyPage(() => import('../pages/PhysicalCylinders/PhysicalCylinders'), 'PhysicalCylinders');
const CylinderExpirations = lazyPage(
  () => import('../pages/PhysicalCylinders/CylinderExpirations'),
  'CylinderExpirations',
);
const RecoveryCases = lazyPage(() => import('../pages/PhysicalCylinders/Recovery/RecoveryCases'), 'RecoveryCases');
const CylinderDetails = lazyPage(() => import('../pages/PhysicalCylinders/CylinderDetails'), 'CylinderDetails');
const DeliveryForm = lazyPage(() => import('../pages/Deliveries/DeliveryForm'), 'DeliveryForm');
const Deliveries = lazyPage(() => import('../pages/Deliveries/Deliveries'), 'Deliveries');
const DeliveryDetails = lazyPage(() => import('../pages/Deliveries/DeliveryDetails'), 'DeliveryDetails');
const Cars = lazyPage(() => import('../pages/Cars/Cars'), 'Cars');
const CarDetails = lazyPage(() => import('../pages/Cars/CarDetails'), 'CarDetails');
const FleetExpirations = lazyPage(() => import('../pages/Fleet/FleetExpirations'), 'FleetExpirations');
const RouteBatches = lazyPage(() => import('../pages/RouteBatches/RouteBatches'), 'RouteBatches');
const FleetPlanner = lazyPage(() => import('../pages/Fleet/Planner/FleetPlanner'), 'FleetPlanner');
const FleetFiles = lazyPage(() => import('../pages/Fleet/FleetFiles'), 'FleetFiles');
const FleetPlans = lazyPage(() => import('../pages/Fleet/FleetPlans'), 'FleetPlans');
const FleetPlanDetails = lazyPage(() => import('../pages/Fleet/FleetPlanDetails'), 'FleetPlanDetails');
const FleetTasks = lazyPage(() => import('../pages/Fleet/FleetTasks'), 'FleetTasks');
const FleetTaskDetail = lazyPage(() => import('../pages/Fleet/FleetTaskDetail'), 'FleetTaskDetail');
const FuelLoads = lazyPage(() => import('../pages/FleetExpense/FuelLoads'), 'FuelLoads');
const FuelLoadForm = lazyPage(() => import('../pages/FleetExpense/FuelLoadForm'), 'FuelLoadForm');
const TrafficFines = lazyPage(() => import('../pages/FleetExpense/TrafficFines'), 'TrafficFines');
const Insurers = lazyPage(() => import('../pages/Insurance/Insurers'), 'Insurers');
const VehicleAccidents = lazyPage(() => import('../pages/FleetExpense/VehicleAccidents'), 'VehicleAccidents');
const VehicleAccidentForm = lazyPage(() => import('../pages/FleetExpense/VehicleAccidentForm'), 'VehicleAccidentForm');
const FleetCosts = lazyPage(() => import('../pages/FleetExpense/FleetCosts'), 'FleetCosts');
const Tires = lazyPage(() => import('../pages/FleetExpense/Tires'), 'Tires');
const Configuration = lazyPage(() => import('../pages/Configuration/Configuration'), 'Configuration');
const DispatchSettings = lazyPage(() => import('../pages/Configuration/DispatchSettings'), 'DispatchSettings');
const AutomaticProcesses = lazyPage(() => import('../pages/Configuration/AutomaticProcesses'), 'AutomaticProcesses');
const ProcessMonitor = lazyPage(() => import('../pages/Configuration/ProcessMonitor'), 'ProcessMonitor');
const ExpressSettings = lazyPage(() => import('../pages/Configuration/ExpressSettings'), 'ExpressSettings');
const Refunds = lazyPage(() => import('../pages/Refunds/Refunds'), 'Refunds');
const ScheduledTasksSettings = lazyPage(
  () => import('../pages/Configuration/ScheduledTasksSettings'),
  'ScheduledTasksSettings',
);
const Orders = lazyPage(() => import('../pages/Orders/Orders'), 'Orders');
const DispatchBoard = lazyPage(() => import('../pages/Orders/DispatchBoard'), 'DispatchBoard');
const OrderDetails = lazyPage(() => import('../pages/Orders/OrderDetails'), 'OrderDetails');
const NewOrder = lazyPage(() => import('../pages/Orders/NewOrder'), 'NewOrder');
const UnpaidCollections = lazyPage(() => import('../pages/UnpaidCollections/UnpaidCollections'), 'UnpaidCollections');
const Claims = lazyPage(() => import('../pages/Claims/Claims'), 'Claims');
const Notifications = lazyPage(() => import('../pages/Notifications/Notifications'), 'Notifications');
const Incidents = lazyPage(() => import('../pages/Incidents/Incidents'), 'Incidents');
const CoverageZones = lazyPage(() => import('../pages/CoverageZones/CoverageZones'), 'CoverageZones');
const Reservations = lazyPage(() => import('../pages/Reservations/Reservations'), 'Reservations');
const Reports = lazyPage(() => import('../pages/Reports/Reports'), 'Reports');
const Tracking = lazyPage(() => import('../pages/Tracking/Tracking'), 'Tracking');
const Distributors = lazyPage(() => import('../pages/Distributors/Distributors'), 'Distributors');
const DistributorForm = lazyPage(() => import('../pages/Distributors/DistributorForm'), 'DistributorForm');
const DistributorDetails = lazyPage(() => import('../pages/Distributors/DistributorDetails'), 'DistributorDetails');
const Admins = lazyPage(() => import('../pages/Admins/Admins'), 'Admins');
const AdminDetails = lazyPage(() => import('../pages/Admins/AdminDetails'), 'AdminDetails');
const Ratings = lazyPage(() => import('../pages/Ratings/Ratings'), 'Ratings');
const Audit = lazyPage(() => import('../pages/Audit/Audit'), 'Audit');
const System = lazyPage(() => import('../pages/System/System'), 'System');
const StockSummary = lazyPage(() => import('../pages/Stock/StockSummary'), 'StockSummary');
const Warehouses = lazyPage(() => import('../pages/Stock/Warehouses'), 'Warehouses');
const WarehouseDetails = lazyPage(() => import('../pages/Stock/WarehouseDetails'), 'WarehouseDetails');
const Adjustments = lazyPage(() => import('../pages/Stock/Adjustments'), 'Adjustments');
const AdjustmentDetails = lazyPage(() => import('../pages/Stock/AdjustmentDetails'), 'AdjustmentDetails');
const Transfers = lazyPage(() => import('../pages/Stock/Transfers'), 'Transfers');
const Movements = lazyPage(() => import('../pages/Stock/Movements'), 'Movements');
const Thresholds = lazyPage(() => import('../pages/Stock/Thresholds'), 'Thresholds');
const Reconciliation = lazyPage(() => import('../pages/Stock/Reconciliation'), 'Reconciliation');
const FinanceDashboard = lazyPage(() => import('../pages/Finance/FinanceDashboard'), 'FinanceDashboard');
const IncomeStatement = lazyPage(() => import('../pages/Finance/IncomeStatement'), 'IncomeStatement');
const CashBoxes = lazyPage(() => import('../pages/Finance/CashBoxes'), 'CashBoxes');
const CashCollectionSettings = lazyPage(
  () => import('../pages/Finance/CashCollectionSettings'),
  'CashCollectionSettings',
);
const MpReconciliations = lazyPage(() => import('../pages/Finance/MpReconciliations'), 'MpReconciliations');
const MpReconciliationDetails = lazyPage(
  () => import('../pages/Finance/MpReconciliationDetails'),
  'MpReconciliationDetails',
);
const CashBoxDetails = lazyPage(() => import('../pages/Finance/CashBoxDetails'), 'CashBoxDetails');
const CashMovements = lazyPage(() => import('../pages/Finance/CashMovements'), 'CashMovements');
const CashCategories = lazyPage(() => import('../pages/Finance/CashCategories'), 'CashCategories');
const DriverSettlements = lazyPage(() => import('../pages/Finance/DriverSettlements'), 'DriverSettlements');
const DriverSettlementDetails = lazyPage(
  () => import('../pages/Finance/DriverSettlementDetails'),
  'DriverSettlementDetails',
);
const CustomerAccounts = lazyPage(() => import('../pages/Finance/CustomerAccounts'), 'CustomerAccounts');
const CustomerAging = lazyPage(() => import('../pages/Finance/CustomerAging'), 'CustomerAging');
const CustomerAccountDetails = lazyPage(
  () => import('../pages/Finance/CustomerAccountDetails'),
  'CustomerAccountDetails',
);
const Suppliers = lazyPage(() => import('../pages/Purchases/Suppliers'), 'Suppliers');
const SupplierDetails = lazyPage(() => import('../pages/Purchases/SupplierDetails'), 'SupplierDetails');
const PurchaseOrders = lazyPage(() => import('../pages/Purchases/PurchaseOrders'), 'PurchaseOrders');
const PurchaseOrderDetails = lazyPage(() => import('../pages/Purchases/PurchaseOrderDetails'), 'PurchaseOrderDetails');
const PurchaseReceipts = lazyPage(() => import('../pages/Purchases/PurchaseReceipts'), 'PurchaseReceipts');
const PurchaseReceiptDetails = lazyPage(
  () => import('../pages/Purchases/PurchaseReceiptDetails'),
  'PurchaseReceiptDetails',
);
const AverageCosts = lazyPage(() => import('../pages/Purchases/AverageCosts'), 'AverageCosts');
const TruckLoads = lazyPage(() => import('../pages/TruckLoads/TruckLoads'), 'TruckLoads');
const TruckLoadDetails = lazyPage(() => import('../pages/TruckLoads/TruckLoadDetails'), 'TruckLoadDetails');

export const DashboardRoutes = () => {
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
          <Route path="customers/repurchase" element={<Repurchase />} />
          <Route path="customers/details/:id" element={<CustomerDetails />} />

          {/* Direcciones de entrega de todos los clientes — super_admin */}
          <Route path="addresses" element={<Addresses />} />

          {/* 4. Garrafas / Productos (catálogo) */}
          <Route path="cylinders" element={<GasCylinders />} />
          <Route path="cylinders/details/:id" element={<GasCylinderDetails />} />

          {/* 4b. Envases físicos (garrafas serializadas, ciclo de canje) */}
          <Route path="physical-cylinders" element={<PhysicalCylinders />} />
          <Route path="physical-cylinders/expirations" element={<CylinderExpirations />} />
          <Route path="physical-cylinders/recovery" element={<RecoveryCases />} />
          <Route path="physical-cylinders/:id" element={<CylinderDetails />} />

          {/* Legajos del personal */}
          <Route path="employees" element={<Employees />} />
          <Route path="employees/new" element={<EmployeeForm />} />
          <Route path="employees/:id/edit" element={<EmployeeForm />} />
          <Route path="employees/details/:id" element={<EmployeeDetails />} />
          <Route path="employees/positions" element={<JobPositions />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="leaves" element={<Leaves />} />

          {/* 5. Repartidores (Deliveries) */}
          <Route path="deliveries" element={<Deliveries />} />
          <Route path="deliveries/new" element={<DeliveryForm />} />
          <Route path="deliveries/:id/edit" element={<DeliveryForm />} />
          <Route path="deliveries/details/:id" element={<DeliveryDetails />} />

          {/* 6. Vehículos (Cars) - NUEVA RUTA */}
          <Route path="cars" element={<Cars />} />
          <Route path="cars/details/:id" element={<CarDetails />} />
          <Route path="settings" element={<Configuration />} />
          <Route path="settings/dispatch" element={<DispatchSettings />} />
          <Route path="settings/scheduled-tasks" element={<ScheduledTasksSettings />} />
          <Route path="settings/automatic-processes" element={<AutomaticProcesses />} />
          <Route path="settings/process-monitor" element={<ProcessMonitor />} />
          <Route path="settings/express" element={<ExpressSettings />} />
          <Route path="refunds" element={<Refunds />} />

          {/* Documentación de la flota: vencimientos (CU-139), planes (CU-105/140) y tareas */}
          <Route path="fleet/expirations" element={<FleetExpirations />} />
          <Route path="fleet/planner" element={<FleetPlanner />} />
          <Route path="fleet/files" element={<FleetFiles />} />
          <Route path="fleet/plans" element={<FleetPlans />} />
          <Route path="fleet/plans/:id" element={<FleetPlanDetails />} />
          <Route path="fleet/tasks" element={<FleetTasks />} />
          <Route path="fleet/tasks/:id" element={<FleetTaskDetail />} />

          {/* 7. Ordenes */}
          <Route path="orders" element={<Orders />} />
          <Route path="orders/dispatch" element={<DispatchBoard />} />
          <Route path="route-batches" element={<RouteBatches />} />
          <Route path="orders/new" element={<NewOrder />} />
          <Route path="orders/:id" element={<OrderDetails />} />

          {/* Stock físico, compras y cargas del camión: sólo dentro de una distribuidora */}
          <Route element={<RequireDistributor />}>
            <Route path="stock" element={<StockSummary />} />
            <Route path="stock/warehouses" element={<Warehouses />} />
            <Route path="stock/warehouses/:id" element={<WarehouseDetails />} />
            <Route path="stock/adjustments" element={<Adjustments />} />
            <Route path="stock/adjustments/:id" element={<AdjustmentDetails />} />
            <Route path="stock/transfers" element={<Transfers />} />
            <Route path="stock/movements" element={<Movements />} />
            <Route path="stock/thresholds" element={<Thresholds />} />
            <Route path="stock/reconciliation" element={<Reconciliation />} />
            <Route path="purchases/suppliers" element={<Suppliers />} />
            <Route path="purchases/suppliers/:id" element={<SupplierDetails />} />
            <Route path="purchases/orders" element={<PurchaseOrders />} />
            <Route path="purchases/orders/:id" element={<PurchaseOrderDetails />} />
            <Route path="purchases/receipts" element={<PurchaseReceipts />} />
            <Route path="purchases/receipts/:id" element={<PurchaseReceiptDetails />} />
            <Route path="purchases/costs" element={<AverageCosts />} />
            <Route path="fleet/fuel-loads" element={<FuelLoads />} />
            <Route path="fleet/fuel-loads/new" element={<FuelLoadForm />} />
            <Route path="fleet/fuel-loads/:id/edit" element={<FuelLoadForm />} />
            <Route path="fleet/fines" element={<TrafficFines />} />
            <Route path="fleet/insurers" element={<Insurers />} />
            <Route path="fleet/accidents" element={<VehicleAccidents />} />
            <Route path="fleet/accidents/new" element={<VehicleAccidentForm />} />
            <Route path="fleet/accidents/:id/edit" element={<VehicleAccidentForm />} />
            <Route path="fleet/costs" element={<FleetCosts />} />
            <Route path="fleet/tires" element={<Tires />} />
            <Route path="finance" element={<FinanceDashboard />} />
            <Route path="finance/income-statement" element={<IncomeStatement />} />
            <Route path="finance/boxes" element={<CashBoxes />} />
            <Route path="finance/boxes/:id" element={<CashBoxDetails />} />
            <Route path="finance/movements" element={<CashMovements />} />
            <Route path="finance/categories" element={<CashCategories />} />
            <Route path="finance/collection-settings" element={<CashCollectionSettings />} />
            <Route path="finance/mp-reconciliation" element={<MpReconciliations />} />
            <Route path="finance/mp-reconciliation/:id" element={<MpReconciliationDetails />} />
            <Route path="finance/settlements" element={<DriverSettlements />} />
            <Route path="finance/settlements/:id" element={<DriverSettlementDetails />} />
            <Route path="finance/accounts" element={<CustomerAccounts />} />
            <Route path="finance/accounts/aging" element={<CustomerAging />} />
            <Route path="finance/accounts/:id" element={<CustomerAccountDetails />} />
            {/* Comisiones, reglas y liquidaciones salieron del alcance: las páginas siguen en Finance/, sin ruta. */}
            <Route path="finance/commissions" element={<Navigate to="/finance" replace />} />
            <Route path="finance/commission-rules" element={<Navigate to="/finance" replace />} />
            <Route path="finance/liquidations/*" element={<Navigate to="/finance" replace />} />
            <Route path="truck-loads" element={<TruckLoads />} />
            <Route path="truck-loads/:id" element={<TruckLoadDetails />} />
          </Route>

          <Route path="unpaid-collections" element={<UnpaidCollections />} />

          {/* 8. Tracking en vivo de choferes */}
          <Route path="tracking" element={<Tracking />} />

          <Route path="claims" element={<Claims />} />
          <Route path="incidents" element={<Incidents />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="coverage-zones" element={<CoverageZones />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="reports" element={<Reports />} />
          <Route path="ratings" element={<Ratings />} />

          {/* Gestión de empresas (multi-distribuidora) — super_admin */}
          <Route path="distributors" element={<Distributors />} />
          <Route path="distributors/new" element={<DistributorForm />} />
          <Route path="distributors/:id" element={<DistributorDetails />} />
          <Route path="distributors/:id/edit" element={<DistributorForm />} />
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
