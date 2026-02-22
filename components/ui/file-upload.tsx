"use client"

import React, { useState, useEffect } from "react"
import { Button } from "./button"
import { Label } from "./label"
import { Input } from "./input"
import { cn } from "@/lib/utils"
import { Trash, Plus, X, Eye, FileIcon, AlertTriangle, Check, Loader } from "lucide-react"
import { isPdfFile, uploadFile } from "@/lib/services/file-upload.service"
import { DocumentTypeIcon } from "@/components/ui/document-type-icon"
import { FilePreviewModal } from "@/components/ui/file-preview-modal"

export interface FileUploadProps {
  label?: string
  description?: string
  value?: string
  onChange?: (fileUrl: string, file?: File) => void
  onRemove?: () => void
  disabled?: boolean
  className?: string
  accept?: string
  maxSizeMB?: number
}

export function FileUpload({
  label = "Upload File",
  description,
  value = "",
  onChange,
  onRemove,
  disabled = false,
  className,
  accept = ".pdf", // Default to PDF files
  maxSizeMB = 10, // Default max size is 10MB
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>(value || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Update internal file url when value prop changes
  useEffect(() => {
    setFileUrl(value || "");
  }, [value]);

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || disabled) return;
    
    const selectedFile = e.target.files[0];
    const maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    
    // Validate file size
    if (selectedFile.size > maxSize) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      e.target.value = "";
      return;
    }
    
    // Validate file type if accept is specified
    if (accept && accept !== "*") {
      const fileType = selectedFile.type;
      const acceptedTypes = accept.split(",").map(type => type.trim());
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith(".")) {
          // Check by extension
          return selectedFile.name.toLowerCase().endsWith(type.toLowerCase());
        } else {
          // Check by MIME type
          return fileType === type || (type.endsWith("/*") && fileType.startsWith(type.replace("/*", "/")));
        }
      });
      
      if (!isAccepted) {
        setError(`Invalid file type. Please upload a ${accept} file.`);
        e.target.value = "";
        return;
      }
    }
    
    setFile(selectedFile);
    setError(null);
    
    // Create a preview URL for the file
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreview(objectUrl);
    
    // Upload the file to storage API
    if (onChange) {
      setUploading(true);
      try {
        // Upload to server using the same service as image upload
        const response = await uploadFile(selectedFile, false); // false for non-image files
        
        // Use CDN URL from response
        const serverUrl = response.fileCDNUrl;
        setFileUrl(serverUrl);
        
        // Pass the server URL and file object to the parent component
        onChange(serverUrl, selectedFile);
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to upload file. Please try again.");
        
        // Keep the local preview but indicate error
        setFileUrl(objectUrl);
        onChange(objectUrl, selectedFile);
      } finally {
        setUploading(false);
      }
    }
    
    // Clear the input to allow selecting the same file again
    e.target.value = "";
  };
  
  // Handle removing the file
  const handleRemoveFile = () => {
    if (disabled) return;
    
    setFile(null);
    setFileUrl("");
    setPreview(null);
    setError(null);
    
    if (onRemove) {
      onRemove();
    }
  };
  
  // Handle file preview
  const handlePreview = () => {
    const urlToPreview = preview || fileUrl;
    if (urlToPreview) {
      setIsPreviewOpen(true);
    }
  };
  
  return (
    <div className={cn("flex flex-col gap-2", className)}>      
      {/* File display when a file is selected */}
      {fileUrl ? (
        <div className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-accent/10 transition-colors">
          <div className="flex gap-3 items-center flex-1">
            <div className="bg-primary/10 p-2 rounded-md">
              <DocumentTypeIcon 
                fileName={file?.name || fileUrl || ""} 
                mimeType={file?.type || ""} 
                size={16} 
                className="text-primary" 
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{file?.name || "Document"}</p>
              {file && <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>}
            </div>
          </div>
          
          <div className="flex gap-2">
            {/* Preview button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handlePreview}
              disabled={disabled || !fileUrl}
              className="h-8 w-8"
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">Preview file</span>
            </Button>
            
            {/* Remove button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRemoveFile}
              disabled={disabled}
              className="h-8 w-8 hover:bg-destructive/10"
            >
              <Trash className="h-4 w-4" />
              <span className="sr-only">Remove file</span>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Upload button when no file is selected */}
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="file-upload"
              className={cn(
                "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-accent/10 transition-colors",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileIcon className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="mb-2 text-sm text-center text-muted-foreground">
                  <span className="font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-center text-muted-foreground">
                  {accept === ".pdf" ? "PDF files only" : accept}
                  {maxSizeMB && ` (Max size: ${maxSizeMB}MB)`}
                </p>
              </div>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept={accept}
                disabled={disabled || uploading}
                value=""
              />
            </label>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 mt-1 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </>
      )}
      
      {/* Loading state */}
      {uploading && (
        <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
          <Loader className="h-4 w-4 animate-spin" />
          <span>Uploading file...</span>
        </div>
      )}
      
      {/* File Preview Modal */}
      <FilePreviewModal 
        src={preview || fileUrl || ""} 
        alt={file?.name || "Document"} 
        isOpen={isPreviewOpen} 
        onClose={() => setIsPreviewOpen(false)}
      />
    </div>
  );
} 