import type { EmployeeBody } from '../../services/api/employees';
import type { Employee } from '../../services/api/types';
import type { EmployeeFormValues } from './employeeSchema';

const nullable = (value: string) => value.trim() || null;

/** Del formulario al cuerpo del back: los textos vacíos viajan como `null` y un legajo nuevo sin número toma el correlativo. */
export const toEmployeeBody = (values: EmployeeFormValues): EmployeeBody => ({
  firstName: values.firstName,
  lastName: values.lastName,
  positionId: values.positionId,
  documentType: values.documentType,
  documentNumber: values.documentNumber,
  hireDate: values.hireDate,
  employmentType: values.employmentType,
  ...(values.fileNumber && { fileNumber: values.fileNumber }),
  cuil: nullable(values.cuil),
  birthDate: nullable(values.birthDate),
  phone: nullable(values.phone),
  personalEmail: nullable(values.personalEmail),
  addressLine: nullable(values.addressLine),
  city: nullable(values.city),
  province: nullable(values.province),
  postalCode: nullable(values.postalCode),
  emergencyContactName: nullable(values.emergencyContactName),
  emergencyContactPhone: nullable(values.emergencyContactPhone),
  emergencyContactRelationship: nullable(values.emergencyContactRelationship),
  notes: nullable(values.notes),
});

export const emptyEmployeeValues: EmployeeFormValues = {
  firstName: '',
  lastName: '',
  positionId: '',
  documentType: 'dni',
  documentNumber: '',
  hireDate: '',
  employmentType: 'permanent',
  fileNumber: '',
  cuil: '',
  birthDate: '',
  phone: '',
  personalEmail: '',
  addressLine: '',
  city: '',
  province: '',
  postalCode: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelationship: '',
  notes: '',
};

export const employeeToValues = (e: Employee): EmployeeFormValues => ({
  firstName: e.firstName,
  lastName: e.lastName,
  positionId: e.position.positionId,
  documentType: e.documentType,
  documentNumber: e.documentNumber,
  hireDate: e.hireDate,
  employmentType: e.employmentType,
  fileNumber: e.fileNumber,
  cuil: e.cuil ?? '',
  birthDate: e.birthDate ?? '',
  phone: e.phone ?? '',
  personalEmail: e.personalEmail ?? '',
  addressLine: e.addressLine ?? '',
  city: e.city ?? '',
  province: e.province ?? '',
  postalCode: e.postalCode ?? '',
  emergencyContactName: e.emergencyContactName ?? '',
  emergencyContactPhone: e.emergencyContactPhone ?? '',
  emergencyContactRelationship: e.emergencyContactRelationship ?? '',
  notes: e.notes ?? '',
});
