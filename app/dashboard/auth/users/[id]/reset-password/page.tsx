"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Lock, KeyRound } from "lucide-react";
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

interface ResetPasswordPageProps {
    params: {
        id: string;
    };
}

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

export default function ResetPasswordPage({ params }: ResetPasswordPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { confirmPasswordReset } = useUserStore();

    const identifier = searchParams.get("identifier") || "";
    const identifierType = searchParams.get("type") as "email" | "phone" || "email";
    const tenantId = session?.user?.tenant_id;

    const confirmForm = useForm<ConfirmFormValues>({
        resolver: zodResolver(confirmSchema),
        defaultValues: {
            reset_token: "",
            new_password: "",
            confirm_password: "",
        },
    });

    const handleConfirmSubmit = async (data: ConfirmFormValues) => {
        if (!tenantId) {
            toast.error("Tenant ID is missing.");
            return;
        }

        setIsSubmitting(true);
        try {
            const headers = { "X-Tenant-ID": tenantId };
            const payload =
                identifierType === "email"
                    ? {
                        email: identifier,
                        reset_token: data.reset_token,
                        new_password: data.new_password,
                    }
                    : {
                        phone_number: identifier,
                        reset_token: data.reset_token,
                        new_password: data.new_password,
                    };

            await confirmPasswordReset(payload, headers);

            toast.success("Password reset successfully!");
            router.push(`/dashboard/auth/users/${params.id}`);
        } catch (error) {
            toast.error("Failed to reset password. Please check the OTP and try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoBack = () => {
        router.push(`/dashboard/auth/users/${params.id}`);
    };

    return (
        <div className="container max-w-2xl py-6 space-y-6">
            <div className="flex items-center space-x-2">
                <Button variant="outline" size="icon" onClick={handleGoBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight">Complete Password Reset</h1>
                    <p className="text-sm text-muted-foreground">
                        Enter the OTP and set a new password for the user
                    </p>
                </div>
            </div>

            <Separator />

            <Alert>
                <KeyRound className="h-4 w-4" />
                <AlertDescription>
                    A 6-digit reset code has been sent to <strong>{identifier}</strong>.
                    Please ask the user for the OTP to complete the password reset.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>Password Reset Confirmation</CardTitle>
                    <CardDescription>
                        Complete the password reset by entering the OTP and a new password
                    </CardDescription>
                </CardHeader>
                <CardContent>
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
                                            Enter the 6-digit code sent to the user
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
                                <Button type="button" variant="outline" onClick={handleGoBack} className="flex-1">
                                    Cancel
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
        </div>
    );
}
