import { ExternalLink, FileText } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, ErrorState, Skeleton } from '../../../common/components/ui';
import { useFileSourceUrl } from '../../../hooks/useFileSourceUrl';
import type { DocumentReadingAttachment } from '../../../services/api/types';
import { useAttachmentFile, useAttachmentPreview } from '../../../services/queries/attachments';
import { openFileSource } from '../../../utils/fileSource';
import { notify } from '../../../utils/notifications';

interface Props {
  attachment: DocumentReadingAttachment | undefined;
}

/** El archivo leído, al lado de los datos: la imagen o el PDF por URL firmada (se pide al abrir, no se guarda). */
export const AttachmentPreview = ({ attachment }: Props) => {
  const preview = useAttachmentPreview(attachment?.attachmentId);
  const url = useFileSourceUrl(preview.data);
  const opener = useAttachmentFile();
  const isImage = attachment?.mimeType.startsWith('image/') ?? false;
  const isPdf = attachment?.mimeType === 'application/pdf';

  const openInTab = () => {
    if (!attachment) return;
    opener.mutate(
      { attachmentId: attachment.attachmentId, disposition: 'inline' },
      {
        onSuccess: (source) => {
          if (!openFileSource(source)) notify.warn('El navegador bloqueó la pestaña nueva: permití las ventanas.');
        },
        onError: notify.error,
      },
    );
  };

  return (
    <Card className="p-5">
      <CardHeader
        title="Archivo"
        subtitle={attachment?.originalName}
        action={
          attachment && (
            <Button
              size="sm"
              variant="secondary"
              icon={<ExternalLink />}
              loading={opener.isPending}
              onClick={openInTab}
            >
              Abrir
            </Button>
          )
        }
      />
      {!attachment ? (
        <EmptyState icon={FileText} title="Sin archivo" description="La lectura no trae el adjunto." />
      ) : preview.error ? (
        <ErrorState error={preview.error} resource="El archivo" onRetry={() => void preview.refetch()} />
      ) : !url ? (
        <Skeleton className="h-[420px] w-full" />
      ) : isImage ? (
        <img
          src={url}
          alt={`Documento leído: ${attachment.originalName}`}
          className="max-h-[70vh] w-full rounded-lg border border-outline-soft object-contain"
        />
      ) : isPdf ? (
        <object
          data={url}
          type="application/pdf"
          aria-label={`Documento leído: ${attachment.originalName}`}
          className="h-[70vh] min-h-[360px] w-full rounded-lg border border-outline-soft"
        >
          <p className="p-4 text-sm text-muted">
            El navegador no muestra el PDF acá: usá «Abrir» para verlo en otra pestaña.
          </p>
        </object>
      ) : (
        <p className="text-sm text-muted">Este tipo de archivo no se puede mostrar acá: usá «Abrir».</p>
      )}
    </Card>
  );
};
