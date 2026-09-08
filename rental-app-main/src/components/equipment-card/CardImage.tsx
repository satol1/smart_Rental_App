import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CardImageProps { imageUrl?: string; name: string; selected?: boolean }

export function CardImage({ imageUrl, name, selected = false }: CardImageProps) {
  const { t } = useTranslation();
  const [failedUrl, setFailedUrl] = useState<string>();
  return (
    <div className="equipment-image">
      {imageUrl && failedUrl !== imageUrl ? (
        <img src={imageUrl} alt={name} loading="lazy" onError={() => setFailedUrl(imageUrl)}
          className={`transition-transform duration-300 ease-out motion-reduce:transition-none ${selected ? 'scale-[1.03]' : ''}`} />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="size-8 stroke-1" aria-hidden="true" />
          <span className="text-sm">{t('catalogDesign.noPhoto')}</span>
        </div>
      )}
    </div>
  );
}