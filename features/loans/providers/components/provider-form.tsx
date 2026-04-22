"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Spinner } from "@/components/ui/spinner";

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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RequiredField } from "@/components/ui/required-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Direct implementation instead of PhoneInput to avoid infinite loops

import { LoanProviderFormValues } from "../types";
import { useLoanProviderStore } from "../store";
import { useSelectedTenantStore } from "@/features/tenants/store";

// Form validation schema
const providerFormSchema = z.object({
  tenant_id: z.string().min(1, "Tenant ID is required"),
  user_id: z.string().min(1, "User ID is required"),
  business_name: z.string().min(1, "Business name is required"),
  description: z.string().min(1, "Description is required"),
  contact_email: z.string().email("Invalid email address"),
  contact_phone: z.string().min(1, "Contact phone is required"),
  website: z.string().optional(),
  address: z.string().optional(),
  is_active: z.boolean().default(true),
  integration_key: z.string().optional(),
  integration_secret: z.string().optional(),
});

interface ProviderFormProps {
  onSubmit: (data: LoanProviderFormValues) => Promise<any>;
  onCancel?: () => void;
  initialData?: Partial<LoanProviderFormValues>;
  id?: string;
  isSubmitting?: boolean;
}

export function ProviderForm({
  onSubmit,
  onCancel,
  initialData,
  id,
  isSubmitting: externalIsSubmitting,
}: ProviderFormProps) {
  const { data: session } = useSession();
  const { selectedTenantId } = useSelectedTenantStore();
  const tenantId = selectedTenantId || (session?.user as any)?.tenant_id || "";
  const userId = (session?.user as any)?.id || (session?.user as any)?.user_id || "";
  const [activeTab, setActiveTab] = useState("basic");
  const [internalIsSubmitting, setInternalIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Determine if form is submitting from either external or internal state
  const isSubmitting = externalIsSubmitting || internalIsSubmitting;
  const isAddPage = !initialData?.id;

  // Initialize React Hook Form
  const form = useForm<LoanProviderFormValues>({
    resolver: zodResolver(providerFormSchema),
    mode: "onSubmit",
    defaultValues: initialData || {
      tenant_id: tenantId,
      user_id: userId,
      business_name: "",
      description: "",
      contact_email: "",
      contact_phone: "",
      website: "",
      address: "",
      is_active: true,
      integration_key: "",
      integration_secret: "",
    }
  });

  // Handle form submission
  const handleFormSubmit = async (data: LoanProviderFormValues) => {
    setFormError(null);
    setInternalIsSubmitting(true);
    
    try {
      await onSubmit(data);
    } catch (error) {
      setFormError(typeof error === 'string' ? error : 'Failed to save loan provider. Please try again.');
      toast.error("Failed to save loan provider");
    } finally {
      setInternalIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form 
        id="loan-provider-form" 
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-6"
      >
        <Tabs 
          defaultValue="basic" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="integration">Integration Settings</TabsTrigger>
          </TabsList>
          
          {formError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          
          <TabsContent value="basic" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="business_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Business Name <RequiredField />
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Enter business name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Contact Email <RequiredField />
                        </FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter contact email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contact_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Contact Phone <RequiredField />
                        </FormLabel>
                        <FormControl>
                          <div className="flex">
                            <Select
                              value={field.value ? (field.value.match(/^(255|254|256|250|257)/)?.[0] || "255") : "255"}
                              onValueChange={(code: string) => {
                                const phoneValue = field.value || "";
                                const phoneNumber = phoneValue.replace(/^(255|254|256|250|257)/, "");
                                field.onChange(code + phoneNumber);
                              }}
                            >
                              <SelectTrigger className="w-[100px] rounded-r-none border-r-0">
                                <SelectValue placeholder="Code" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="255">🇹🇿 +255</SelectItem>
                                <SelectItem value="254">🇰🇪 +254</SelectItem>
                                <SelectItem value="256">🇺🇬 +256</SelectItem>
                                <SelectItem value="250">🇷🇼 +250</SelectItem>
                                <SelectItem value="257">🇧🇮 +257</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              className="rounded-l-none flex-1"
                              placeholder="712XXXXXX"
                              value={(field.value || "").replace(/^(255|254|256|250|257)/, "")}
                              onChange={(e) => {
                                const phoneValue = field.value || "";
                                const countryCodeMatch = phoneValue.match(/^(255|254|256|250|257)/);
                                const countryCode = countryCodeMatch && countryCodeMatch[0] ? countryCodeMatch[0] : "255";
                                // Strip any non-numeric characters
                                const numericValue = e.target.value.replace(/\D/g, '');
                                field.onChange(countryCode + numericValue);
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter website URL" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between mt-8">
                        <div className="space-y-0.5">
                          <FormLabel>Active Status</FormLabel>
                          <FormDescription>
                            Enable to make this provider active
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
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>
                        Description <RequiredField />
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter provider description" 
                          className="min-h-[120px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter provider address" 
                          className="min-h-[80px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="integration" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <Alert className="mb-4">
                  <AlertTitle>Integration Settings</AlertTitle>
                  <AlertDescription>
                    Configure API integration details for this loan provider. These settings will be used for automated loan processing.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="integration_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Integration Key</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter API key" {...field} />
                        </FormControl>
                        <FormDescription>
                          Used for API authentication
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="integration_secret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Secret Key</FormLabel>
                        <FormControl>
                          <Input 
                            type="password"
                            placeholder="Enter API secret" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Keep this confidential
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner size="sm" color="white" className="mr-2" />
                {isAddPage ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              <>{isAddPage ? 'Create Provider' : 'Update Provider'}</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
