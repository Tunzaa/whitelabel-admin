"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeliveryPartnerForm } from "@/features/delivery-partners/components/delivery-partner-form";
import { useDeliveryPartnerStore } from "@/features/delivery-partners/store";
import { DeliveryPartner, VehicleInfo, KycDocument } from "@/features/delivery-partners/types"; // Added KycDocument
import { DeliveryPartnerFormValues, formKycDocumentSchema } from "@/features/delivery-partners/schema"; // Added FormValues type and formKycDocumentSchema
import { z } from "zod"; // For inferring FormKycDocumentValues type
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner"
import { withAuthorization } from "@/components/auth/with-authorization";
import { withModuleAuthorization } from "@/components/auth/with-module-authorization";

interface DeliveryPartnerEditPageProps {
  params: {
    id: string;
  };
}

type FormKycDocumentValues = z.infer<typeof formKycDocumentSchema>;

const transformPartnerDataToFormValues = (partner: DeliveryPartner): Partial<DeliveryPartnerFormValues> => {
  const formValues: Partial<DeliveryPartnerFormValues> = {
    _id: partner._id,
    type: partner.type,
    name: partner.name,
    user: partner.user_details ? {
      first_name: partner.user_details.first_name || "",
      last_name: partner.user_details.last_name || "",
      email: partner.user_details.email || "",
      phone_number: partner.user_details.phone_number || "",
    } : { first_name: " ", last_name: " ", email: " ", phone_number: " " },
    profile_picture: partner.profile_picture || undefined,
    description: partner.description || undefined,
    tax_id: partner.tax_id || undefined,
  };
  if (partner.location?.coordinates) {
    formValues.coordinates = [partner.location.coordinates.lat, partner.location.coordinates.lng];
  }
  if (partner.vehicle_info) {
    formValues.vehicle_type_id = partner.vehicle_info.vehicle_type_id || "";
    formValues.vehiclePlate = partner.vehicle_info.metadata?.plate ? String(partner.vehicle_info.metadata.plate) : "";
    formValues.vehicleMake = partner.vehicle_info.metadata?.make ? String(partner.vehicle_info.metadata.make) : "";
    formValues.vehicleModel = partner.vehicle_info.metadata?.model ? String(partner.vehicle_info.metadata.model) : "";
    formValues.vehicleYear = partner.vehicle_info.metadata?.year ? String(partner.vehicle_info.metadata.year) : "";
    formValues.vehicleColor = partner.vehicle_info.metadata?.color ? String(partner.vehicle_info.metadata.color) : "";
  }
  if (partner.cost_per_km !== undefined && partner.cost_per_km !== null) {
    formValues.cost_per_km = String(partner.cost_per_km);
  }
  if (partner.type === 'pickup_point') {
    if (partner.flat_fee !== undefined && partner.flat_fee !== null) {
      formValues.flat_fee = String(partner.flat_fee);
    }
  }
  if (partner.kyc && partner.kyc.documents && Array.isArray(partner.kyc.documents)) {
    formValues.kyc_documents = partner.kyc.documents.map((doc: KycDocument) => ({
      document_id: doc.document_type_id || "", // TODO: remove this later, when not required anymore by the backend
      document_type_id: doc.document_type_id || "",
      number: doc.number || "",
      link: doc.link || "",
      expires_at: doc.expires_at || "",
      status: doc.verified ? 'verified' : (doc.rejected_at ? 'rejected' : 'pending_verification'),
      rejection_reason: doc.rejected_reason || undefined,
    }));
  } else {
    formValues.kyc_documents = [];
  }
  return formValues;
};

const transformFormValuesToApiPayload = (formValues: DeliveryPartnerFormValues, partner?: DeliveryPartner | null): Partial<DeliveryPartner> => {
  const vehicle_metadata = {
    make: formValues.vehicleMake || "",
    model: formValues.vehicleModel || "",
    year: formValues.vehicleYear ? parseInt(formValues.vehicleYear, 10) : undefined,
    color: formValues.vehicleColor || "",
    plate: formValues.vehiclePlate || "",
  };
  const detailsArr = [vehicle_metadata.make, vehicle_metadata.model, vehicle_metadata.color, vehicle_metadata.plate].filter(Boolean);
  const details = detailsArr.join(", ");
  const vehicle_info = {
    vehicle_type_id: formValues.vehicle_type_id || "",
    details,
    metadata: vehicle_metadata,
  };
  const kyc_documents = (formValues.kyc_documents || []).map((doc) => ({
    document_type_id: doc.document_type_id || "",
    number: doc.number || "",
    link: doc.link || "",
    expires_at: doc.expires_at || "",
    verified: false,
  }));
  const apiPayload: Partial<DeliveryPartner> = {
    type: formValues.type,
    name: formValues.name,
    user_details: {
      first_name: formValues.user.first_name,
      last_name: formValues.user.last_name,
      email: formValues.user.email,
      phone_number: formValues.user.phone_number,
    },
    profile_picture: formValues.profile_picture || undefined,
    description: formValues.description || undefined,
    tax_id: formValues.tax_id,
    vehicle_info: {
      ...vehicle_info,
      plate_number: formValues.vehiclePlate || "",
    },
    kyc: { verified: false, documents: kyc_documents },
    drivers: [],
  };
  if (formValues.coordinates && formValues.coordinates.length === 2) {
    apiPayload.location = {
      coordinates: {
        lat: formValues.coordinates[0],
        lng: formValues.coordinates[1],
      },
    };
  }
  if (formValues.type === "pickup_point" && formValues.flat_fee) {
    apiPayload.flat_fee = parseFloat(formValues.flat_fee);
  }
  if (formValues.type === "individual" && formValues.cost_per_km) {
    apiPayload.cost_per_km = parseFloat(formValues.cost_per_km);
  }
  return apiPayload;
};

function DeliveryPartnerEditPage(props: DeliveryPartnerEditPageProps) {
  const params = use(props.params) as { id: string };
  const router = useRouter();
  const { data: session } = useSession();
  const id = params.id;
  const [partner, setPartner] = useState<DeliveryPartner | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null); // This can be used for displaying general page errors
  const { fetchDeliveryPartner, updateDeliveryPartner } = useDeliveryPartnerStore();

  useEffect(() => {
    const loadPartner = async () => {
      try {
        setLoading(true);
        setError(null);
        const tenantId = (session?.user as any)?.tenant_id;
        const headers: Record<string, string> = {};
        if (tenantId) {
          headers["X-Tenant-ID"] = tenantId;
        }
        const partnerData = await fetchDeliveryPartner(id, headers);
        setPartner(partnerData);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load delivery partner details. Please try again.');
        setError('Failed to load delivery partner details.'); // Set page level error if needed
      } finally {
        setLoading(false);
      }
    };

    loadPartner();
  }, [id, fetchDeliveryPartner]);

  const handleSubmit = async (data: DeliveryPartnerFormValues) => {
    try {
      setLoading(true);
      const tenantId = (session?.user as any)?.tenant_id;
      const headers: Record<string, string> = {};
      if (tenantId) {
        headers["X-Tenant-ID"] = tenantId;
      }

      const apiPayload = transformFormValuesToApiPayload(data as DeliveryPartnerFormValues, partner);
      await updateDeliveryPartner(id, apiPayload, headers);
      toast.success("Delivery Partner updated successfully");
      router.push("/dashboard/delivery-partners");
    } catch (err: any) {
      toast.error(err.message || 'Failed to update delivery partner. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !partner) {
    return <Spinner />
  }

  if (!partner && error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Delivery Partner Not Found</h1>
            <p className="text-muted-foreground">
              The delivery partner you are trying to edit does not exist.
            </p>
          </div>
        </div>
        <div className="p-4">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/delivery-partners")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Delivery Partners
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/delivery-partners")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Edit Delivery Partner: {partner?.name}
            </h1>
            <p className="text-muted-foreground">
              Update delivery partner information and settings
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <DeliveryPartnerForm
          initialData={partner ? transformPartnerDataToFormValues(partner) : undefined}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/dashboard/delivery-partners")}
          disableTypeChange={true}
        />
      </div>
    </div>
  );
}

export default withModuleAuthorization(withAuthorization(DeliveryPartnerEditPage, { 
  permission: "delivery-partners:update" 
}), "delivery");