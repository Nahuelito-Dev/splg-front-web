import type { Employee, JobPosition } from '../../services/api/types';

export const DOCUMENT_TYPE_LABELS: Record<Employee['documentType'], string> = {
  dni: 'DNI',
  passport: 'Pasaporte',
  other: 'Otro',
};

export const EMPLOYMENT_TYPE_LABELS: Record<Employee['employmentType'], string> = {
  permanent: 'Efectivo',
  fixed_term: 'Plazo fijo',
  part_time: 'Part-time',
  contractor: 'Contratado',
};

export const POSITION_CATEGORY_LABELS: Record<JobPosition['category'], string> = {
  driver: 'Choferes',
  helper: 'Ayudantes',
  warehouse: 'Depósito',
  administration: 'Administración',
  sales: 'Ventas',
  management: 'Gerencia',
  other: 'Otros',
};

export const TERMINATION_REASON_LABELS: Record<NonNullable<Employee['terminationReason']>, string> = {
  resignation: 'Renuncia',
  dismissal: 'Despido',
  end_of_contract: 'Fin de contrato',
  retirement: 'Jubilación',
  other: 'Otro',
};

export const EMPLOYEE_STATUS_LABELS: Record<Employee['status'], string> = {
  active: 'Activo',
  terminated: 'Egresado',
};

export const employeeFullName = (e: { firstName: string; lastName: string }) => `${e.firstName} ${e.lastName}`;
