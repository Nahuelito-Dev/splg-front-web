import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignCylinders,
  createCylinder,
  getCylinderHistory,
  listCylinders,
  transitionCylinder,
} from '../api/physicalCylinders';
import type { AssignCylindersBody, CreateCylinderBody, Cylinder, TransitionCylinderBody } from '../api/types';
import { queryKeys } from './queryKeys';

const keys = queryKeys.cylinders;

export const useCylinders = (state?: Cylinder['state']) =>
  useQuery({
    queryKey: keys.list({ state }),
    queryFn: () => listCylinders(state),
  });

export const useCylinderHistory = (id: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: [...keys.detail(id ?? ''), 'history'],
    queryFn: () => getCylinderHistory(id ?? ''),
    enabled: Boolean(id) && enabled,
  });

export const useCreateCylinder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCylinderBody) => createCylinder(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useTransitionCylinder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: TransitionCylinderBody }) => transitionCylinder(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};

export const useAssignCylinders = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AssignCylindersBody) => assignCylinders(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
};
