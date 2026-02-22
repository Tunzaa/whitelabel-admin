"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "sonner";

import { languages } from "../data/languages";

const SystemSettingsSchema = z.object({
  documentTypes: z.array(z.string()).default([]),
  vehicleTypes: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
});

type SystemSettingsFormValues = z.infer<typeof SystemSettingsSchema>;

export function SystemSettingsForm() {
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);

  const form = useForm<SystemSettingsFormValues>({
    resolver: zodResolver(SystemSettingsSchema),
    defaultValues: {
      documentTypes: [],
      vehicleTypes: [],
      languages: [],
    },
  });

  const onSubmit = (data: SystemSettingsFormValues) => {
    // TODO: Implement actual save functionality
    toast.success("Settings saved successfully");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Document Types</h3>
          <FormField
            control={form.control}
            name="documentTypes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Document Types</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter document type (e.g., NIDA, Passport)"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          const value = e.currentTarget.value.trim();
                          if (value && !documentTypes.includes(value)) {
                            setDocumentTypes([...documentTypes, value]);
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      {documentTypes.map((type, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive/10"
                          onClick={() => {
                            setDocumentTypes(
                              documentTypes.filter((_, i) => i !== index)
                            );
                          }}
                        >
                          {type}
                          <span className="ml-2">×</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Vehicle Types</h3>
          <FormField
            control={form.control}
            name="vehicleTypes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Types</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter vehicle type (e.g., Boda, Car)"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          const value = e.currentTarget.value.trim();
                          if (value && !vehicleTypes.includes(value)) {
                            setVehicleTypes([...vehicleTypes, value]);
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      {vehicleTypes.map((type, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive/10"
                          onClick={() => {
                            setVehicleTypes(
                              vehicleTypes.filter((_, i) => i !== index)
                            );
                          }}
                        >
                          {type}
                          <span className="ml-2">×</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Languages</h3>
          <FormField
            control={form.control}
            name="languages"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Languages</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={languages}
                    selected={field.value}
                    onChange={field.onChange}
                    placeholder="Select languages"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit">Save Settings</Button>
      </form>
    </Form>
  );
}
