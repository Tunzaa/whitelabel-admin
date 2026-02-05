"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useUserStore } from "../stores/user-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

const requestSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
  identifierType: z.enum(["email", "phone"]),
});

const confirmSchema = z
  .object({
    resetToken: z.string().length(6, "Reset code must be 6 digits"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RequestFormValues = z.infer<typeof requestSchema>;
type ConfirmFormValues = z.infer<typeof confirmSchema>;

export function PasswordResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetStep, setResetStep] = useState<"request" | "confirm">("request");
  const [identifier, setIdentifier] = useState("");
  const [identifierType, setIdentifierType] = useState<"email" | "phone">(
    "email",
  );
  const { requestPasswordReset, confirmPasswordReset } = useUserStore();

  const requestForm = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      identifier: "",
      identifierType: "email",
    },
  });

  const confirmForm = useForm<ConfirmFormValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: {
      resetToken: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleRequestSubmit = async (data: RequestFormValues) => {
    setIsSubmitting(true);
    try {
      const payload =
        data.identifierType === "email"
          ? { email: data.identifier }
          : { phone_number: data.identifier };

      await requestPasswordReset(payload);

      toast.success("Reset code sent successfully!");

      // Move to confirmation step
      setIdentifier(data.identifier);
      setIdentifierType(data.identifierType);
      setResetStep("confirm");
      setIsSubmitting(false);
    } catch (error: any) {
      console.error("Password reset request error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to send reset code. Please try again.";
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleConfirmSubmit = async (data: ConfirmFormValues) => {
    setIsSubmitting(true);
    try {
      const payload =
        identifierType === "email"
          ? {
              email: identifier,
              reset_token: data.resetToken,
              new_password: data.newPassword,
            }
          : {
              phone_number: identifier,
              reset_token: data.resetToken,
              new_password: data.newPassword,
            };

      await confirmPasswordReset(payload);

      toast.success("Password reset successfully!");

      // Redirect to signin page after successful reset
      setTimeout(() => {
        router.push("/signin");
      }, 2000);
    } catch (error: any) {
      console.error("Password reset confirmation error:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to reset password. Please try again.";
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleBackToRequest = () => {
    setResetStep("request");
    requestForm.reset();
    confirmForm.reset();
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            {resetStep === "request" ? "Reset Password" : "Confirm Reset Code"}
          </CardTitle>
          <CardDescription>
            {resetStep === "request"
              ? "Enter your email or phone number to receive a reset code"
              : `Enter the 6-digit code sent to ${identifierType === "email" ? "your email" : "your phone number"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {resetStep === "request" ? (
              <Form {...requestForm}>
                <form
                  onSubmit={requestForm.handleSubmit(handleRequestSubmit)}
                  className="space-y-4"
                >
                  <Tabs
                    value={requestForm.watch("identifierType")}
                    onValueChange={(value: "email" | "phone") =>
                      requestForm.setValue("identifierType", value)
                    }
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="email">
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </TabsTrigger>
                      <TabsTrigger value="phone">
                        <Phone className="h-4 w-4 mr-2" />
                        Phone
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="email" className="space-y-4">
                      <FormField
                        control={requestForm.control}
                        name="identifier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 w-4 text-muted-foreground" />
                                <Input
                                  type="email"
                                  placeholder="user@example.com"
                                  className="pl-10 h-12"
                                  disabled={isSubmitting}
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              A 6-digit reset code will be sent to this email
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    <TabsContent value="phone" className="space-y-4">
                      <FormField
                        control={requestForm.control}
                        name="identifier"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Phone className="absolute left-3 top-3 w-4 text-muted-foreground" />
                                <Input
                                  type="tel"
                                  placeholder="255712345678"
                                  className="pl-10 h-12"
                                  disabled={isSubmitting}
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              A 6-digit reset code will be sent via SMS
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 text-sm font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <KeyRound className="mr-2 h-4 w-4 animate-spin" />
                        Sending Reset Code...
                      </>
                    ) : (
                      <>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Send Reset Code
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...confirmForm}>
                <form
                  onSubmit={confirmForm.handleSubmit(handleConfirmSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={confirmForm.control}
                    name="resetToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reset Code</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter 6-digit code"
                            className="h-12 text-center text-lg font-mono"
                            disabled={isSubmitting}
                            maxLength={6}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the 6-digit code sent to {identifier}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={confirmForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <KeyRound className="absolute left-3 top-3 w-4 text-muted-foreground" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Enter new password"
                              className="pl-10 pr-10 h-12"
                              disabled={isSubmitting}
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
                        <FormDescription>
                          Password must be at least 8 characters long
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={confirmForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <KeyRound className="absolute left-3 top-3 w-4 text-muted-foreground" />
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm new password"
                              className="pl-10 pr-10 h-12"
                              disabled={isSubmitting}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              className="absolute right-3 top-3 w-4 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showConfirmPassword ? (
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

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBackToRequest}
                      disabled={isSubmitting}
                      className="flex-1 h-12"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 h-12 text-sm font-semibold"
                    >
                      {isSubmitting ? (
                        <>
                          <KeyRound className="mr-2 h-4 w-4 animate-spin" />
                          Resetting Password...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Reset Password
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}

            <div className="text-center text-sm">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
        By continuing, you agree to our <a href="#">Terms of Service</a> and{" "}
        <a href="#">Privacy Policy</a>.
      </div>
    </div>
  );
}
