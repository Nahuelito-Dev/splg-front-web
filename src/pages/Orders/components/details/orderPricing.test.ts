import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { ApiError } from '../../../../services/api/errors';
import { formatCurrency } from '../../../../utils/format';
import {
  containerChargeLabel,
  containerItemNote,
  containersChargedCount,
  isMissingContainerPrice,
  orderSurchargeLabel,
  paymentSurchargeAmount,
  paymentSurchargeLabel,
  quoteSurchargeLabel,
} from './orderPricing';

describe('paymentSurchargeAmount', () => {
  it('es el que guardó el back, sin deducirlo del total', () => {
    expect(paymentSurchargeAmount({ paymentSurchargeAmount: 1350 })).toBe(1350);
    expect(paymentSurchargeAmount({ paymentSurchargeAmount: 0 })).toBe(0);
  });
});

describe('paymentSurchargeLabel', () => {
  it.each([
    ['transfer', 10, 'Recargo por transferencia (10 %)'],
    ['mercadopago', 7.5, 'Recargo por Mercado Pago (7,5 %)'],
    ['cash', 2, 'Recargo por efectivo (2 %)'],
    ['transfer', 12.34, 'Recargo por transferencia (12,34 %)'],
    ['transfer', 0, 'Recargo por transferencia (0 %)'],
  ])('%s al %s %%', (method, percentage, expected) => {
    expect(paymentSurchargeLabel(method, percentage)).toBe(expected);
  });

  it('un pedido anterior (sin porcentaje) va sin él, y un medio desconocido no se inventa', () => {
    expect(paymentSurchargeLabel('transfer', null)).toBe('Recargo por transferencia');
    expect(paymentSurchargeLabel('account', 5)).toBe('Recargo por medio de pago (5 %)');
    expect(paymentSurchargeLabel(undefined, undefined)).toBe('Recargo por medio de pago');
  });

  it('del pedido y de la cotización', () => {
    expect(orderSurchargeLabel({ paymentMethodDetail: 'mercadopago', paymentSurchargePercentage: 10 })).toBe(
      'Recargo por Mercado Pago (10 %)',
    );
    expect(quoteSurchargeLabel({ paymentMethod: 'transfer', paymentSurchargePercentage: 7.5 })).toBe(
      'Recargo por transferencia (7,5 %)',
    );
  });
});

describe('envases cobrados (F35)', () => {
  it('cuenta los envases que informa el back por renglón', () => {
    expect(containersChargedCount([{ containersCharged: 1 }, { containersCharged: 2 }, { containersCharged: 0 }])).toBe(
      3,
    );
    expect(containersChargedCount([])).toBe(0);
    expect(containerChargeLabel(3)).toBe('Envases (3)');
  });

  it('la aclaración del renglón va en singular o plural y sólo si cobra envases con precio', () => {
    expect(containerItemNote({ containersCharged: 1, containerUnitPrice: 10000 })).toBe(
      `+ 1 envase a ${formatCurrency(10000)}`,
    );
    expect(containerItemNote({ containersCharged: 2, containerUnitPrice: 10000 })).toBe(
      `+ 2 envases a ${formatCurrency(10000)}`,
    );
    expect(containerItemNote({ containersCharged: 0, containerUnitPrice: 10000 })).toBeNull();
    expect(containerItemNote({ containersCharged: 1, containerUnitPrice: null })).toBeNull();
  });

  it('reconoce el 400 de «sin precio del envase» por su code, no por el texto', () => {
    const msg = 'La distribuidora todavía no cargó el precio del envase de Garrafa 10kg: no se puede tomar el pedido';
    expect(isMissingContainerPrice(new ApiError(400, [msg], 'CONTAINER_PRICE_MISSING'))).toBe(true);
    expect(isMissingContainerPrice(new ApiError(400, [msg]))).toBe(false);
    expect(isMissingContainerPrice(new ApiError(400, ['Stock insuficiente'], 'INVALID_ID'))).toBe(false);
    expect(isMissingContainerPrice(new ApiError(500, [msg], 'CONTAINER_PRICE_MISSING'))).toBe(false);
    expect(isMissingContainerPrice(new Error(msg))).toBe(false);
  });

  it('lo reconoce también en el error de axios tal como lo deja la consulta (sin convertir)', () => {
    const msg = 'La distribuidora todavía no cargó el precio del envase de Garrafa 25kg: no se puede tomar el pedido';
    const deAxios = (data: unknown) =>
      new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data,
      });
    expect(isMissingContainerPrice(deAxios({ statusCode: 400, message: msg, code: 'CONTAINER_PRICE_MISSING' }))).toBe(
      true,
    );
    expect(isMissingContainerPrice(deAxios({ statusCode: 400, message: msg }))).toBe(false);
  });
});
