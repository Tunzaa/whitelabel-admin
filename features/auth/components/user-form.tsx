"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { Role } from "../types/role";
import { useRoleStore } from "../stores/role-store";

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
import { Separator } from "@/components/ui/separator";
import { PhoneInput } from "@/components/ui/phone-input";
import { RequiredField } from "@/components/ui/required-field";
import { MultiSelect } from "@/components/ui/multi-select";

// Form schema
const userFormSchema = z.object({
  first_name: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  last_name: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone_number: z.string().optional(),
  active_profile_role: z.string({ required_error: "Please select a primary role." }),
  roles: z.array(z.string()).refine((value) => value.length > 0, {
    message: "You have to select at least one role.",
  }),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormPayload extends Omit<UserFormValues, "roles"> {
  tenant_id: string;
  roles: { role: string }[];
  reset_password?: boolean;
}

interface UserFormProps {
  onSubmit: (data: UserFormPayload) => void;
  onCancel?: () => void;
  initialData?: Partial<UserFormValues> & { user_id?: string; roles?: (string | { role: string })[] };
}

export function UserForm({ onSubmit, onCancel, initialData }: UserFormProps) {
  const { data: session, status } = useSession();
  const { roles: availableRoles, fetchRoles } = useRoleStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tenantId = session?.user?.tenant_id;

  useEffect(() => {
    if (status === 'authenticated' && tenantId) {
      const headers = { "X-Tenant-ID": tenantId };
      fetchRoles({}, headers).catch(() => {});
    }
  }, [fetchRoles, tenantId, status]);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      email: initialData?.email || "",
      phone_number: initialData?.phone_number || "",
      active_profile_role: initialData?.active_profile_role || undefined,
      roles: initialData?.roles?.map((role: any) => typeof role === 'string' ? role : role.role).filter(Boolean) || [],
    },
  });

  const selectedRoles = form.watch("roles");

  useEffect(() => {
    const primaryRole = form.getValues("active_profile_role");
    if (primaryRole && selectedRoles && !selectedRoles.includes(primaryRole)) {
      form.setValue("active_profile_role", "");
    }
  }, [selectedRoles, form]);

  const handleSubmit = async (data: UserFormValues) => {
    setIsSubmitting(true);
    try {
      const payload: UserFormPayload = {
        ...data,
        tenant_id: session?.user.tenant_id as string,
        roles: data.roles.map((roleName) => ({ role: roleName })),
      };
      if (!initialData?.user_id) {
        payload.reset_password = true;
      }
      await onSubmit(payload);
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleOptions = availableRoles.map((role: Role) => ({
    value: role.role,
    label: role.role.charAt(0).toUpperCase() + role.role.slice(1),
  }));

  return (
    <Card className="mx-4">
      <CardContent className="p-6">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h3 className="text-lg font-medium">User Information</h3>
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
                        <Input placeholder="Juma" {...field} />
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
                        <Input placeholder="Doe" {...field} />
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
                      <FormLabel>
                        Email <RequiredField />
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-4" />

              <h3 className="text-lg font-medium">Access Control</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="roles"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Roles <RequiredField />
                      </FormLabel>
                      <MultiSelect
                        options={roleOptions}
                        selected={field.value}
                        onChange={field.onChange}
                        placeholder="Select roles..."
                      />
                      <FormDescription>
                        Assign one or more roles to the user.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="active_profile_role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Primary Role <RequiredField />
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedRoles || selectedRoles.length === 0}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a primary role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedRoles.map((roleName) => (
                            <SelectItem key={roleName} value={roleName}>
                              {roleName.charAt(0).toUpperCase() + roleName.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The user's main role in the system. Must be one of the selected roles.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end mt-6">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : initialData?.user_id
                  ? "Update User"
                  : "Create User"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
