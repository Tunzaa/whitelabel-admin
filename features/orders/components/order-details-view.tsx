'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useOrderStore } from '@/features/orders/store';
import { useVendorStore } from '@/features/vendors/store';
import { useParams } from 'next/navigation';

import { OrderHeader } from './order-header';
import { CustomerInfoCard } from './customer-info-card';
import { ShippingInfoCard } from './shipping-info-card';
import { OrderSummaryCard } from './order-summary-card';
import { OrderItemsCard } from './order-items-card';
import { VendorResponsesCard } from './vendor-responses-card';
import { VendorResponseItem } from './vendor-response-item';
import { PaymentDetailsCard } from './payment-details-card';
import { InstallmentPlanCard } from './installment-plan-card';
import { RefundsCard } from './refunds-card';
import { DeliveryInfoCard } from './delivery-info-card';
import { OrderNotesCard } from './order-notes-card';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export const OrderDetailsView = () => {
  const [fetchedVendors, setFetchedVendors] = useState<Record<string, any>>({});
  const [openItems, setOpenItems] = useState<string[]>([]);
  const { fetchVendor } = useVendorStore();
  const { id: orderId } = useParams();
  const { data: session } = useSession();
  const tenantId = (session?.user as any)?.tenant_id;

  const order = useOrderStore((state) => state.order);
  const transaction = useOrderStore((state) => state.transaction);
  const loading = useOrderStore((state) => state.loading);
  const error = useOrderStore((state) => (state as any).error);
  const fetchOrder = useOrderStore((state) => state.fetchOrder);
  const fetchTransactionDetails = useOrderStore((state) => state.fetchTransactionDetails);
  const clearStore = useOrderStore((state) => state.clearStore);

  const transactionId = order?.payment_details.transaction_id;

  useEffect(() => {
    if (orderId && tenantId) {
      fetchOrder(orderId as string, { 'X-Tenant-ID': tenantId });
    }

    return () => {
      clearStore();
    };
  }, [orderId, tenantId, fetchOrder, clearStore]);

  useEffect(() => {
    if (transactionId && tenantId) {
      fetchTransactionDetails(transactionId, {
        'X-Tenant-ID': tenantId,
      });
    }
  }, [transactionId, tenantId, fetchTransactionDetails]);

  if (loading && !order) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-full p-8">
         <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Order Not Found</AlertTitle>
          <AlertDescription>The requested order could not be found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasPlan = !!order.plan;
  const hasRefunds = order.refunds && order.refunds.length > 0;

  const tabList = [
    { value: 'overview', label: 'Overview' },
    { value: 'payment', label: 'Payment & Installments' },
  ];

  const handleAccordionChange = async (value: string) => {
    const isOpen = openItems.includes(value);
    if (isOpen) {
      setOpenItems(openItems.filter(item => item !== value));
      return;
    }

    setOpenItems([...openItems, value]);
    const itemIndex = parseInt(value);
    const item = order.items[itemIndex];
    
    if (item && item.vendor_id && !fetchedVendors[item.vendor_id]) {
      try {
        const vendorData = await fetchVendor(item.vendor_id);
        setFetchedVendors(prev => ({
          ...prev,
          [item.vendor_id]: vendorData
        }));
      } catch (error) {
      }
    }
  };


  return (
    <div className="flex flex-col h-full bg-muted/40">
      <OrderHeader order={order} />
      <main className="grid flex-1 items-start gap-4 p-4 md:gap-6 lg:grid-cols-3 xl:grid-cols-3">
        <div className="grid auto-rows-max items-start gap-4 md:gap-6 lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList className={`grid w-full grid-cols-${tabList.length}`}>
              {tabList.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="overview">
              <div className="space-y-6">
                <OrderNotesCard order={order} />
                <Card className="overflow-hidden border-none shadow-lg">
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2">
                      <span>Order Items</span>
                      <span className="text-sm font-normal text-muted-foreground">({order.items.length} items)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-center">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.items.map((item, index) => {
                          const vendorResponse = order.vendor_responses?.[item.vendor_id];
                          const vendor = fetchedVendors[item.vendor_id, {headers: {'X-Tenant-ID': tenantId}}];
                          const isOpen = openItems.includes(String(index));
                          return (
                            <React.Fragment key={item.item_id}>
                              <OrderItemsCard 
                                order={order} 
                                itemIndex={index} 
                                onRowClick={() => handleAccordionChange(String(index))}
                                isExpanded={isOpen}
                              />
                              {isOpen && (
                                <TableRow>
                                  <TableCell colSpan={6} className="bg-muted/30 p-4">
                                    {vendorResponse ? (
                                      <VendorResponseItem
                                        vendorId={item.vendor_id}
                                        response={vendorResponse}
                                        vendor={vendor}
                                        isLoading={!vendor}
                                      />
                                    ) : (
                                      <div className="rounded-lg bg-background/50 p-4 text-sm text-muted-foreground">
                                        No vendor response available for this item.
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                {hasRefunds && <RefundsCard order={order} />}
              </div>
            </TabsContent>
            <TabsContent value="payment">
              <div className="space-y-4">
                <PaymentDetailsCard order={order} transaction={transaction} />
                {hasPlan && <InstallmentPlanCard plan={order.plan!} />}
              </div>
            </TabsContent>

          </Tabs>
        </div>
        <div className="grid auto-rows-max items-start gap-4 md:gap-6 lg:col-span-1">
          <OrderSummaryCard order={order} />
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Customer Details</h3>
                <CustomerInfoCard order={order} />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Shipping Information</h3>
                <ShippingInfoCard order={order} />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Delivery Status</h3>
                <DeliveryInfoCard order={order} />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};
