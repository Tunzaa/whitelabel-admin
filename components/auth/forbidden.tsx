"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ShieldAlert, Package } from "lucide-react";

interface ForbiddenProps {
  reason?: "permission" | "module";
  moduleName?: string;
}

const Forbidden: React.FC<ForbiddenProps> = ({ reason = "permission", moduleName }) => {
  const router = useRouter();

  const isModule = reason === "module";

  return (
    <div className="flex flex-col items-center justify-center h-full bg-background text-foreground p-4">
      {isModule ? (
        <Package className="w-16 h-16 text-orange-500 mb-4" />
      ) : (
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
      )}
      <h1 className="text-4xl font-bold mb-2">
        {isModule ? "Module Not Available" : "403 - Access Denied"}
      </h1>
      <p className="text-lg text-muted-foreground mb-6 text-center max-w-md">
        {isModule
          ? `The ${moduleName || "requested"} module is not enabled for your Marketplace.`
          : "You do not have the required permissions to view this page."
        }
      </p>
      <Button onClick={() => router.back()}>Go Back</Button>
    </div>
  );
};

export default Forbidden;
