import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getBankDetails, putBankDetails } from '../api/bankDetails';
import type { BankDetailsBody } from '../api/types';
import { queryKeys } from './queryKeys';

const key = queryKeys.bankDetails.all;

export const useBankDetails = ({ enabled = true }: { enabled?: boolean } = {}) =>
  useQuery({ queryKey: key, queryFn: getBankDetails, enabled });

export const useUpdateBankDetails = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BankDetailsBody) => putBankDetails(body),
    onSuccess: (saved) => {
      queryClient.setQueryData(key, saved);
    },
  });
};
