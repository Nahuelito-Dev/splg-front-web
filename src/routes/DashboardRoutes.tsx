import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from '../common/layout';
import { RouteProgressBar } from '../common/layout/RouteProgressBar';
import { LoadingState } from '../common/components/ui';
import { RequireCompanyAdmin, RequireCompanyScope } from '../common/components/RequireCompanyScope';
import { RequireModule } from '../common/components/RequireModule';
import { RequireSuperAdmin } from '../common/components/RequireSuperAdmin';
import { lazyPage } from './lazyPage';
import { CheckingAuth } from '../common/components/Spinner';
import { useAppSelector, useSupportSession } from '../hooks';
import { useSupportEndedEvent } from '../hooks/useSupportEndedEvent';
import { useOwnedCompany } from '../hooks/useOwnedCompany';
import { useSupportModeSync } from '../services/queries/supportSessions';

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
const RouteSheets = lazyPage(() => import('../pages/RouteSheets/RouteSheets'), 'RouteSheets');
const FleetPlanner = lazyPage(() => import('../pages/Fleet/Planner/FleetPlanner'), 'FleetPlanner');
const FleetFiles = lazyPage(() => import('../pages/Fleet/FleetFiles'), 'FleetFiles');
const FleetPlans = lazyPage(() => import('../pages/Fleet/FleetPlans'), 'FleetPlans');
const FleetPlanDetails = lazyPage(() => import('../pages/Fleet/FleetPlanDetails'), 'FleetPlanDetails');
const FleetTasks = lazyPage(() => import('../pages/Fleet/FleetTasks'), 'FleetTasks');
const FleetTaskDetail = lazyPage(() => import('../pages/Fleet/FleetTaskDetail'), 'FleetTaskDetail');
const FuelLoads = lazyPage(() => import('../pages/FleetExpense/FuelLoads'), 'FuelLoads');
const FuelLoadForm = lazyPage(() => import('../pages/FleetExpense/FuelLoadForm'), 'FuelLoadForm');
const DocumentReadings = lazyPage(() => import('../pages/DocumentReadings/DocumentReadings'), 'DocumentReadings');
const DocumentReadingDetails = lazyPage(
  () => import('../pages/DocumentReadings/DocumentReadingDetails'),
  'DocumentReadingDetails',
);
const TrafficFines = lazyPage(() => import('../pages/FleetExpense/TrafficFines'), 'TrafficFines');
const Insurers = lazyPage(() => import('../pages/Insurance/Insurers'), 'Insurers');
const VehicleAccidents = lazyPage(() => import('../pages/FleetExpense/VehicleAccidents'), 'VehicleAccidents');
const VehicleAccidentForm = lazyPage(() => import('../pages/FleetExpense/VehicleAccidentForm'), 'VehicleAccidentForm');
const FleetCosts = lazyPage(() => import('../pages/FleetExpense/FleetCosts'), 'FleetCosts');
const Tires = lazyPage(() => import('../pages/FleetExpense/Tires'), 'Tires');
const Configuration = lazyPage(() => import('../pages/Configuration/Configuration'), 'Configuration');
const DispatchSettings = lazyPage(() => import('../pages/Configuration/DispatchSettings'), 'DispatchSettings');
const Appearance = lazyPage(() => import('../pages/Configuration/Appearance'), 'Appearance');
const AutomaticProcesses = lazyPage(() => import('../pages/Configuration/AutomaticProcesses'), 'AutomaticProcesses');
const PlatformMonitoring = lazyPage(() => import('../pages/Platform/PlatformMonitoring'), 'PlatformMonitoring');
const PlatformScheduledTasks = lazyPage(
  () => import('../pages/Platform/PlatformScheduledTasks'),
  'PlatformScheduledTasks',
);
const ServiceUsage = lazyPage(() => import('../pages/Platform/ServiceUsage'), 'ServiceUsage');
const PlatformModules = lazyPage(() => import('../pages/Platform/Modules/PlatformModules'), 'PlatformModules');
const PlatformActivity = lazyPage(() => import('../pages/Platform/PlatformActivity'), 'PlatformActivity');
const SupportSessions = lazyPage(() => import('../pages/Platform/SupportSessions'), 'SupportSessions');
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
const SupportAccess = lazyPage(() => import('../pages/SupportAccess/SupportAccess'), 'SupportAccess');
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
const SupportHelp = lazyPage(() => import('../pages/Support/SupportHelp'), 'SupportHelp');
const CompanyTicketDetail = lazyPage(() => import('../pages/Support/CompanyTicketDetail'), 'CompanyTicketDetail');
const CompanyChatArchive = lazyPage(() => import('../pages/Support/CompanyChatArchive'), 'CompanyChatArchive');
const PlatformChats = lazyPage(() => import('../pages/Platform/Support/PlatformChats'), 'PlatformChats');
const PlatformTickets = lazyPage(() => import('../pages/Platform/Support/PlatformTickets'), 'PlatformTickets');
const PlatformTicketDetail = lazyPage(
  () => import('../pages/Platform/Support/PlatformTicketDetail'),
  'PlatformTicketDetail',
);

export const DashboardRoutes = () => {
  const role = useAppSelector((state) => state.auth.role);
  const isSuperAdminRole = role === 'super_admin';
  useSupportModeSync(isSuperAdminRole);
  useSupportEndedEvent(isSuperAdminRole);
  const { loaded, active } = useSupportSession();
  const owned = useOwnedCompany();

  // El administrador general no ve nada hasta saber si está en modo soporte: si no, el panel mostraría un instante la
  // plataforma (o la empresa) equivocada y pediría datos sin la sesión.
  if (isSuperAdminRole && !loaded) return <CheckingAuth />;

  return (
    // Al entrar o salir del modo soporte o de la empresa propia se monta todo de nuevo: ninguna pantalla conserva datos
    // del otro lado.
    <DashboardLayout key={active?.id ?? (isSuperAdminRole && owned ? `propia:${owned.slug}` : 'sin-soporte')}>
      <Suspense
        fallback={
          <>
            <RouteProgressBar />
            <LoadingState fullPage />
          </>
        }
      >
        <Routes>
          {/* «Ambos» (§2 del diseño del modo soporte): el admin de empresa y el administrador general, cada uno con lo suyo */}
          <Route path="home" element={<Home />} />
          <Route path="account" element={<Account />} />
          <Route path="users" element={<Users />} />
          <Route path="users/details/:leadId" element={<UserDetails />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="admins" element={<Admins />} />
          <Route path="admins/:id" element={<AdminDetails />} />

          {/* «Accesos de soporte»: sólo el admin de la empresa (la API se lo niega al administrador general) */}
          <Route element={<RequireCompanyAdmin />}>
            <Route path="support-access" element={<SupportAccess />} />
            {/* «Ayuda»: el chat con la plataforma y los tickets de la empresa (núcleo, también suspendida) */}
            <Route path="support" element={<SupportHelp />} />
            <Route path="support/tickets/:id" element={<CompanyTicketDetail />} />
            <Route path="support/chats/:id" element={<CompanyChatArchive />} />
          </Route>

          {/* Plataforma: sólo el administrador general fuera del modo soporte */}
          <Route element={<RequireSuperAdmin />}>
            <Route path="distributors" element={<Distributors />} />
            <Route path="distributors/new" element={<DistributorForm />} />
            <Route path="distributors/:id" element={<DistributorDetails />} />
            <Route path="distributors/:id/edit" element={<DistributorForm />} />
            <Route path="system" element={<System />} />
            <Route path="platform/modules" element={<PlatformModules />} />
            <Route path="platform/support-sessions" element={<SupportSessions />} />
            <Route path="platform/chats" element={<PlatformChats />} />
            <Route path="platform/chats/:id" element={<PlatformChats />} />
            <Route path="platform/tickets" element={<PlatformTickets />} />
            <Route path="platform/tickets/:id" element={<PlatformTicketDetail />} />
            <Route path="platform/monitoring" element={<PlatformMonitoring />} />
            <Route path="platform/scheduled-tasks" element={<PlatformScheduledTasks />} />
            <Route path="platform/service-usage" element={<ServiceUsage />} />
            <Route path="platform/activity" element={<PlatformActivity />} />
            {/* El monitoreo pasó a la plataforma: el enlace viejo lleva al nuevo (a un admin, al inicio). */}
            <Route path="settings/process-monitor" element={<Navigate to="/platform/monitoring" replace />} />
          </Route>

          {/* Empresa: el admin de la empresa, y el administrador general sólo en modo soporte (en sólo lectura). Las
              pantallas de un módulo van además con `RequireModule`: sin el módulo habilitado, «No incluido en tu plan». */}
          <Route element={<RequireCompanyScope />}>
            {/* La auditoría de datos es de una empresa: la plataforma tiene la suya en `/platform/activity`. */}
            <Route path="audit" element={<Audit />} />
            <Route path="customers" element={<Customers />} />
            <Route element={<RequireModule module="repurchase" />}>
              <Route path="customers/repurchase" element={<Repurchase />} />
            </Route>
            <Route path="customers/details/:id" element={<CustomerDetails />} />
            <Route path="cylinders" element={<GasCylinders />} />
            <Route path="cylinders/details/:id" element={<GasCylinderDetails />} />
            <Route path="physical-cylinders" element={<PhysicalCylinders />} />
            <Route path="physical-cylinders/expirations" element={<CylinderExpirations />} />
            <Route element={<RequireModule module="cylinder_recovery" />}>
              <Route path="physical-cylinders/recovery" element={<RecoveryCases />} />
            </Route>
            <Route path="physical-cylinders/:id" element={<CylinderDetails />} />
            <Route path="employees" element={<Employees />} />
            <Route path="employees/new" element={<EmployeeForm />} />
            <Route path="employees/:id/edit" element={<EmployeeForm />} />
            <Route path="employees/details/:id" element={<EmployeeDetails />} />
            <Route path="employees/positions" element={<JobPositions />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leaves" element={<Leaves />} />
            <Route path="deliveries" element={<Deliveries />} />
            <Route path="deliveries/new" element={<DeliveryForm />} />
            <Route path="deliveries/:id/edit" element={<DeliveryForm />} />
            <Route path="deliveries/details/:id" element={<DeliveryDetails />} />
            <Route path="cars" element={<Cars />} />
            <Route path="cars/details/:id" element={<CarDetails />} />
            <Route path="settings" element={<Configuration />} />
            <Route path="settings/appearance" element={<Appearance />} />
            <Route path="settings/dispatch" element={<DispatchSettings />} />
            <Route path="settings/scheduled-tasks" element={<ScheduledTasksSettings />} />
            <Route path="settings/automatic-processes" element={<AutomaticProcesses />} />
            <Route element={<RequireModule module="express" />}>
              <Route path="settings/express" element={<ExpressSettings />} />
            </Route>
            <Route path="refunds" element={<Refunds />} />
            <Route path="fleet/expirations" element={<FleetExpirations />} />
            <Route element={<RequireModule module="fleet_planner" />}>
              <Route path="fleet/planner" element={<FleetPlanner />} />
            </Route>
            <Route path="fleet/files" element={<FleetFiles />} />
            <Route path="fleet/plans" element={<FleetPlans />} />
            <Route path="fleet/plans/:id" element={<FleetPlanDetails />} />
            <Route path="fleet/tasks" element={<FleetTasks />} />
            <Route path="fleet/tasks/:id" element={<FleetTaskDetail />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/dispatch" element={<DispatchBoard />} />
            <Route element={<RequireModule module="route_batching" />}>
              <Route path="route-batches" element={<RouteBatches />} />
            </Route>
            <Route element={<RequireModule module="route_planning" />}>
              <Route path="route-sheets" element={<RouteSheets />} />
            </Route>
            <Route path="orders/new" element={<NewOrder />} />
            <Route path="orders/:id" element={<OrderDetails />} />
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
            <Route element={<RequireModule module="document_reading" />}>
              <Route path="document-readings" element={<DocumentReadings />} />
              <Route path="document-readings/:id" element={<DocumentReadingDetails />} />
            </Route>
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
            <Route element={<RequireModule module="mercadopago" />}>
              <Route path="finance/mp-reconciliation" element={<MpReconciliations />} />
              <Route path="finance/mp-reconciliation/:id" element={<MpReconciliationDetails />} />
            </Route>
            <Route path="finance/settlements" element={<DriverSettlements />} />
            <Route path="finance/settlements/:id" element={<DriverSettlementDetails />} />
            <Route path="finance/accounts" element={<CustomerAccounts />} />
            <Route path="finance/accounts/aging" element={<CustomerAging />} />
            <Route path="finance/accounts/:id" element={<CustomerAccountDetails />} />
            <Route path="finance/commissions" element={<Navigate to="/finance" replace />} />
            <Route path="finance/commission-rules" element={<Navigate to="/finance" replace />} />
            <Route path="finance/liquidations/*" element={<Navigate to="/finance" replace />} />
            <Route path="truck-loads" element={<TruckLoads />} />
            <Route path="truck-loads/:id" element={<TruckLoadDetails />} />
            <Route path="unpaid-collections" element={<UnpaidCollections />} />
            <Route path="tracking" element={<Tracking />} />
            <Route path="claims" element={<Claims />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="coverage-zones" element={<CoverageZones />} />
            <Route path="reservations" element={<Reservations />} />
            <Route path="reports" element={<Reports />} />
            <Route path="ratings" element={<Ratings />} />
          </Route>

          {/* Ruta por defecto */}
          <Route path="/*" element={<Navigate to="/home" />} />
        </Routes>
      </Suspense>
    </DashboardLayout>
  );
};
