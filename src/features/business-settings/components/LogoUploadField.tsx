import { useMutation } from '@tanstack/react-query';
import { ImageIcon, Loader2, Upload } from 'lucide-react';
import { useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api/axios';
import { fileUrl as resolveUrl } from '@/lib/fileUrl';
import { uploadBusinessLogo } from '../business-settings.api';

export function LogoUploadField({
  type,
  label,
  currentPath,
  help,
}: {
  type: 'logo' | 'login_logo';
  label: string;
  currentPath: string | null;
  help?: string;
}) {
  const [preview, setPreview] = useState<string | null>(resolveUrl(currentPath));
  const [error, setError] = useState('');

  const upload = useMutation({
    mutationFn: (file: File) => uploadBusinessLogo(type, file),
    onSuccess: (res) => {
      setPreview(resolveUrl(res.path));
      setError('');
    },
    onError: (e) => setError(getApiErrorMessage(e, 'Could not upload image')),
  });

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
          {preview ? (
            <img src={preview} alt={label} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'cursor-pointer')}>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={upload.isPending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
            }}
          />
          {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Choose image
        </label>
      </div>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
