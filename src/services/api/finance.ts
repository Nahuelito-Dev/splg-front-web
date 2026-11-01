import { env } from '../../config/env';
import { http } from './httpClient';
import { idempotencyHeaders } from './idempotency';
import type {
  AgingReport,
  ApproveDriverSettlementBody,
  CashBox,
  CashBoxPage,
  CashCategory,
  CashCategoryPage,
  CashMovement,
  CashMovementV2Page,
  CashSession,
  CashSessionDetail,
  CashSessionPage,
  CashTransfer,
  CloseCashSessionBody,
  CloseCashSessionPreview,
  CommissionEntryPage,
  CommissionRule,
  CommissionRulePage,
  CreateCashBoxBody,
  CreateCashCategoryBody,
  CreateCashMovementBody,
  CreateCommissionRuleBody,
  CreateCustomerAccountBody,
  CreateDriverLiquidationBody,
  CustomerAccountDetail,
  CustomerAccountPage,
  CustomerEntry,
  CustomerStatement,
  DriverLiquidation,
  DriverLiquidationDetail,
  DriverLiquidationPage,
  DriverSettlementDetail,
  DriverSettlementPage,
  FinanceDashboard,
  IncomeStatement,
  OpenCashSessionBody,
  OpenDriverSettlementBody,
  PreviewCloseCashSessionBody,
  PreviewDriverSettlementBody,
  SettlementPreview,
  PayDriverLiquidationBody,
  RegisterAdjustmentBody,
  RegisterPaymentBody,
  ReverseCashMovementBody,
  SubmitDriverSettlementBody,
  TransferCashBody,
  UnpayDriverLiquidationBody,
  UpdateCashBoxBody,
  UpdateCashCategoryBody,
  UpdateCommissionRuleBody,
  UpdateCustomerAccountBody,
} from './types';
import type { ListParams } from './stock';

const paging = ({ page, pageSize }: ListParams) => ({ page: page + 1, limit: pageSize });
const withKey = (key: string) => ({ headers: idempotencyHeaders(key) });

// ── Cajas ───────────────────────────────────────────────────────────────────

export interface CashBoxFilters {
  kind?: CashBox['kind'];
  includeInactive?: boolean;
  term?: string;
}

/** Los parámetros de GET /cash-boxes sin paginar: los mismos que usa el exporte completo. */
export const cashBoxQuery = (filters: CashBoxFilters) => ({ ...filters });

/** GET /cash-boxes */
export const listCashBoxes = async (params: ListParams, filters: CashBoxFilters = {}): Promise<CashBoxPage> => {
  const { data } = await http.get<CashBoxPage>('/cash-boxes', {
    params: { ...paging(params), ...cashBoxQuery(filters) },
  });
  return data;
};

/** GET /cash-boxes/:id */
export const getCashBox = async (id: string): Promise<CashBox> => {
  const { data } = await http.get<CashBox>(`/cash-boxes/${id}`);
  return data;
};

/** POST /cash-boxes */
export const createCashBox = async (body: CreateCashBoxBody, key: string): Promise<CashBox> => {
  const { data } = await http.post<CashBox>('/cash-boxes', body, withKey(key));
  return data;
};

/** PATCH /cash-boxes/:id */
export const updateCashBox = async (id: string, body: UpdateCashBoxBody, key: string): Promise<CashBox> => {
  const { data } = await http.patch<CashBox>(`/cash-boxes/${id}`, body, withKey(key));
  return data;
};

/** POST /cash-boxes/:id/sessions: abre la caja. */
export const openCashSession = async (id: string, body: OpenCashSessionBody, key: string): Promise<CashSession> => {
  const { data } = await http.post<CashSession>(`/cash-boxes/${id}/sessions`, body, withKey(key));
  return data;
};

/** GET /cash-boxes/:id/sessions */
export const listCashSessions = async (id: string, params: ListParams): Promise<CashSessionPage> => {
  const { data } = await http.get<CashSessionPage>(`/cash-boxes/${id}/sessions`, { params: paging(params) });
  return data;
};

/** GET /cash-sessions/:id: con sus movimientos y el saldo actual. */
export const getCashSession = async (id: string): Promise<CashSessionDetail> => {
  const { data } = await http.get<CashSessionDetail>(`/cash-sessions/${id}`);
  return data;
};

/** PATCH /cash-sessions/:id/close: cierra con arqueo. */
export const closeCashSession = async (id: string, body: CloseCashSessionBody, key: string): Promise<CashSession> => {
  const { data } = await http.patch<CashSession>(`/cash-sessions/${id}/close`, body, withKey(key));
  return data;
};

// ── Movimientos ─────────────────────────────────────────────────────────────

export interface CashMovementFilters {
  cashBoxId?: string;
  categoryId?: string;
  direction?: CashMovement['direction'];
  referenceType?: CashMovement['referenceType'];
  from?: string;
  to?: string;
  /** Sólo los que cuentan como ingreso o egreso en el estado de resultados (sin transferencias ni carga inicial). */
  countsForResult?: boolean;
}

/** Los parámetros de GET /cash-movements sin paginar: los mismos que usa el exporte completo. */
export const cashMovementQuery = (filters: CashMovementFilters) => ({ ...filters });

/** GET /v2/cash-movements: lo mismo que la v1, y cada cobro de venta trae su `orderId` para llegar al pedido. */
export const listCashMovements = async (
  params: ListParams,
  filters: CashMovementFilters = {},
): Promise<CashMovementV2Page> => {
  const { data } = await http.get<CashMovementV2Page>('/cash-movements', {
    baseURL: env.apiUrlV2,
    params: { ...paging(params), ...cashMovementQuery(filters) },
  });
  return data;
};

/** POST /cash-movements: entrada o salida manual. */
export const createCashMovement = async (body: CreateCashMovementBody, key: string): Promise<CashMovement> => {
  const { data } = await http.post<CashMovement>('/cash-movements', body, withKey(key));
  return data;
};

/** POST /cash-movements/transfer */
export const transferCash = async (body: TransferCashBody, key: string): Promise<CashTransfer> => {
  const { data } = await http.post<CashTransfer>('/cash-movements/transfer', body, withKey(key));
  return data;
};

/** POST /cash-movements/:id/reverse */
export const reverseCashMovement = async (
  id: string,
  body: ReverseCashMovementBody,
  key: string,
): Promise<CashMovement> => {
  const { data } = await http.post<CashMovement>(`/cash-movements/${id}/reverse`, body, withKey(key));
  return data;
};

/** POST /cash-movements/:id/reverse-transfer (revierte las dos patas) */
export const reverseCashTransfer = async (
  id: string,
  body: ReverseCashMovementBody,
  key: string,
): Promise<CashTransfer> => {
  const { data } = await http.post<CashTransfer>(`/cash-movements/${id}/reverse-transfer`, body, withKey(key));
  return data;
};

// ── Categorías ──────────────────────────────────────────────────────────────

export interface CashCategoryFilters {
  direction?: CashCategory['direction'];
  includeInactive?: boolean;
}

/** GET /cash-categories */
export const listCashCategories = async (
  params: ListParams,
  filters: CashCategoryFilters = {},
): Promise<CashCategoryPage> => {
  const { data } = await http.get<CashCategoryPage>('/cash-categories', { params: { ...paging(params), ...filters } });
  return data;
};

/** POST /cash-categories */
export const createCashCategory = async (body: CreateCashCategoryBody, key: string): Promise<CashCategory> => {
  const { data } = await http.post<CashCategory>('/cash-categories', body, withKey(key));
  return data;
};

/** PATCH /cash-categories/:id */
export const updateCashCategory = async (
  id: string,
  body: UpdateCashCategoryBody,
  key: string,
): Promise<CashCategory> => {
  const { data } = await http.patch<CashCategory>(`/cash-categories/${id}`, body, withKey(key));
  return data;
};

// ── Rendiciones ─────────────────────────────────────────────────────────────

export interface SettlementFilters {
  date?: string;
  status?: DriverSettlementDetail['status'];
  deliveryId?: string;
}

/** Los parámetros de GET /driver-settlements sin paginar: los mismos que usa el exporte completo. */
export const settlementQuery = (filters: SettlementFilters) => ({ ...filters });

/** GET /driver-settlements */
export const listDriverSettlements = async (
  params: ListParams,
  filters: SettlementFilters = {},
): Promise<DriverSettlementPage> => {
  const { data } = await http.get<DriverSettlementPage>('/driver-settlements', {
    params: { ...paging(params), ...settlementQuery(filters) },
  });
  return data;
};

/** GET /driver-settlements/:id */
export const getDriverSettlement = async (id: string): Promise<DriverSettlementDetail> => {
  const { data } = await http.get<DriverSettlementDetail>(`/driver-settlements/${id}`);
  return data;
};

/**
 * POST /v2/cash-sessions/:id/close-preview: lo esperado y la diferencia que calcula el back para lo que se está
 * contando. No escribe nada.
 */
export const previewCloseCashSession = async (
  id: string,
  body: PreviewCloseCashSessionBody,
): Promise<CloseCashSessionPreview> => {
  const { data } = await http.post<CloseCashSessionPreview>(`/cash-sessions/${id}/close-preview`, body, {
    baseURL: env.apiUrlV2,
  });
  return data;
};

/** POST /driver-settlements */
export const openDriverSettlement = async (
  body: OpenDriverSettlementBody,
  key: string,
): Promise<DriverSettlementDetail> => {
  const { data } = await http.post<DriverSettlementDetail>('/driver-settlements', body, withKey(key));
  return data;
};

/**
 * POST /v2/driver-settlements/:id/preview: lo esperado y la diferencia que calcula el back para el efectivo y los
 * gastos que se están escribiendo. No escribe nada.
 */
export const previewDriverSettlement = async (
  id: string,
  body: PreviewDriverSettlementBody,
): Promise<SettlementPreview> => {
  const { data } = await http.post<SettlementPreview>(`/driver-settlements/${id}/preview`, body, {
    baseURL: env.apiUrlV2,
  });
  return data;
};

/** POST /driver-settlements/:id/submit */
export const submitDriverSettlement = async (
  id: string,
  body: SubmitDriverSettlementBody,
  key: string,
): Promise<DriverSettlementDetail> => {
  const { data } = await http.post<DriverSettlementDetail>(`/driver-settlements/${id}/submit`, body, withKey(key));
  return data;
};

/** PATCH /driver-settlements/:id/approve */
export const approveDriverSettlement = async (
  id: string,
  body: ApproveDriverSettlementBody,
  key: string,
): Promise<DriverSettlementDetail> => {
  const { data } = await http.patch<DriverSettlementDetail>(`/driver-settlements/${id}/approve`, body, withKey(key));
  return data;
};

/** PATCH /driver-settlements/:id/reopen */
export const reopenDriverSettlement = async (id: string, key: string): Promise<DriverSettlementDetail> => {
  const { data } = await http.patch<DriverSettlementDetail>(`/driver-settlements/${id}/reopen`, {}, withKey(key));
  return data;
};

// ── Cuentas corrientes ──────────────────────────────────────────────────────

export interface CustomerAccountFilters {
  status?: CustomerAccountDetail['status'];
  overdue?: boolean;
  q?: string;
}

/** Los parámetros de GET /customer-accounts sin paginar: los mismos que usa el exporte completo. */
export const customerAccountQuery = (filters: CustomerAccountFilters) => ({ ...filters });

/** GET /customer-accounts */
export const listCustomerAccounts = async (
  params: ListParams,
  filters: CustomerAccountFilters = {},
): Promise<CustomerAccountPage> => {
  const { data } = await http.get<CustomerAccountPage>('/customer-accounts', {
    params: { ...paging(params), ...customerAccountQuery(filters) },
  });
  return data;
};

/** GET /customer-accounts/:id */
export const getCustomerAccount = async (id: string): Promise<CustomerAccountDetail> => {
  const { data } = await http.get<CustomerAccountDetail>(`/customer-accounts/${id}`);
  return data;
};

/** GET /customer-accounts/aging */
export const getCustomerAging = async (): Promise<AgingReport> => {
  const { data } = await http.get<AgingReport>('/customer-accounts/aging');
  return data;
};

/** POST /customer-accounts */
export const createCustomerAccount = async (
  body: CreateCustomerAccountBody,
  key: string,
): Promise<CustomerAccountDetail> => {
  const { data } = await http.post<CustomerAccountDetail>('/customer-accounts', body, withKey(key));
  return data;
};

/** PATCH /customer-accounts/:id */
export const updateCustomerAccount = async (
  id: string,
  body: UpdateCustomerAccountBody,
  key: string,
): Promise<CustomerAccountDetail> => {
  const { data } = await http.patch<CustomerAccountDetail>(`/customer-accounts/${id}`, body, withKey(key));
  return data;
};

/** GET /customer-accounts/:id/entries: el estado de cuenta. */
export const getCustomerStatement = async (
  id: string,
  params: ListParams,
  range: { from?: string; to?: string } = {},
): Promise<CustomerStatement> => {
  const { data } = await http.get<CustomerStatement>(`/customer-accounts/${id}/entries`, {
    params: { ...paging(params), ...range },
  });
  return data;
};

/** POST /customer-accounts/:id/payments */
export const registerCustomerPayment = async (
  id: string,
  body: RegisterPaymentBody,
  key: string,
): Promise<CustomerEntry> => {
  const { data } = await http.post<CustomerEntry>(`/customer-accounts/${id}/payments`, body, withKey(key));
  return data;
};

/** POST /customer-accounts/:id/adjustments */
export const registerCustomerAdjustment = async (
  id: string,
  body: RegisterAdjustmentBody,
  key: string,
): Promise<CustomerEntry> => {
  const { data } = await http.post<CustomerEntry>(`/customer-accounts/${id}/adjustments`, body, withKey(key));
  return data;
};

// ── Comisiones ──────────────────────────────────────────────────────────────

export interface CommissionRuleFilters {
  employeeId?: string;
  activeOnly?: boolean;
}

/** GET /commission-rules */
export const listCommissionRules = async (
  params: ListParams,
  filters: CommissionRuleFilters = {},
): Promise<CommissionRulePage> => {
  const { data } = await http.get<CommissionRulePage>('/commission-rules', {
    params: { ...paging(params), ...filters },
  });
  return data;
};

/** POST /commission-rules */
export const createCommissionRule = async (body: CreateCommissionRuleBody, key: string): Promise<CommissionRule> => {
  const { data } = await http.post<CommissionRule>('/commission-rules', body, withKey(key));
  return data;
};

/** PATCH /commission-rules/:id */
export const updateCommissionRule = async (
  id: string,
  body: UpdateCommissionRuleBody,
  key: string,
): Promise<CommissionRule> => {
  const { data } = await http.patch<CommissionRule>(`/commission-rules/${id}`, body, withKey(key));
  return data;
};

export interface CommissionEntryFilters {
  employeeId?: string;
  type?: CommissionEntryPage['data'][number]['type'];
  liquidated?: boolean;
  from?: string;
  to?: string;
}

/** GET /commissions */
export const listCommissionEntries = async (
  params: ListParams,
  filters: CommissionEntryFilters = {},
): Promise<CommissionEntryPage> => {
  const { data } = await http.get<CommissionEntryPage>('/commissions', { params: { ...paging(params), ...filters } });
  return data;
};

export interface LiquidationFilters {
  employeeId?: string;
  status?: DriverLiquidation['status'];
}

/** Los parámetros de GET /driver-liquidations sin paginar: los mismos que usa el exporte completo. */
export const liquidationQuery = (filters: LiquidationFilters) => ({ ...filters });

/** GET /driver-liquidations */
export const listDriverLiquidations = async (
  params: ListParams,
  filters: LiquidationFilters = {},
): Promise<DriverLiquidationPage> => {
  const { data } = await http.get<DriverLiquidationPage>('/driver-liquidations', {
    params: { ...paging(params), ...liquidationQuery(filters) },
  });
  return data;
};

/** GET /driver-liquidations/:id */
export const getDriverLiquidation = async (id: string): Promise<DriverLiquidationDetail> => {
  const { data } = await http.get<DriverLiquidationDetail>(`/driver-liquidations/${id}`);
  return data;
};

/** POST /driver-liquidations */
export const createDriverLiquidation = async (
  body: CreateDriverLiquidationBody,
  key: string,
): Promise<DriverLiquidation> => {
  const { data } = await http.post<DriverLiquidation>('/driver-liquidations', body, withKey(key));
  return data;
};

/** PATCH /driver-liquidations/:id/approve */
export const approveDriverLiquidation = async (id: string, key: string): Promise<DriverLiquidation> => {
  const { data } = await http.patch<DriverLiquidation>(`/driver-liquidations/${id}/approve`, {}, withKey(key));
  return data;
};

/** PATCH /driver-liquidations/:id/pay */
export const payDriverLiquidation = async (
  id: string,
  body: PayDriverLiquidationBody,
  key: string,
): Promise<DriverLiquidation> => {
  const { data } = await http.patch<DriverLiquidation>(`/driver-liquidations/${id}/pay`, body, withKey(key));
  return data;
};

/** PATCH /driver-liquidations/:id/unpay */
export const unpayDriverLiquidation = async (
  id: string,
  body: UnpayDriverLiquidationBody,
  key: string,
): Promise<DriverLiquidation> => {
  const { data } = await http.patch<DriverLiquidation>(`/driver-liquidations/${id}/unpay`, body, withKey(key));
  return data;
};

/** PATCH /driver-liquidations/:id/void */
export const voidDriverLiquidation = async (id: string, key: string): Promise<DriverLiquidation> => {
  const { data } = await http.patch<DriverLiquidation>(`/driver-liquidations/${id}/void`, {}, withKey(key));
  return data;
};

// ── Tablero ─────────────────────────────────────────────────────────────────

/** GET /finance/dashboard */
export const getFinanceDashboard = async (date?: string): Promise<FinanceDashboard> => {
  const { data } = await http.get<FinanceDashboard>('/finance/dashboard', { params: { date } });
  return data;
};

export interface IncomeStatementFilters {
  from: string;
  to: string;
  groupBy?: IncomeStatement['groupBy'];
  cashBoxId?: string;
}

/** GET /v2/finance/income-statement: ingresos y egresos de un período, por categoría, período y caja. */
export const getIncomeStatement = async (filters: IncomeStatementFilters): Promise<IncomeStatement> => {
  const { data } = await http.get<IncomeStatement>('/finance/income-statement', {
    baseURL: env.apiUrlV2,
    params: filters,
  });
  return data;
};
