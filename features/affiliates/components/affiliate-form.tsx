import React, { useEffect, useState, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Affiliate } from "../types";
import { AffiliateFormValues, affiliateSchema } from "../schema";
import { RequiredField } from "@/components/ui/required-field";
import { DocumentUpload, DocumentWithMeta } from "@/components/ui/document-upload";
import { BankingInfoFields } from "../../../components/ui/banking-info-fields";
import { DOCUMENT_TYPES } from "@/features/configurations/data/document-types";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

interface AffiliateFormProps {
  initialData?: Affiliate;
  onSubmit: (values: AffiliateFormValues) => void;
  isSubmitting?: boolean;
  formId?: string;
}

// Map field names to tabs for error navigation
export const affiliateTabFieldMap: Record<string, string> = {
  // Basic Info
  name: "basic",
  email: "basic",
  phone: "basic",
  bio: "basic",
  website: "basic",
  "social_media.instagram": "basic",
  "social_media.twitter": "basic",
  "social_media.facebook": "basic",
  // Banking
  "bank_account.bank_name": "banking",
  "bank_account.account_number": "banking",
  "bank_account.account_name": "banking",
  "bank_account.swift_bic": "banking",
  "bank_account.branch_code": "banking",
  // Documents
  verification_documents: "documents",
  // Add more as needed
};

export function AffiliateForm({ initialData, onSubmit, isSubmitting = false, formId = "marketplace-affiliate-form" }: AffiliateFormProps) {
  const [activeTab, setActiveTab] = useState("basic");

  // Default values
  const defaultValues: Partial<AffiliateFormValues> = {
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    bio: initialData?.bio || "",
    website: initialData?.website || "",
    social_media: {
      instagram: initialData?.social_media?.instagram || "",
      twitter: initialData?.social_media?.twitter || "",
      facebook: initialData?.social_media?.facebook || "",
    },
    bank_account: {
      bank_name: initialData?.bank_account?.bank_name || "",
      account_number: initialData?.bank_account?.account_number || "",
      account_name: initialData?.bank_account?.account_name || "",
      swift_bic: initialData?.bank_account?.swift_bic || "",
      branch_code: initialData?.bank_account?.branch_code || "",
    },
    verification_documents: initialData?.verification_documents || [],
  };

  const form = useForm<AffiliateFormValues>({
    resolver: zodResolver(affiliateSchema),
    defaultValues,
    mode: "onBlur",
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        bio: initialData.bio || "",
        website: initialData.website || "",
        social_media: {
          instagram: initialData.social_media?.instagram || "",
          twitter: initialData.social_media?.twitter || "",
          facebook: initialData.social_media?.facebook || "",
        },
        bank_account: {
          bank_name: initialData.bank_account?.bank_name || "",
          account_number: initialData.bank_account?.account_number || "",
          account_name: initialData.bank_account?.account_name || "",
          swift_bic: initialData.bank_account?.swift_bic || "",
          branch_code: initialData.bank_account?.branch_code || "",
        },
        verification_documents: initialData.verification_documents || [],
      });
    }
  }, [initialData, form]);

  // Document field array
  const { fields: documentFields, append: appendDocument, remove: removeDocument } = useFieldArray({
    control: form.control,
    name: "verification_documents",
  });

  // Document types for DocumentUpload (match vendor form)
  const mappedDocumentTypes = useMemo(() => {
    return DOCUMENT_TYPES.map((docType: any) => ({
      id: docType.id,
      name: docType.label,
      description: docType.description,
      required: false,
    }));
  }, []);

  // DocumentUpload handlers (match vendor form)
  const handleUploadComplete = (doc: DocumentWithMeta) => {
    if (!doc.document_url) {
      toast.error("Upload failed: document URL is missing.");
      return;
    }
    // Map to the expected affiliate document type structure if needed
    const newDocument = {
      document_type: doc.document_type,
      document_url: doc.document_url,
      file_name: doc.file_name,
      expires_at: doc.expires_at,
      file_id: doc.file_id,
      verification_status: "pending",
      number: doc.number,
    };
    appendDocument(newDocument as any);
  };
  const handleDeleteDocument = (index: number) => {
    removeDocument(index);
    toast.info("Document removed from list. Save changes to make it permanent.");
  };

  const tabFlow = ["basic", "banking", "documents", "review"];
  const prevTab = () => {
    const currentIndex = tabFlow.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabFlow[currentIndex - 1]);
    }
  };
  const nextTab = async () => {
    // Validate current tab fields before moving to next
    const tabFields: Record<string, string[]> = {
      basic: [
        "name",
        "email",
        "phone",
        "bio",
        "website",
        "social_media.instagram",
        "social_media.twitter",
        "social_media.facebook",
      ],
      banking: [
        "bank_account.bank_name",
        "bank_account.account_number",
        "bank_account.account_name",
        "bank_account.swift_bic",
        "bank_account.branch_code",
      ],
      documents: ["verification_documents"],
      review: [],
    };
    const fieldsToValidate = tabFields[activeTab] || [];
    if (fieldsToValidate.length > 0) {
      const isValid = await form.trigger(fieldsToValidate as any);
      if (!isValid) {
        toast.error("Please correct the errors on this tab before proceeding.");
        return;
      }
    }
    const currentIndex = tabFlow.indexOf(activeTab);
    if (currentIndex < tabFlow.length - 1) {
      setActiveTab(tabFlow[currentIndex + 1]);
    }
  };

  // Handle form validation errors and set the correct tab
  const handleFormError = (errors: any) => {
    // Find the first error field
    const firstErrorField = Object.keys(errors)[0];
    if (firstErrorField) {
      // Map to tab
      const tab = affiliateTabFieldMap[firstErrorField] || "basic";
      setActiveTab(tab);
    }
    toast.error("Please fix the validation errors before submitting.");
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <Form {...form}>
          <form
            id={formId}
            onSubmit={form.handleSubmit(onSubmit, handleFormError)}
            className="space-y-8"
          >
            <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="w-full">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="banking">Banking Info</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="review">Review & Submit</TabsTrigger>
              </TabsList>
              <BasicInfoTab />
              <BankingTab />
              <DocumentsTab />
              <ReviewTab />
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
                      <>Save Affiliate</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );

  // Basic Info Tab
  function BasicInfoTab() {
    return (
      <TabsContent value="basic" className="space-y-6 pt-4">
        <div>
          <CardTitle>Core Affiliate Details</CardTitle>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Affiliate Name <RequiredField /></FormLabel>
                <FormControl>
                  <Input placeholder="Affiliate Name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email <RequiredField /></FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone <RequiredField /></FormLabel>
                <FormControl>
                  <PhoneInput placeholder="Enter contact phone" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <Separator className="mb-2" />
          <CardTitle>Profile Information</CardTitle>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Bio (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Tell us a little bit about this affiliate..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Website (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <Separator className="mb-2" />
          <CardTitle>Social Media Links (Optional)</CardTitle>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="social_media.instagram"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instagram</FormLabel>
                <FormControl>
                  <Input placeholder="Instagram URL or username" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="social_media.twitter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Twitter</FormLabel>
                <FormControl>
                  <Input placeholder="Twitter URL or handle" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="social_media.facebook"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Facebook</FormLabel>
                <FormControl>
                  <Input placeholder="Facebook Page URL" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </TabsContent>
    );
  }

  // Banking Tab
  function BankingTab() {
    return (
      <TabsContent value="banking" className="space-y-4 pt-4">
        <div>
          <CardTitle>Banking Information</CardTitle>
        </div>
        <div>
          <BankingInfoFields form={form} fieldPrefix="bank_account" />
        </div>
      </TabsContent>
    );
  }

  // Documents Tab
  function DocumentsTab() {
    // Get the current documents from form state when tab is active
    const formDocuments = useWatch({
      control: form.control,
      name: "verification_documents",
      defaultValue: [],
    });

    // Log when documents change in form state (optional, for debugging)
    useEffect(() => {
      if (activeTab === "documents") {
      }
    }, [formDocuments, activeTab]);

    return (
      <TabsContent value="documents" className="space-y-6 pt-4">
        <div>
          <CardTitle>Verification Documents</CardTitle>
        </div>
        <div className="space-y-4">
          <DocumentUpload
            entityName="winga"
            documents={documentFields as DocumentWithMeta[]}
            onUploadComplete={handleUploadComplete}
            onDelete={handleDeleteDocument}
            disabled={isSubmitting}
            label="Affiliate Documents"
            description="Upload identity documents, business licenses, and bank statements."
          />
        </div>
      </TabsContent>
    );
  }

  // Review Tab
  function ReviewTab() {
    const [reviewValues, setReviewValues] = useState(() => form.getValues());
    useEffect(() => {
      if (activeTab === "review") {
        setReviewValues(form.getValues());
      }
    }, [activeTab]);
    return (
      <TabsContent value="review" className="space-y-4 pt-4">
        <p>Review the information before submitting.</p>
        {/* You can expand this to show a summary of all form values */}
      </TabsContent>
    );
  }
}
