"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

const Forbidden: React.FC = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-full bg-background text-foreground p-4">
      <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
      <h1 className="text-4xl font-bold mb-2">403 - Access Denied</h1>
      <p className="text-lg text-muted-foreground mb-6">
        You do not have the required permissions to view this page.
      </p>
      <Button onClick={() => router.back()}>Go Back</Button>
    </div>
  );
};

export default Forbidden;
