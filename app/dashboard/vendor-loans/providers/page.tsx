"use client";

import { Suspense } from 'react';

import { PageHeader } from '@/components/page-header';
import { LoanProvidersContent } from '@/features/loans/providers/components/providers-content';
import { LoadingPage } from '@/components/loading-page';
import { withAuthorization } from '@/components/auth/with-authorization';

function LoanProvidersPage() {
  return (
    <div className="">
      <Suspense fallback={<LoadingPage />}>
        <LoanProvidersContent />
      </Suspense>
    </div>
  );
}

export default withAuthorization(LoanProvidersPage, { permission: "vendor-loans:read" });
