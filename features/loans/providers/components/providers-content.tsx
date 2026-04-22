'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { ErrorCard } from '@/components/ui/error-card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusIcon, Search, RefreshCw } from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import { Can } from '@/components/auth/can';

import { ProviderTable } from './provider-table';
import { ProviderForm } from './provider-form';
import { useLoanProviderStore } from '../store';
import { useSelectedTenantStore } from '@/features/tenants/store';
import { LoanProvider } from '../types';

export function LoanProvidersContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const { selectedTenantId } = useSelectedTenantStore();
  const tenantId = selectedTenantId || (session?.user as any)?.tenant_id || "";
  const userId = (session?.user as any)?.id || (session?.user as any)?.user_id || "";
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<LoanProvider | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('all');
  const [isTabLoading, setIsTabLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 10;
  const isFetchingRef = useRef(false);
  
  const {
    providers,
    loading,
    storeError,
    createProvider,
    updateProvider,
    deleteProvider,
    fetchProviders,
    setStoreError,
  } = useLoanProviderStore();

  // Define tenant headers
  const tenantHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }
    return headers;
  }, [tenantId]);

  // Define filter based on active tab
  const getFilters = () => {
    const baseFilter = {
      skip: (currentPage - 1) * pageSize,
      limit: pageSize,
    };

    // Add filter based on the active tab
    let finalFilter = baseFilter;
    switch (activeTab) {
      case "active":
        finalFilter = {
          ...baseFilter,
          is_active: true,
        };
        break;
      case "inactive":
        finalFilter = {
          ...baseFilter,
          is_active: false,
        };
        break;
      default:
        finalFilter = baseFilter;
    }

    console.log('[Loan Providers] getFilters returning:', finalFilter, 'for tab:', activeTab);
    return finalFilter;
  };

  // Function to load providers
  const loadProviders = async (showLoadingState = true) => {
    if (isFetchingRef.current) {
      console.log('[Loan Providers] Already fetching, skipping duplicate call');
      return;
    }

    try {
      isFetchingRef.current = true;
      if (showLoadingState) {
        setIsTabLoading(true);
      }
      setStoreError(null);
      const filters = getFilters();
      console.log('[Loan Providers] Fetching with filters:', filters);
      // Clear previous providers before making a new search
      if (searchTerm) {
        setProviders(null);
      }
      const result = await fetchProviders(
        {
          ...filters,
          search: searchTerm,
        },
        tenantHeaders,
      );
      console.log('[Loan Providers] Fetch result:', result);
      // If result is empty and we have a search term, ensure providers are cleared
      if (searchTerm && (!result || result.items.length === 0)) {
        setProviders([]);
      }
    } catch (error) {
      console.error('[Loan Providers] Fetch error:', error);
      // Always set empty providers array for 404 errors (no providers found)
      if (
        error instanceof Error &&
        ((error.message.includes('404') &&
          error.message.includes('No providers found')) ||
          error.message.includes('not found') ||
          error.message.includes('404'))
      ) {
        setProviders([]);
        setStoreError(null);
      } else {
        // For other errors, set the error
        setStoreError(
          error instanceof Error ? error : new Error('Failed to load providers'),
        );
      }
    } finally {
      isFetchingRef.current = false;
      if (showLoadingState) {
        setIsTabLoading(false);
      }
    }
  };

  // Effect for loading providers on initial page load
  useEffect(() => {
    if (tenantId) {
      loadProviders();
    }
  }, [tenantId]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Only update searchTerm if searchQuery has at least 3 characters or is empty
      if (searchQuery.length >= 3 || searchQuery.length === 0) {
        setSearchTerm(searchQuery);
        setCurrentPage(1); // Reset to first page when search term changes
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Effect for filter changes
  useEffect(() => {
    if (tenantId) {
      loadProviders();
    }
  }, [tenantId, activeTab, currentPage, searchTerm]);

  // Filter providers based on search query (client-side fallback)
  const filteredProviders = useMemo(() => {
    if (!searchTerm) {
      return providers?.items || [];
    }
    return (providers?.items || []).filter(
      (provider) =>
        (provider.business_name &&
          provider.business_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (provider.contact_email &&
          provider.contact_email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [providers?.items, searchTerm]);

  console.log('[Loan Providers] Current state:', {
    providers,
    filteredProviders,
    loading,
    isTabLoading,
    storeError,
  });

  const handleAddProvider = async (values: any) => {
    try {
      await createProvider(values, tenantHeaders);
      setIsAddDialogOpen(false);
      toast.success('Provider created successfully');
      await loadProviders();
    } catch (err) {
      toast.error('Failed to create provider');
    }
  };

  const handleEditProvider = async (values: any) => {
    if (currentProvider) {
      try {
        await updateProvider(currentProvider.provider_id, values, tenantHeaders);
        setIsEditDialogOpen(false);
        setCurrentProvider(null);
        toast.success('Provider updated successfully');
        await loadProviders();
      } catch (err) {
        toast.error('Failed to update provider');
      }
    }
  };

  const handleDeleteProvider = async (id: string) => {
    try {
      await deleteProvider(id, tenantHeaders);
      toast.success('Provider deleted successfully');
      await loadProviders();
    } catch (err) {
      toast.error('Failed to delete provider');
    }
  };

  const handleEditClick = (provider: LoanProvider) => {
    setCurrentProvider(provider);
    setIsEditDialogOpen(true);
  };

  const handleTabChange = (value: string) => {
    console.log('[Loan Providers] Tab changing to:', value);
    setActiveTab(value);
    setCurrentPage(1);
  };

  if (loading && !providers?.items?.length && !isTabLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Loan Providers</h1>
            <p className="text-muted-foreground">
              Manage loan providers for your organization
            </p>
          </div>
        </div>
        <Spinner />
      </div>
    );
  }

  if (storeError && !providers?.items?.length && !isTabLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Loan Providers</h1>
            <p className="text-muted-foreground">
              Manage loan providers for your organization
            </p>
          </div>
        </div>
        <div className="p-4">
          <ErrorCard
            title="Failed to load providers"
            error={{
              status: storeError.status?.toString() || 'Error',
              message: storeError.message || 'An unexpected error occurred.',
            }}
            buttonText="Retry"
            buttonAction={() => loadProviders()}
            buttonIcon={RefreshCw}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loan Providers</h1>
          <p className="text-muted-foreground">
            Manage loan providers for your organization
          </p>
        </div>
        <Can permission="vendor-loans:create">
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-1"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Provider</span>
          </Button>
        </Can>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between mb-4">
          <div className="relative w-[300px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadProviders(false)}
                title="Refresh providers"
                className="relative"
              >
                <RefreshCw />
              </Button>
              <Input
                type="search"
                placeholder="Search providers..."
                className="w-[250px] pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all">All Providers</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>

          {isTabLoading ? (
            <Spinner />
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Loan Providers</CardTitle>
              </CardHeader>
              <CardContent>
                <ProviderTable 
                  providers={filteredProviders} 
                  onEdit={handleEditClick}
                  onView={(provider) => router.push(`/dashboard/vendor-loans/providers/${provider.provider_id}`)}
                />
              </CardContent>
            </Card>
          )}
        </Tabs>
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={providers?.total || 0}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      {/* Add Provider Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Provider</DialogTitle>
            <DialogDescription>
              Enter the details of the new loan provider below.
            </DialogDescription>
          </DialogHeader>
          <ProviderForm 
            initialData={{
              tenant_id: tenantId,
              user_id: userId,
              business_name: '',
              description: '',
              contact_email: '',
              contact_phone: '',
              is_active: true,
              website: '',
              address: '',
            }}
            onSubmit={handleAddProvider}
            isSubmitting={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Provider Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Provider</DialogTitle>
            <DialogDescription>
              Update the provider information below.
            </DialogDescription>
          </DialogHeader>
          {currentProvider && (
            <ProviderForm 
              initialData={currentProvider}
              onSubmit={handleEditProvider}
              isSubmitting={loading}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
