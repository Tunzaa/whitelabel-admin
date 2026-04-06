import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';

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
  provider_id: z.string().min(1, 'Provider is required'),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  interest_rate: z.preprocess((val) => typeof val === 'string' ? parseFloat(val) : val, z.number().min(0, 'Interest rate must be a non-negative number')),
  interest_period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  interest_rate_type: z.enum(['FLAT', 'REDUCING', 'REDUCING_BALANCE']),
  term_duration: z.number().min(1, 'Term duration is required'),
  term_unit: z.enum(['DAYS', 'WEEKS', 'MONTHS', 'YEARS']),
  repayment_frequency: z.enum(['DAILY', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY']),
  charges_array: z.array(z.object({
    name: z.string().min(1, 'Charge name is required'),
    value: z.preprocess((val) => typeof val === 'string' ? parseFloat(val) : val, z.number().min(0, 'Value must be positive'))
  })).default([]),
  charges: z.record(z.any()).default({}),
});

interface ProductFormProps {
  initialValues: LoanProductFormValues;
  onSubmit: (values: LoanProductFormValues) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
  providers: LoanProvider[];
  defaultProviderId?: string;
}

type ExtendedFormValues = LoanProductFormValues & {
  charges_array: { name: string; value: number }[];
};

export function ProductForm({
  initialValues,
  onSubmit,
  isSubmitting,
  submitLabel,
  providers,
  defaultProviderId
}: ProductFormProps) {
  const form = useForm<ExtendedFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...initialValues,
      charges_array: initialValues.charges 
        ? Object.entries(initialValues.charges).map(([name, value]) => ({ name, value: Number(value) }))
        : []
    } as any
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "charges_array"
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

  const handleFormSubmit = async (values: any) => {
    // Transform charges_array back to Record<string, any>
    const finalCharges: Record<string, any> = {};
    if (values.charges_array && Array.isArray(values.charges_array)) {
      values.charges_array.forEach((charge: { name: string, value: number }) => {
        if (charge.name) {
          finalCharges[charge.name] = charge.value;
        }
      });
    }

    const { charges_array, ...finalValues } = values;
    await onSubmit({ 
      ...finalValues, 
      charges: finalCharges 
    } as LoanProductFormValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {!defaultProviderId && (
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
        )}

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



        <div className="w-full border rounded-md p-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium">Product Charges</h3>
              <p className="text-sm text-muted-foreground">Manage additional fees for this loan product</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: '', value: 0 })}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" /> Add Charge
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-4 p-3 border rounded-lg bg-muted/30">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name={`charges_array.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Charge Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Processing Fee" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="w-32">
                  <FormField
                    control={form.control}
                    name={`charges_array.${index}.value`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Amount</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {fields.length === 0 && (
              <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground">
                No charges added. Click "Add Charge" to include fees.
              </div>
            )}
          </div>
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
