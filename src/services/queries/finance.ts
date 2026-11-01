import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { ApiError, toApiError } from '../api/errors';
import {
  approveDriverLiquidation,
  approveDriverSettlement,
  closeCashSession,
  createCashBox,
  createCashCategory,
  createCashMovement,
  createCommissionRule,
  createCustomerAccount,
  createDriverLiquidation,
  getCashBox,
  getCashSession,
  getCustomerAccount,
  getCustomerAging,
  getCustomerStatement,
  getDriverLiquidation,
  getDriverSettlement,
  getFinanceDashboard,
  getIncomeStatement,
  listCashBoxes,
  listCashCategories,
  listCashMovements,
  listCashSessions,
  listCommissionEntries,
  listCommissionRules,
  listCustomerAccounts,
  listDriverLiquidations,
  listDriverSettlements,
  previewDriverSettlement,
  openCashSession,
  openDriverSettlement,
  payDriverLiquidation,
  registerCustomerAdjustment,
  registerCustomerPayment,
  reopenDriverSettlement,
  reverseCashMovement,
  reverseCashTransfer,
  submitDriverSettlement,
  transferCash,
  updateCashBox,
  updateCashCategory,
  updateCommissionRule,
  updateCustomerAccount,
  unpayDriverLiquidation,
  voidDriverLiquidation,
  type CashBoxFilters,
  type CashCategoryFilters,
  type CashMovementFilters,
  type CommissionEntryFilters,
  type CommissionRuleFilters,
  type IncomeStatementFilters,
  type CustomerAccountFilters,
  type LiquidationFilters,
  type SettlementFilters,
} from '../api/finance';
import { clearIntent, intentKey } from '../api/idempotency';
import type { ListParams } from '../api/stock';
import type {
  ApproveDriverSettlementBody,
  CloseCashSessionBody,
  CreateCashBoxBody,
  CreateCashCategoryBody,
  CreateCashMovementBody,
  CreateCommissionRuleBody,
  CreateCustomerAccountBody,
  CreateDriverLiquidationBody,
  OpenCashSessionBody,
  OpenDriverSettlementBody,
  PayDriverLiquidationBody,
  RegisterAdjustmentBody,
  RegisterPaymentBody,
  ReverseCashMovementBody,
  UnpayDriverLiquidationBody,
  PreviewDriverSettlementBody,
  SubmitDriverSettlementBody,
  TransferCashBody,
  UpdateCashBoxBody,
  UpdateCashCategoryBody,
  UpdateCommissionRuleBody,
  UpdateCustomerAccountBody,
} from '../api/types';
import { ACCOUNT_STATUS, LIQUIDATION_STATUS, SETTLEMENT_STATUS, statusKeys } from '../../utils/statusLabels';
import { useStatusCounts } from './statusCounts';
import { queryKeys } from './queryKeys';

interface Options {
  enabled?: boolean;
}

export const UNCERTAIN_MESSAGE = 'No sabemos si se registró: revisá antes de reintentar';

/** Todo lo de finanzas: una operación de plata puede mover cajas, rendiciones, cuentas y comisiones a la vez. */
const FINANCE_KEYS = [
  queryKeys.cashBoxes.all,
  queryKeys.cashSessions.all,
  queryKeys.cashMovements.all,
  queryKeys.cashCategories.all,
  queryKeys.cashSettings.all,
  queryKeys.mpReconciliations.all,
  queryKeys.driverSettlements.all,
  queryKeys.customerAccounts.all,
  queryKeys.commissionEntries.all,
  queryKeys.commissionRules.all,
  queryKeys.driverLiquidations.all,
  queryKeys.finance.all,
];

export const refreshFinance = (queryClient: QueryClient) =>
  Promise.all(FINANCE_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

/**
 * Corre una operación que mueve plata con la clave de su intención:
 * - sale bien: la intención se descarta;
 * - error sin respuesta (red, timeout): puede haberse registrado. Se refresca todo y el mensaje lo dice; la clave se
 *   conserva para que el reintento no duplique;
 * - 422 (la clave ya se usó con otros datos): se descarta la intención y se muestra el mensaje del back.
 */
export const runMoney = async <T>(
  queryClient: QueryClient,
  scope: string,
  body: unknown,
  call: (key: string) => Promise<T>,
): Promise<T> => {
  try {
    const result = await call(intentKey(scope, body));
    clearIntent(scope);
    return result;
  } catch (error) {
    const api = toApiError(error);
    if (api.status === null) {
      await refreshFinance(queryClient);
      throw new ApiError(null, [UNCERTAIN_MESSAGE]);
    }
    if (api.status === 422) {
      clearIntent(scope);
      await refreshFinance(queryClient);
    }
    throw error;
  }
};

/** Una mutación de plata: su intención, y al terminar se refresca todo lo de finanzas. */
export const useMoneyMutation = <V, R>(
  scopeOf: (variables: V) => string,
  bodyOf: (variables: V) => unknown,
  call: (variables: V, key: string) => Promise<R>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: V) =>
      runMoney(queryClient, scopeOf(variables), bodyOf(variables), (key) => call(variables, key)),
    onSuccess: () => refreshFinance(queryClient),
  });
};

// ── Tablero ─────────────────────────────────────────────────────────────────

export const useFinanceDashboard = (date?: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.finance.list({ date: date ?? '' }),
    queryFn: () => getFinanceDashboard(date),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useIncomeStatement = (filters: IncomeStatementFilters, enabled = true) =>
  useQuery({
    queryKey: queryKeys.finance.list({ incomeStatement: true, ...filters }),
    queryFn: () => getIncomeStatement(filters),
    placeholderData: keepPreviousData,
    enabled,
  });

/** Cuántas rendiciones hay en cada estado del día (o de todos, sin fecha). */
export const useSettlementStatusCounts = (filters: Omit<SettlementFilters, 'status'>, enabled = true) =>
  useStatusCounts(
    statusKeys(SETTLEMENT_STATUS),
    (status) => queryKeys.driverSettlements.list({ ...filters, counts: status }),
    (status) => listDriverSettlements({ page: 0, pageSize: 1 }, { ...filters, status }).then((page) => page.total),
    enabled,
  );

/**
 * Rendiciones por estado para las pestañas. Con un día elegido salen del tablero financiero (una sola consulta, la
 * misma de las cifras de arriba); sin día («todos los días») el tablero no sirve y se cuenta estado por estado.
 */
export const useSettlementCounts = (date: string | undefined) => {
  const dashboard = useFinanceDashboard(date, date !== undefined);
  const perStatus = useSettlementStatusCounts({}, date === undefined);
  if (date === undefined) return perStatus;
  const day = dashboard.data?.settlements;
  if (!day) return { all: null, open: null, submitted: null, approved: null };
  return {
    all: day.open + day.submitted + day.approved,
    open: day.open,
    submitted: day.submitted,
    approved: day.approved,
  };
};

/** Cuántas liquidaciones hay en cada estado. */
export const useLiquidationStatusCounts = () =>
  useStatusCounts(
    statusKeys(LIQUIDATION_STATUS),
    (status) => queryKeys.driverLiquidations.list({ counts: status }),
    (status) => listDriverLiquidations({ page: 0, pageSize: 1 }, { status }).then((page) => page.total),
  );

/** Cuántas cuentas corrientes hay en cada estado, con la búsqueda y «vencidas» aplicadas. */
export const useCustomerAccountStatusCounts = (filters: Omit<CustomerAccountFilters, 'status'>) =>
  useStatusCounts(
    statusKeys(ACCOUNT_STATUS),
    (status) => queryKeys.customerAccounts.list({ ...filters, counts: status }),
    (status) => listCustomerAccounts({ page: 0, pageSize: 1 }, { ...filters, status }).then((page) => page.total),
  );

// ── Cajas ───────────────────────────────────────────────────────────────────

export const useCashBoxes = (params: ListParams, filters: CashBoxFilters = {}, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.cashBoxes.list({ ...params, ...filters }),
    queryFn: () => listCashBoxes(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

/** Todas las cajas activas, para los combos. */
export const useCashBoxOptions = ({ enabled = true }: Options = {}) =>
  useCashBoxes({ page: 0, pageSize: 100 }, {}, { enabled });

export const useCashBox = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.cashBoxes.detail(id ?? ''),
    queryFn: () => getCashBox(id ?? ''),
    enabled: Boolean(id),
  });

export const useCashSessions = (id: string | undefined, params: ListParams) =>
  useQuery({
    queryKey: queryKeys.cashSessions.list({ id: id ?? '', ...params }),
    queryFn: () => listCashSessions(id ?? '', params),
    placeholderData: keepPreviousData,
    enabled: Boolean(id),
  });

export const useCashSession = (id: string | undefined, { enabled = true }: Options = {}) =>
  useQuery({
    queryKey: queryKeys.cashSessions.detail(id ?? ''),
    queryFn: () => getCashSession(id ?? ''),
    enabled: Boolean(id) && enabled,
  });

export const useCreateCashBox = () =>
  useMoneyMutation<CreateCashBoxBody, Awaited<ReturnType<typeof createCashBox>>>(
    () => 'cash-box:new',
    (body) => body,
    (body, key) => createCashBox(body, key),
  );

export const useUpdateCashBox = () =>
  useMoneyMutation<{ id: string; body: UpdateCashBoxBody }, Awaited<ReturnType<typeof updateCashBox>>>(
    ({ id }) => `cash-box:edit:${id}`,
    ({ body }) => body,
    ({ id, body }, key) => updateCashBox(id, body, key),
  );

export const useOpenCashSession = () =>
  useMoneyMutation<{ id: string; body: OpenCashSessionBody }, Awaited<ReturnType<typeof openCashSession>>>(
    ({ id }) => `cash-session:open:${id}`,
    ({ body }) => body,
    ({ id, body }, key) => openCashSession(id, body, key),
  );

export const useCloseCashSession = () =>
  useMoneyMutation<{ id: string; body: CloseCashSessionBody }, Awaited<ReturnType<typeof closeCashSession>>>(
    ({ id }) => `cash-session:close:${id}`,
    ({ body }) => body,
    ({ id, body }, key) => closeCashSession(id, body, key),
  );

// ── Movimientos y categorías ────────────────────────────────────────────────

export const useCashMovements = (
  params: ListParams,
  filters: CashMovementFilters = {},
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: queryKeys.cashMovements.list({ ...params, ...filters }),
    queryFn: () => listCashMovements(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useCreateCashMovement = () =>
  useMoneyMutation<CreateCashMovementBody, Awaited<ReturnType<typeof createCashMovement>>>(
    () => 'cash-movement:new',
    (body) => body,
    (body, key) => createCashMovement(body, key),
  );

export const useTransferCash = () =>
  useMoneyMutation<TransferCashBody, Awaited<ReturnType<typeof transferCash>>>(
    () => 'cash-transfer:new',
    (body) => body,
    (body, key) => transferCash(body, key),
  );

export const useReverseCashMovement = () =>
  useMoneyMutation<{ id: string; body: ReverseCashMovementBody }, Awaited<ReturnType<typeof reverseCashMovement>>>(
    ({ id }) => `cash-movement:reverse:${id}`,
    ({ body }) => body,
    ({ id, body }, key) => reverseCashMovement(id, body, key),
  );

export const useReverseCashTransfer = () =>
  useMoneyMutation<{ id: string; body: ReverseCashMovementBody }, Awaited<ReturnType<typeof reverseCashTransfer>>>(
    ({ id }) => `cash-transfer:reverse:${id}`,
    ({ body }) => body,
    ({ id, body }, key) => reverseCashTransfer(id, body, key),
  );

export const useCashCategories = (
  params: ListParams,
  filters: CashCategoryFilters = {},
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: queryKeys.cashCategories.list({ ...params, ...filters }),
    queryFn: () => listCashCategories(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useCreateCashCategory = () =>
  useMoneyMutation<CreateCashCategoryBody, Awaited<ReturnType<typeof createCashCategory>>>(
    () => 'cash-category:new',
    (body) => body,
    (body, key) => createCashCategory(body, key),
  );

export const useUpdateCashCategory = () =>
  useMoneyMutation<{ id: string; body: UpdateCashCategoryBody }, Awaited<ReturnType<typeof updateCashCategory>>>(
    ({ id }) => `cash-category:edit:${id}`,
    ({ body }) => body,
    ({ id, body }, key) => updateCashCategory(id, body, key),
  );

// ── Rendiciones ─────────────────────────────────────────────────────────────

export const useDriverSettlements = (params: ListParams, filters: SettlementFilters = {}) =>
  useQuery({
    queryKey: queryKeys.driverSettlements.list({ ...params, ...filters }),
    queryFn: () => listDriverSettlements(params, filters),
    placeholderData: keepPreviousData,
  });

export const useDriverSettlement = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.driverSettlements.detail(id ?? ''),
    queryFn: () => getDriverSettlement(id ?? ''),
    enabled: Boolean(id),
  });

export const useOpenDriverSettlement = () =>
  useMoneyMutation<OpenDriverSettlementBody, Awaited<ReturnType<typeof openDriverSettlement>>>(
    () => 'settlement:new',
    (body) => body,
    (body, key) => openDriverSettlement(body, key),
  );

/**
 * La diferencia de una rendición abierta según el back, para lo que se está escribiendo. La respuesta queda atada a su
 * clave (el efectivo y los gastos): una lenta de un valor viejo nunca reemplaza a la del valor actual.
 */
export const useDriverSettlementPreview = (id: string, body: PreviewDriverSettlementBody | null, enabled = true) =>
  useQuery({
    queryKey: [...queryKeys.driverSettlements.detail(id), 'preview', body],
    queryFn: () => previewDriverSettlement(id, body as PreviewDriverSettlementBody),
    enabled: enabled && body !== null,
    retry: false,
    gcTime: 0,
  });

export const useSubmitDriverSettlement = () =>
  useMoneyMutation<
    { id: string; body: SubmitDriverSettlementBody },
    Awaited<ReturnType<typeof submitDriverSettlement>>
  >(
    ({ id }) => `settlement:submit:${id}`,
    ({ body }) => body,
    ({ id, body }, key) => submitDriverSettlement(id, body, key),
  );

export const useApproveDriverSettlement = () =>
  useMoneyMutation<
    { id: string; body: ApproveDriverSettlementBody },
    Awaited<ReturnType<typeof approveDriverSettlement>>
  >(
    ({ id }) => `settlement:approve:${id}`,
    ({ body }) => body,
    ({ id, body }, key) => approveDriverSettlement(id, body, key),
  );

export const useReopenDriverSettlement = () =>
  useMoneyMutation<string, Awaited<ReturnType<typeof reopenDriverSettlement>>>(
    (id) => `settlement:reopen:${id}`,
    () => ({}),
    (id, key) => reopenDriverSettlement(id, key),
  );

// ── Cuentas corrientes ──────────────────────────────────────────────────────

export const useCustomerAccounts = (
  params: ListParams,
  filters: CustomerAccountFilters = {},
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: queryKeys.customerAccounts.list({ ...params, ...filters }),
    queryFn: () => listCustomerAccounts(params, filters),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useCustomerAccount = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.customerAccounts.detail(id ?? ''),
    queryFn: () => getCustomerAccount(id ?? ''),
    enabled: Boolean(id),
  });

/** La cuenta corriente de un cliente en esta distribuidora, si la tiene (busca por su usuario). */
export const useCustomerAccountOf = (
  customerUserId: string | undefined,
  name: string | undefined,
  { enabled = true }: Options = {},
) =>
  useQuery({
    queryKey: queryKeys.customerAccounts.list({ customerUserId: customerUserId ?? '', name: name ?? '' }),
    // La API no filtra por usuario: se busca por nombre si lo hay y se recorren las páginas hasta dar con la cuenta.
    queryFn: async () => {
      const pageSize = 100;
      for (let page = 0; ; page += 1) {
        const result = await listCustomerAccounts({ page, pageSize }, { q: name || undefined });
        const found = result.data.find((account) => account.customerUserId === customerUserId);
        if (found) return found;
        if ((page + 1) * pageSize >= result.total) return null;
      }
    },
    enabled: Boolean(customerUserId) && enabled,
  });

export const useCustomerStatement = (
  id: string | undefined,
  params: ListParams,
  range: { from?: string; to?: string } = {},
) =>
  useQuery({
    queryKey: queryKeys.customerAccounts.detail(
      `statement:${id}:${params.page}:${params.pageSize}:${range.from ?? ''}:${range.to ?? ''}`,
    ),
    queryFn: () => getCustomerStatement(id ?? '', params, range),
    placeholderData: keepPreviousData,
    enabled: Boolean(id),
  });

export const useCustomerAging = () =>
  useQuery({
    queryKey: queryKeys.customerAccounts.detail('aging'),
    queryFn: getCustomerAging,
  });

export const useCreateCustomerAccount = () =>
  useMoneyMutation<CreateCustomerAccountBody, Awaited<ReturnType<typeof createCustomerAccount>>>(
    () => 'customer-account:new',
    (body) => body,
    (body, key) => createCustomerAccount(body, key),
  );

export const useUpdateCustomerAccount = () =>
  useMoneyMutation<{ id: string; body: UpdateCustomerAccountBody }, Awaited<ReturnType<typeof updateCustomerAccount>>>(
    ({ id }) => `customer-account:edit:${id}`,
    ({ body }) => body,
    ({ id, body }, key) => updateCustomerAccount(id, body, key),
  );

export const useRegisterCustomerPayment = () =>
  useMoneyMutation<{ id: string; body: RegisterPaymentBody }, Awaited<ReturnType<typeof registerCustomerPayment>>>(
    ({ id }) => `customer-account:payment:${id}`,
    ({ body }) => body,
    ({ id, body }, key) => registerCustomerPayment(id, body, key),
  );

export const useRegisterCustomerAdjustment = () =>
  useMoneyMutation<
    { id: string; body: RegisterAdjustmentBody },
    Awaited<ReturnType<typeof registerCustomerAdjustment>>
  >(
    ({ id }) => `customer-account:adjustment:${id}`,
    ({ body }) => body,
    ({ id, body }, key) => registerCustomerAdjustment(id, body, key),
  );

// ── Comisiones ──────────────────────────────────────────────────────────────

export const useCommissionRules = (params: ListParams, filters: CommissionRuleFilters = {}) =>
  useQuery({
    queryKey: queryKeys.commissionRules.list({ ...params, ...filters }),
    queryFn: () => listCommissionRules(params, filters),
    placeholderData: keepPreviousData,
  });

export const useCreateCommissionRule = () =>
  useMoneyMutation<CreateCommissionRuleBody, Awaited<ReturnType<typeof createCommissionRule>>>(
    () => 'commission-rule:new',
    (body) => body,
    (body, key) => createCommissionRule(body, key),
  );

export const useUpdateCommissionRule = () =>
  useMoneyMutation<{ id: string; body: UpdateCommissionRuleBody }, Awaited<ReturnType<typeof updateCommissionRule>>>(
    ({ id }) => `commission-rule:edit:${id}`,
    ({ body }) => body,
    ({ id, body }, key) => updateCommissionRule(id, body, key),
  );

export const useCommissionEntries = (params: ListParams, filters: CommissionEntryFilters = {}) =>
  useQuery({
    queryKey: queryKeys.commissionEntries.list({ ...params, ...filters }),
    queryFn: () => listCommissionEntries(params, filters),
    placeholderData: keepPreviousData,
  });

export const useDriverLiquidations = (params: ListParams, filters: LiquidationFilters = {}) =>
  useQuery({
    queryKey: queryKeys.driverLiquidations.list({ ...params, ...filters }),
    queryFn: () => listDriverLiquidations(params, filters),
    placeholderData: keepPreviousData,
  });

export const useDriverLiquidation = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.driverLiquidations.detail(id ?? ''),
    queryFn: () => getDriverLiquidation(id ?? ''),
    enabled: Boolean(id),
  });

export const useCreateDriverLiquidation = () =>
  useMoneyMutation<CreateDriverLiquidationBody, Awaited<ReturnType<typeof createDriverLiquidation>>>(
    (body) => `liquidation:new:${body.employeeId}`,
    (body) => body,
    (body, key) => createDriverLiquidation(body, key),
  );

export const useApproveDriverLiquidation = () =>
  useMoneyMutation<string, Awaited<ReturnType<typeof approveDriverLiquidation>>>(
    (id) => `liquidation:approve:${id}`,
    () => ({}),
    (id, key) => approveDriverLiquidation(id, key),
  );

export const usePayDriverLiquidation = () =>
  useMoneyMutation<{ id: string; body: PayDriverLiquidationBody }, Awaited<ReturnType<typeof payDriverLiquidation>>>(
    ({ id }) => `liquidation:pay:${id}`,
    ({ body }) => body,
    ({ id, body }, key) => payDriverLiquidation(id, body, key),
  );

export const useUnpayDriverLiquidation = () =>
  useMoneyMutation<
    { id: string; body: UnpayDriverLiquidationBody },
    Awaited<ReturnType<typeof unpayDriverLiquidation>>
  >(
    ({ id }) => `liquidation:unpay:${id}`,
    ({ body }) => body,
    ({ id, body }, key) => unpayDriverLiquidation(id, body, key),
  );

export const useVoidDriverLiquidation = () =>
  useMoneyMutation<string, Awaited<ReturnType<typeof voidDriverLiquidation>>>(
    (id) => `liquidation:void:${id}`,
    () => ({}),
    (id, key) => voidDriverLiquidation(id, key),
  );
