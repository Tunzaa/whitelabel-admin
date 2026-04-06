import { Suspense, use } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/page-header';
import { LoadingPage } from '@/components/loading-page';
import { ProviderEditContent } from '@/features/loans/providers/components/provider-edit-content';

export const metadata: Metadata = {
  title: 'Edit Loan Provider | Marketplace Dashboard',
  description: 'Edit loan provider details',
};

interface ProviderEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ProviderEditPage(props: ProviderEditPageProps) {
  const params = use(props.params);
  const { id } = params;
  
  if (!id) {
    return notFound();
  }
  
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <PageHeader
        title="Edit Provider"
        description="Update loan provider details"
      />
      
      <Suspense fallback={<LoadingPage />}>
        <ProviderEditContent providerId={id} />
      </Suspense>
    </div>
  );
}
