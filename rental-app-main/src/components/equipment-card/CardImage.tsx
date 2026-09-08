import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CardImageProps { imageUrl?: string; name: string }

export function CardImage({ imageUrl, name }: CardImageProps) {
  const { t } = useTranslation();
  const [failedUrl, setFailedUrl] = useState<string>();
  return (
    <div className="equipment-image">
      {imageUrl && failedUrl !== imageUrl ? (
        <img src={imageUrl} alt={name} loading="lazy" onError={() => setFailedUrl(imageUrl)} />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="size-8 stroke-1" aria-hidden="true" />
          <span className="text-sm">{t('catalogDesign.noPhoto')}</span>
        </div>
      )}
    </div>
  );
}