"use client"

import * as React from "react"
import { Upload, X, Loader, PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadFile } from "@/lib/services/file-upload.service"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface ImageFile {
  url: string;
  file?: File;
  alt?: string;
  is_primary?: boolean;
  isUploading?: boolean;
  error?: string;
}

interface MultiImageUploadProps {
  id: string
  value: ImageFile[]
  onChange: (images: ImageFile[]) => void
  previewAlt?: string
  maxImages?: number
  className?: string
  readOnly?: boolean
  onUploadingChange?: (isUploading: boolean) => void;
}

export function MultiImageUpload({
  id,
  value = [],
  onChange,
  previewAlt = "Image preview",
  maxImages = 10,
  className = "",
  readOnly = false,
  onUploadingChange,
}: MultiImageUploadProps) {
  // Inform parent if any image is uploading
  React.useEffect(() => {
    if (onUploadingChange) {
      onUploadingChange(value.some(img => img.isUploading));
    }
  }, [value, onUploadingChange]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files).slice(0, maxImages - value.length) : [];
    if (!files.length) {
      e.target.value = "";
      return;
    }

    const newImageFiles: ImageFile[] = files.map(file => ({
        url: URL.createObjectURL(file),
        file: file,
        isUploading: true,
    }));

    // Use a local variable to track the current state of images within this handler
    let currentImages = [...value, ...newImageFiles];
    onChange(currentImages);

    // Process uploads sequentially to avoid race conditions with state updates
    for (const imageToUpload of newImageFiles) {
        try {
            if (!imageToUpload.file) continue;
            const response = await uploadFile(imageToUpload.file, true);
            const serverUrl = response.fileCDNUrl;

            // Find the image by its temporary blob URL and update it immutably
            currentImages = currentImages.map(img =>
                img.url === imageToUpload.url
                    ? { ...img, url: serverUrl, file: undefined, isUploading: false }
                    : img
            );

            // Notify the parent with the updated list
            onChange(currentImages);

        } catch (err) {
            // Optionally mark the image as failed and stop its loading state
            currentImages = currentImages.map(img =>
                img.url === imageToUpload.url
                    ? { ...img, isUploading: false, error: "Upload failed" }
                    : img
            );
            onChange(currentImages);
        }
    }

    // Clear the input to allow uploading the same file again
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    const updatedImages = [...value]
    
    // If removing primary image, make the next image primary
    const wasRemovingPrimary = updatedImages[index]?.is_primary
    
    updatedImages.splice(index, 1)
    
    // If we removed the primary image and there are other images left
    if (wasRemovingPrimary && updatedImages.length > 0) {
      updatedImages[0].is_primary = true
    }
    
    onChange(updatedImages)
  }

  const setPrimaryImage = (index: number) => {
    const updatedImages = value.map((img, i) => ({
      ...img,
      is_primary: i === index
    }))
    onChange(updatedImages)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {/* Existing images */}
        {value.map((image, index) => (
          <div key={index} className="group relative aspect-square border rounded-md overflow-hidden">
            <img
              src={image.url}
              alt={image.alt || `${previewAlt} ${index + 1}`}
              className={`object-cover w-full h-full ${image.is_primary ? 'ring-2 ring-primary' : ''}`}
            />
            {image.isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                <Loader className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {!readOnly && (
              <div className="absolute inset-x-0 bottom-0 p-2 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={`p-1 h-8 text-xs ${image.is_primary ? 'bg-primary/20' : ''}`}
                  disabled={image.is_primary}
                  onClick={() => setPrimaryImage(index)}
                >
                  {image.is_primary ? 'Primary' : 'Set as primary'}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
        
        {/* Add new image button */}
        {!readOnly && value.length < maxImages && (
          <div className="aspect-square border border-dashed rounded-md flex flex-col items-center justify-center">
            <Input
              type="file"
              className="hidden"
              id={id}
              accept="image/*"
              onChange={handleFileChange}
              multiple
              disabled={value.some(img => img.isUploading)}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => document.getElementById(id)?.click()}
              className="h-full w-full flex flex-col gap-2"
              disabled={value.some(img => img.isUploading)}
            >
              <PlusCircle className="h-8 w-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Add image
              </span>
            </Button>
          </div>
        )}
      </div>
      
      {value.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-4">
          No images uploaded. Add product images to improve visibility.
        </div>
      )}
    </div>
  )
} 