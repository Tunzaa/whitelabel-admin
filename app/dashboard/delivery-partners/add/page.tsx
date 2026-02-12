"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDeliveryPartnerStore } from "@/features/delivery-partners/store"
import { DeliveryPartnerForm } from "@/features/delivery-partners/components/delivery-partner-form"
import { DeliveryPartner } from "@/features/delivery-partners/types"
import { toast } from "sonner";
import { DeliveryPartnerFormValues } from "@/features/delivery-partners/schema";
import { withAuthorization } from "@/components/auth/with-authorization";

const transformFormValuesToApiPayload = (formValues: DeliveryPartnerFormValues): Partial<DeliveryPartner> => {
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
    document_id: doc.document_type_id || "", 
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

function CreateDeliveryPartnerPage() {
  const router = useRouter()
  const { data: session } = useSession();

  const { createDeliveryPartner } = useDeliveryPartnerStore()

  const handleSubmit = async (data: DeliveryPartnerFormValues) => {
    const apiPayload = transformFormValuesToApiPayload(data);
    const tenantId = (session?.user as any)?.tenant_id;
    const headers: Record<string, string> = {};
    if (tenantId) {
      headers["X-Tenant-ID"] = tenantId;
    }

    try {
      await createDeliveryPartner(apiPayload, headers);
      toast.success("Delivery Partner created successfully");
      router.push("/dashboard/delivery-partners");
    } catch (error) {
      console.error("Error creating delivery partner:", error);
      toast.error("Failed to create delivery partner. Please try again.");
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard/delivery-partners")}
          className="mr-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back</span>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Delivery Partner</h1>
          <p className="text-muted-foreground">
            Create a new delivery partner account
          </p>
        </div>
      </div>

      <div className="p-4">
        <DeliveryPartnerForm
          onSubmit={handleSubmit}
          onCancel={() => router.push("/dashboard/delivery-partners")}
        />
      </div>
    </div>
  )
}

export default withAuthorization(CreateDeliveryPartnerPage, { permission: "delivery-partners:create" });
