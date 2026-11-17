import { usePreviewPlatformAssistant } from '../../../services/queries/assistantLab';
import { PreviewPanel } from '../../Assistant/lab/PreviewPanel';

interface Props {
  blockedReason?: string;
}

/** El probador del asistente del soporte de OrixTech, con la base de OrixTech. */
export const PlatformPreviewTab = ({ blockedReason }: Props) => {
  const preview = usePreviewPlatformAssistant();
  return (
    <PreviewPanel
      scope="platform"
      preview={preview}
      description="Lo que les contestaría a las distribuidoras en el chat de soporte, con las preguntas de OrixTech."
      placeholder="¿Cómo cargo un chofer nuevo?"
      blockedReason={blockedReason}
    />
  );
};
