// src/hooks/useListingPhotos.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { compressImages } from '@/lib/compressImage';

/** Photo picker with client-side compression for mobile uploads */
export function useListingPhotos(maxPhotos: number) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const incoming = Array.from(e.target.files || []);
      e.target.value = '';
      if (!incoming.length) return;
      if (photos.length + incoming.length > maxPhotos) {
        toast.error(`Maximum ${maxPhotos} photos`);
        return;
      }
      setCompressing(true);
      try {
        const compressed = await compressImages(incoming);
        setPhotos((prev) => [...prev, ...compressed]);
        setPhotoPreviews((prev) => [
          ...prev,
          ...compressed.map((f) => URL.createObjectURL(f)),
        ]);
      } finally {
        setCompressing(false);
      }
    },
    [photos.length, maxPhotos]
  );

  const removePhoto = useCallback(
    (index: number) => {
      setPhotos((prev) => prev.filter((_, i) => i !== index));
      setPhotoPreviews((prev) => {
        const url = prev[index];
        if (url) URL.revokeObjectURL(url);
        return prev.filter((_, i) => i !== index);
      });
    },
    []
  );

  useEffect(
    () => () => {
      photoPreviews.forEach((p) => URL.revokeObjectURL(p));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return { photos, photoPreviews, compressing, handlePhotoUpload, removePhoto, setPhotos };
}
