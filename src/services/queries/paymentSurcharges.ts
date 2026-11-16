import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPaymentSurcharges, putPaymentSurcharges } from '../api/paymentSurcharges';
import type { PaymentSurchargeConfigBody } from '../api/types';
import { queryKeys } from './queryKeys';

const key = queryKeys.paymentSurcharges.all;

export const usePaymentSurcharges = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: key, queryFn: getPaymentSurcharges, enabled });

export const useUpdatePaymentSurcharges = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PaymentSurchargeConfigBody) => putPaymentSurcharges(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(key, saved);
    },
  });
};
