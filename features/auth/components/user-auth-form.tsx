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
import { AccountSelectionModal, UserAccount } from "./account-selection-modal";

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

  // Multi-account selection state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState<UserAccount[]>([]);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);

  // Synchronize tokens when session changes
  useEffect(() => {
    // Check for session and attempt to extract tokens
    if (session) {
      const token = localStorage.getItem("token");
      if (!token) {
        // @ts-ignore - NextAuth custom session type includes accessToken
        const accessToken = session.accessToken;
        // @ts-ignore - Our custom user type includes token for refresh token
        const refreshToken = session.user?.token;

        if (accessToken) {
          localStorage.setItem("token", accessToken);
        }

        if (refreshToken) {
          localStorage.setItem("refresh_token", refreshToken);
        }
      }
    }
  }, [session]);

  // Handle multi-account selection
  const handleAccountSelect = async (account: UserAccount) => {
    try {
      // Set tokens for the selected account
      localStorage.setItem("token", account.access_token);
      localStorage.setItem("refresh_token", account.refresh_token);

      // Close the modal
      setShowAccountModal(false);

      // Now proceed with NextAuth to set up the session for middleware
      // We use the stored credentials since the authorize function needs them
      if (pendingCredentials) {
        const result = await signIn("credentials", {
          email: pendingCredentials.email,
          password: pendingCredentials.password,
          selectedUserId: account.user_id, // Pass selected user ID
          callbackUrl: callbackUrl ?? "/dashboard",
          redirect: false,
        });

        if (result?.ok || !result?.error) {
          toast.success(`Signed in as ${account.first_name} ${account.last_name}`);
          window.location.href = callbackUrl ?? "/dashboard";
        } else {
          toast.success(`Signed in as ${account.first_name} ${account.last_name}`);
          window.location.href = callbackUrl ?? "/dashboard";
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to sign in with selected account";
      toast.error(errorMessage);
      throw error;
    }
  };

  const onSubmit = async (data: UserFormValue) => {
    startTransition(async () => {
      try {
        // First authenticate directly with our API to get tokens
        let apiAuthResult: any;
        try {
          apiAuthResult = await api.auth.login(data.email, data.password);
        } catch (apiError) {
          setAuthError("Invalid credentials");
          toast.error("Invalid credentials");
          return;
        }

        // Handle multi-user response
        if (apiAuthResult.users && Array.isArray(apiAuthResult.users)) {
          const privilegedRoles = ["admin", "super", "loan_provider"];

          // Filter users that have at least one privileged role
          const privilegedUsers = apiAuthResult.users.filter((user: any) => {
            const userRoles: string[] = [];
            // Add from roles array
            user.roles?.forEach((r: any) => r?.role && userRoles.push(r.role.toLowerCase()));
            // Add from profiles
            user.profiles?.forEach((p: any) => p?.role && userRoles.push(p.role.toLowerCase()));
            // Add active profile role
            if (user.active_profile_role) userRoles.push(user.active_profile_role.toLowerCase());

            return userRoles.some(role => privilegedRoles.includes(role));
          });

          // If multiple privileged users, show selection modal
          if (privilegedUsers.length > 1) {
            setPendingCredentials({ email: data.email, password: data.password });
            setAvailableAccounts(privilegedUsers);
            setShowAccountModal(true);
            return;
          }

          // If exactly 1 privileged user, auto-select it
          if (privilegedUsers.length === 1) {
            const userData = privilegedUsers[0];
            // Set tokens for the privileged user
            localStorage.setItem("token", userData.access_token);
            localStorage.setItem("refresh_token", userData.refresh_token);

            // Proceed with NextAuth for the privileged user
            const result = await signIn("credentials", {
              email: data.email,
              password: data.password,
              selectedUserId: userData.user_id,
              callbackUrl: callbackUrl ?? "/dashboard",
              redirect: false,
            });

            if (result?.ok || !result?.error) {
              toast.success("Signed in successfully");
              window.location.href = callbackUrl ?? "/dashboard";
            } else {
              toast.success("Signed in successfully");
              window.location.href = callbackUrl ?? "/dashboard";
            }
            return;
          }

          // No privileged users found - show error, don't allow login
          setAuthError("No authorized accounts found. Only admin, super, and loan_provider roles can access this system.");
          toast.error("No authorized accounts found. Only admin, super, and loan_provider roles can access this system.");
          return;
        }

        // Handle single user case - could be in users array with 1 item or direct response
        const userData = apiAuthResult.users?.[0] || apiAuthResult;

        // Check if single user has privileged role
        const privilegedRoles = ["admin", "super", "loan_provider"];
        const userRoles: string[] = [];
        userData.roles?.forEach((r: any) => r?.role && userRoles.push(r.role.toLowerCase()));
        userData.profiles?.forEach((p: any) => p?.role && userRoles.push(p.role.toLowerCase()));
        if (userData.active_profile_role) userRoles.push(userData.active_profile_role.toLowerCase());

        const hasPrivilegedRole = userRoles.some(role => privilegedRoles.includes(role));

        if (!hasPrivilegedRole) {
          setAuthError("Access denied. Only admin, super, and loan_provider roles can access this system.");
          toast.error("Access denied. Only admin, super, and loan_provider roles can access this system.");
          return;
        }

        // Store tokens directly in localStorage
        if (userData.access_token) {
          localStorage.setItem("token", userData.access_token);
          localStorage.setItem("refresh_token", userData.refresh_token);
        }

        // Now proceed with NextAuth to set up the session for middleware
        const result = await signIn("credentials", {
          email: data.email,
          password: data.password,
          callbackUrl: callbackUrl ?? "/dashboard",
          redirect: false,
        });

        if (result?.ok || !result?.error) {
          toast.success("Signed in successfully");
          window.location.href = callbackUrl ?? "/dashboard";
        } else {
          toast.success("Signed in successfully");
          window.location.href = callbackUrl ?? "/dashboard";
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

      {/* Account Selection Modal for Multi-User Login */}
      <AccountSelectionModal
        isOpen={showAccountModal}
        onClose={() => {
          setShowAccountModal(false);
          setPendingCredentials(null);
        }}
        accounts={availableAccounts}
        onSelectAccount={handleAccountSelect}
      />
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
