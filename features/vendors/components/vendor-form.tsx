"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  useFieldArray,
  useWatch,
  Control,
  FieldPath,
} from "react-hook-form";
import { Spinner } from "@/components/ui/spinner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RequiredField } from "@/components/ui/required-field";
import { PhoneInput } from "@/components/ui/phone-input";
import { MultiSelect } from "@/components/ui/multi-select";
import { ImageUpload } from "@/components/ui/image-upload";
import { MapPicker } from "@/components/ui/map-picker";
import {
  DocumentUpload,
  DocumentWithMeta,
  DocumentType,
} from "@/components/ui/document-upload";
import { FileUpload } from "@/components/ui/file-upload";
import {
  DOCUMENT_TYPES,
  DocumentTypeOption,
} from "@/features/configurations/data/document-types";
import {
  VendorFormValues,
  VerificationDocument as VendorVerificationDocument,
  StoreBanner,
  Store,
} from "../types";
import { Category } from "@/features/categories/types";
import { Tenant } from "@/features/tenants/types";
import { useCategoryStore } from "@/features/categories/store";
import { useTenantStore } from "@/features/tenants/store";
import { useVendorStore } from "../store";
import { BannerEditor } from "@/components/ui/banner-editor";
import { vendorFormSchema } from "../schema";
import { cn } from "@/lib/utils";
import VendorStoreForm from "./vendor-store-fields";
import { BankingInfoFields } from "@/components/ui/banking-info-fields";

// Default values for the form, providing a clean slate for new vendors.
const defaultValues: Partial<VendorFormValues> = {
  verification_documents: [],
  country: "Tanzania",
  commission_rate: "0",
  business_name: "",
  bank_account: {
    bank_name: "",
    account_number: "",
    account_name: "",
    swift_code: "",
    branch_code: "",
  },
  stores: [
    {
      store_name: "",
      store_slug: "",
      description: "",
      branding: {
        logo_url: "",
        colors: {
          primary: "#4285F4",
          secondary: "#34A853",
          accent: "#FBBC05",
          text: "#333333",
          background: "#FFFFFF",
        },
      },
      banners: [],
      categories: [],
      return_policy: "",
      shipping_policy: "",
      general_policy: "",
    },
  ],
  user: {
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
  },
};

interface VendorFormProps {
  onSubmit: (data: VendorFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  initialData?: VendorFormValues | null;
  id?: string;
}

export const VendorForm: React.FC<VendorFormProps> = ({
  onSubmit: onFormSubmit,
  onCancel,
  isSubmitting,
  initialData,
  id,
}) => {
  const { data: session } = useSession();
  const tenantId = useMemo(
    () => (session?.user as any)?.tenant_id || "",
    [session]
  );
  const isSuperOwner = useMemo(
    () => session?.user?.role === "super",
    [session]
  );
  const isAddPage = !initialData?.vendor_id;

  const [activeTab, setActiveTab] = useState<Tab>("business");
  const [formError, setFormError] = useState<string | null>(null);

  // Removed direct store calls, as parent component now handles submission
  const { loading: isUpdatingStatus } = useVendorStore();
  const fetchTenants = useTenantStore((state) => state.fetchTenants);
  const tenants = useTenantStore((state) => state.tenants);
  const fetchCategories = useCategoryStore((state) => state.fetchCategories);
  const categories = useCategoryStore((state) => state.categories);

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: initialData
      ? {
          ...defaultValues,
          ...initialData,
          user: {
            ...defaultValues.user,
            ...initialData.user,
            email: initialData.user?.email || initialData.contact_email || "",
            phone_number:
              initialData.user?.phone_number || initialData.contact_phone || "",
          },
        }
      : { ...defaultValues, tenant_id: isSuperOwner ? "" : tenantId },
    mode: "onSubmit",
  });

  const watchedTenantId = form.watch("tenant_id");
  useEffect(() => {
    if (isSuperOwner) {
      fetchTenants();
    }
  }, [isSuperOwner, fetchTenants]);

  useEffect(() => {
    if (watchedTenantId) {
      fetchCategories(undefined, { "X-Tenant-ID": watchedTenantId });
    }
  }, [watchedTenantId, fetchCategories]);

  const tabFlow = [
    "business",
    "store",
    "address",
    "banking",
    "documents",
    "review",
  ] as const;
  type Tab = (typeof tabFlow)[number];

  const tabFields: Partial<Record<Tab, FieldPath<VendorFormValues>[]>> = {
    business: [
      "tenant_id",
      "business_name",
      "display_name",
      "user.first_name",
      "user.last_name",
      "contact_email",
      "contact_phone",
      "commission_rate",
    ],
    store: [
      "stores.0.store_name",
      "stores.0.description",
      "stores.0.categories",
    ],
    address: [
      "address_line1",
      "city",
      "state_province",
      "postal_code",
      "country",
    ],
    banking: [
      "bank_account.bank_name",
      "bank_account.account_name",
      "bank_account.account_number",
    ],
    documents: ["verification_documents"],
  };

  const nextTab = async () => {
    const fieldsToValidate = tabFields[activeTab];

    // If the current tab has no fields to validate (e.g., review tab), just proceed
    if (!fieldsToValidate) {
      const currentTabIndex = tabFlow.indexOf(activeTab);
      if (currentTabIndex < tabFlow.length - 1) {
        setActiveTab(tabFlow[currentTabIndex + 1]);
      }
      return;
    }

    const isValid = await form.trigger(fieldsToValidate as any);

    if (isValid) {
      const currentTabIndex = tabFlow.indexOf(activeTab);
      if (currentTabIndex < tabFlow.length - 1) {
        setActiveTab(tabFlow[currentTabIndex + 1]);
      }
    } else {
      toast.error("Please correct the errors on this tab before proceeding.");
    }
  };

  const prevTab = () => {
    const currentTabIndex = tabFlow.indexOf(activeTab);
    if (currentTabIndex > 0) {
      setActiveTab(tabFlow[currentTabIndex - 1]);
    }
  };

  const handleDeleteDocument = (index: number) => {
    // Simply remove the document from the field array without any server call
    removeDocument(index);
    toast.info(
      "Document removed from list. Save changes to make it permanent."
    );
  };

  const handleUploadComplete = (doc: DocumentWithMeta) => {
    if (!doc.document_url) {
      toast.error("Upload failed: document URL is missing.");
      return;
    }
    const newDocument: VendorVerificationDocument = {
      document_type_id: doc.document_type,
      document_url: doc.document_url,
      file_name: doc.file_name,
      expires_at: doc.expires_at,
      file_id: doc.file_id,
      verification_status: "pending",
      number: doc.number, // Ensure number is included
    };
    appendDocument(newDocument as any);
  };

  // const handleUpdateStore = async (vendorId: string, storeId: string, data: any) => {
  //   try {
  //     await updateStore(vendorId, storeId, data);
  //     toast.success("Store updated successfully.");
  //   } catch (error) {
  //     toast.error("Failed to update store.");
  //   }
  // };

  const onSubmit = (data: VendorFormValues) => {
    setFormError(null);
    // Clean up data before submitting to the parent
    const dataToSubmit = JSON.parse(JSON.stringify(data));

    // Ensure tenant_id is set if not super owner
    if (!isSuperOwner) {
      dataToSubmit.tenant_id = tenantId;
    }

    // Remove local 'file' objects from documents before submission
    if (dataToSubmit.verification_documents) {
      dataToSubmit.verification_documents =
        dataToSubmit.verification_documents.map((doc: any) => {
          const { file, ...docWithoutFile } = doc;
          // Ensure number is included in the payload
          return { ...docWithoutFile, number: doc.number };
        });
    }

    // Convert [lat,long] tuple to { lat, long } object if necessary
    if (dataToSubmit.location && Array.isArray(dataToSubmit.location)) {
      dataToSubmit.location = {
        lat: dataToSubmit.location[0],
        long: dataToSubmit.location[1],
      };
    }

    // Pass the cleaned data to the parent component's submit handler
    onFormSubmit(dataToSubmit);
  };

  const handleFormError = (errors: any) => {

    // Find the first error field and determine which tab it belongs to
    const findTabForField = (fieldPath: string): Tab | null => {
      for (const [tabName, fields] of Object.entries(tabFields)) {
        if (
          fields?.some((field) => {
            // Check exact match or if the error field starts with the tab field
            return (
              fieldPath === field ||
              fieldPath.startsWith(field + ".") ||
              field.startsWith(fieldPath + ".")
            );
          })
        ) {
          return tabName as Tab;
        }
      }

      // Handle nested field paths by checking root level
      const fieldRoot = fieldPath.split(".")[0];
      for (const [tabName, fields] of Object.entries(tabFields)) {
        if (fields?.some((field) => field.startsWith(fieldRoot + "."))) {
          return tabName as Tab;
        }
      }

      return null;
    };

    // Get all error field paths and find the first tab with errors
    const errorFields = Object.keys(errors);
    let targetTab: Tab | null = null;

    for (const fieldPath of errorFields) {
      targetTab = findTabForField(fieldPath);
      if (targetTab) {
        break;
      }
    }

    // Navigate to the tab with the first error
    if (targetTab && activeTab !== targetTab) {
      setActiveTab(targetTab);
      toast.error(
        `Please fix the validation errors in the ${targetTab} section.`
      );
    } else {
      toast.error("Please fix the validation errors before submitting.");
    }
  };

  const {
    fields: documentFields,
    append: appendDocument,
    remove: removeDocument,
  } = useFieldArray({
    control: form.control,
    name: "verification_documents",
  });

  const handleBusinessNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const businessName = e.target.value;
    form.setValue("business_name", businessName, { shouldValidate: true });

    const currentStoreName = form.getValues("stores.0.store_name");
    if (!currentStoreName) {
      form.setValue("stores.0.store_name", businessName, {
        shouldValidate: false,
      });
    }

    const currentStoreSlug = form.getValues("stores.0.store_slug");
    if (!currentStoreSlug) {
      const slug = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      form.setValue("stores.0.store_slug", slug, { shouldValidate: false });
    }
  };

  return (
    <div className="space-y-6">
      {formError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <Card className="w-full">
        <CardContent className="p-6">
          <Form {...form}>
            <form
              id={id || "marketplace-vendor-form"}
              onSubmit={form.handleSubmit(onSubmit, handleFormError)}
            >
              {/* Save isEditable in a local variable to fix reference issues throughout the form */}
              <fieldset disabled={isSubmitting} className="space-y-6">
                {/* Tenant selector (superowner only) */}
                {isSuperOwner && (
                  <FormField
                    control={form.control}
                    name="tenant_id"
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>
                          Tenant <RequiredField />
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a tenant" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tenants
                              .filter(
                                (tenant) =>
                                  tenant.tenant_id &&
                                  tenant.tenant_id.trim() !== ""
                              )
                              .map((tenant) => (
                                <SelectItem
                                  key={
                                    tenant.tenant_id ||
                                    `tenant-${Math.random()}`
                                  }
                                  value={tenant.tenant_id}
                                >
                                  {tenant.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-sm text-muted-foreground">
                          The tenant this vendor belongs to
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Tabs for form sections */}
                <Tabs
                  defaultValue="business"
                  value={activeTab}
                  className="mt-2"
                  onValueChange={(value) => setActiveTab(value)}
                >
                  <TabsList className="w-full">
                    <TabsTrigger value="business" className="text-center">
                      Business
                    </TabsTrigger>
                    <TabsTrigger value="store" className="text-center">
                      Store
                    </TabsTrigger>
                    <TabsTrigger value="address" className="text-center">
                      Address
                    </TabsTrigger>
                    <TabsTrigger value="banking" className="text-center">
                      Banking
                    </TabsTrigger>
                    <TabsTrigger value="documents" className="text-center">
                      Documents
                    </TabsTrigger>
                    <TabsTrigger value="review" className="text-center">
                      Review
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-6">
                    <BusinessTab />
                    <StoreTab />
                    <AddressTab />
                    <BankingTab />
                    <DocumentsTab />
                    <ReviewTab />
                  </div>
                </Tabs>

                {/* Navigation Buttons - moved to the right */}
                <div className="flex justify-end mt-6">
                  <div className="flex gap-2">
                    {/* Previous button */}
                    {activeTab !== tabFlow[0] && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevTab}
                        disabled={isSubmitting}
                      >
                        Previous
                      </Button>
                    )}

                    {/* Next button - show except on last tab */}
                    {activeTab !== tabFlow[tabFlow.length - 1] && (
                      <Button
                        type="button"
                        onClick={nextTab}
                        disabled={isSubmitting}
                      >
                        Next
                      </Button>
                    )}

                    {/* Save button - only on last tab */}
                    {activeTab === tabFlow[tabFlow.length - 1] && (
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Spinner size="sm" color="white" />
                            Saving...
                          </>
                        ) : (
                          <>Save Vendor</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </fieldset>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );

  // Business Tab Component
  function BusinessTab() {
    return (
      <TabsContent value="business" className="space-y-6 mt-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Business Name Field */}
            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Business Name <RequiredField />
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        handleBusinessNameChange(e);
                      }}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Display Name Field */}
            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Display Name <RequiredField />
                  </FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* First Name Field */}
            <FormField
              control={form.control}
              name="user.first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Owner First Name <RequiredField />
                  </FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Last Name Field */}
            <FormField
              control={form.control}
              name="user.last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Owner Last Name <RequiredField />
                  </FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Email Field */}
            <FormField
              control={form.control}
              name="contact_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Contact Email <RequiredField />
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      value={field.value || ""}
                      onChange={(e) => {
                        field.onChange(e);
                        form.setValue("user.email", e.target.value, {
                          shouldValidate: true,
                        });
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Used for account login and notifications
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Phone Field */}
            <FormField
              control={form.control}
              name="contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Contact Phone <RequiredField />
                  </FormLabel>
                  <FormControl>
                    <PhoneInput
                      {...field}
                      value={field.value || ""}
                      onChange={(value) => {
                        const phoneValue = value || "";
                        field.onChange(phoneValue);
                        form.setValue("user.phone_number", phoneValue, {
                          shouldValidate: true,
                        });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Website Field */}
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tax ID Field */}
            <FormField
              control={form.control}
              name="tax_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax ID</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categories moved to store tab */}

            {/* Commission Rate Field */}
            <FormField
              control={form.control}
              name="commission_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Commission Rate (%) <RequiredField />
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      pattern="^\d*(\.\d{0,2})?$"
                      placeholder="Enter commission rate"
                      value={field.value?.toString() || ""}
                      onChange={(e) => {
                        // Only allow numeric input with up to 2 decimal places
                        const value = e.target.value;
                        if (value === "" || /^\d*(\.\d{0,2})?$/.test(value)) {
                          field.onChange(value);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </TabsContent>
    );
  }

  // Store Tab Componnent
  function StoreTab() {
    return (
      <TabsContent value="store" className="space-y-6 mt-4">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Store Information</h3>
          <p className="text-sm text-muted-foreground">
            Provide details about your online store.
          </p>
        </div>
        <div className="space-y-4">
          <VendorStoreForm
            control={form.control}
            fieldPrefix="stores.0"
            categories={categories}
          />
        </div>
      </TabsContent>
    );
  }

  // Address Tab Component
  function AddressTab() {
    // Handle address data from map picker
    const handleAddressFound = (addressData: {
      address_line1?: string;
      city?: string;
      state_province?: string;
      country?: string;
    }) => {
      // Update form fields with the geocoded address data
      if (addressData.address_line1) {
        form.setValue("address_line1", addressData.address_line1, {
          shouldValidate: true,
        });
      }

      if (addressData.city) {
        form.setValue("city", addressData.city, { shouldValidate: true });
      }

      if (addressData.state_province) {
        form.setValue("state_province", addressData.state_province, {
          shouldValidate: true,
        });
      }

      if (addressData.country) {
        form.setValue("country", addressData.country, { shouldValidate: true });
      }
    };

    return (
      <TabsContent value="address" className="space-y-6 pt-4">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Address Information</h3>
          <p className="text-sm text-muted-foreground">
            Provide your business address details.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="address_line1"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Address <RequiredField />
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="mt-2"
                    placeholder="Street address, P.O. box, etc."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  City <RequiredField />
                </FormLabel>
                <FormControl>
                  <Input {...field} className="mt-2" placeholder="City" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="state_province"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  State/Province <RequiredField />
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    className="mt-2"
                    placeholder="State, province, region"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Country <RequiredField />
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Tanzania">Tanzania</SelectItem>
                    <SelectItem value="Kenya">Kenya</SelectItem>
                    <SelectItem value="Uganda">Uganda</SelectItem>
                    <SelectItem value="Rwanda">Rwanda</SelectItem>
                    {/* Add more countries as needed */}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Coordinates Map Picker */}
        <div className="md:col-span-2 mt-4">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => {
              let mapValue: [number, number] | null = null;
              if (field.value) {
                if (Array.isArray(field.value)) {
                  mapValue = field.value as [number, number];
                } else if (
                  typeof field.value === "object" &&
                  field.value !== null &&
                  "lat" in field.value &&
                  "long" in field.value
                ) {
                  const loc = field.value as { lat: number; long: number };
                  mapValue = [loc.lat, loc.long];
                } else {
                  mapValue = [0, 0]; // default to [0, 0] if not in expected format
                }
              }

              return (
                <FormItem>
                  <FormLabel>Location on Map</FormLabel>
                  <FormControl>
                    <MapPicker
                      value={mapValue}
                      onChange={field.onChange}
                      onAddressFound={handleAddressFound}
                      height="350px"
                      className="mt-2"
                    />
                  </FormControl>
                  <FormDescription className="text-sm text-muted-foreground mt-2">
                    Click on the map to set your business location or use the
                    "Use Current Location" button.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>
      </TabsContent>
    );
  }

  // Banking Tab Component
  function BankingTab() {
    return (
      <TabsContent value="banking" className="space-y-6 pt-4">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Banking Information</h3>
          <p className="text-sm text-muted-foreground">
            Provide your business banking details for payments.
          </p>
        </div>
        <div className="space-y-4">
          <BankingInfoFields form={form} fieldPrefix="bank_account" />
        </div>
      </TabsContent>
    );
  }

  // Documents Tab Component
  function DocumentsTab() {
    // Generate a unique ID for this instance
    const uploadId = useMemo(() => `vendor-docs-${Date.now()}`, []);

    // Get the current documents from form state when tab is active
    const formDocuments = useWatch({
      control: form.control,
      name: "verification_documents",
      defaultValue: [],
    });

    // Map DOCUMENT_TYPES to the format expected by DocumentUpload
    const mappedDocumentTypes = useMemo(() => {
      return DOCUMENT_TYPES.map((docType) => ({
        id: docType.id,
        name: docType.label,
        description: docType.description,
        required: false,
      }));
    }, []);

    // Log when documents change in form state
    useEffect(() => {
      if (activeTab === "documents") {
      }
    }, [formDocuments, activeTab]);

    // Ultra simple document handling - pass through exactly as is
    const handleDocumentsChange = useCallback(
      (documents: DocumentWithMeta[]) => {
        // Use documents exactly as provided with zero transformation
        form.setValue("verification_documents", documents, {
          shouldValidate: false,
          shouldDirty: true,
        });
      },
      [form]
    );

    // Handle policy document changes
    const handlePolicyChange = useCallback(
      (fileUrl: string, file?: File) => {
        form.setValue("policy", fileUrl, {
          shouldValidate: false,
          shouldDirty: true,
        });
      },
      [form]
    );

    // Handle policy document removal
    const handlePolicyRemove = useCallback(() => {
      form.setValue("policy", "", {
        shouldValidate: false,
        shouldDirty: true,
      });
    }, [form]);

    return (
      <TabsContent value="documents" className="space-y-6 mt-4">
        {/* Policy Document Upload */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Policy Document</h3>
          <p className="text-sm text-muted-foreground">
            Upload your business policy document in PDF format
          </p>

          <div className="mt-2">
            <Label htmlFor="policy-document">Policy Document (PDF only)</Label>
            <FileUpload
              label=""
              description="Upload your business policy document (PDF only, max 10MB)"
              value={form.getValues("policy") || ""}
              onChange={handlePolicyChange}
              onRemove={handlePolicyRemove}
              accept=".pdf"
              maxSizeMB={10}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="border-t my-6"></div>

        {/* Business Verification Documents - Using the new clean component */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Document Verification</h3>
          <p className="text-sm text-muted-foreground">
            Upload verification documents to prove your identity and business
            ownership
          </p>
          <DocumentUpload
            entityName="vendor"
            documents={documentFields as DocumentWithMeta[]}
            onUploadComplete={handleUploadComplete}
            onDelete={handleDeleteDocument}
            disabled={isSubmitting}
            label="Vendor Documents"
            description="Manage business registration, tax documents, etc."
          />
        </div>
      </TabsContent>
    );
  }

  // Review Tab Component
  function ReviewTab() {
    // Only get values when the tab is opened
    const [reviewValues, setReviewValues] = useState(() => form.getValues());

    // Update values when tab becomes active
    useEffect(() => {
      if (activeTab === "review") {
        setReviewValues(form.getValues());
      }
    }, [activeTab]);

    return (
      <TabsContent value="review" className="space-y-6 pt-4">
        <div className="space-y-4">
          <h3 className="text-xl font-medium">Review Vendor Information</h3>
          <p className="text-sm text-muted-foreground">
            Review all information before submission. Make sure all required
            fields are complete.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="space-y-6">
              {/* Business Info Review */}
              <div>
                <h4 className="font-medium text-md border-b pb-2 mb-2">
                  Business Information
                </h4>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Business Name
                    </dt>
                    <dd>{reviewValues.business_name || "-"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Display Name
                    </dt>
                    <dd>{reviewValues.display_name || "-"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Contact Email
                    </dt>
                    <dd>{reviewValues.contact_email || "-"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Contact Phone
                    </dt>
                    <dd>{reviewValues.contact_phone || "-"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Website
                    </dt>
                    <dd>{reviewValues.website || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Tax ID
                    </dt>
                    <dd>{reviewValues.tax_id || "Not provided"}</dd>
                  </div>
                </dl>
              </div>

              {/* Address Info Review */}
              <div>
                <h4 className="font-medium text-md border-b pb-2 mb-2">
                  Address Information
                </h4>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Address
                    </dt>
                    <dd>
                      {reviewValues.address_line1 || "-"}
                      <br />
                      {reviewValues.address_line2 && (
                        <>
                          {reviewValues.address_line2}
                          <br />
                        </>
                      )}
                      {reviewValues.city && reviewValues.state_province
                        ? `${reviewValues.city}, ${reviewValues.state_province} ${reviewValues.postal_code}`
                        : "-"}
                      <br />
                      {reviewValues.country || "-"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Banking Info Review */}
              <div>
                <h4 className="font-medium text-md border-b pb-2 mb-2">
                  Banking Information
                </h4>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Bank Name
                    </dt>
                    <dd>{reviewValues.bank_account?.bank_name || "-"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Account Name
                    </dt>
                    <dd>{reviewValues.bank_account?.account_name || "-"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Account Number
                    </dt>
                    <dd>{reviewValues.bank_account?.account_number || "-"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Branch Code
                    </dt>
                    <dd>
                      {reviewValues.bank_account?.branch_code || "Not provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      SWIFT/BIC
                    </dt>
                    <dd>
                      {reviewValues.bank_account?.swift_bic || "Not provided"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Store Info Review */}
              <div>
                <h4 className="font-medium text-md border-b pb-2 mb-2">
                  Store Information
                </h4>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Store Name
                    </dt>
                    <dd>{reviewValues.stores?.[0]?.store_name || "-"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Store Slug
                    </dt>
                    <dd>{reviewValues.stores?.[0]?.store_slug || "-"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Description
                    </dt>
                    <dd>
                      {reviewValues.stores?.[0]?.description || "Not provided"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">Logo</dt>
                    <dd>
                      {reviewValues.stores?.[0]?.branding?.logo_url
                        ? "Uploaded"
                        : "Not uploaded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Categories
                    </dt>
                    <dd>
                      {reviewValues.stores?.[0]?.categories &&
                      reviewValues.stores?.[0].categories.length > 0
                        ? reviewValues.stores?.[0].categories
                            .map((catId: string) => {
                              const category = categories.find(
                                (c) => c.category_id === catId
                              );
                              return category?.name || catId;
                            })
                            .join(", ")
                        : "None selected"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Store Policies Review */}
              <div>
                <h4 className="font-medium text-md border-b pb-2 mb-2">
                  Store Policies
                </h4>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Return Policy
                    </dt>
                    <dd>
                      {reviewValues.stores?.[0]?.return_policy
                        ? "Uploaded"
                        : "Not uploaded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Shipping Policy
                    </dt>
                    <dd>
                      {reviewValues.stores?.[0]?.shipping_policy
                        ? "Uploaded"
                        : "Not uploaded"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">
                      Terms & Conditions
                    </dt>
                    <dd>
                      {reviewValues.stores?.[0]?.general_policy
                        ? "Uploaded"
                        : "Not uploaded"}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Documents Review */}
              <div>
                <h4 className="font-medium text-md border-b pb-2 mb-2">
                  Documents Uploaded
                </h4>
                <div className="text-sm">
                  {reviewValues.verification_documents &&
                  reviewValues.verification_documents.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {reviewValues.verification_documents.map(
                        (doc: any, index: number) => (
                          <li key={index}>
                            {doc.document_type_name}: {doc.file_name}
                            {doc.number && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                Number: {doc.number}
                              </span>
                            )}
                            {doc.expiry_date && (
                              <span className="ml-2 text-muted-foreground">
                                Expires: {doc.expiry_date}
                              </span>
                            )}
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">
                      No documents uploaded
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    );
  }
};
