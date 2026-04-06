import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
// Using a simple div instead of Accordion which isn't available

import { LoanProduct, LoanProductFormValues } from '../types';
import { LoanProvider } from '../../providers/types';

const formSchema = z.object({
  tenant_id: z.string(),
  provider_id: z.string().min(1, 'Provider is required'),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  interest_rate: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, 
    { message: 'Interest rate must be a valid number' }
  ),
  interest_period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  interest_rate_type: z.enum(['FLAT', 'REDUCING', 'REDUCING_BALANCE']),
  term_duration: z.number().min(1, 'Term duration is required'),
  term_unit: z.enum(['DAYS', 'WEEKS', 'MONTHS', 'YEARS']),
  repayment_frequency: z.enum(['DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY']),
  min_amount: z.string().optional().refine(
    (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0),
    { message: 'Minimum amount must be a positive number' }
  ),
  max_amount: z.string().optional().refine(
    (val) => !val || (!isNaN(parseFloat(val)) && parseFloat(val) > 0),
    { message: 'Maximum amount must be a positive number' }
  ),
  is_active: z.boolean().default(true),
});

interface ProductFormProps {
  initialValues: LoanProductFormValues;
  onSubmit: (values: LoanProductFormValues) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
  providers: LoanProvider[];
  defaultProviderId?: string;
}

export function ProductForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  providers,
  defaultProviderId
}: ProductFormProps) {
  const form = useForm<LoanProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });

  // Update the form when initialValues change
  useEffect(() => {
    if (initialValues) {
      Object.keys(initialValues).forEach((key) => {
        form.setValue(key as keyof LoanProductFormValues, initialValues[key as keyof LoanProductFormValues]);
      });
    }
  }, [form, initialValues]);

  // Set default provider if provided
  useEffect(() => {
    if (defaultProviderId) {
      form.setValue('provider_id', defaultProviderId);
    }
  }, [defaultProviderId, form]);

  const handleFormSubmit = async (values: LoanProductFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="provider_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provider</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.provider_id} value={provider.provider_id}>
                      {provider.name}
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter product name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter product description"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="interest_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interest Rate (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 5.5"
                    step="0.01"
                    min="0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interest_period"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interest Period</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="interest_rate_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Interest Rate Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="FLAT">Flat Rate</SelectItem>
                    <SelectItem value="REDUCING">Reducing Balance</SelectItem>
                    <SelectItem value="REDUCING_BALANCE">Reducing Balance (Standard)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="term_duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Term Duration</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 3"
                    min="1"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="term_unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Term Unit</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="DAYS">Days</SelectItem>
                    <SelectItem value="WEEKS">Weeks</SelectItem>
                    <SelectItem value="MONTHS">Months</SelectItem>
                    <SelectItem value="YEARS">Years</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="repayment_frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Repayment Frequency</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="BI_WEEKLY">Bi-Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="min_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum Loan Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 1000"
                    step="100"
                    min="0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="max_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Maximum Loan Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 10000"
                    step="100"
                    min="0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>


        <div className="w-full border rounded-md p-4 mt-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Status Settings</h3>
          </div>
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Active</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Make this product available to vendors
                  </p>
                </div>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
