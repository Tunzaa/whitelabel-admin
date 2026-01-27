"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  ArrowLeft, Edit, Banknote, Percent, Calendar, Clock,
  CreditCard, Check, X, ExternalLink, Star, ChevronsUpDown,
  BarChart4, FileText, Building, Tag, Calculator, Settings,
  Coins, Target, Users, Wallet, Globe,
  Mail, Phone
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { VerificationDocumentManager } from "@/components/ui/verification-document-manager";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { useLoanProductStore } from "@/features/loans/products/store";
import { useLoanProviderStore } from "@/features/loans/providers/store";
import { generateMockLoanProducts } from "@/features/loans/products/data/mock-data";
import { generateMockLoanProviders } from "@/features/loans/providers/data/mock-data";
import { LoanProduct } from "@/features/loans/products/types";
import { LoanProvider } from "@/features/loans/providers/types";
import { compactCurrency } from "@/lib/utils";


interface LoanProductDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function LoanProductDetailPage(props: LoanProductDetailPageProps) {
  const params = use(props.params) as { id: string };
  const { id } = params;
  const router = useRouter();
  const session = useSession();
  // Get tenant ID safely
  const tenantId = session?.data?.user ? (session.data.user as any).tenant_id : undefined;

  // Skip the store for now and use local state directly
  const [product, setProduct] = useState<LoanProduct | null>(null);
  const [provider, setProvider] = useState<LoanProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [productError, setProductError] = useState<any>(null);
  const [providerLoading, setProviderLoading] = useState(false);

  // Get the store functions we still need
  const { updateProductStatus } = useLoanProductStore();
  // Not using store fetchProvider anymore

  // Define tenant headers
  const tenantHeaders = {
    'X-Tenant-ID': tenantId || ''
  };

  // Super simple data loading approach
  useEffect(() => {
    console.log('[DEBUG] Starting data load process, id:', id);

    // Immediately set loading to true
    setLoading(true);

    // Hardcoded timeout to ensure we can debug the issue
    setTimeout(() => {
      try {
        console.log('[DEBUG] Mock data load timer triggered');

        // Use mock data directly
        const mockProducts = generateMockLoanProducts();
        console.log('[DEBUG] Mock products:', mockProducts.length);

        const foundProduct = mockProducts.find(p => p.product_id === id);
        console.log('[DEBUG] Found product?', !!foundProduct);

        if (foundProduct) {
          setProduct(foundProduct);

          // If product has provider_id, get provider data
          if (foundProduct.provider_id) {
            const mockProviders = generateMockLoanProviders();
            const providerData = mockProviders.find(p => p.provider_id === foundProduct.provider_id);
            if (providerData) {
              setProvider(providerData);
            }
          }
        } else {
          setProductError({
            message: 'Loan product not found',
            status: 404
          });
        }
      } catch (error) {
        console.error('[DEBUG] Error in timeout handler:', error);
        setProductError({
          message: 'Failed to load loan product data',
          status: 'error'
        });
      } finally {
        // ALWAYS set loading to false, no matter what happened
        console.log('[DEBUG] Setting loading to false');
        setLoading(false);
      }
    }, 500); // Small timeout to ensure component is fully mounted

    // Cleanup function
    return () => {
      console.log('[DEBUG] Component unmounting');
    };
  }, [id]); // Only depend on the ID

  const handleStatusChange = async (isActive: boolean) => {
    try {
      toast.loading(`${isActive ? 'Activating' : 'Deactivating'} product?...`);
      await updateProductStatus(id, isActive, tenantHeaders);

      // After updating, reload the data directly
      const mockProducts = generateMockLoanProducts();
      const updatedProduct = mockProducts.find(p => p.product_id === id);
      if (updatedProduct) {
        setProduct(updatedProduct);
      }

      toast.success(`Product ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error(`Failed to ${isActive ? 'activate' : 'deactivate'} product`);
    }
  };

  const formatFrequency = (frequency: string) => {
    if (!frequency) return "Not set";
    return frequency.charAt(0).toUpperCase() + frequency.slice(1).replace("_", " ");
  };

  // Calculate monthly payment for a loan
  const calculateMonthlyPayment = (principal: string | number, interestRate: string | number, termMonths: number) => {
    const p = parseFloat(principal.toString());
    const r = parseFloat(interestRate.toString()) / 100 / 12; // Monthly interest rate
    const n = termMonths;

    // Monthly payment formula: P * (r * (1 + r)^n) / ((1 + r)^n - 1)
    if (r === 0) return p / n; // If interest rate is 0, just divide principal by term

    const monthlyPayment = p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return monthlyPayment;
  };

  // Calculate total interest paid over the life of the loan
  const calculateTotalInterest = (principal: string | number, interestRate: string | number, termMonths: number) => {
    const p = parseFloat(principal.toString());
    const monthlyPayment = calculateMonthlyPayment(p, interestRate, termMonths);
    const totalPayment = monthlyPayment * termMonths;
    return totalPayment - p;
  };

  if (loading && !product) {
    return (
      <Spinner />
    );
  }

  if (productError && !product && !loading) {
    return (
      <ErrorCard
        title="Error Loading Loan Product"
        error={{
          message: productError?.message || "Failed to load loan product",
          status: productError?.status ? String(productError.status) : "error"
        }}
        buttonText="Back to Products"
        buttonAction={() => router.push("/dashboard/vendor-loans/products")}
        buttonIcon={ArrowLeft}
      />
    );
  }

  const formatDateDisplay = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";
    return format(new Date(dateString), "MMMM d, yyyy");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/vendor-loans/products")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>

          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback style={{ backgroundColor: "#6366f1" }} className="text-white">
                <Banknote className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>

            <div>
              <h1 className="text-2xl font-bold tracking-tight">{product?.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge
                  variant={product?.is_active ? "default" : "destructive"}
                  className={product?.is_active ? "bg-green-500 hover:bg-green-600 px-2 py-1" : "px-2 py-1"}
                >
                  {product?.is_active ? "Active" : "Inactive"}
                </Badge>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created: {formatDateDisplay(product?.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/vendor-loans/products/${id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 overflow-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
          {/* Main Content - 5 columns */}
          <div className="md:col-span-5 space-y-6">
            {/* Overview Card */}
            <Card className="overflow-hidden border-2 border-primary/10">
              <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-primary" />
                    <CardTitle>Loan Product Overview</CardTitle>
                  </div>
                  <Badge
                    variant={product?.is_active ? "default" : "secondary"}
                    className={product?.is_active ? "bg-green-500 hover:bg-green-600" : ""}
                  >
                    {product?.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>
                  Key details and metrics for this loan product
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Description */}
                  <div className="bg-muted/20 p-4 rounded-lg border border-muted shadow-sm">
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Product Description
                    </h3>
                    <p className="text-sm leading-relaxed">{product?.description || "No description provided."}</p>
                  </div>

                  {/* Key Metrics */}
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <BarChart4 className="h-4 w-4 text-primary" />
                      Key Metrics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border border-primary/20 shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-white to-primary/5">
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="bg-primary/10 p-2 rounded-full">
                                  <Percent className="h-4 w-4 text-primary" />
                                </div>
                                <p className="text-sm font-medium">Interest Rate</p>
                              </div>
                              <Badge variant="outline" className="bg-primary/5">{product?.interest_rate}%</Badge>
                            </div>
                            <p className="text-3xl font-bold text-primary">{product?.interest_rate}%</p>
                            <p className="text-xs text-muted-foreground">Annual percentage rate (APR)</p>

                            {product?.interest_rate && product?.term_options?.[0] && (
                              <div className="mt-2 pt-2 border-t border-dashed border-muted">
                                <p className="text-xs text-muted-foreground">
                                  {calculateTotalInterest(10000, product.interest_rate, product.term_options[0]) > 0 ?
                                    `~${compactCurrency(calculateTotalInterest(10000, product.interest_rate, product.term_options[0]))} interest on $10k/${product.term_options[0]}mo` :
                                    'Interest calculation not available'}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border border-primary/20 shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-white to-primary/5">
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="bg-primary/10 p-2 rounded-full">
                                  <Banknote className="h-4 w-4 text-primary" />
                                </div>
                                <p className="text-sm font-medium">Amount Range</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">Min</p>
                                <p className="text-lg font-semibold">{compactCurrency(product?.min_amount)}</p>
                              </div>
                              <div className="text-center">
                                <span className="text-muted-foreground">—</span>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Max</p>
                                <p className="text-lg font-semibold">{compactCurrency(product?.max_amount)}</p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Loan amount boundaries</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border border-primary/20 shadow-sm hover:shadow-md transition-shadow duration-200 bg-gradient-to-br from-white to-primary/5">
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="bg-primary/10 p-2 rounded-full">
                                  <Clock className="h-4 w-4 text-primary" />
                                </div>
                                <p className="text-sm font-medium">Payment Details</p>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-xs text-muted-foreground">Frequency:</p>
                                <Badge variant="outline" className="capitalize bg-primary/5">
                                  {formatFrequency(product?.payment_frequency)}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center">
                                <p className="text-xs text-muted-foreground">Term Options:</p>
                                <div className="flex flex-wrap gap-1 justify-end">
                                  {product?.term_options?.slice(0, 3).map((term, index) => (
                                    <Badge key={index} variant="outline" className="text-xs px-1 py-0 h-5">
                                      {term}m
                                    </Badge>
                                  ))}
                                  {product?.term_options && product.term_options.length > 3 && (
                                    <Badge variant="outline" className="text-xs px-1 py-0 h-5">
                                      +{product.term_options.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Payment structure details</p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loan Terms Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Loan Terms</CardTitle>
                    <CardDescription>Detailed loan terms and conditions</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" /> Term Options
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {product?.term_options.map((term, index) => (
                          <Badge key={index} variant="outline" className="capitalize">
                            {term} {term === 1 ? 'month' : 'months'}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Commented out late_fee since it's not in the LoanProduct type */
                    /*{product?.late_fee && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                          <Banknote className="h-4 w-4" /> Late Payment Fee
                        </p>
                        <p className="text-sm">{compactCurrency(product?.late_fee)}</p>
                      </div>
                    )}*/}
                  </div>

                  <div className="space-y-4">
                    {product?.processing_fee && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                          <CreditCard className="h-4 w-4" /> Processing Fee
                        </p>
                        <p className="text-sm">{compactCurrency(product?.processing_fee)}</p>
                      </div>
                    )}

                    {/* Commented out early_repayment_fee since it's not in the LoanProduct type */
                    /*{product?.early_repayment_fee && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium flex items-center gap-1 text-muted-foreground">
                          <Banknote className="h-4 w-4" /> Early Repayment Fee
                        </p>
                        <p className="text-sm">{compactCurrency(product?.early_repayment_fee)}</p>
                      </div>
                    )}*/}
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Eligibility Criteria</p>
                  <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                    <li>Minimum age requirement: 18 years</li>
                    <li>Valid identification document</li>
                    <li>Proof of income or employment</li>
                    <li>No active bankruptcies or defaults</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 2 columns */}
          <div className="md:col-span-2 space-y-6">
            {/* Provider Information */}
            <Card>
              <CardHeader>
                <CardTitle>Provider Information</CardTitle>
              </CardHeader>

              <CardContent>
                {providerLoading ? (
                  <div className="flex justify-center py-4">
                    <Spinner />
                  </div>
                ) : provider ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback style={{ backgroundColor: "#4f46e5" }}>
                          {provider?.name ? provider.name.substring(0, 2).toUpperCase() : 'LP'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{provider?.name || 'Unknown Provider'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {provider?.is_active ? "Active Provider" : "Inactive Provider"}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      {provider?.contact_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${provider.contact_email || ''}`} className="text-sm hover:underline">
                            {provider.contact_email || 'No email provided'}
                          </a>
                        </div>
                      )}

                      {provider?.contact_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${provider.contact_phone || ''}`} className="text-sm hover:underline">
                            {provider.contact_phone || 'No phone provided'}
                          </a>
                        </div>
                      )}

                      {provider?.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm hover:underline flex items-center gap-1"
                          >
                            {provider.website.replace(/^https?:\/\//, '')}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Provider information not available</p>
                  </div>
                )}
              </CardContent>

              {provider?.provider_id && (
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push(`/dashboard/vendor-loans/providers/${provider.provider_id}`)}
                  >
                    <Building className="h-4 w-4 mr-2" />
                    View Provider
                  </Button>
                </CardFooter>
              )}
            </Card>

            {/* Product Status */}
            <Card>
              <CardHeader>
                <CardTitle>Product Status</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Current Status</p>
                  <Badge
                    className={`capitalize ${product?.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
                  >
                    {product?.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Created On</p>
                  <p className="text-sm">{formatDateDisplay(product?.created_at)}</p>
                </div>

                {product?.updated_at && product?.updated_at !== product?.created_at && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                    <p className="text-sm">{formatDateDisplay(product?.updated_at)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <Button
                  variant={product?.is_active ? "destructive" : "default"}
                  className="w-full"
                  onClick={() => handleStatusChange(!product?.is_active)}
                >
                  {product?.is_active ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Deactivate Product
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Activate Product
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/dashboard/vendor-loans/products/${id}/edit`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Product
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* If product has verification_documents, render VerificationDocumentManager */}
        {product?.verification_documents && (
          <VerificationDocumentManager
            documents={product.verification_documents}
            onApprove={handleDocumentApprove}
            onReject={handleDocumentReject}
            showActions={true}
          />
        )}
      </div>
    </div>
  );
}
