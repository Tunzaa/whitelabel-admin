"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  RefreshCw,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { PhoneInput } from "@/components/ui/phone-input";
import { RequiredField } from "@/components/ui/required-field";
import { MultiSelect } from "@/components/ui/multi-select";
import { ImageUpload } from "@/components/ui/image-upload";
import { ColorPicker } from "@/components/ui/color-picker";
import { BannerEditor } from "@/components/ui/banner-editor";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { FileUpload } from "@/components/ui/file-upload";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { TenantConfiguration, TenantConfigurationHandle } from "./extra-config-fields";
import { useConfigurationStore } from '@/features/configurations/store';
import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { useTenantStore } from '../store';

import {
  countries,
  currencies,
  languages,
  documentTypes,
  vehicleTypes,
} from "@/features/settings/data/localization";
import { platformModules, getModuleIcon } from "@/features/settings/data/modules";
import { tenantFormSchema } from "../schema";
import { TenantFormValues } from "../types";
import { saveConfigurations } from './extra-config-fields';

// Default values for the form, providing a good starting point.
const defaultValues: Partial<TenantFormValues> = {
  plan: "monthly",
  country_code: "TZ",
  currency: "TZS",
  languages: ["en-US", "sw"],
  is_active: true,
  banners: [],
  branding: {
    logoUrl: "",
    theme: {
      logo: {
        primary: "",
        secondary: "",
        icon: "",
      },
      colors: {
        primary: "#3182CE",
        secondary: "#E2E8F0",
        accent: "#ED8936",
        text: {
          primary: "#000000",
          secondary: "#4A5568",
        },
        background: {
          primary: "#FFFFFF",
          secondary: "#F7FAFC",
        },
        border: "#E2E8F0",
      },
    },
  },
  modules: platformModules.reduce((acc, module) => {
    acc[module.name] = false; // Initialize all modules to false
    return acc;
  }, {} as Record<string, boolean>),
  billing_config: {
    flat_rate_amount: null,
    currency: "TZS",
    billing_frequency: "monthly",
    billing_email: "",
    auto_generate_invoices: true,
    email_notifications: true,
    billing_day_of_month: 1,
    payment_due_days: 30,
    is_active: true,
  },
};

interface TenantFormProps {
  onSubmit: (data: TenantFormValues) => Promise<any>; // Allow promise for response
  onCancel?: () => void;
  initialData?: Partial<TenantFormValues> & { id?: string };
  isEditable?: boolean;
  id?: string;
  isSubmitting?: boolean;
}

export function TenantForm({
  onSubmit,
  onCancel,
  initialData,
  isEditable = true,
  id,
  isSubmitting: externalIsSubmitting,
}: TenantFormProps) {
  const { data: session } = useSession();
  const { hasRole } = usePermissions();
  const isSuperOwner = hasRole("super");
  const isAddPage = !initialData?.id;

  const [activeTab, setActiveTab] = useState("details");
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  const isSubmitting =
    externalIsSubmitting !== undefined
      ? externalIsSubmitting
      : internalIsSubmitting;
  const [formError, setFormError] = useState<string | null>(null);
  // 1. Add state for configurations and vehicleTypes in the parent
  const [configurations, setConfigurations] = useState<Record<string, any>>({});
  const [vehicleTypes, setVehicleTypes] = useState<any[]>([]);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const { fetchVehicleTypes, fetchEntities } = useConfigurationStore();
  const { fetchBillingConfig, billingConfig, loadingBillingConfig, createBillingConfig, updateBillingConfig } = useTenantStore();
  const [configActiveTab, setConfigActiveTab] = useState('delivery');

  const form = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema(isSuperOwner)),
    defaultValues: initialData
      ? { ...defaultValues, ...initialData }
      : defaultValues,
    mode: "onBlur",
  });

  // 2. Fetch initial data when tenantId changes
  useEffect(() => {
    async function fetchInitialConfig() {
      if (!initialData?.tenant_id) return;
      setIsConfigLoading(true);
      await fetchVehicleTypes(initialData.tenant_id);
      setVehicleTypes(useConfigurationStore.getState().vehicleTypes || []);
      const entities = await fetchEntities(initialData.tenant_id);
      const configObj: Record<string, any> = {};
      for (const entity of entities) {
        configObj[entity.name] = {
          ...entity,
          document_types: Array.isArray(entity.document_types) ? entity.document_types : [],
        };
      }
      setConfigurations(configObj);

      // Fetch billing config if tenant exists and user is super owner
      if (isSuperOwner && initialData.tenant_id) {
        await fetchBillingConfig(initialData.tenant_id);
      }

      setIsConfigLoading(false);
    }
    fetchInitialConfig();
  }, [initialData?.tenant_id, fetchVehicleTypes, fetchEntities, fetchBillingConfig, isSuperOwner]);

  // Populate billing config form fields when billing config is loaded
  useEffect(() => {
    if (billingConfig && !loadingBillingConfig) {
      form.setValue('billing_config', {
        flat_rate_amount: billingConfig.flat_rate_amount || null,
        currency: billingConfig.currency || "TZS",
        billing_frequency: billingConfig.billing_frequency || "monthly",
        billing_email: billingConfig.billing_email || "",
        auto_generate_invoices: billingConfig.auto_generate_invoices ?? true,
        email_notifications: billingConfig.email_notifications ?? true,
        billing_day_of_month: billingConfig.billing_day_of_month || 1,
        payment_due_days: billingConfig.payment_due_days || 30,
        is_active: billingConfig.is_active ?? true,
      });
    }
  }, [billingConfig, loadingBillingConfig, form]);

  // 3. Remove configRef and pass state/setters to TenantConfiguration
  // Ref for TenantConfiguration
  // const configRef = useRef<TenantConfigurationHandle>(null);

  const tabFlow = [
    "details",
    "branding",
    "configuration",
    ...(isSuperOwner ? ["billing"] : []),
    "modules",
  ];

  const handleNextTab = () => {
    const currentTabIndex = tabFlow.indexOf(activeTab);
    if (currentTabIndex < tabFlow.length - 1) {
      setActiveTab(tabFlow[currentTabIndex + 1]);
    }
  };

  const handlePrevTab = () => {
    const currentTabIndex = tabFlow.indexOf(activeTab);
    if (currentTabIndex > 0) {
      setActiveTab(tabFlow[currentTabIndex - 1]);
    }
  };

  const handleFileUpload = useCallback((file: File, fieldName: string) => {
    // and call form.setValue(fieldName, uploadedUrl)
  }, []);

  // Handle form submission with error handling and validation navigation
  const handleFormSubmit = useCallback(
    async (data: TenantFormValues) => {
      try {
        setFormError(null);
        setInternalIsSubmitting(true);

        // 1. Prepare the tenant data payload
        const dataToSubmit = JSON.parse(JSON.stringify(data));

        dataToSubmit.user = {
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.admin_email,
          phone_number: data.admin_phone,
        };

        delete dataToSubmit.first_name;
        delete dataToSubmit.last_name;
        delete dataToSubmit.admin_email;
        delete dataToSubmit.admin_phone;

        // Extract billing config before removing it from tenant data
        const billingConfigData = data.billing_config;
        delete dataToSubmit.billing_config;

        if (!isSuperOwner) {
          delete dataToSubmit.modules;
          delete dataToSubmit.fee;
          delete dataToSubmit.plan;
          delete dataToSubmit.trial_ends_at;
          delete dataToSubmit.is_active;
        }

        // 2. Submit tenant data and get the ID from the response
        const response = await onSubmit(dataToSubmit);
        const tenantId = response?.id || id;

        if (!tenantId) {
          throw new Error('Failed to get tenant ID after submission.');
        }

        // 3. Save billing configuration (only for super owners)
        if (isSuperOwner && billingConfigData) {
          const billingPayload = {
            ...billingConfigData,
            tenant_id: tenantId,
          };

          try {
            // Check if billing config exists (billingConfig will be set if it was fetched)
            if (billingConfig?.config_id) {
              await updateBillingConfig(tenantId, billingPayload);
            } else {
              await createBillingConfig(billingPayload);
            }
          } catch (billingError) {
            // Don't throw here to allow the rest to continue
            toast.error('Tenant saved but billing configuration failed to save');
          }
        }

        // 4. On submit, call saveConfigurations with parent's state
        await saveConfigurations(tenantId, configurations, vehicleTypes);

        toast.success(`Tenant ${id ? 'updated' : 'created'} successfully!`);
        if (!id) { // If it was a new tenant, reset form or navigate
          form.reset();
        }
        setActiveTab("details");

      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "An unexpected error occurred.";
        setFormError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setInternalIsSubmitting(false);
      }
    },
    [onSubmit, isSuperOwner, id, form, configurations, vehicleTypes, billingConfig, createBillingConfig, updateBillingConfig]
  );

  // Import the saveConfigurations function from extra-config-fields
  // (You may need to export it from that file)
  // import { saveConfigurations } from './extra-config-fields';
  // For now, assume it is available in scope

  const handleDeleteBanner = async (resourceId: string, bannerId: string) => {
    if (!resourceId) {
      toast.error("Cannot delete banner: Tenant ID is missing.");
      return;
    }
    toast.promise(
      new Promise<void>(async (resolve, reject) => {
        try {
          // This is a placeholder for the actual API call.
          // We optimistically remove the banner from the form state.
          const currentBanners = form.getValues("banners") || [];
          const updatedBanners = currentBanners.filter(
            (b) => b.id !== bannerId
          );
          form.setValue("banners", updatedBanners, { shouldDirty: true });
          resolve();
        } catch (error) {
          reject(error);
        }
      }),
      {
        loading: "Deleting banner...",
        success: "Banner removed from form.",
        error: "Failed to remove banner.",
      }
    );
  };

  const handleUpdateTenant = async (
    resourceId: string,
    entityId: string,
    data: any
  ) => {
    if (!resourceId) {
      toast.error("Cannot update banners: Tenant ID is missing.");
      return;
    }
    toast.info(
      "Banner order saved locally. Submit the form to persist changes."
    );
  };

  // Handle form errors by navigating to the tab with the first error
  const handleFormError = (errors: any) => {
    const fieldToTabMap: Record<string, string> = {
      first_name: "details",
      last_name: "details",
      name: "details",
      domain: "details",
      admin_email: "details",
      admin_phone: "details",
      branding: "branding",
      banners: "branding",
      country_code: "configuration",
      currency: "configuration",
      languages: "configuration",
      document_types: "configuration",
      vehicle_types: "configuration",
      billing_config: "billing",
      modules: "modules",
    };

    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      const tab = fieldToTabMap[firstErrorField.split('.')[0]];
      if (tab) {
        setActiveTab(tab);
      }
    }
    toast.error("Please fix the validation errors before submitting");
  };

  // If there's a form error and we're not in the loading state, show error card
  if (formError && !isSubmitting) {
    return (
      <ErrorCard
        title={`Failed to ${isAddPage ? "create" : "update"} tenant`}
        error={{ status: "Error", message: formError }}
        buttonText="Try Again"
        buttonAction={() => setFormError(null)}
        buttonIcon={RefreshCw}
      />
    );
  }

  return (
    <fieldset disabled={isSubmitting}>
      <Card className="">
        <CardContent className="p-6">
          <Form {...form}>
            <form
              id="marketplace-tenant-form"
              onSubmit={form.handleSubmit(handleFormSubmit, handleFormError)}
              className="space-y-6"
            >
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="details">Basic Details</TabsTrigger>
                  <TabsTrigger value="branding">Branding</TabsTrigger>
                  <TabsTrigger value="configuration">Makertplace Config</TabsTrigger>
                  {isSuperOwner && (
                    <TabsTrigger value="billing">Billing Config</TabsTrigger>
                  )}
                  <TabsTrigger value="modules">Modules</TabsTrigger>
                </TabsList>

                <DetailsTab />

                <BrandingTab />

                <ConfigurationTab />

                {isSuperOwner && <BillingConfigTab />}

                <ModulesTab />
              </Tabs>

              {isEditable && (
                <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end mt-6">
                  {activeTab !== "details" && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevTab}
                    >
                      Previous
                    </Button>
                  )}

                  {activeTab !== tabFlow[tabFlow.length - 1] ? (
                    <Button
                      type="button"
                      onClick={handleNextTab}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Spinner size="sm" color="white" />
                          Processing...
                        </>
                      ) : (
                        "Submit"
                      )}
                    </Button>
                  )}
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </fieldset>
  );

  function DetailsTab() {
    return (
      <TabsContent value="details" className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Makertplace Name <RequiredField />
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Example Store"
                    {...field}
                    readOnly={!isEditable}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Domain <RequiredField />
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="example-store.marketplace.com"
                    {...field}
                    readOnly={!isEditable}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Administrator Contact</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    First Name <RequiredField />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John"
                      {...field}
                      readOnly={!isEditable}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Last Name <RequiredField />
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Doe"
                      {...field}
                      readOnly={!isEditable}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="admin_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Email <RequiredField />
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="admin@example.com"
                      {...field}
                      readOnly={!isEditable}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="admin_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Phone <RequiredField />
                  </FormLabel>
                  <FormControl>
                    <PhoneInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      readOnly={!isEditable}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <Separator />
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Status</h3>
          {isSuperOwner && (
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 py-6">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!isEditable && isSuperOwner}
                      className="disabled:opacity-80"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active Status</FormLabel>
                    <FormDescription>
                      Toggle to activate or deactivate the tenant account
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          )}
          {!isSuperOwner && (
            <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 py-6">
              <Switch
                checked={form.getValues("is_active")}
                disabled
                className="disabled:opacity-80"
              />
              <div className="space-y-1 leading-none ms-2">
                <FormLabel>Active Status</FormLabel>
                <FormDescription>
                  You do not have permission to change the status.
                </FormDescription>
              </div>
            </div>
          )}
        </div>
      </TabsContent>
    );
  }

  function BrandingTab() {
    return (
      <TabsContent value="branding" className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Store Branding</h3>

          <div className="grid gap-6 md:grid-cols-4">
            <FormField
              control={form.control}
              name="branding.logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    Logo URL
                    <InfoTooltip className="ms-auto" content="Main store logo used in the header and general branding throughout the marketplace." />
                  </FormLabel>
                  <FormControl>
                    <ImageUpload
                      id="logo-upload"
                      value={field.value}
                      onChange={field.onChange}
                      previewAlt="Store Logo Preview"
                      onFileChange={(file) => handleFileUpload(file, "logoUrl")}
                      readOnly={!isEditable}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <h4 className="text-md font-medium">Logo Variants</h4>
            <div className="grid gap-8 md:grid-cols-4">
              <FormField
                control={form.control}
                name="branding.theme.logo.primary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Primary Logo
                      <InfoTooltip className="ms-auto" content="Main logo used in light-themed sections, headers, and primary branding areas." />
                    </FormLabel>
                    <FormControl>
                      <ImageUpload
                        id="primary-logo-upload"
                        value={field.value}
                        onChange={field.onChange}
                        previewAlt="Primary Logo Preview"
                        onFileChange={(file) =>
                          handleFileUpload(file, "primaryLogo")
                        }
                        height="h-32"
                        buttonText="Primary Logo"
                        readOnly={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branding.theme.logo.secondary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Secondary Logo
                      <InfoTooltip className="ms-auto" content="Alternative logo used in dark-themed sections, footers, and secondary branding areas." />
                    </FormLabel>
                    <FormControl>
                      <ImageUpload
                        id="secondary-logo-upload"
                        value={field.value}
                        onChange={field.onChange}
                        previewAlt="Secondary Logo Preview"
                        onFileChange={(file) =>
                          handleFileUpload(file, "secondaryLogo")
                        }
                        height="h-32"
                        buttonText="Secondary Logo"
                        readOnly={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branding.theme.logo.icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Icon Logo
                      <InfoTooltip className="ms-auto" content="Compact icon version of your logo used in favicons, mobile apps, and small UI elements." />
                    </FormLabel>
                    <FormControl>
                      <ImageUpload
                        id="icon-logo-upload"
                        value={field.value}
                        onChange={field.onChange}
                        previewAlt="Icon Logo Preview"
                        onFileChange={(file) =>
                          handleFileUpload(file, "iconLogo")
                        }
                        height="h-32"
                        buttonText="Icon Logo"
                        readOnly={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator className="mt-12" />
          <div className="space-y-2">
            <h4 className="text-md font-medium">Brand Colors</h4>
            <div className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="branding.theme.colors.primary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Primary Color <RequiredField />
                      <InfoTooltip className="ms-auto" content="Main brand color used for buttons, links, highlights, and primary interactive elements throughout the app." />
                    </FormLabel>
                    <FormControl>
                      <ColorPicker
                        color={field.value}
                        onChange={field.onChange}
                        disabled={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branding.theme.colors.secondary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Secondary Color <RequiredField />
                      <InfoTooltip className="ms-auto" content="Supporting brand color used for secondary buttons, subtle highlights, and complementary UI elements." />
                    </FormLabel>
                    <FormControl>
                      <ColorPicker
                        color={field.value}
                        onChange={field.onChange}
                        disabled={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branding.theme.colors.accent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Accent Color <RequiredField />
                      <InfoTooltip className="ms-auto" content="Accent color used for notifications, alerts, special promotions, and call-to-action elements." />
                    </FormLabel>
                    <FormControl>
                      <ColorPicker
                        color={field.value}
                        onChange={field.onChange}
                        disabled={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator className="mt-12" />
          <div className="space-y-2">
            <h4 className="text-md font-medium">
              Text, Background & Border Colors
            </h4>
            <div className="grid gap-6 md:grid-cols-5">
              <FormField
                control={form.control}
                name="branding.theme.colors.text.primary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Primary Text <RequiredField />
                      <InfoTooltip className="ms-auto" content="Main text color used for headings, important content, and primary text throughout the app." />
                    </FormLabel>
                    <FormControl>
                      <ColorPicker
                        color={field.value}
                        onChange={field.onChange}
                        disabled={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branding.theme.colors.text.secondary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Secondary Text <RequiredField />
                      <InfoTooltip className="ms-auto" content="Secondary text color used for descriptions, captions, and less prominent text content." />
                    </FormLabel>
                    <FormControl>
                      <ColorPicker
                        color={field.value}
                        onChange={field.onChange}
                        disabled={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branding.theme.colors.background.primary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Primary Background <RequiredField />
                      <InfoTooltip className="ms-auto" content="Main background color used for pages, cards, and primary content areas in the app." />
                    </FormLabel>
                    <FormControl>
                      <ColorPicker
                        color={field.value}
                        onChange={field.onChange}
                        disabled={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branding.theme.colors.background.secondary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Secondary Background <RequiredField />
                      <InfoTooltip className="ms-auto" content="Alternative background color used for sidebars, panels, and secondary content areas." />
                    </FormLabel>
                    <FormControl>
                      <ColorPicker
                        color={field.value}
                        onChange={field.onChange}
                        disabled={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branding.theme.colors.border"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Border Color <RequiredField />
                      <InfoTooltip className="ms-auto" content="Color used for borders, dividers, input field outlines, and card separators throughout the app." />
                    </FormLabel>
                    <FormControl>
                      <ColorPicker
                        color={field.value}
                        onChange={field.onChange}
                        disabled={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator className="mt-14" />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="banners"
              render={({ field }) => (
                <BannerEditor
                  title="Onboarding Banners"
                  infoContent="Banners displayed during user onboarding and registration flows to welcome new users and showcase key features."
                  banners={field.value ?? []}
                  onChange={field.onChange}
                  readOnly={!isEditable}
                  resourceId={id || initialData?.id || ""}
                  entityId={id || initialData?.id || ""}
                  onDeleteBanner={handleDeleteBanner}
                  onUpdateResource={handleUpdateTenant}
                />
              )}
            />

            <FormField
              control={form.control}
              name="metadata.banners"
              render={({ field }) => (
                <BannerEditor
                  title="In-App Banners"
                  infoContent="Promotional banners shown within the app interface for marketing campaigns, special offers, and important announcements."
                  banners={field.value ?? []}
                  onChange={field.onChange}
                  readOnly={!isEditable}
                  resourceId={id || initialData?.id || ""}
                  entityId={id || initialData?.id || ""}
                  onDeleteBanner={handleDeleteBanner}
                  onUpdateResource={handleUpdateTenant}
                />
              )}
            />
          </div>
        </div>
      </TabsContent>
    );
  }

  function ConfigurationTab() {
    return (
      <TabsContent value="configuration" className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Marketplace Configurations</h3>
          <p className="text-sm text-muted-foreground">
            Configure country, currency, languages, and other marketplace
            settings
          </p>

          <div className="space-y-6">
            <h4 className="text-md font-medium">Localization Settings</h4>
            <div className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="country_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Country <RequiredField />
                    </FormLabel>
                    <Select
                      disabled={!isEditable}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a country code" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((code) => (
                          <SelectItem key={code.value} value={code.value}>
                            {code.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Currency <RequiredField />
                    </FormLabel>
                    <Select
                      disabled={!isEditable}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem
                            key={currency.value}
                            value={currency.value}
                          >
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="languages"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Languages <RequiredField />
                    </FormLabel>
                    <MultiSelect
                      placeholder="Select languages"
                      selected={field.value || []}
                      options={languages.map((language) => ({
                        value: language.value,
                        label: language.label,
                      }))}
                      onChange={(selected) => field.onChange(selected)}
                      className="w-full"
                      readOnly={!isEditable}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Legal Documents */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="metadata.terms_conditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms & Conditions</FormLabel>
                    <FormControl>
                      <FileUpload
                        label="Upload Terms & Conditions"
                        description="Upload your terms and conditions document (PDF format recommended)"
                        value={field.value || ""}
                        onChange={(fileUrl) => field.onChange(fileUrl)}
                        onRemove={() => field.onChange("")}
                        disabled={!isEditable}
                        accept=".pdf"
                        maxSizeMB={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metadata.privacy_policy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Privacy Policy</FormLabel>
                    <FormControl>
                      <FileUpload
                        label="Upload Privacy Policy"
                        description="Upload your privacy policy document (PDF format recommended)"
                        value={field.value || ""}
                        onChange={(fileUrl) => field.onChange(fileUrl)}
                        onRemove={() => field.onChange("")}
                        disabled={!isEditable}
                        accept=".pdf"
                        maxSizeMB={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="metadata.support_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Support Email <RequiredField />
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="support@example.com"
                        {...field}
                        readOnly={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="metadata.support_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Support Phone <RequiredField />
                    </FormLabel>
                    <FormControl>
                      <PhoneInput
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        readOnly={!isEditable}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-6 mt-8" />

            {/* Extra Configuration Fields - now controlled */}
            <TenantConfiguration
              tenantId={initialData?.tenant_id}
              isEditable={isEditable}
              configurations={configurations}
              setConfigurations={setConfigurations}
              vehicleTypes={vehicleTypes}
              setVehicleTypes={setVehicleTypes}
              loading={isConfigLoading}
              activeTab={configActiveTab}
              setActiveTab={setConfigActiveTab}
            />
          </div>
        </div>
      </TabsContent>
    );
  }

  function ModulesTab() {
    return (
      <TabsContent value="modules" className="space-y-4">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Modules Configuration</h3>
          
          {!isSuperOwner ? (
            <>
              <Alert className="mb-4">
                <FileText className="h-4 w-4" />
                <AlertTitle>View Only</AlertTitle>
                <AlertDescription>
                  Only super admins can modify module configurations
                </AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                Marketplace modules configurations
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select which platform modules to enable for this tenant. Each module provides additional functionality to enhance the marketplace experience.
            </p>
          )}
        </div>
        <Separator className="mb-8" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {platformModules.map((module) => {
            const Icon = getModuleIcon(module.icon);
            return (
              <FormField
                key={module.name}
                control={form.control}
                name={`modules.${module.name}`}
                render={({ field }) => (
                  <Card key={module.name} className="relative cursor-pointer" onClick={() => field.onChange(!field.value)}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center space-x-3">
                        {Icon && <Icon className="h-6 w-6" />}
                        <div>
                          <FormLabel className="text-base font-medium" htmlFor={field.id} onClick={(e) => { field.onChange(!field.value); e.stopPropagation(); }}>
                            {module.label}
                          </FormLabel>
                          <FormDescription>
                            {module.description}
                          </FormDescription>
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            onClick={(e) => e.stopPropagation()}
                            disabled={!isSuperOwner || !isEditable}
                          />
                        </FormControl>
                      </div>
                    </CardContent>
                  </Card>
                )}
              />
            );
          })}
        </div>
      </TabsContent>
    );
  }

  function BillingConfigTab() {
    return (
      <TabsContent value="billing" className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Billing Configurations</h3>
          <p className="text-sm text-muted-foreground">
            Configure billing settings for this tenant
          </p>
        </div>

        {loadingBillingConfig && (
          <Spinner />
        )}

        {!loadingBillingConfig && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="billing_config.flat_rate_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Flat Rate Amount <RequiredField />
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1000"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        readOnly={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billing_config.currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Currency <RequiredField />
                    </FormLabel>
                    <Select
                      disabled={!isEditable}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem
                            key={currency.value}
                            value={currency.value}
                          >
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="billing_config.billing_frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Billing Frequency <RequiredField />
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!isEditable}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billing_config.billing_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Billing Email <RequiredField />
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="billing@example.com"
                        {...field}
                        value={field.value || ''}
                        readOnly={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="billing_config.billing_day_of_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Billing Day of Month <RequiredField />
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="1"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        readOnly={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billing_config.payment_due_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Payment Due Days <RequiredField />
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="30"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                        readOnly={!isEditable}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h4 className="text-md font-medium">Settings</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="billing_config.auto_generate_invoices"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!isEditable}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Auto Generate Invoices</FormLabel>
                        <FormDescription>
                          Automatically generate invoices based on billing frequency
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billing_config.email_notifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={!isEditable}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Email Notifications</FormLabel>
                        <FormDescription>
                          Send email notifications for billing events
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="billing_config.is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!isEditable}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active Status</FormLabel>
                      <FormDescription>
                        Enable or disable billing for this tenant
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}
      </TabsContent>
    );
  }
}