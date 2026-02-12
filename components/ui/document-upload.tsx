"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSelectedTenantStore } from "@/features/tenants/store";
import { usePermissions } from "@/features/auth/hooks/use-permissions";
import {
  Upload,
  Loader,
  File,
  Calendar,
  Plus,
  Trash,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

import { useConfigurationStore } from "@/features/configurations/store";
import { DocumentType } from "@/features/configurations/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FilePreviewModal } from "@/components/ui/file-preview-modal";
import { uploadFile } from "@/lib/services/file-upload.service";

// Type definitions
export interface DocumentWithMeta {
  id?: string;
  document_id?: string;
  document_type: string; // This will now be document_type_id
  file_name?: string;
  expires_at?: string;
  document_url?: string;
  verification_status?: string;
  submitted_at?: string;
  rejection_reason?: string;
  file?: File;
  file_id?: string;
  number?: string; // Added number field
}

export interface DocumentUploadProps {
  entityName: string; // e.g., 'delivery-partner', 'vendor'
  documents?: DocumentWithMeta[];
  onUploadComplete?: (document: DocumentWithMeta) => void;
  onDelete?: (index: number) => void;
  label?: string;
  description?: string;
  className?: string;
  disabled?: boolean;
}

export function DocumentUpload({
  entityName,
  documents = [],
  onUploadComplete,
  onDelete,
  label = "Upload Documents",
  description,
  className = "",
  disabled = false,
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingDocument, setIsAddingDocument] = useState(false);
  const { data: session } = useSession();
  const { selectedTenantId } = useSelectedTenantStore();
  const { hasRole } = usePermissions();

  // Use selected tenant for super users, otherwise use session tenant
  const tenantId = hasRole("super")
    ? selectedTenantId
    : session?.user?.tenant_id;

  const {
    configurations,
    loading: configLoading,
    error: configError,
    fetchEntityConfiguration,
  } = useConfigurationStore();

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "verified":
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 border-green-200 font-medium"
          >
            <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
            Verified
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-100 text-red-800 border-red-200 font-medium"
          >
            <XCircle className="mr-1.5 h-3.5 w-3.5" />
            Rejected
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge
            variant="outline"
            className="bg-yellow-100 text-yellow-800 border-yellow-200 font-medium"
          >
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Pending
          </Badge>
        );
    }
  };

  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("");
  const [expires_at, setExpires_at] = useState<string>("");
  const [number, setNumber] = useState<string>(""); // Added state for number
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewFile, setPreviewFile] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handlePreviewDocument = (url?: string, name?: string) => {
    if (!url) return;
    setPreviewFile({ src: url, alt: name || "Document" });
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setError(null);
      return;
    }

    const maxSizeMB = 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }
    setError(null);
  };

  const handleUploadDocument = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !selectedDocumentType) {
      setError(
        !file ? "Please select a file" : "Please select a document type",
      );
      return;
    }
    if (!number) {
      setError("Please enter a number for the document.");
      return;
    }
    try {
      setIsUploading(true);
      setError(null);
      const uploadResponse = await uploadFile(file, true);
      const newDocument: DocumentWithMeta = {
        document_type: selectedDocumentType,
        file_name: file.name,
        document_url: uploadResponse.fileCDNUrl,
        expires_at: expires_at || undefined,
        file_id: uploadResponse.filePath,
        verification_status: "pending",
        number, // Add number to new document
      };
      onUploadComplete?.(newDocument);
      // Reset dialog state
      setSelectedDocumentType("");
      setExpires_at("");
      setNumber(""); // Reset number
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsAddingDocument(false);
    } catch (error) {
      console.error("Error uploading document:", error);
      setError("Failed to upload document. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveDocument = (index: number) => {
    onDelete?.(index);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setIsAddingDocument(isOpen);
    console.log("Dialog open state changed:", isOpen);

    // Fetch configuration only when dialog is opened and data is not already available
    if (isOpen && entityName && tenantId && !configurations[entityName]) {
      console.log(
        `Fetching configuration for entity: ${entityName}, tenant: ${tenantId}`,
      );
      fetchEntityConfiguration(entityName, tenantId);
    } else if (isOpen) {
      console.log("Did not fetch. Conditions:", {
        entityName: !!entityName,
        tenantId: !!tenantId,
        configExists: !!configurations[entityName],
      });
    }
  };

  const documentTypes = configurations[entityName]?.document_types || [];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between items-center mb-2">
        <div>
          {label && <Label>{label}</Label>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <Dialog open={isAddingDocument} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 hover:bg-primary/10"
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload New Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="document-file">Document File</Label>
                <Input
                  ref={fileInputRef}
                  id="document-file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-muted-foreground">
                  Accepted formats: PDF, JPG, JPEG, PNG (max 10MB)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document-type">Document Type</Label>
                <Select
                  value={selectedDocumentType}
                  onValueChange={setSelectedDocumentType}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        configLoading
                          ? "Loading types..."
                          : "Select document type"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {configLoading ? (
                      <div className="flex items-center justify-center p-2">
                        <Spinner size="sm" />
                      </div>
                    ) : configError ? (
                      <div className="p-2 text-sm text-destructive flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Error loading types.</span>
                      </div>
                    ) : documentTypes.length === 0 ? (
                      <SelectItem value="no-types" disabled>
                        No document types found.
                      </SelectItem>
                    ) : (
                      documentTypes.map((type) => (
                        <SelectItem
                          key={type.document_type_id}
                          value={type.document_type_id}
                        >
                          {type.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="document-number">Document Number</Label>
                <Input
                  id="document-number"
                  type="text"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full"
                  placeholder="Enter document number"
                  disabled={isUploading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiry-date">Expires At (if applicable)</Label>
                <Input
                  id="expiry-date"
                  type="date"
                  value={expires_at}
                  onChange={(e) => setExpires_at(e.target.value)}
                  className="w-full"
                  disabled={!selectedDocumentType || isUploading}
                />
              </div>

              {error && <div className="text-sm text-destructive">{error}</div>}

              {isUploading && (
                <div className="flex items-center justify-center p-2">
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  <span>Uploading document...</span>
                </div>
              )}

              <Button
                onClick={handleUploadDocument}
                disabled={isUploading || !selectedDocumentType}
                className="w-full mt-2"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length > 0 ? (
        <div className="space-y-2">
          <ScrollArea className="max-h-[400px] overflow-y-auto">
            <div className="space-y-2">
              {documents.map((field, index) => {
                const doc = field as DocumentWithMeta & { id: string };
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-md border bg-card transition-colors hover:bg-accent/10 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10 text-primary">
                        <File className="h-8 w-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium flex items-center gap-2">
                          <span>
                            {doc.document_type_name ||
                              documentTypes.find(
                                (t) => t.document_type_id === doc.document_type,
                              )?.name ||
                              doc.document_type}
                          </span>
                          {doc.file_name ? (
                            <Badge
                              variant="outline"
                              className="bg-green-100 text-green-800 border-green-200 font-medium"
                            >
                              New
                            </Badge>
                          ) : (
                            getStatusBadge(doc.verification_status)
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {doc.file_name || ""}
                        </div>
                        {doc.number && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            #{doc.number}
                          </span>
                        )}
                        {doc.expires_at && (
                          <div className="text-xs flex items-center text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            Expires: {doc.expires_at}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handlePreviewDocument(doc.document_url, doc.file_name)
                        }
                        disabled={disabled || !doc.document_url}
                        className="h-8 w-8"
                        title="Preview document"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Preview</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveDocument(index)}
                        disabled={disabled}
                        className="h-8 w-8 hover:bg-destructive/10"
                        title="Delete document"
                      >
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-6 border border-dashed rounded-md">
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No documents uploaded</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click "Add Document" to upload
          </p>
        </div>
      )}

      {isPreviewOpen && previewFile && (
        <FilePreviewModal
          src={previewFile.src}
          alt={previewFile.alt}
          isOpen={isPreviewOpen}
          onClose={closePreview}
        />
      )}
    </div>
  );
}
