import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assignCylinders,
  createCylinder,
  getCylinder,
  getCylinderHistory,
  listCylinders,
  transitionCylinder,
} from '../api/physicalCylinders';
import type { AssignCylindersBody, CreateCylinderBody, Cylinder, TransitionCylinderBody } from '../api/types';
import { NEXT_STATES } from '../../pages/PhysicalCylinders/cylinderTransitions';
import { SKIP } from '../../utils/batch';
import { useBatchMutation } from './batchMutation';
import { queryKeys } from './queryKeys';

const keys = queryKeys.cylinders;

export const useCylinders = (state?: Cylinder['state']) =>
  useQuery({
    queryKey: keys.list({ state }),
    queryFn: () => listCylinders(state),
  });

export const useCylinder = (id: string | undefined) =>
  useQuery({
    queryKey: keys.detail(id ?? ''),
    queryFn: () => getCylinder(id ?? ''),
    enabled: Boolean(id),
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

/**
 * Mover varios envases al mismo estado: una llamada por envase, de a una. Antes de cada una se vuelve a pedir el
 * envase: si ya no puede pasar a ese estado se omite en vez de contarlo como falla.
 */
export const useBulkTransitionCylinders = () =>
  useBatchMutation<{ ids: string[]; toState: Cylinder['state'] }>({
    run: async ({ toState }, id) => {
      if (!NEXT_STATES[(await getCylinder(id)).state].includes(toState)) return SKIP;
      return transitionCylinder(id, { toState });
    },
    invalidate: keys.all,
    noun: ['envase', 'envases'],
    participle: ['movido', 'movidos'],
  });
