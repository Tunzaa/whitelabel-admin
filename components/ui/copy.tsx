"use client";

import * as React from "react";
import { Copy as CopyIcon, Check } from "lucide-react";
import { toast } from "sonner";

interface CopyProps extends React.HTMLAttributes<HTMLButtonElement> {
  text: string;
  size?: number;
  className?: string;
}

export function Copy({ text, size = 16, className, ...props }: CopyProps) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied!");
    } catch (error) {
      toast.error("Failed to copy text");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center justify-center hover:text-primary transition-colors ${className || ""}`}
      {...props}
    >
      {copied ? (
        <Check size={size} className="text-green-500" />
      ) : (
        <CopyIcon size={size} />
      )}
    </button>
  );
}