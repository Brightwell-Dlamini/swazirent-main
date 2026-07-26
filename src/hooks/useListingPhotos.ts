// src/hooks/useListingPhotos.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { compressImages } from '@/lib/compressImage';

/** Photo picker: compress, drag-reorder (index 0 = cover), drop zone */
export function useListingPhotos(maxPhotos: number) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);

  const appendFiles = useCallback(
    async (incoming: File[]) => {
      const images = incoming.filter((f) => f.type.startsWith('image/'));
      if (!images.length) {
        toast.error('Please choose image files');
        return;
      }
      if (photos.length + images.length > maxPhotos) {
        toast.error(`Maximum ${maxPhotos} photos`);
        return;
      }
      setCompressing(true);
      try {
        const compressed = await compressImages(images);
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

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const incoming = Array.from(e.target.files || []);
      e.target.value = '';
      await appendFiles(incoming);
    },
    [appendFiles]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const incoming = Array.from(e.dataTransfer.files || []);
      await appendFiles(incoming);
    },
    [appendFiles]
  );

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  /** Move photo at fromIndex to toIndex; index 0 is always cover */
  const movePhoto = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
    setPhotoPreviews((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  const setAsCover = useCallback(
    (index: number) => {
      if (index <= 0) return;
      movePhoto(index, 0);
      toast.success('Cover photo updated');
    },
    [movePhoto]
  );

  useEffect(
    () => () => {
      photoPreviews.forEach((p) => URL.revokeObjectURL(p));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return {
    photos,
    photoPreviews,
    compressing,
    handlePhotoUpload,
    handleDrop,
    removePhoto,
    movePhoto,
    setAsCover,
  };
}
