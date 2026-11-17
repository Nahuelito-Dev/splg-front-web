import { env } from '../../config/env';
import { http } from './httpClient';
import type {
  AdminStaffRoleResponseDto,
  AssignStaffRoleBody,
  CreateStaffRoleBody,
  Message,
  StaffRole,
  UpdateStaffRoleBody,
} from './types';

export const listStaffRoles = async (): Promise<StaffRole[]> => {
  const { data } = await http.get<StaffRole[]>('/staff-roles', { baseURL: env.apiUrlV2 });
  return data;
};

export const createStaffRole = async (body: CreateStaffRoleBody): Promise<StaffRole> => {
  const { data } = await http.post<StaffRole>('/staff-roles', body, { baseURL: env.apiUrlV2 });
  return data;
};

export const updateStaffRole = async (id: string, body: UpdateStaffRoleBody): Promise<StaffRole> => {
  const { data } = await http.patch<StaffRole>(`/staff-roles/${id}`, body, { baseURL: env.apiUrlV2 });
  return data;
};

export const deleteStaffRole = async (id: string): Promise<Message> => {
  const { data } = await http.delete<Message>(`/staff-roles/${id}`, { baseURL: env.apiUrlV2 });
  return data;
};

export const assignStaffRole = async (
  adminId: string,
  body: AssignStaffRoleBody,
): Promise<AdminStaffRoleResponseDto> => {
  const { data } = await http.put<AdminStaffRoleResponseDto>(`/admins/${adminId}/staff-role`, body, {
    baseURL: env.apiUrlV2,
  });
  return data;
};
