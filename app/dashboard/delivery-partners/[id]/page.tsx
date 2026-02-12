"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Check,
  X,
  Edit,
  User as UserIcon,
  Mail,
  Phone,
  MapPin as MapPinIcon,
  FileText,
  Calendar,
  Power,
  AlertCircle,
  Trash2,
  Eye,
  Truck,
  Building as BuildingIcon,
  Info,
  RefreshCw,
  ShieldCheck,
  ListChecks,
  Users,
  User,
  Briefcase,
  MapPin,
  ShieldX,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { DriversTab } from "@/features/delivery-partners/components/DriversTab";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Copy } from "@/components/ui/copy";

import { useDeliveryPartnerStore } from "@/features/delivery-partners/store";
import { DeliveryPartnerRejectionModal } from "@/features/delivery-partners/components/delivery-partner-rejection-modal";
import { getRejectionReasonText } from "@/features/delivery-partners/utils";

import {
  DeliveryPartner,
  KycDocument,
  VehicleInfo,
  Location,
} from "@/features/delivery-partners/types";
const MapPicker = dynamic(
  () => import("@/components/ui/map-picker").then((mod) => mod.MapPicker),
  {
    ssr: false,
    loading: () => (
      <Spinner />
    ),
  }
);
import {
  VerificationDocumentManager,
  VerificationDocument,
  VerificationActionPayload,
} from "@/components/ui/verification-document-manager";
import { withAuthorization } from "@/components/auth/with-authorization";
import { Can } from "@/components/auth/can";

interface DeliveryPartnerPageProps {
  params: {
    id: string;
  };
}

const InfoItem = ({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-start space-x-2 py-1">
    {icon && (
      <div className="shrink-0 w-5 h-5 text-muted-foreground mt-0.5">
        {icon}
      </div>
    )}
    <div className="grow">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </p>
      <p className="text-sm text-muted-foreground break-words">
        {value || "N/A"}
      </p>
    </div>
  </div>
);

const getPartnerTypeLabel = (type: string | undefined) => {
  if (!type) return "N/A";
  switch (type) {
    case "individual":
      return "Individual Rider";
    case "business":
      return "Delivery Business";
    case "pickup_point":
      return "Pickup Point";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

const StatusBadge = ({
  status,
  className,
}: {
  status: string;
  className?: string;
}) => {
  if (typeof status !== "string" || !status.trim()) {
    return (
      <Badge
        variant="outline"
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${className || ""
          } bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200`}
      >
        <Info className="h-3.5 w-3.5 mr-1" />
        Unknown
      </Badge>
    );
  }

  let variant: "default" | "destructive" | "outline" | "secondary" = "default";
  let icon: React.ReactNode = null;
  let text = status.charAt(0).toUpperCase() + status.slice(1);

  switch (status) {
    case "active":
      icon = <ShieldCheck className="h-3.5 w-3.5" />;
      className = `${className || ""
        } bg-green-100 text-green-700 border-green-300 hover:bg-green-200`;
      break;
    case "inactive":
      icon = <ShieldX className="h-3.5 w-3.5" />;
      className = `${className || ""
        } bg-red-100 text-red-700 border-red-300 hover:bg-red-200`;
      break;
    case "approved":
      icon = <ShieldX className="h-3.5 w-3.5" />;
      className = `${className || ""
        } bg-green-100 text-green-700 border-green-300 hover:bg-green-200`;
      break;
    case "not_approved":
      icon = <AlertCircle className="h-3.5 w-3.5" />;
      className = `${className || ""
        } bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200`;
      break;
    default:
      icon = <Info className="h-3.5 w-3.5" />;
      className = `${className || ""
        } bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200`;
      break;
  }

  return (
    <Badge
      variant={variant}
      className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {icon}
      {text}
    </Badge>
  );
};

function DeliveryPartnerPage({
  params,
}: DeliveryPartnerPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const tenantId = (session?.user as any)?.tenant_id;
  const { id } = params;

  const {
    partner,
    loading,
    error,
    fetchDeliveryPartner,
    updateDeliveryPartnerStatus,
    deleteDeliveryPartner,
    updateDeliveryPartnerDocumentStatus,
  } = useDeliveryPartnerStore();

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const transformKycToVerificationDoc = (
    doc: any,
  ): VerificationDocument => {
    return {
      document_id: doc.document_id,
      document_type_id: doc.document_type_id,
      document_type_name: 'KYC Document',
      verification_status: doc.verified ? 'verified' : 'pending',
      document_url: doc.link,
      rejection_reason: doc.rejection_reason,
      created_at: doc.created_at,
      expires_at: doc.expires_at,
      number: doc.number || undefined,
    } as any;
  };

  const handleDocumentVerification = useCallback(async (payload: VerificationActionPayload) => {
    if (!partner) {
      toast.error("Verification failed: Partner data not available.");
      return;
    }
    if (!tenantId) {
      toast.error("Verification failed: User session is invalid.");
      return;
    }

    setIsUpdating(true);
    const action = payload.verification_status === 'verified' ? 'Approving' : 'Rejecting';
    const toastId = toast.loading(\`\${action} document...\`);

    try {
      await updateDeliveryPartnerDocumentStatus(
        partner.partner_id,
        payload,
        { "X-Tenant-ID": tenantId }
      );
      toast.success(\`Document \${payload.verification_status} successfully.\`, { id: toastId });
    } catch (error) {
      toast.error(\`Failed to \${action.toLowerCase()} document.\`, { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  }, [partner, tenantId, updateDeliveryPartnerDocumentStatus]);


  useEffect(() => {
    if (id && tenantId) {
      fetchDeliveryPartner(id, { "X-Tenant-ID": tenantId });
    }
  }, [id, tenantId, fetchDeliveryPartner]);

  const handleStatusChange = async (
    action: 'approve' | 'reject' | 'activate' | 'deactivate'
  ) => {
    if (!partner) return;

    if (action === 'reject') {
      setShowRejectDialog(true);
      return;
    }

    let payload = {};
    switch (action) {
      case 'approve':
        payload = { is_approved: true, is_active: true };
        break;
      case 'activate':
        payload = { is_active: true };
        break;
      case 'deactivate':
        payload = { is_active: false };
        break;
    }

    setIsUpdatingStatus(true);
    const toastId = toast.loading("Updating partner status...");
    try {
      await updateDeliveryPartnerStatus(partner.partner_id, payload, undefined, { "X-Tenant-ID": tenantId });
      toast.success("Partner status updated successfully.", { id: toastId });
    } catch (error) {
      toast.error("Failed to update partner status.", { id: toastId });
      console.error(\`Error changing partner status to \${action}:\`, error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleRejectConfirm = async ({ type, customReason }: { type: string; customReason?: string }) => {
    if (!partner) return;

    const reasonText = getRejectionReasonText(type, customReason);
    const payload = {
      is_approved: false,
      is_active: false,
      rejection_reason: reasonText,
    };

    setIsUpdatingStatus(true);
    setShowRejectDialog(false);
    const toastId = toast.loading("Rejecting partner...");
    try {
      await updateDeliveryPartnerStatus(partner.partner_id, payload, undefined, { "X-Tenant-ID": tenantId });
      toast.success("Partner has been rejected.", { id: toastId });
    } catch (error) {
      toast.error("Failed to reject partner.", { id: toastId });
      console.error("Error rejecting partner:", error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeletePartner = async () => {
    if (!partner?.partner_id || !tenantId) return;
    const toastId = toast.loading("Deleting delivery partner...");
    try {
      await deleteDeliveryPartner(partner.partner_id, { "X-Tenant-ID": tenantId });
      toast.success("Delivery partner deleted successfully.", {
        id: toastId,
      });
      router.push("/dashboard/delivery-partners");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete partner.", { id: toastId });
    }
  };

  if (loading && !partner) {
    return <Spinner />;
  }

  if (error && !partner) {
    return (
      <ErrorCard
        title="Failed to load delivery partner"
        error={{
          status: error?.status?.toString() || "Error",
          message:
            error?.message ||
            "An error occurred while fetching partner details.",
        }}
        buttonText="Back to Delivery Partners"
        buttonAction={() => router.push("/dashboard/delivery-partners")}
        buttonIcon={ArrowLeft}
      />
    );
  }

  const partnerName =
    partner?.name ||
    \`\${partner?.user_details?.first_name || ""} \${partner?.user_details?.last_name || ""
      }\`.trim() ||
    "Unnamed Partner";
  const partnerAvatarFallback = (
    partnerName.substring(0, 2) || "DP"
  ).toUpperCase();

  return partner ? (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-background z-10">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/delivery-partners")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Back</span>
          </Button>

          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border">
              <AvatarImage
                src={partner?.profile_picture || undefined}
                alt={partnerName}
              />
              <AvatarFallback className="text-lg">
                {partnerAvatarFallback}
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-xl lg:text-2xl font-semibold tracking-tight">
                {partnerName}
              </h1>
              <p className="text-muted-foreground text-xs lg:text-sm flex items-center gap-1.5 capitalize">
                {partner?.type === "individual" && (
                  <UserIcon className="h-3.5 w-3.5" />
                )}
                {partner?.type === "business" && (
                  <Briefcase className="h-3.5 w-3.5" />
                )}
                {partner?.type === "pickup_point" && (
                  <MapPinIcon className="h-3.5 w-3.5" />
                )}
                {partner?.type ? partner?.type.replace("_", " ") : "Type N/A"}
                <span className="text-gray-500 font-mono text-[11px] lg:text-xs ml-1">
                  ID: {partner?.partner_id}
                  {partner?.partner_id && (
                    <span className="ml-2 align-middle inline-flex">
                      <Copy text={partner.partner_id} size={14} className="ml-1" />
                    </span>
                  )}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <StatusBadge status={partner?.is_approved ? "approved" : "not_approved"} />
          <StatusBadge status={partner?.is_active ? "active" : "inactive"} />
          <Can permission="delivery-partners:update">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                router.push(
                  \`/dashboard/delivery-partners/\${partner?.partner_id}/edit\`
                )
              }
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
          </Can>
        </div>
      </div>

      <div className="p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
          <div className="lg:col-span-2 space-y-6">
            {partner?.type === "business" ? (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="overview" className="text-sm font-medium">
                    <Info className="mr-2 h-4 w-4" /> Business Overview
                  </TabsTrigger>
                  <TabsTrigger value="drivers" className="text-sm font-medium">
                    <Users className="mr-2 h-4 w-4" /> Drivers
                  </TabsTrigger>
                  <TabsTrigger value="kyc" className="text-sm font-medium">
                    <ShieldCheck className="mr-2 h-4 w-4" /> KYC Documents
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16 border">
                          <AvatarImage
                            src={partner?.profile_picture || undefined}
                            alt={partnerName}
                          />
                          <AvatarFallback className="text-xl">
                            {partnerAvatarFallback}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-2xl font-semibold">
                            {partnerName}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            ID: {partner?.id}{" "}
                            <Badge
                              variant="outline"
                              className="ml-2 capitalize"
                            >
                              {getPartnerTypeLabel(partner?.type)}
                            </Badge>
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {partner?.description && (
                        <InfoItem
                          icon={<FileText className="h-4 w-4" />}
                          label="Description"
                          value={partner?.description}
                        />
                      )}
                      <Separator />
                      <h4 className="font-medium text-md">
                        Contact Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <InfoItem
                          icon={<Mail className="h-4 w-4" />}
                          label="Contact Email"
                          value={partner?.user_details?.email ? (
                            <a href={\`mailto:\${partner.user_details.email}\`} className="hover:underline">{partner.user_details.email}</a>
                          ) : "N/A"}
                        />
                        <InfoItem
                          icon={<Phone className="h-4 w-4" />}
                          label="Contact Phone"
                          value={partner?.user_details?.phone ? (
                            <a href={\`tel:\${partner.user_details.phone}\`} className="hover:underline">{partner.user_details.phone}</a>
                          ) : "N/A"}
                        />
                        <InfoItem
                          icon={<BuildingIcon className="h-4 w-4" />}
                          label="Tax ID / Reg No."
                          value={partner?.tax_id || "N/A"}
                        />
                      </div>
                      <Separator />
                      <h4 className="font-medium text-md">
                        Associated User Account
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <InfoItem
                          icon={<UserIcon className="h-4 w-4" />}
                          label="Account Name"
                          value={
                            \`\${partner?.user_details?.first_name || ""} \${partner?.user_details?.last_name || ""
                              }\`.trim() || "N/A"
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="drivers">
                  <DriversTab
                    partnerId={partner?.partner_id!}
                    tenantId={tenantId!}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-16 w-16 border">
                        <AvatarImage
                          src={partner?.profilePicture || undefined}
                          alt={partnerName}
                        />
                        <AvatarFallback className="text-xl">
                          {partnerAvatarFallback}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-2xl font-semibold">
                          {partnerName}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          ID: {partner?.partner_id || partner?._id}{" "}
                          <Badge variant="outline" className="ml-2 capitalize">
                            {getPartnerTypeLabel(partner?.type)}
                          </Badge>
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {partner?.description && (
                      <InfoItem
                        icon={<FileText className="h-4 w-4" />}
                        label="Description"
                        value={partner?.description}
                      />
                    )}
                    <Separator />
                    <h4 className="font-medium text-md">Contact Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <InfoItem
                        icon={<Mail className="h-4 w-4" />}
                        label="Contact Email"
                        value={partner?.user_details?.email ? (
                          <a href={\`mailto:\${partner.user_details.email}\`} className="hover:underline">{partner.user_details.email}</a>
                        ) : "N/A"}
                      />
                      <InfoItem
                        icon={<Phone className="h-4 w-4" />}
                        label="Contact Phone"
                        value={partner?.user_details?.phone ? (
                          <a href={\`tel:\${partner.user_details.phone}\`} className="hover:underline">{partner.user_details.phone}</a>
                        ) : "N/A"}
                      />
                      {partner?.location?.address && (
                        <InfoItem
                          icon={<MapPinIcon className="h-4 w-4" />}
                          label="Address"
                          value={partner?.location.address}
                        />
                      )}
                    </div>
                    <Separator />
                    <h4 className="font-medium text-md">
                      Associated User Account
                    </h4>{" "}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <InfoItem
                        icon={<UserIcon className="h-4 w-4" />}
                        label="Account Name"
                        value={
                          \`\${partner?.user_details?.first_name || ""} \${partner?.user_details?.last_name || ""
                            }\`.trim() || "N/A"
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Truck className="mr-2 h-5 w-5 text-primary" />{" "}
                      Operational Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {partner?.location?.coordinates && (
                      <div>
                        <h4 className="font-medium text-md mb-2">
                          Service Area / Location
                        </h4>
                        <MapPicker
                          value={[
                            partner?.location.coordinates.lat,
                            partner?.location.coordinates.lng,
                          ]}
                          onChange={() => { }}
                          readOnly={true}
                          height="250px"
                        />
                      </div>
                    )}
                    {partner?.type === "individual" && partner?.vehicle_info && (
                      <div>
                        <h4 className="font-medium text-md mb-2">
                          Vehicle Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                          <InfoItem
                            label="Vehicle Type"
                            value={partner?.vehicle_info.vehicle_type_id || "N/A"}
                          />
                          <InfoItem
                            label="Plate Number"
                            value={partner?.vehicle_info.metadata?.plate || "N/A"}
                          />
                          <InfoItem
                            label="Make"
                            value={partner?.vehicle_info.metadata?.make || "N/A"}
                          />
                          <InfoItem
                            label="Model"
                            value={partner?.vehicle_info.metadata?.model || "N/A"}
                          />
                          <InfoItem
                            label="Year"
                            value={partner?.vehicle_info.metadata?.year || "N/A"}
                          />
                          <InfoItem
                            label="Color"
                            value={partner?.vehicle_info.metadata?.color || "N/A"}
                          />
                        </div>
                      </div>
                    )}

                    {(partner?.type === "pickup_point" ||
                      partner?.type === "individual") && (
                        <div>
                          <Separator />
                          <h4 className="font-medium text-md mb-2">Pricing</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {partner?.type == "individual" && (
                              <InfoItem
                                label="Cost Per Km"
                                value={partner?.cost_per_km || "N/A"}
                              />
                            )}
                            {partner?.type == "pickup_point" && (
                              <InfoItem
                                label="Flat Fee"
                                value={partner?.flat_fee || "N/A"}
                              />
                            )}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24 self-start">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <ListChecks className="mr-2 h-5 w-5" /> Verification Status
                </CardTitle>
                <CardDescription>
                  Overall KYC Status:
                  <Badge
                    variant={partner?.kyc?.verified ? "success" : "warning"}
                    className="ml-2 capitalize"
                  >
                    {partner?.kyc?.verified ? (
                      <>
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Verified
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {partner?.kyc?.status || "Pending"}
                      </>
                    )}
                  </Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <VerificationDocumentManager
                  documents={partner?.kyc?.documents?.map(transformKycToVerificationDoc) || []}
                  onDocumentVerification={handleDocumentVerification}
                  showActions={true}
                  isProcessing={isUpdating}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!partner.is_approved && (
                  <div className="space-y-2">
                    {partner.kyc?.verified && (
                      <Can permission="delivery-partners:update">
                        <Button
                          onClick={() => handleStatusChange("approve")}
                          disabled={isUpdatingStatus}
                          size="sm"
                          className="w-full bg-green-100 text-green-600 border-green-600 hover:bg-green-200"
                        >
                          {isUpdatingStatus ? (
                            <Spinner size="sm" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          Approve
                        </Button>
                      </Can>
                    )}
                  </div>
                )}

                {partner.is_approved && (
                  <div className="space-y-2">
                    <Can permission="delivery-partners:update">
                      <Button
                        onClick={() =>
                          handleStatusChange(partner.is_active ? "deactivate" : "activate")
                        }
                        disabled={isUpdatingStatus}
                        size="sm"
                        className="w-full"
                      >
                        {isUpdatingStatus ? (
                          <Spinner size="sm" />
                        ) : (
                          <Power className="mr-2 h-4 w-4" />
                        )}
                        {partner.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </Can>
                  </div>
                )}
                <Can permission="delivery-partners:update">
                  <Button
                    onClick={() => handleStatusChange("reject")}
                    disabled={isUpdatingStatus}
                    size="sm"
                    className="w-full bg-red-100 text-red-600 border-red-600 hover:bg-red-200"
                  >
                    {isUpdatingStatus ? (
                      <Spinner size="sm" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    {!partner.is_approved ? "Reject Partner" : "Suspend Partner"}
                  </Button>
                </Can>
                <Separator className="my-3" />
                <Can permission="delivery-partners:update">
                  <Button
                    variant="outline"
                    onClick={() =>
                      router.push(
                        \`/dashboard/delivery-partners/\${partner?.partner_id || partner?._id
                        }/edit\`
                      )
                    }
                    className="w-full"
                    size="sm"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit Partner Details
                  </Button>
                </Can>
                <Can permission="delivery-partners:delete">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full hover:bg-red-700"
                        size="sm"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Partner
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete the delivery partner
                          <strong>{partnerName}</strong> and all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                          onClick={handleDeletePartner}
                        >
                          Delete Partner
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </Can>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <DeliveryPartnerRejectionModal
        isOpen={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onConfirm={handleRejectConfirm}
      />
    </div>
  ) : null;
}

export default withAuthorization(DeliveryPartnerPage, { permission: "delivery-partners:read" });
