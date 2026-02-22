"use client";

import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowLeft, X, Plus, Save, Trash, CheckCircle2, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { MultiSelect } from "@/components/ui/multi-select";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  MultiImageUpload,
  type ImageFile,
} from "@/components/ui/multi-image-upload";

import { useCategoryStore } from "@/features/categories/store";
import { useVendorStore } from "@/features/vendors/store";
import { useFieldArray } from "react-hook-form";
import { Pencil } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  // DialogTrigger, // Dialog is controlled programmatically here
} from "@/components/ui/dialog";
import {
  productFormSchema,
  type ProductFormValues,
  variantSchema,
} from "../schema";
import type { Product, ProductVariant } from "../types";
import type {
  UseFormReturn,
  FieldArrayWithId,
  FieldArrayMethodProps,
} from "react-hook-form";

// Helper component for required field indicator
const RequiredField = () => <span className="text-destructive ml-1">*</span>;

// Default values for the form
const defaultValues: Partial<ProductFormValues> = {
  name: "",
  description: "",
  short_description: "",
  sku: "",
  base_price: 0,
  sale_price: 0,
  cost_price: 0,
  inventory_quantity: 0,
  inventory_tracking: true,
  low_stock_threshold: 10,
  category_ids: [],
  tags: [],
  images: [],
  variants: [],
  weight: 0,
  dimensions: {
    length: 0,
    width: 0,
    height: 0,
  },
  requires_shipping: true,
  is_active: true,
  is_featured: false,
  promotion: null,
};

interface ProductFormProps {
  initialData?: Partial<Product>;
  onSubmit: (data: ProductFormValues) => Promise<void>;
  onCancel?: () => void;
  title?: string;
  description?: string;
  isSubmitting?: boolean;
}

// Helper function for generating slug from name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .trim();
};

// Define props for the VariantsTab component
interface VariantsTabProps {
  form: UseFormReturn<ProductFormValues, any, undefined>;
  variantFields: FieldArrayWithId<ProductFormValues, "variants", "id">[];
  // Types for useFieldArray functions - adjust if your ProductVariant type is different in the form
  appendVariant: (
    value: ProductVariant,
    options?: FieldArrayMethodProps | undefined
  ) => void;
  updateVariant: (
    index: number,
    value: ProductVariant,
    options?: FieldArrayMethodProps | undefined
  ) => void;
  removeVariant: (index?: number | number[] | undefined) => void;
  isVariantModalOpen: boolean;
  setIsVariantModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingVariantIndex: number | null;
  setEditingVariantIndex: React.Dispatch<React.SetStateAction<number | null>>;
  currentVariantData: Partial<ProductVariant> | null;
  setCurrentVariantData: React.Dispatch<
    React.SetStateAction<Partial<ProductVariant> | null>
  >;
  handleAddNewVariant: () => void;
  handleEditVariant: (index: number) => void;
  handleSaveVariant: (variantData: ProductVariant) => void;
  setTabAndValidate: (tab: string) => Promise<void>;
  // tenantId might be needed if ImageUpload within the modal requires it directly
  // tenantId: string | undefined;
}

export function ProductForm({
  initialData,
  onSubmit,
  onCancel,
  title = "Add New Product",
  description = "Create a new product for your marketplace",
  isSubmitting: externalIsSubmitting,
}: ProductFormProps) {
  // Get tenant ID from session
  const { data: session } = useSession();
  const tenantId = (session?.user as any)?.tenant_id || "";

  // --- New state for vendor/store logic ---
  const [selectedVendorId, setSelectedVendorId] = useState<string>(initialData?.vendor_id || "");
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [storeId, setStoreId] = useState<string>(initialData?.store_id || "");
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeFound, setStoreFound] = useState(false);

  // Helper function to resolve default values for the form
  const getResolvedDefaultValues = () => {
    if (initialData) {
      // Create a new object by merging defaultValues and initialData
      // Ensure deep merge for nested objects like 'dimensions'
      // and proper handling for arrays like 'variants', 'images', 'tags', 'category_ids'
      const merged = {
        ...defaultValues,
        ...initialData,
        dimensions: {
          ...(defaultValues.dimensions || {}),
          ...(initialData.dimensions || {}),
        },
        // Ensure arrays are taken from initialData if present, otherwise from defaultValues, or fallback to empty array
        variants: initialData.variants || [],
        images: initialData.images || defaultValues.images || [],
        tags: initialData.tags || defaultValues.tags || [],
        category_ids:
          initialData.category_ids || defaultValues.category_ids || [],
        // Handle potential type mismatches or transformations if necessary here
        // For example, if initialData.base_price is string and schema expects number
        base_price:
          initialData.base_price !== undefined
            ? Number(initialData.base_price)
            : defaultValues.base_price,
        sale_price:
          initialData.sale_price !== undefined
            ? Number(initialData.sale_price)
            : defaultValues.sale_price,
        cost_price:
          initialData.cost_price !== undefined
            ? Number(initialData.cost_price)
            : defaultValues.cost_price,
        inventory_quantity:
          initialData.inventory_quantity !== undefined
            ? Number(initialData.inventory_quantity)
            : defaultValues.inventory_quantity,
        low_stock_threshold:
          initialData.low_stock_threshold !== undefined
            ? Number(initialData.low_stock_threshold)
            : defaultValues.low_stock_threshold,
        weight:
          initialData.weight !== undefined
            ? Number(initialData.weight)
            : defaultValues.weight,
      };
      return merged as ProductFormValues;
    }
    return defaultValues as ProductFormValues;
  };

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: getResolvedDefaultValues(),
    mode: "onChange", // Or "onBlur" or "onSubmit" based on preference
  });

  // Effect to reset form when initialData changes
  useEffect(() => {
    form.reset(getResolvedDefaultValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, form.reset]); // form.reset is stable, initialData is the key dependency

  // Tab validation mapping - which fields belong to which tab
  const tabValidationMap = {
    basic: ["name", "slug", "sku", "category_ids", "tags"],
    pricing: ["base_price", "sale_price", "cost_price"],
    details: [
      "description",
      "short_description",
      "inventory_quantity",
      "inventory_tracking",
      "low_stock_threshold",
      "weight",
      "dimensions",
      "requires_shipping",
    ],
    publishing: ["images"],
    variants: ["variants"],
  };

  // Set up state
  const [activeTab, setActiveTab] = useState("basic");
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);

  // State for variant modal
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(
    null
  );
  const [currentVariantData, setCurrentVariantData] =
    useState<Partial<ProductVariant> | null>(null);

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
    update: updateVariant,
  } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const { append, update } = useFieldArray({
    control: form.control,
    name: "images",
  });

  const handleAddNewVariant = React.useCallback(() => {
    setCurrentVariantData({
      name: "",
      attributes: {},
      _tempAttributesArray: [{ name: "", value: "" }], // Temporary array for UI
      price: 0,
      inventory_quantity: 0,
      sku: "",
      image_url: "",
    });
    setEditingVariantIndex(null);
    setIsVariantModalOpen(true);
  }, []);

  const handleEditVariant = React.useCallback((index: number) => {
    const variantToEdit = form.getValues("variants")?.[index];
    if (variantToEdit) {
      // Convert attributes object to array for UI editing
      const attributesArray = Object.entries(variantToEdit.attributes || {}).map(([name, value]) => ({
        name,
        value,
      }));
      setCurrentVariantData({ 
        ...variantToEdit,
        _tempAttributesArray: attributesArray.length > 0 ? attributesArray : [{ name: "", value: "" }],
      });
      setEditingVariantIndex(index);
      setIsVariantModalOpen(true);
    }
  }, []);

  // Placeholder save function - proper implementation needs a dedicated form for the modal
  const handleSaveVariant = React.useCallback(
    (variantData: any) => {
      // Convert temporary array to object before validation
      const attributesObj: Record<string, string> = {};
      if (variantData._tempAttributesArray) {
        variantData._tempAttributesArray.forEach((attr: any) => {
          if (attr.name && attr.value) {
            attributesObj[attr.name] = attr.value;
          }
        });
      }
      
      const finalVariantData = {
        ...variantData,
        attributes: attributesObj,
      };
      delete finalVariantData._tempAttributesArray;

      const validationResult = variantSchema.safeParse(finalVariantData);
      if (!validationResult.success) {
        toast.error("Failed to save variant. Please check the data.", {
          description: Object.values(
            validationResult.error.flatten().fieldErrors
          )
            .flat()
            .join(", "),
        });
        return;
      }

      if (editingVariantIndex !== null) {
        updateVariant(editingVariantIndex, finalVariantData);
        toast.success("Variant updated successfully!");
      } else {
        appendVariant(finalVariantData);
        toast.success("Variant added successfully!");
      }
      setIsVariantModalOpen(false);
      setEditingVariantIndex(null);
      setCurrentVariantData(null);
    },
    [
      editingVariantIndex,
      appendVariant,
      updateVariant,
      form,
      setIsVariantModalOpen,
      setEditingVariantIndex,
      setCurrentVariantData,
    ]
  );

  // Determine if form is submitting from either external or internal state, or if images are uploading
  const isSubmitting =
    externalIsSubmitting || internalIsSubmitting || isImageUploading;

  // Load vendors and categories
  const { vendors, fetchVendors, fetchVendor, fetchStoreByVendor } = useVendorStore();
  const { categories, fetchCategories } = useCategoryStore();

  // Fetch vendors and categories on mount
  useEffect(() => {
    if (tenantId) {
      const headers = { "X-Tenant-ID": tenantId };
      fetchVendors({}, headers);
      fetchCategories({}, headers);
    }
  }, [fetchVendors, fetchCategories, tenantId]);

  // Fetch vendor and stores when selectedVendorId changes
  useEffect(() => {
    let ignore = false;
    async function fetchVendorAndStores() {
      if (selectedVendorId && tenantId) {
        setStoreLoading(true);
        try {
          const headers = { "X-Tenant-ID": tenantId };
          const vendor = await fetchVendor(selectedVendorId, headers);
          if (ignore) return;
          setSelectedVendor(vendor);
          let vendorStores = [];
          if (vendor.stores && Array.isArray(vendor.stores) && vendor.stores.length > 0) {
            vendorStores = vendor.stores;
          } else {
            // fallback: fetch stores by vendor if not present
            vendorStores = await fetchStoreByVendor(selectedVendorId, headers);
          }
          setStores(vendorStores);
          if (vendorStores.length > 0) {
            setStoreId(vendorStores[0].store_id || "");
            setStoreFound(true);
            form.setValue("store_id", vendorStores[0].store_id || "");
          } else {
            setStoreId("");
            setStoreFound(false);
            form.setValue("store_id", "");
            toast.error("Selected vendor has no store. Please add a store for this vendor before creating a product.");
          }
        } catch {
          setSelectedVendor(null);
          setStores([]);
          setStoreId("");
          setStoreFound(false);
          form.setValue("store_id", "");
        } finally {
          setStoreLoading(false);
        }
      } else {
        setSelectedVendor(null);
        setStores([]);
        setStoreId("");
        setStoreFound(false);
        form.setValue("store_id", "");
      }
    }
    fetchVendorAndStores();
    return () => { ignore = true; };
  }, [selectedVendorId, tenantId, fetchVendor, fetchStoreByVendor, form]);

  // Keep form store_id in sync with storeId state
  useEffect(() => {
    if (storeId) {
      form.setValue("store_id", storeId);
    }
  }, [storeId]);

  // When initialData changes (edit mode), update selectedVendorId and storeId
  useEffect(() => {
    if (initialData?.vendor_id) setSelectedVendorId(initialData.vendor_id);
    if (initialData?.store_id) setStoreId(initialData.store_id);
  }, [initialData?.vendor_id, initialData?.store_id]);

  // Handle form submission
  const handleFormSubmit = async (data: ProductFormValues) => {
    try {
      setFormError(null);
      setInternalIsSubmitting(true);

      // Generate slug from name if not provided
      const slug = data.slug || generateSlug(data.name);

      // Ensure images don't have File objects when sending to API and format variants
      const cleanedData = {
        ...data,
        has_variants: data.variants && data.variants.length > 0,

        slug,
        images: data.images?.map((img) => ({
          url: img.url,
          alt: img.alt || "",
          is_primary: img.is_primary || false,
        })),
        variants:
          data.variants?.map((variant) => ({
            ...variant,
            price: Number(variant.price), // Ensure price is a number
            inventory_quantity: Number(variant.inventory_quantity), // Ensure stock is a number
            sku: variant.sku || "", // Ensure SKU is a string
            image_url: variant.image_url || "", // Ensure image_url is a string
          })) || [],
      };


      await onSubmit(cleanedData);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Failed to save product"
      );
    } finally {
      setInternalIsSubmitting(false);
    }
  };

  // Handle form errors
  const handleFormError = (errors: any) => {
    // Find which tab has errors
    for (const [tabName, fieldNames] of Object.entries(tabValidationMap)) {
      for (const fieldName of fieldNames) {
        const fieldHasError = errors[fieldName as keyof ProductFormValues];
        if (fieldHasError) {
          setActiveTab(tabName);
          return; // Exit after setting the first tab with errors
        }
      }
    }
  };

  // Navigation between tabs
  const setTabAndValidate = React.useCallback(
    async (tab: string) => {
      const currentTabFields =
        tabValidationMap[activeTab as keyof typeof tabValidationMap];

      if (currentTabFields) {
        const isValid = await form.trigger(
          currentTabFields as Path<ProductFormValues>[]
        );
        if (!isValid) {
          toast.error("Please correct the errors before proceeding.", {
            description: `There are errors in the ${activeTab.replace(
              /_/g,
              " "
            )} tab.`,
          });
          return; // Stop if validation fails
        }
      } // Closes: if (currentTabFields)
      setActiveTab(tab); // Proceed to set active tab if validation passed or no fields to validate
    },
    [activeTab, form, setActiveTab, tabValidationMap]
  );

  // Add effect to update slug when name changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "name") {
        const productName = value.name as string;
        if (productName && !form.getValues("slug")) {
          const generatedSlug = generateSlug(productName);
          form.setValue("slug", generatedSlug);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <div className="flex flex-col h-full">
      <Form {...form}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="ghost"
                size="icon"
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <p className="text-muted-foreground">{description}</p>
            </div>
          </div>

          <Button
            type="submit"
            form="product-form"
            disabled={isSubmitting || isImageUploading}
            className="ml-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting
              ? "Saving..."
              : initialData?.product_id
              ? "Update Product"
              : "Create Product"}
          </Button>
        </div>

        <div className="p-4 md:p-6 flex-1">
          {formError && (
            <Alert variant="destructive" className="mb-6">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {/* Vendor selection above tabs */}
          <div className="mb-6">
            <FormField
              control={form.control}
              name="vendor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Vendor <RequiredField />
                  </FormLabel>
                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        setSelectedVendorId(val);
                      }}
                      defaultValue={field.value}
                      value={selectedVendorId}
                      disabled={storeLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors?.items?.map((vendor) => (
                          <SelectItem
                            key={vendor.vendor_id}
                            value={vendor.vendor_id}
                          >
                            {vendor.business_name || vendor.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Store found indicator */}
                    {storeLoading ? (
                      <span className="text-xs text-muted-foreground animate-pulse">Loading store...</span>
                    ) : storeFound ? (
                      <CheckCircle2 aria-label="Store found" className="h-5 w-5 text-green-600" />
                    ) : selectedVendorId ? (
                      <XCircle aria-label="No store found" className="h-5 w-5 text-destructive" />
                    ) : null}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Store selection dropdown if multiple stores */}
            {stores.length > 1 && (
              <FormField
                control={form.control}
                name="store_id"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Store <RequiredField /></FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        setStoreId(val);
                      }}
                      value={storeId}
                      disabled={storeLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a store" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.store_id} value={store.store_id}>
                            {store.store_name || store.store_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <Card>
            <CardContent className="p-6">
              <form
                id="product-form"
                onSubmit={form.handleSubmit(handleFormSubmit, handleFormError)}
              >
                <fieldset disabled={isSubmitting} className="space-y-6">
                  {/* Tabs for form sections */}
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-5 w-full mb-6">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="pricing">Pricing</TabsTrigger>
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="variants">Variants</TabsTrigger>
                      <TabsTrigger value="publishing">Publishing & Images</TabsTrigger>
                    </TabsList>

                    <BasicInfoTab />
                    <PricingTab />
                    <DetailsTab />
                    <VariantsTab
                      form={form}
                      variantFields={variantFields}
                      appendVariant={appendVariant}
                      updateVariant={updateVariant}
                      removeVariant={removeVariant}
                      isVariantModalOpen={isVariantModalOpen}
                      setIsVariantModalOpen={setIsVariantModalOpen}
                      editingVariantIndex={editingVariantIndex}
                      setEditingVariantIndex={setEditingVariantIndex}
                      currentVariantData={currentVariantData}
                      setCurrentVariantData={setCurrentVariantData}
                      handleAddNewVariant={handleAddNewVariant}
                      handleEditVariant={handleEditVariant}
                      handleSaveVariant={handleSaveVariant}
                      setTabAndValidate={setTabAndValidate}
                    />
                    <PublishingTab />
                  </Tabs>
                </fieldset>
              </form>
            </CardContent>
          </Card>
        </div>
      </Form>
    </div>
  );

  function BasicInfoTab() {
    return (
      <TabsContent value="basic" className="space-y-6 pt-2">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Basic Product Information</h3>
          <p className="text-sm text-muted-foreground">
            Enter the essential information about your product.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Product Name <RequiredField />
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Premium Wireless Headphones" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="premium-wireless-headphones" />
                </FormControl>
                <FormDescription>
                  URL-friendly version of the product name. Auto-generated if
                  left empty.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  SKU <RequiredField />
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="PROD-001" />
                </FormControl>
                <FormDescription>
                  Stock Keeping Unit - unique product identifier
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="short_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Brief product description for listings"
                  className="h-20 resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Categories with multi-select */}
        <FormField
          control={form.control}
          name="category_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Categories <RequiredField />
              </FormLabel>
              <FormControl>
                <MultiSelect
                  options={categories
                    .filter(
                      (category) =>
                        (category._id || category.category_id) && category.name
                    )
                    .map((category) => ({
                      label: category.name,
                      value: category.category_id || category._id || "",
                    }))}
                  selected={field.value || []}
                  onChange={field.onChange}
                  placeholder="Select product categories"
                />
              </FormControl>
              <FormDescription>
                Select one or more categories for your product
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags */}
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => {
            const [tagInput, setTagInput] = useState("");

            const addTag = () => {
              const tag = tagInput.trim();
              if (tag && !field.value.includes(tag)) {
                field.onChange([...field.value, tag]);
              }
              setTagInput("");
            };

            const removeTag = (tagToRemove: string) => {
              field.onChange(field.value.filter((tag) => tag !== tagToRemove));
            };

            return (
              <FormItem>
                <FormLabel>
                  Tags <RequiredField />
                </FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add tags"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                  </FormControl>
                  <Button type="button" onClick={addTag}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {field.value?.map((tag, index) => (
                    <div
                      key={index}
                      className="bg-secondary text-secondary-foreground text-sm px-2 py-1 rounded-md flex items-center gap-1.5"
                    >
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:cursor-pointer hover:text-destructive"
                        onClick={() => removeTag(tag)}
                      >
                        <span className="sr-only">Remove</span>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <FormDescription>
                  Tags help with search and categorization. At least one tag is required.
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className="flex justify-end">
          <Button type="button" onClick={() => setTabAndValidate("pricing")}>
            Next: Pricing
          </Button>
        </div>
      </TabsContent>
    );
  }

  function PricingTab() {
    return (
      <TabsContent value="pricing" className="space-y-6 pt-2">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Product Pricing</h3>
          <p className="text-sm text-muted-foreground">
            Set the pricing details for your product.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <FormField
            control={form.control}
            name="base_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Base Price <RequiredField />
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </FormControl>
                <FormDescription>
                  Original/base price (strikethrough if discounted)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sale_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Sale Price <RequiredField />
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </FormControl>
                <FormDescription>
                  Price buyers pay (discounted)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cost_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost Price</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                  />
                </FormControl>
                <FormDescription>
                  For profit calculation only (hidden from users)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setActiveTab("basic")}
          >
            Back: Basic Info
          </Button>
          <Button type="button" onClick={() => setTabAndValidate("details")}>
            Next: Details
          </Button>
        </div>
      </TabsContent>
    );
  }

  function DetailsTab() {
    return (
      <TabsContent value="details" className="space-y-6 pt-2">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Product Details</h3>
          <p className="text-sm text-muted-foreground">
            Additional product details and inventory information.
          </p>
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Description <RequiredField />
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Detailed product description..."
                  className="min-h-[150px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <h4 className="text-md font-medium">Inventory Information</h4>
            <FormField
              control={form.control}
              name="inventory_quantity"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Stock Quantity</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="low_stock_threshold"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Low Stock Threshold</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="10" />
                  </FormControl>
                  <FormDescription>
                    Get alerts when stock is below this level
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="inventory_tracking"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="cursor-pointer">
                      Track Inventory
                    </FormLabel>
                    <FormDescription>
                      Track stock levels for this product
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-6">
            <h4 className="text-md font-medium">Physical Properties</h4>
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Weight (grams)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" placeholder="0" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="dimensions.length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Length (cm)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dimensions.width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width (cm)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dimensions.height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (cm)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.1"
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="requires_shipping"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="cursor-pointer">
                      Requires Shipping
                    </FormLabel>
                    <FormDescription>
                      This product requires physical shipping
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setActiveTab("pricing")}
          >
            Back: Pricing
          </Button>
          <Button type="button" onClick={() => setTabAndValidate("variants")}>
            Next: Variants
          </Button>
        </div>
      </TabsContent>
    );
  }

  function PublishingTab() {
    return (
      <TabsContent value="publishing" className="space-y-6 pt-2">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Product Images & Status</h3>
          <p className="text-sm text-muted-foreground">
            Upload product images and set visibility status.
          </p>
        </div>

        <FormField
          control={form.control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Product Images <RequiredField />
              </FormLabel>
              <FormControl>
                <MultiImageUpload
                  id="product-images"
                  value={field.value || []}
                  onChange={field.onChange}
                  previewAlt="Product image"
                  onUploadingChange={setIsImageUploading}
                />
              </FormControl>
              <FormDescription>
                Upload at least 3 high-quality product images. First or selected image will
                be used as the main image.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4">
          <h4 className="text-md font-medium">Visibility Settings</h4>
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="cursor-pointer">Active</FormLabel>
                    <FormDescription>
                      Product is visible and can be purchased
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_featured"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between p-3 border rounded-lg shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="cursor-pointer">Featured</FormLabel>
                    <FormDescription>
                      Highlight this product on the homepage and featured
                      sections
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setTabAndValidate("variants")}
          >
            Back: Variants
          </Button>
          <Button type="submit" disabled={isSubmitting || isImageUploading}>
            {isSubmitting
              ? "Saving..."
              : initialData?.product_id
              ? "Update Product"
              : "Create Product"}
          </Button>
        </div>
      </TabsContent>
    );
  }
}

const VariantsTab = React.memo(
  ({
    form, // form is not directly used in this JSX, but handlers might need it from ProductForm's scope
    variantFields,
    // appendVariant, // Not directly called here, but handleSaveVariant (prop) uses it
    // updateVariant, // Not directly called here, but handleSaveVariant (prop) uses it
    removeVariant,
    isVariantModalOpen,
    setIsVariantModalOpen,
    editingVariantIndex,
    setEditingVariantIndex,
    currentVariantData,
    setCurrentVariantData,
    handleAddNewVariant,
    handleEditVariant,
    handleSaveVariant,
    setTabAndValidate,
  }: VariantsTabProps) => {
    // Note: `form` prop is available if needed for direct operations,
    // but variant modal inputs are controlled by `currentVariantData` state.
    // Handlers like `handleSaveVariant` passed as props already have `form` in their closure if needed.

    return (
      <TabsContent value="variants" className="space-y-6 pt-2">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Product Variants</h3>
          <p className="text-sm text-muted-foreground">
            Add variations of this product such as size or color options.
          </p>
        </div>

        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">Manage Variants</h4>
            <Button type="button" size="sm" onClick={handleAddNewVariant}>
              <Plus className="mr-2 h-4 w-4" /> Add Variant
            </Button>
          </div>

          {variantFields.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Variant Name</TableHead>
                  <TableHead className="w-[250px]">Attributes</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead className="text-right w-[100px]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variantFields.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      {item.attributes && Object.keys(item.attributes).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(item.attributes).map(([name, value], attrIndex) => (
                            <span
                              key={attrIndex}
                              className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-xs"
                            >
                              <span className="font-medium">{name}:</span>
                              <span className="ml-1">{value}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No attributes</span>
                      )}
                    </TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{item.price}</TableCell>
                    <TableCell>{item.inventory_quantity}</TableCell>
                    <TableCell>
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name || "Variant image"}
                          className="h-10 w-10 object-cover rounded"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No image
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditVariant(index)}
                        className="mr-1"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVariant(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No variants added yet. Click "Add Variant" to get started.
            </p>
          )}
        </div>

        {/* Variant Add/Edit Modal */}
        {isVariantModalOpen && (
          <Dialog
            open={isVariantModalOpen}
            onOpenChange={(open) => {
              if (!open) {
                setIsVariantModalOpen(false);
                setEditingVariantIndex(null);
                setCurrentVariantData(null);
              }
            }}
          >
            <DialogContent className="sm:max-w-xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingVariantIndex !== null
                    ? "Edit Variant"
                    : "Add New Variant"}
                </DialogTitle>
                <DialogDescription>
                  {editingVariantIndex !== null
                    ? "Modify details for this product variant."
                    : "Add details for a new product variant."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div>
                  <Label htmlFor="variant-name">Variant Name</Label>
                  <Input
                    id="variant-name"
                    value={currentVariantData?.name || ""}
                    onChange={(e) => {
                      const name = e.target.value;
                      const generatedSku = name
                        .toUpperCase()
                        .replace(/[^\w\s-]/g, "")
                        .replace(/\s+/g, "-")
                        .replace(/-+/g, "-")
                        .trim();
                      setCurrentVariantData((prev) => ({
                        ...prev,
                        name: name,
                        sku: generatedSku,
                      }));
                    }}
                    placeholder="e.g., MacBook 13 Space Gray 1TB"
                  />
                  {currentVariantData?.sku && (
                    <p className="text-xs text-muted-foreground mt-1">
                      SKU: <span className="font-mono font-medium">{currentVariantData.sku}</span>
                    </p>
                  )}
                </div>
                <div>
                  <Label>Attributes</Label>
                  <div className="space-y-2 border rounded-md p-3">
                    {currentVariantData?._tempAttributesArray?.map((attr: any, index: number) => (
                      <div key={index} className="flex gap-2 items-start">
                        <Input
                          value={attr.name}
                          onChange={(e) => {
                            const newAttrs = [...(currentVariantData._tempAttributesArray || [])];
                            newAttrs[index] = { ...newAttrs[index], name: e.target.value };
                            setCurrentVariantData((prev) => ({
                              ...prev,
                              _tempAttributesArray: newAttrs,
                            }));
                          }}
                          placeholder="Attribute name (e.g., Color)"
                          className="flex-1"
                        />
                        <Input
                          value={attr.value}
                          onChange={(e) => {
                            const newAttrs = [...(currentVariantData._tempAttributesArray || [])];
                            newAttrs[index] = { ...newAttrs[index], value: e.target.value };
                            setCurrentVariantData((prev) => ({
                              ...prev,
                              _tempAttributesArray: newAttrs,
                            }));
                          }}
                          placeholder="Value (e.g., Space Gray)"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newAttrs = currentVariantData._tempAttributesArray?.filter((_: any, i: number) => i !== index) || [];
                            setCurrentVariantData((prev) => ({
                              ...prev,
                              _tempAttributesArray: newAttrs,
                            }));
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )) || null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newAttrs = [...(currentVariantData?._tempAttributesArray || []), { name: "", value: "" }];
                        setCurrentVariantData((prev) => ({
                          ...prev,
                          _tempAttributesArray: newAttrs,
                        }));
                      }}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add Attribute
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="variant-price">Variant Price</Label>
                  <Input
                    id="variant-price"
                    type="number"
                    value={currentVariantData?.price ?? ""}
                    onChange={(e) =>
                      setCurrentVariantData((prev) => ({
                        ...prev,
                        price: parseFloat(e.target.value) || undefined,
                      }))
                    }
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Base Price: <span className="font-medium">{form.getValues("base_price") || 0}</span>
                  </p>
                </div>
                <div>
                  <Label htmlFor="variant-stock_qty">Stock Quantity</Label>
                  <Input
                    id="variant-stock_qty"
                    type="number"
                    value={currentVariantData?.inventory_quantity ?? ""}
                    onChange={(e) =>
                      setCurrentVariantData((prev) => ({
                        ...prev,
                        inventory_quantity: parseInt(e.target.value, 10) || undefined,
                      }))
                    }
                    placeholder="10"
                  />
                </div>
                <div>
                  <Label htmlFor="variant-thumbnail-upload">
                    Variant Image (Optional)
                  </Label>
                  <ImageUpload
                    id="variant-thumbnail-upload"
                    value={currentVariantData?.image_url || ""}
                    onChange={(url) => {
                      setCurrentVariantData((prev) => ({
                        ...prev,
                        image_url: url || undefined,
                      }));
                    }}
                    previewAlt={currentVariantData?.name || "Variant image"}
                    className="mt-1"
                    // tenantId={tenantId} // Pass tenantId if ImageUpload component requires it and it's passed to VariantsTab
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsVariantModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    currentVariantData &&
                    handleSaveVariant(currentVariantData as ProductVariant)
                  }
                >
                  Add Variant
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setTabAndValidate("images")}
          >
            Back: Images
          </Button>
          <Button type="button" onClick={() => setTabAndValidate("publishing")}>
            Next: Publishing
          </Button>
        </div>
      </TabsContent>
    );
  }
);

VariantsTab.displayName = "VariantsTab";
