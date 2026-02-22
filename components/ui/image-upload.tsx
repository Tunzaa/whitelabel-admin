"use client"

import * as React from "react"
import { Upload, X, Loader } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { uploadFile } from "@/lib/services/file-upload.service"

interface ImageUploadProps {
  id: string
  value?: string
  onChange: (url: string) => void
  onFileChange?: (file: File) => void
  onUploadingChange?: (isUploading: boolean) => void
  previewAlt?: string
  height?: string
  width?: string
  imgHeight?: string
  buttonText?: string
  className?: string
  readOnly?: boolean
}

export function ImageUpload({
  id,
  value,
  onChange,
  onFileChange,
  previewAlt = "Image preview",
  height = "h-24",
  width = "w-full",
  imgHeight = "h-full",
  buttonText = "Upload",
  className = "",
  readOnly = false,
  onUploadingChange,
}: ImageUploadProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(value || null)
  const [isUploading, setIsUploading] = React.useState(false)

  React.useEffect(() => {
    if (onUploadingChange) {
      onUploadingChange(isUploading)
    }
  }, [isUploading, onUploadingChange])
  const [error, setError] = React.useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("File is too large! Maximum size is 2MB.")
      return
    }

    // Create URL for preview
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
    
    // Upload the file
    try {
      setIsUploading(true)
      setError(null)
      
      // Upload to server
      const response = await uploadFile(file, true);
      
      // Use CDN URL from response
      const serverUrl = response.fileCDNUrl;
      setPreviewUrl(serverUrl);
      onChange(serverUrl);
      
      // Call onFileChange if provided
      if (onFileChange) {
        onFileChange(file);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
      
      // Keep the local preview but indicate error
      onChange(localUrl);
    } finally {
      setIsUploading(false);
    }
  }

  const clearImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPreviewUrl(null)
    setError(null)
    onChange("")
  }

  return (
    <div className={`relative ${className}`}>
      {previewUrl ? (
        <div className={`relative aspect-video rounded-md overflow-hidden ${imgHeight}`}>
          <img
            src={previewUrl}
            alt={previewAlt}
            className={`object-contain w-full ${error ? 'opacity-60' : ''}`}
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/30">
              <Loader className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
          {error && (
            <div className="absolute bottom-0 left-0 right-0 bg-destructive text-destructive-foreground p-1 text-xs text-center">
              Upload failed. Please try again.
            </div>
          )}
          {!readOnly && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={clearImage}
              disabled={isUploading}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : readOnly ? (
        <div className={`${width} ${height} border border-dashed rounded-md flex items-center justify-center`}>
          <span className="text-sm text-muted-foreground">No image</span>
        </div>
      ) : (
        <>
          <Input
            type="file"
            className="hidden"
            id={id}
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById(id)?.click()}
            className={`${width} ${height} border-dashed flex flex-col gap-2 items-center justify-center`}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader className="h-6 w-6 animate-spin" />
            ) : (
              <Upload className="h-6 w-6" />
            )}
            <span>{buttonText}</span>
            <span className="text-xs text-muted-foreground">
              PNG, JPG, SVG (max 2MB)
            </span>
          </Button>
        </>
      )}
    </div>
  )
}
