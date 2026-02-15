"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface ErrorCardProps {
  title: string;
  description?: string;
  error?: { status: string; message: string };
  buttonText?: string;
  buttonAction?: () => void;
  buttonIcon?: React.ComponentType<{ className?: string }>;
  onRetry?: () => void;
}

export function ErrorCard({
  title,
  description,
  error,
  buttonText = "Retry",
  buttonAction,
  buttonIcon: Icon,
  onRetry,
}: ErrorCardProps) {
  const handleAction = buttonAction || onRetry;
  const message = description || error?.message;

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-destructive/5">
      <AlertCircle className="w-12 h-12 text-destructive mb-4" />
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      {message && <p className="text-muted-foreground mb-6 max-w-md">{message}</p>}
      {handleAction && (
        <Button variant="outline" onClick={handleAction}>
          {Icon && <Icon className="mr-2 h-4 w-4" />}
          {buttonText}
        </Button>
      )}
    </div>
  );
}
