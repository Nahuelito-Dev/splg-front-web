import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ErrorState, IconButton, LoadingState } from '../../common/components/ui';
import { useDelivery } from '../../services/queries/deliveries';
import { CarsManager } from './components/CarsManager';
import { DeliveryProfileCard } from './components/DeliveryProfileCard';

export const DeliveryDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: delivery, isPending, error, refetch } = useDelivery(id);

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <div className="mb-6 flex items-center gap-3">
        <IconButton label="Volver a choferes" icon={<ArrowBackIcon />} onClick={() => navigate('/deliveries')} />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Ficha del chofer</h1>
      </div>

      {isPending ? (
        <LoadingState />
      ) : error || !delivery ? (
        <ErrorState error={error} resource="El chofer" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-6">
          <DeliveryProfileCard delivery={delivery} />
          <CarsManager userId={delivery.user_id} />
        </div>
      )}
    </div>
  );
};
