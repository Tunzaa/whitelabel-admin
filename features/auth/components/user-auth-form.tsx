"use client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { api } from "@/lib/core";

const formSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address" }),
  password: z.string({
    required_error: "Password is required",
  }),
});

type UserFormValue = z.infer<typeof formSchema>;

export default function UserAuthForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [loading, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const defaultValues = {
    email: "",
    password: "",
  };
  const form = useForm<UserFormValue>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Using NextAuth for authentication instead of direct API calls
  const [authError, setAuthError] = useState<string | null>(null);

  // Watch for auth error changes
  useEffect(() => {
    if (authError) {
      toast.error(authError);
    }
  }, [authError]);

  // Get the session data to detect changes
  const { data: session } = useSession();

  // Synchronize tokens when session changes
  useEffect(() => {
    // Check for session and attempt to extract tokens
    if (session) {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("Session detected, checking for tokens");
        // @ts-ignore - NextAuth custom session type includes accessToken
        const accessToken = session.accessToken;
        // @ts-ignore - Our custom user type includes token for refresh token
        const refreshToken = session.user?.token;

        if (accessToken) {
          localStorage.setItem("token", accessToken);
          console.log("Token set from session");
        }

        if (refreshToken) {
          localStorage.setItem("refresh_token", refreshToken);
          console.log("Refresh token set from session");
        }
      }
    }
  }, [session]);

  const onSubmit = async (data: UserFormValue) => {
    startTransition(async () => {
      try {
        // First authenticate directly with our API to get tokens
        let apiAuthSuccess = false;
        try {
          const apiAuthResult = await api.auth.login(data.email, data.password);

          // Store tokens directly in localStorage
          if (apiAuthResult.access_token) {
            localStorage.setItem("token", apiAuthResult.access_token);
            localStorage.setItem("refresh_token", apiAuthResult.refresh_token);
            apiAuthSuccess = true;
          }
        } catch (apiError) {
          setAuthError("Invalid credentials");
          toast.error("Invalid credentials");
          return;
        }

        // If API auth succeeded, still need NextAuth for middleware authentication
        if (apiAuthSuccess) {
          // Now proceed with NextAuth to set up the session for middleware
          const result = await signIn("credentials", {
            email: data.email,
            password: data.password,
            callbackUrl: callbackUrl ?? "/dashboard",
            redirect: false,
          });

          if (result?.ok || !result?.error) {
            toast.success("Signed in successfully");

            const redirectUrl = callbackUrl ?? "/dashboard";

            // Use window.location.href for more reliable redirect
            window.location.href = redirectUrl;
          } else {
            // Still redirect since API auth worked
            toast.success("Signed in successfully");
            window.location.href = callbackUrl ?? "/dashboard";
          }
          return;
        }

        // Only try NextAuth if direct API failed
        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          callbackUrl: callbackUrl ?? "/dashboard",
          redirect: false,
        });

        if (result?.error) {
          setAuthError(result.error);
          toast.error(result.error);
        } else if (result?.ok) {
          toast.success("Signed in successfully");
          router.push(callbackUrl ?? "/dashboard");
        }
      } catch (error: any) {
        const errorMessage = error.message || "Authentication failed";
        setAuthError(errorMessage);
        toast.error(errorMessage);
      }
    });
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full space-y-6"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">
                  Email Address
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      disabled={loading}
                      className="pl-10 h-12"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-sm font-medium">
                    Password
                  </FormLabel>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => router.push("/password-reset")}
                  >
                    Forgot password?
                  </button>
                </div>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      disabled={loading}
                      className="pl-10 pr-10 h-12"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 w-4 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            disabled={loading}
            className="w-full h-12 text-sm font-semibold mt-8"
            type="submit"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </Form>
      {/* <div className='relative'>
        <div className='absolute inset-0 flex items-center'>
          <span className='w-full border-t' />
        </div>
        <div className='relative flex justify-center text-xs uppercase'>
          <span className='bg-background px-2 text-muted-foreground'>
            Or continue with
          </span>
        </div>
      </div>
      <GithubSignInButton /> */}
    </>
  );
}
