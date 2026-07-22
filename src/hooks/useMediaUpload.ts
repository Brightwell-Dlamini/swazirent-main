// src/hooks/useMediaUpload.ts
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { MAX_PHOTOS, MAX_FILE_SIZE } from '@/utils/constants';
import { toast } from 'sonner';

interface UseMediaUploadOptions {
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
}

export function useMediaUpload(options: UseMediaUploadOptions = {}) {
  const {
    maxFiles = MAX_PHOTOS,
    maxFileSize = MAX_FILE_SIZE,
    acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  } = options;

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const previewsRef = useRef<string[]>([]);

  // Keep previewsRef in sync
  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      previewsRef.current.forEach(preview => {
        if (preview && preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, []);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.isArray(newFiles) ? newFiles : Array.from(newFiles);
    
    if (files.length + fileArray.length > maxFiles) {
      setError(`Maximum ${maxFiles} photos allowed`);
      toast.error(`Maximum ${maxFiles} photos allowed`);
      return;
    }

    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    for (const file of fileArray) {
      if (!acceptedTypes.includes(file.type)) {
        toast.error(`${file.name}: Unsupported file type`);
        continue;
      }

      if (file.size > maxFileSize) {
        toast.error(`${file.name}: File too large (max ${maxFileSize / 1024 / 1024}MB)`);
        continue;
      }

      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setPreviews(prev => [...prev, ...validPreviews]);
      setError(null);
    }
  }, [files.length, maxFiles, maxFileSize, acceptedTypes]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    
    const preview = previews[index];
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }, [previews]);

  const clearAll = useCallback(() => {
    previews.forEach(preview => {
      if (preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    });
    setFiles([]);
    setPreviews([]);
    setError(null);
  }, [previews]);

  return {
    files,
    previews,
    error,
    addFiles,
    removeFile,
    clearAll,
    count: files.length,
    maxFiles,
  };
}
