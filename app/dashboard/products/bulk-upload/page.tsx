"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useProductStore } from "@/features/products/store";
import { useVendorStore } from "@/features/vendors/store";
import { BulkUploadDropzone } from "@/features/products/components/bulk-upload-dropzone";
import { BulkUploadStatus } from "@/features/products/components/bulk-upload-status";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Store,
  HelpCircle,
  FileDown,
  History,
  User,
  FileUp,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { BulkUploadDocsModal } from "@/features/products/components/bulk-upload-docs-modal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Copy } from "@/components/ui/copy";
import { withAuthorization } from "@/components/auth/with-authorization";

function BulkUploadPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const tenantId = (session?.user as any)?.tenant_id;
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [storeId, setStoreId] = useState<string>("");
  const [batches, setBatches] = useState<any[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "error" | "complete"
  >("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [batchId, setBatchId] = useState<string | undefined>(undefined);
  const [showStatus, setShowStatus] = useState(false);
  const [uploading, setUploading] = useState(false);
  const {
    fetchBulkUploadStatus,
    fetchBulkUploadBatches,
    uploadBulkProducts,
    fetchBulkUploadTemplateCSV,
    approveBulkUploadBatch,
  } = useProductStore();
  const {
    vendors,
    fetchVendors,
    fetchVendor,
    loading: loadingVendors,
  } = useVendorStore();
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("upload");
  const [docsOpen, setDocsOpen] = useState(false);
  const [clearFileSignal, setClearFileSignal] = useState(0);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [responseStatusCode, setResponseStatusCode] = useState<
    number | undefined
  >(undefined);
  const [approvingBatchId, setApprovingBatchId] = useState<string | null>(null);

  // Fetch vendors on mount
  useEffect(() => {
    if (tenantId) {
      fetchVendors(undefined, { "X-Tenant-ID": tenantId });
    }
  }, [fetchVendors, tenantId]);

  // When vendor is selected, fetch vendor details and set storeId
  useEffect(() => {
    if (selectedVendorId && tenantId) {
      fetchVendor(selectedVendorId, { "X-Tenant-ID": tenantId }).then(
        (vendor) => {
          setSelectedVendor(vendor);
          if (vendor.stores && vendor.stores.length > 0) {
            setStoreId(vendor.stores[0].store_id || "");
          } else {
            setStoreId("");
          }
        },
      );
    } else {
      setSelectedVendor(null);
      setStoreId("");
    }
  }, [selectedVendorId, fetchVendor, tenantId]);

  // Fetch batches when vendor or store changes
  useEffect(() => {
    if (selectedVendorId && storeId && tenantId) {
      setLoadingBatches(true);
      fetchBulkUploadBatches(selectedVendorId, storeId, {
        "X-Tenant-ID": tenantId,
      }).then((data: any) => {
        const batchArray = data?.items || data || [];
        setBatches(batchArray);
        setLoadingBatches(false);
      });
    } else {
      setBatches([]);
    }
  }, [selectedVendorId, storeId, fetchBulkUploadBatches, tenantId]);

  const handleFileUpload = async (file: File) => {
    setStatus("uploading");
    setErrors([]);
    setBatchId(undefined);
    setUploading(true);
    setShowStatus(true);
    setUploadResult(null);
    setResponseStatusCode(undefined);
    try {
      // Use direct upload for file
      const result = await uploadBulkProducts(
        file,
        selectedVendorId,
        storeId,
        tenantId,
      );
      // If error response (no batch_id and has detail/error/message)
      if (
        !result.batch_id &&
        (result.detail || result.error || result.message)
      ) {
        setUploadResult(result);
        setResponseStatusCode(400); // or use actual status if available
        setStatus("error");
        setErrors([]); // Don't set errors array to avoid duplicate error display
        return;
      }
      setUploadResult(result);
      setResponseStatusCode(undefined);
      if (result.errors || result.error || result.message || result.detail) {
        setStatus("error");
        // Prefer array of errors, else show error/message/detail as array
        if (Array.isArray(result.errors) && result.errors.length > 0) {
          setErrors(result.errors);
        } else if (result.error) {
          setErrors([result.error]);
        } else if (result.message) {
          setErrors([result.message]);
        } else if (result.detail) {
          setErrors([result.detail]);
        } else {
          setErrors(["Unknown error occurred."]);
        }
      } else if (result.batch_id) {
        setStatus("processing");
        setBatchId(result.batch_id);
        setTimeout(async () => {
          try {
            const batch = await fetchBulkUploadStatus(result.batch_id, {
              "X-Tenant-ID": tenantId,
            });
            setUploadResult(batch);
            setResponseStatusCode(undefined);
            if (batch && batch.status === "complete") {
              setStatus("complete");
            } else {
              setStatus("processing");
            }
          } catch {
            setStatus("processing");
          }
        }, 2000);
      } else {
        setStatus("error");
        setErrors(["Unknown error occurred."]);
      }
    } catch (err: any) {
      setStatus("error");
      setErrors([]); // Don't set errors array to avoid duplicate error display
      let backendDetail = "Upload failed";
      if (err?.response?.data?.detail) {
        backendDetail = err.response.data.detail;
      } else if (err?.response?.data?.error) {
        backendDetail = err.response.data.error;
      } else if (err?.message) {
        backendDetail = err.message;
      }
      setUploadResult({ detail: backendDetail });
      setResponseStatusCode(err?.response?.status || 400);
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = () => {
    setStatus("idle");
    setErrors([]);
    setBatchId(undefined);
    setShowStatus(false);
    setUploadResult(null);
    setResponseStatusCode(undefined);
    setClearFileSignal((c) => c + 1); // trigger file clear in dropzone
  };

  const vendorList = vendors?.items || [];

  // Helper for status badge
  const renderStatusBadge = (status: string) => {
    let variant: any = "secondary";
    if (status === "complete") variant = "success";
    else if (status === "processing" || status === "uploading")
      variant = "warning";
    else if (status === "error") variant = "destructive";
    return (
      <Badge variant={variant} className="capitalize animate-fade-in">
        {status}
      </Badge>
    );
  };

  // Download sample CSV handler (fetches from API and triggers download)
  const handleDownloadSample = async () => {
    try {
      const csv = await fetchBulkUploadTemplateCSV({ "X-Tenant-ID": tenantId });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bulk-upload-template.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Failed to download template. Please try again.");
    }
  };

  // Handle batch approval
  const handleApproveBatch = async (batchId: string) => {
    if (!session?.user?.name) {
      toast.error("User information not available");
      return;
    }

    setApprovingBatchId(batchId);
    try {
      await approveBulkUploadBatch(batchId, session.user.name, {
        "X-Tenant-ID": tenantId,
      });
      toast.success("Batch approved successfully!");

      // Refresh batches to show updated status
      if (selectedVendorId && storeId && tenantId) {
        const data = await fetchBulkUploadBatches(selectedVendorId, storeId, {
          "X-Tenant-ID": tenantId,
        });
        const batchArray = data?.items || data || [];
        setBatches(batchArray);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to approve batch");
    } finally {
      setApprovingBatchId(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-background to-muted/40 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/products")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Bulk Product Upload
              </h1>
              <p className="text-muted-foreground text-base mt-1">
                Upload and manage product batches for your vendors.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="p-6 flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Section */}
          <div className="space-y-6 order-2 lg:order-1">
            {/* Vendor Selection */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" /> Select Vendor
                </CardTitle>
                <CardDescription>
                  Choose a vendor to upload products for.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingVendors ? (
                  <Spinner />
                ) : (
                  <Select
                    value={selectedVendorId}
                    onValueChange={setSelectedVendorId}
                    disabled={loadingVendors}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a vendor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vendorList.length > 0 ? (
                        vendorList
                          .filter(
                            (vendor: any) =>
                              vendor.vendor_id && vendor.vendor_id !== "",
                          )
                          .map((vendor: any) => (
                            <SelectItem
                              key={vendor.vendor_id}
                              value={vendor.vendor_id!}
                            >
                              {vendor.business_name}
                            </SelectItem>
                          ))
                      ) : (
                        <SelectItem value="no-vendors" disabled>
                          No vendors found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </CardContent>
            </Card>
            {/* Vendor/Store Info */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" /> Vendor & Store
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedVendor ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Vendor
                      </span>
                      <span className="text-sm font-medium">
                        {selectedVendor.business_name}
                      </span>
                    </div>
                    {selectedVendor.stores &&
                      selectedVendor.stores.length > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Store
                          </span>
                          <span className="text-sm font-medium">
                            {selectedVendor.stores[0].store_name}
                          </span>
                        </div>
                      )}
                    {selectedVendor.email && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Email
                        </span>
                        <span className="text-sm font-medium">
                          {selectedVendor.email}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-center">
                    Select a vendor to see details.
                  </div>
                )}
              </CardContent>
            </Card>
            {/* Need Help Card */}
            <Card className="shadow-md bg-muted/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" /> Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  Check our documentation or contact support for assistance with
                  bulk uploads.
                </p>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setDocsOpen(true)}
                >
                  View Bulk Upload Guide
                </Button>
              </CardContent>
            </Card>
          </div>
          {/* Main Section */}
          <div className="lg:col-span-3 space-y-8 order-1 lg:order-2">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="w-full">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <FileUp className="h-4 w-4" /> Upload
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex items-center gap-2"
                >
                  <History className="h-4 w-4" /> History
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="space-y-6 animate-fade-in">
                <Card className="shadow-lg">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Bulk Upload</CardTitle>
                      <CardDescription>
                        Upload a CSV file to add products in bulk.
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadSample}
                      className="gap-2"
                    >
                      <FileDown className="h-4 w-4" /> Download CSV Template
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <BulkUploadDropzone
                      onUpload={handleFileUpload}
                      uploading={uploading}
                      disabled={
                        !selectedVendorId ||
                        (selectedVendor &&
                          (!selectedVendor.stores ||
                            selectedVendor.stores.length === 0))
                      }
                      disabledReason={
                        !selectedVendorId
                          ? "Select a vendor to enable upload"
                          : selectedVendor &&
                              (!selectedVendor.stores ||
                                selectedVendor.stores.length === 0)
                            ? "Selected vendor has no store. Please add a store first."
                            : undefined
                      }
                      clearFileSignal={clearFileSignal}
                    />
                    {showStatus && (
                      <div className="transition-all duration-300 animate-fade-in">
                        <BulkUploadStatus
                          status={status}
                          errors={errors}
                          onRetry={handleRetry}
                          batchId={batchId}
                          result={uploadResult}
                          responseStatusCode={responseStatusCode}
                        />
                      </div>
                    )}
                    {status === "complete" && (
                      <div className="flex justify-end mt-4">
                        <Button onClick={handleRetry} variant="outline">
                          Start New Upload
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent
                value="history"
                className="space-y-6 animate-fade-in"
              >
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Batch History
                    </CardTitle>
                    <CardDescription>
                      Review and manage previous bulk upload batches for this
                      vendor/store.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingBatches ? (
                      <div className="flex items-center justify-center py-8">
                        <Spinner />
                      </div>
                    ) : batches.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="text-muted-foreground text-lg mb-2">
                          No batches found
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Upload your first batch to see it here.
                        </p>
                      </div>
                    ) : (
                      <Accordion type="single" collapsible className="w-full">
                        {batches.map((batch, idx) => (
                          <AccordionItem
                            key={batch.batch_id}
                            value={batch.batch_id}
                            className="border rounded-lg mb-3 hover:shadow-md transition-all duration-200 bg-gradient-to-r from-background to-muted/20"
                          >
                            <AccordionTrigger className="px-6 py-4 hover:no-underline group">
                              <div className="flex items-center justify-between w-full pr-4">
                                <div className="flex items-center gap-4">
                                  <div className="flex flex-col items-start">
                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-md">
                                        <span className="font-mono text-sm text-muted-foreground">
                                          {batch.batch_id?.slice(0, 8)}...
                                        </span>
                                        <Copy
                                          text={batch.batch_id}
                                          size={14}
                                          className="opacity-60 hover:opacity-100 transition-opacity"
                                        />
                                      </div>
                                      {renderStatusBadge(batch.status)}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                      <span className="font-medium">
                                        {batch.filename || "Unknown file"}
                                      </span>
                                      {batch.total_products && (
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                          {batch.total_products} products
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                  <div className="text-right">
                                    <div className="text-xs uppercase tracking-wide">
                                      Created
                                    </div>
                                    <div className="font-medium">
                                      {batch.created_at
                                        ? new Date(
                                            batch.created_at,
                                          ).toLocaleDateString()
                                        : "-"}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs uppercase tracking-wide">
                                      Time
                                    </div>
                                    <div className="font-medium">
                                      {batch.created_at
                                        ? new Date(
                                            batch.created_at,
                                          ).toLocaleTimeString()
                                        : "-"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6">
                              <div className="space-y-6">
                                {/* Batch Details */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  <div className="space-y-4">
                                    <div className="p-4 bg-muted/30 rounded-lg border">
                                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                                        Batch Information
                                      </h4>
                                      <dl className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center">
                                          <dt className="text-muted-foreground">
                                            Batch ID:
                                          </dt>
                                          <dd className="font-mono text-xs bg-muted px-2 py-1 rounded flex items-center gap-1">
                                            {batch.batch_id}
                                            <Copy
                                              text={batch.batch_id}
                                              size={12}
                                            />
                                          </dd>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <dt className="text-muted-foreground">
                                            Status:
                                          </dt>
                                          <dd>
                                            {renderStatusBadge(batch.status)}
                                          </dd>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <dt className="text-muted-foreground">
                                            Filename:
                                          </dt>
                                          <dd className="truncate max-w-[200px] font-medium">
                                            {batch.filename || "N/A"}
                                          </dd>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <dt className="text-muted-foreground">
                                            Created:
                                          </dt>
                                          <dd className="font-medium">
                                            {batch.created_at
                                              ? new Date(
                                                  batch.created_at,
                                                ).toLocaleString()
                                              : "N/A"}
                                          </dd>
                                        </div>
                                        {batch.updated_at && (
                                          <div className="flex justify-between items-center">
                                            <dt className="text-muted-foreground">
                                              Updated:
                                            </dt>
                                            <dd className="font-medium">
                                              {new Date(
                                                batch.updated_at,
                                              ).toLocaleString()}
                                            </dd>
                                          </div>
                                        )}
                                      </dl>
                                    </div>
                                  </div>
                                  <div className="space-y-4">
                                    <div className="p-4 bg-muted/30 rounded-lg border">
                                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        Upload Statistics
                                      </h4>
                                      <dl className="space-y-2 text-sm">
                                        {batch.total_products !== undefined && (
                                          <div className="flex justify-between items-center">
                                            <dt className="text-muted-foreground">
                                              Total Products:
                                            </dt>
                                            <dd className="font-semibold">
                                              {batch.total_products}
                                            </dd>
                                          </div>
                                        )}
                                        {batch.valid_products !== undefined && (
                                          <div className="flex justify-between items-center">
                                            <dt className="text-muted-foreground">
                                              Valid Products:
                                            </dt>
                                            <dd className="text-green-600 font-semibold">
                                              {batch.valid_products}
                                            </dd>
                                          </div>
                                        )}
                                        {batch.invalid_products !==
                                          undefined && (
                                          <div className="flex justify-between items-center">
                                            <dt className="text-muted-foreground">
                                              Invalid Products:
                                            </dt>
                                            <dd className="text-red-600 font-semibold">
                                              {batch.invalid_products}
                                            </dd>
                                          </div>
                                        )}
                                        {batch.warning_products !==
                                          undefined && (
                                          <div className="flex justify-between items-center">
                                            <dt className="text-muted-foreground">
                                              Warnings:
                                            </dt>
                                            <dd className="text-yellow-600 font-semibold">
                                              {batch.warning_products}
                                            </dd>
                                          </div>
                                        )}
                                        {batch.summary?.success_rate !==
                                          undefined && (
                                          <div className="flex justify-between items-center pt-2 border-t">
                                            <dt className="text-muted-foreground font-medium">
                                              Success Rate:
                                            </dt>
                                            <dd className="font-bold text-lg">
                                              {batch.summary.success_rate > 1
                                                ? Math.round(
                                                    batch.summary.success_rate,
                                                  )
                                                : (
                                                    batch.summary.success_rate *
                                                    100
                                                  ).toFixed(0)}
                                              %
                                            </dd>
                                          </div>
                                        )}
                                      </dl>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-4 border-t">
                                  <div className="flex gap-3">
                                    {batch.status === "error" && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="gap-2"
                                      >
                                        <FileDown className="h-4 w-4" />
                                        Download Errors
                                      </Button>
                                    )}
                                    {(batch.status === "complete" ||
                                      batch.status === "pending") &&
                                      !batch.approved_at && (
                                        <Button
                                          size="sm"
                                          variant="default"
                                          className="gap-2"
                                          onClick={() =>
                                            handleApproveBatch(batch.batch_id)
                                          }
                                          disabled={
                                            approvingBatchId === batch.batch_id
                                          }
                                        >
                                          {approvingBatchId ===
                                          batch.batch_id ? (
                                            <Spinner className="h-4 w-4" />
                                          ) : (
                                            <Check className="h-4 w-4" />
                                          )}
                                          {approvingBatchId === batch.batch_id
                                            ? "Approving..."
                                            : "Approve Batch"}
                                        </Button>
                                      )}
                                    {batch.approved_at && (
                                      <div className="flex items-center gap-2 text-sm text-green-600">
                                        <Check className="h-4 w-4" />
                                        <span>
                                          Approved on{" "}
                                          {new Date(
                                            batch.approved_at,
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {batch.batch_id}
                                  </div>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      {/* Bulk Upload Documentation Modal */}
      <BulkUploadDocsModal
        open={docsOpen}
        onOpenChange={setDocsOpen}
        onDownloadTemplate={handleDownloadSample}
      />
    </div>
  );
}

export default withAuthorization(BulkUploadPage, {
  permission: "products:create",
});
