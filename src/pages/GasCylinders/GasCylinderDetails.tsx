import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Button, ErrorState, IconButton, LoadingState } from '../../common/components/ui';
import { useGasCylinder } from '../../services/queries/gasCylinders';
import { CylinderFormModal } from './components/CylinderFormModal';
import { CylinderProfileCard } from './components/details/CylinderProfileCard';
import { PromotionsList } from './components/details/PromotionsList';

export const GasCylinderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const { data: cylinder, isPending, error, refetch } = useGasCylinder(id);

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconButton label="Volver al catálogo" icon={<ArrowBackIcon />} onClick={() => navigate('/cylinders')} />
          <h1 className="text-2xl font-bold tracking-tight text-ink">Ficha del producto</h1>
        </div>
        {cylinder && (
          <Button variant="secondary" icon={<EditOutlinedIcon />} onClick={() => setEditing(true)}>
            Editar
          </Button>
        )}
      </div>

      {isPending ? (
        <LoadingState />
      ) : error || !cylinder ? (
        <ErrorState error={error} resource="El producto" onRetry={() => void refetch()} />
      ) : (
        <div className="space-y-6">
          <CylinderProfileCard cylinder={cylinder} />
          <PromotionsList promotions={cylinder.promotions ?? []} price={cylinder.price} />
        </div>
      )}

      <CylinderFormModal open={editing} onClose={() => setEditing(false)} cylinder={cylinder ?? null} />
    </div>
  );
};
