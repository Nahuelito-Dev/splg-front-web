import { useState } from 'react';
import { useParams } from 'react-router-dom';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Button, DetailSkeleton, ErrorState, PageHeader } from '../../common/components/ui';
import { useBackToList } from '../../hooks';
import { useCrumbLeaf } from '../../common/components';
import { useGasCylinder } from '../../services/queries/gasCylinders';
import { CylinderFormModal } from './components/CylinderFormModal';
import { CylinderProfileCard } from './components/details/CylinderProfileCard';
import { PromotionsList } from './components/details/PromotionsList';

export const GasCylinderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const goBack = useBackToList('/cylinders');
  const [editing, setEditing] = useState(false);
  const { data: cylinder, isPending, error, refetch } = useGasCylinder(id);
  useCrumbLeaf(cylinder?.type, goBack);

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <PageHeader
        title="Ficha del producto"
        actions={
          cylinder && (
            <Button variant="secondary" icon={<EditOutlinedIcon />} onClick={() => setEditing(true)}>
              Editar
            </Button>
          )
        }
      />

      {isPending ? (
        <DetailSkeleton />
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
