import { privateAxiosInstance } from './axiosConfig';

export interface Claim {
  claim_id: string;
  order: {
    order_id: string;
    totalAmount: number;
  };
  customer: {
    full_name: string;
    email: string;
    phone_number: string;
  };
  reason: string;
  description: string;
  photoUrl?: string; // URL de la foto del problema
  status: 'pending' | 'in_process' | 'resolved' | 'rejected';
  resolutionNote?: string;
  createdAt: string;
}

// GET ALL
export const getAllClaims = async () => {
  const { data } = await privateAxiosInstance.get<Claim[]>('/claims');
  return data;
};

// RESOLVE CLAIM
export const resolveClaim = async (
  id: string,
  resolution: string,
  status: string,
) => {
  const { data } = await privateAxiosInstance.patch(`/claims/${id}/resolve`, {
    resolution,
    status,
  });
  return data;
};
