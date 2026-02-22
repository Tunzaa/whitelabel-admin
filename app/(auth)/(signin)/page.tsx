import { Metadata } from "next";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components/login-form";
import { GalleryVerticalEnd } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle/theme-toggle";
import ThemeProvider from "@/components/ThemeToggle/theme-provider";

export const metadata: Metadata = {
  title: "Authentication | Sign In",
  description: "Sign In page for authentication.",
};

export default async function Page() {
  let stars = 3000; // Default value

  //lets check for session here

  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  try {
    const response = await fetch(
      "https://api.github.com/repos/kiranism/next-shadcn-dashboard-starter",
      {
        next: { revalidate: 3600 },
      }
    );

    if (response.ok) {
      const data = await response.json();
      stars = data.stargazers_count || stars; // Update stars if API response is valid
    }
  } catch (error) {
  }
  return (
    <ThemeProvider>
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
        {/* Theme switcher positioned at top right */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="flex w-full max-w-sm flex-col gap-6">
          <a href="#" className="flex items-center gap-2 self-center font-medium">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-4" />
            </div>
            Marketplace
          </a>
          <LoginForm />
        </div>
      </div>
    </ThemeProvider>
  );
}
