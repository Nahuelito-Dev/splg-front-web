import { z } from 'zod';
import type { CompanyModule, SetCompanyModuleBody } from '../../../services/api/types';
import type { Label } from '../../../utils/statusLabels';
import { isFutureMoment } from '../../../utils/dates';

/** Largo del motivo, el mismo que valida el back (`SetCompanyModuleDto.reason`, recortado). */
export const REASON_MIN = 10;
export const REASON_MAX = 300;

/** El vencimiento se elige por día y rige hasta el final de ese día en Argentina. */
export const expiryToIso = (day: string): string => `${day}T23:59:59-03:00`;

/**
 * Formulario de la confirmación: motivo obligatorio (10 a 300 caracteres sin contar los espacios de los extremos, como
 * el back) y, sólo si el cambio deja una excepción, un vencimiento opcional que tiene que ser hoy o después.
 */
export const moduleChangeSchema = z.object({
  reason: z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z
        .string()
        .min(1, 'Escribí el motivo')
        .min(REASON_MIN, `El motivo tiene que tener al menos ${REASON_MIN} caracteres`)
        .max(REASON_MAX, `El motivo puede tener hasta ${REASON_MAX} caracteres`),
    ),
  expiresOn: z
    .string()
    .refine(
      (day) => day === '' || isFutureMoment(expiryToIso(day), 0),
      'El vencimiento tiene que ser hoy o una fecha futura',
    ),
});

export type ModuleChangeInput = z.input<typeof moduleChangeSchema>;
export type ModuleChangeValues = z.output<typeof moduleChangeSchema>;

/**
 * Qué se manda al mover el interruptor. Si lo que se quiere coincide con lo que trae el plan, se vuelve a lo del plan
 * (`enabled: null`, sin excepción ni vencimiento); si no, queda una excepción con ese valor.
 */
export const overrideFor = (module: Pick<CompanyModule, 'inPlan'>, wantEnabled: boolean): boolean | null =>
  wantEnabled === module.inPlan ? null : wantEnabled;

export const toModuleBody = (
  module: Pick<CompanyModule, 'inPlan'>,
  wantEnabled: boolean,
  values: ModuleChangeValues,
): SetCompanyModuleBody => {
  const enabled = overrideFor(module, wantEnabled);
  return {
    enabled,
    reason: values.reason,
    ...(enabled !== null && values.expiresOn ? { expiresAt: expiryToIso(values.expiresOn) } : {}),
  };
};

/** De dónde sale el estado del módulo: el plan o una excepción de la plataforma. */
export const moduleSource = (module: Pick<CompanyModule, 'inPlan' | 'override'>): Label => {
  if (module.override) {
    return module.override.enabled
      ? { text: 'Excepción: habilitado', tone: 'accent' }
      : { text: 'Excepción: deshabilitado', tone: 'warn' };
  }
  return module.inPlan ? { text: 'Incluido en el plan', tone: 'neutral' } : { text: 'Fuera del plan', tone: 'neutral' };
};

/**
 * Cómo lo usa la empresa: en uso, apagado por la propia empresa (su interruptor de Procesos automáticos o de la compra
 * express) o sin uso porque la plataforma no lo habilita.
 */
export const moduleUsage = (module: Pick<CompanyModule, 'enabled' | 'companySwitch' | 'effective'>): Label => {
  if (module.effective) return { text: 'En uso', tone: 'success' };
  if (!module.enabled) return { text: 'Deshabilitado', tone: 'neutral' };
  if (module.companySwitch === false) return { text: 'Apagado por la empresa', tone: 'info' };
  return { text: 'Sin uso: empresa suspendida', tone: 'neutral' };
};
