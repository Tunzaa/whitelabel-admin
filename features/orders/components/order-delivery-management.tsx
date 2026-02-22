"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { User as NextAuthUser } from "next-auth";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import {
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  MapPin,
  Mail,
  Phone,
  User,
  AlertTriangle,
} from "lucide-react";
import { Copy } from "@/components/ui/copy";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate, formatTime, formatPartnerId } from "@/lib/utils";
import { Order, DeliveryDetails, DeliveryStage } from "@/features/orders/types";
import { useOrderStore } from "@/features/orders/store";
import { useDeliveryPartnerStore } from "@/features/delivery-partners/store";
import { DeliveryPartnerFilter } from "@/features/delivery-partners/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExternalLink } from "lucide-react";

interface DeliveryManagementProps {
  order: Order | null;
  delivery_details?: DeliveryDetails | null;
  allVendorsAccepted?: boolean;
}

const stageIcons: { [key: string]: React.ElementType } = {
  assigned: Clock,
  picked_up: Truck,
  in_transit: MapPin,
  delivered: CheckCircle,
  default: Clock,
};

const DeliveryManagement: React.FC<DeliveryManagementProps> = ({
  order,
  delivery_details: initialDeliveryDetails = null,
  allVendorsAccepted = false,
}) => {
  interface ExtendedUser extends NextAuthUser {
    tenant_id: string;
    role: "super" | "admin" | "sub_admin" | "support";
  }

  const { data: session } = useSession();
  const user = session?.user as ExtendedUser;
  const {
    fetchOrder,
    assignDeliveryPartner,
    addDeliveryStage,
    fetchOrderDeliveryDetails,
    activeAction,
  } = useOrderStore();

  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetails | null>(initialDeliveryDetails);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [isFetchingDelivery, setIsFetchingDelivery] = useState(false);
  const [currentPartnerId, setCurrentPartnerId] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Fetch delivery details when component mounts
    if (order?.order_id && user?.tenant_id) {
      setIsFetchingDelivery(true);
      fetchOrderDeliveryDetails(order.order_id, { "X-Tenant-ID": user.tenant_id })
        .then((details) => {
          setDeliveryDetails(details);
        })
        .catch((error) => {
          // Only show error if it's not a 404 (not found)
          const status = error?.response?.status;
          if (status !== 404) {
            setDeliveryError("Failed to fetch delivery details");
            setErrorStatus(status);
          } else {
            setDeliveryDetails(null); // Clear delivery details if not found
            setDeliveryError(null); // Clear error state for 404
            setErrorStatus(404);
          }
        })
        .finally(() => {
          setIsFetchingDelivery(false);
        });
    }
  }, [order?.order_id, user?.tenant_id]);
  const {
    partners: deliveryPartners,
    loading: loadingPartners,
    fetchDeliveryPartners,
  } = useDeliveryPartnerStore();

  const [isAssignDialogOpen, setAssignDialogOpen] = useState(false);
  const [partnerType, setPartnerType] = useState<
    "individual" | "business" | "pickup_point"
  >("business");
  const [partnerSearchTerm, setPartnerSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(partnerSearchTerm, 500);
  const [assigningPartnerId, setAssigningPartnerId] = useState<string | null>(
    null
  );

  const loadDeliveryPartners = async () => {
    if (!user?.tenant_id) {
      toast.error("Tenant ID not found. Cannot fetch partners.");
      return;
    }

    const filter: DeliveryPartnerFilter = {
      partner_type: partnerType,
      is_active: true,
      // is_available:true,
      search: debouncedSearchTerm,
    };

    try {
      await fetchDeliveryPartners(filter, { "X-Tenant-ID": user.tenant_id });
    } catch (error) {
      toast.error("Failed to load delivery partners.");
    }
  };

  useEffect(() => {
    if (isAssignDialogOpen) {
      loadDeliveryPartners();
    }
  }, [isAssignDialogOpen, debouncedSearchTerm, partnerType]);

  const handleAssignPartner = async (partnerId: string) => {
    if (!user?.tenant_id || !order?.order_id) {
      toast.error("Missing required information.");
      return;
    }

    setAssigningPartnerId(partnerId);
    try {
      let result: DeliveryDetails | null = null;

      if (deliveryDetails?.id) {
        // Reassigning an existing delivery – add a new stage via /deliveries/{id}/stages
        const payload = {
          partner_id: partnerId,
          stage: "assigned" as DeliveryStage["stage"],
        };
        result = await addDeliveryStage(deliveryDetails.id, payload, {
          "X-Tenant-ID": user.tenant_id,
        });
      } else {
        // First-time assignment – create delivery via /deliveries
        const now = new Date().toISOString();
        const payload = {
          order_id: order.order_id,
          partner_id: partnerId,
          pickup_points: [
            {
              partner_id: partnerId,
              timestamp: now,
            },
          ],
          stages: [
            {
              partner_id: partnerId,
              stage: "assigned" as DeliveryStage["stage"],
              timestamp: now,
            },
          ],
          current_stage: "assigned" as DeliveryStage["stage"],
          created_at: now,
          updated_at: now,
        };
        result = await assignDeliveryPartner(payload, {
          "X-Tenant-ID": user.tenant_id,
        });
      }

      if (result) {
        setDeliveryDetails(result);
        setAssignDialogOpen(false);
        toast.success(
          deliveryDetails?.id
            ? "Delivery partner reassigned successfully."
            : "Delivery partner assigned successfully."
        );
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to assign delivery partner.");
    } finally {
      setAssigningPartnerId(null);
    }
  };

  return (
    <>    
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div>Delivery</div>
              {deliveryDetails?.id && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="cursor-default">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Go to delivery page"
                        onClick={() => router.push(`/dashboard/orders/deliveries/${deliveryDetails.id}`)}
                        >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Go to Delivery Page
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </CardTitle>
            {deliveryDetails && (
              <Badge variant="secondary">
                {deliveryDetails.current_stage}
              </Badge>
            )}
          </div>
          <CardDescription>
            {deliveryDetails
              ? "Tracking information and history."
              : "No delivery information available."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!deliveryDetails && deliveryError && errorStatus !== 404 ? (
            <div className="text-center py-6">
              <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
              <p className="mt-2 text-sm text-destructive">
                Failed to fetch delivery details. Please try again later.
              </p>
            </div>
          ) : deliveryDetails?.stages?.length > 0 ? (
              <div className="space-y-6">
                {deliveryDetails?.stages?.map((stage, index) => {
                  const Icon = stageIcons[stage.stage] || stageIcons["default"];
                  return (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Icon className="h-5 w-5" />
                        </div>
                        {index < deliveryDetails.stages.length - 1 && (
                          <div className="h-8 w-px bg-border my-1" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold capitalize">
                          {(stage.stage === "assigned" && index > 0 ? "reassigned" : stage.stage).replace(/_/g, " ")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(stage.timestamp)} at {formatTime(stage.timestamp)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Partner:</span>
                          <span className="font-mono">{formatPartnerId(stage.partner_id)}</span>
                          <Copy text={stage.partner_id} size={14} className="ml-auto" />
                        </div>
                        {order?.status && ['pending', 'processing', 'confirmed'].includes(order.status) && deliveryDetails?.current_stage === "assigned" && index === deliveryDetails.stages.length - 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto"
                            onClick={() => {
                              setCurrentPartnerId(stage.partner_id);
                              setAssignDialogOpen(true);
                            }}
                          >
                            Reassign Delivery
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
          ) : (
            <div className="text-center py-6">
              {isFetchingDelivery ? (
                <Spinner className="mx-auto h-6 w-6" />
              ) : (
                <>
                  <Truck className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Delivery has not been initiated for this order.
                  </p>
                  {order?.status && ['pending', 'processing', 'confirmed'].includes(order.status) && (
                    <Button
                      className="mt-4"
                      onClick={() => setAssignDialogOpen(true)}
                      disabled={!allVendorsAccepted}
                    >
                      Assign Delivery Partner
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAssignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="md:max-w-[750px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{currentPartnerId ? 'Reassign Delivery Partner' : 'Assign Delivery Partner'}</DialogTitle>
            <DialogDescription>
              {currentPartnerId 
                ? 'Select a new delivery partner to handle this order.'
                : 'Select a delivery partner to handle this order.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <Tabs
              defaultValue={partnerType}
              onValueChange={(value) =>
                setPartnerType(
                  value as "individual" | "business" | "pickup_point"
                )
              }
            >
              <TabsList className="w-full">
                <TabsTrigger value="business" className="flex-1">
                  Business
                </TabsTrigger>
                <TabsTrigger value="individual" className="flex-1">
                  Individual
                </TabsTrigger>
                <TabsTrigger value="pickup_point" className="flex-1">
                  Pickup Points
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Input
              placeholder="Search partners..."
              value={partnerSearchTerm}
              onChange={(e) => setPartnerSearchTerm(e.target.value)}
            />

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {loadingPartners ? (
                <div className="flex items-center justify-center py-4">
                  <Spinner />
                </div>
              ) : deliveryPartners.length > 0 ? (
                deliveryPartners.map((partner) => (
                  <div
                    key={partner._id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{partner.name}</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5" />
                            <span>{partner?.user_details?.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{partner?.user_details?.phone}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAssignPartner(partner.partner_id)}
                        disabled={
                          assigningPartnerId === partner.partner_id ||
                          activeAction === "assignDeliveryPartner"
                        }
                      >
                        {assigningPartnerId === partner._id ? (
                          <Spinner className="h-4 w-4" />
                        ) : (
                          "Assign"
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  No delivery partners found.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeliveryManagement;