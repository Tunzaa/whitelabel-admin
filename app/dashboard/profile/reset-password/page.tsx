"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Lock, KeyRound, Mail, Send } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useUserStore } from "@/features/auth/stores/user-store";

const confirmSchema = z.object({
    reset_token: z.string().length(6, "OTP must be 6 digits"),
    new_password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ["confirm_password"],
});

type ConfirmFormValues = z.infer<typeof confirmSchema>;

export default function SelfResetPasswordPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [step, setStep] = useState<"request" | "confirm">("request");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { requestPasswordReset, confirmPasswordReset } = useUserStore();

    const userEmail = session?.user?.email || "";
    const tenantId = session?.user?.tenant_id;

    const confirmForm = useForm<ConfirmFormValues>({
        resolver: zodResolver(confirmSchema),
        defaultValues: {
            reset_token: "",
            new_password: "",
            confirm_password: "",
        },
    });

    const handleSendCode = async () => {
        if (!tenantId) {
            toast.error("Session error. Please log in again.");
            return;
        }

        setIsSubmitting(true);
        try {
            const headers = { "X-Tenant-ID": tenantId };
            await requestPasswordReset({ email: userEmail }, headers);

            toast.success("Reset code sent to your email!");
            setStep("confirm");
        } catch (error) {
            toast.error("Failed to send reset code. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmSubmit = async (data: ConfirmFormValues) => {
        if (!tenantId) {
            toast.error("Session error. Please log in again.");
            return;
        }

        setIsSubmitting(true);
        try {
            const headers = { "X-Tenant-ID": tenantId };
            const payload = {
                email: userEmail,
                reset_token: data.reset_token,
                new_password: data.new_password,
            };

            await confirmPasswordReset(payload, headers);

            toast.success("Password reset successfully! Please log in with your new password.");
            router.push("/dashboard");
        } catch (error) {
            toast.error("Failed to reset password. Please check the OTP and try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoBack = () => {
        router.push("/dashboard");
    };

    return (
        <div className="container max-w-2xl py-6 space-y-6">
            <div className="flex items-center px-6 space-x-2">
                <Button variant="outline" size="icon" onClick={handleGoBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight">Reset Your Password</h1>
                    <p className="text-sm text-muted-foreground">
                        {step === "request"
                            ? "Request a password reset code"
                            : "Enter the code and set your new password"}
                    </p>
                </div>
            </div>

            <Separator />

            <div className="px-6">
                {step === "request" ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Request Password Reset</CardTitle>
                            <CardDescription>
                                We'll send a 6-digit reset code to your email address
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert>
                                <Mail className="h-4 w-4" />
                                <AlertDescription>
                                    A reset code will be sent to <strong>{userEmail}</strong>
                                </AlertDescription>
                            </Alert>

                            <div className="flex gap-2 pt-4">
                                <Button variant="outline" onClick={handleGoBack} className="flex-1">
                                    Cancel
                                </Button>
                                <Button onClick={handleSendCode} disabled={isSubmitting} className="flex-1">
                                    <Send className="mr-2 h-4 w-4" />
                                    {isSubmitting ? "Sending..." : "Send Reset Code"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Complete Password Reset</CardTitle>
                            <CardDescription>
                                Enter the code sent to your email and set your new password
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert className="mb-4">
                                <KeyRound className="h-4 w-4" />
                                <AlertDescription>
                                    A 6-digit code has been sent to <strong>{userEmail}</strong>
                                </AlertDescription>
                            </Alert>

                            <Form {...confirmForm}>
                                <form onSubmit={confirmForm.handleSubmit(handleConfirmSubmit)} className="space-y-4">
                                    <FormField
                                        control={confirmForm.control}
                                        name="reset_token"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Reset Code (OTP)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="123456"
                                                        maxLength={6}
                                                        className="font-mono text-center text-lg tracking-widest"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormDescription>
                                                    Enter the 6-digit code from your email
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={confirmForm.control}
                                        name="new_password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>New Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="••••••••" {...field} />
                                                </FormControl>
                                                <FormDescription>
                                                    Must be at least 8 characters with uppercase, lowercase, and number
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={confirmForm.control}
                                        name="confirm_password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Confirm Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" placeholder="••••••••" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex gap-2 pt-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setStep("request")}
                                            className="flex-1"
                                        >
                                            Back
                                        </Button>
                                        <Button type="submit" disabled={isSubmitting} className="flex-1">
                                            <Lock className="mr-2 h-4 w-4" />
                                            {isSubmitting ? "Resetting..." : "Reset Password"}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
