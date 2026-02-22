"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { KeyRound, Mail, Phone, ShieldCheck } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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

interface PasswordResetDialogProps {
    userId: string;
    userEmail?: string;
    userPhone?: string;
    tenantId: string;
}

const requestSchema = z.object({
    identifier: z.string().min(1, "Email or phone number is required"),
    identifierType: z.enum(["email", "phone"]),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export function PasswordResetDialog({
    userId,
    userEmail,
    userPhone,
    tenantId,
}: PasswordResetDialogProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { requestPasswordReset } = useUserStore();

    const requestForm = useForm<RequestFormValues>({
        resolver: zodResolver(requestSchema),
        defaultValues: {
            identifier: userEmail || userPhone || "",
            identifierType: userEmail ? "email" : "phone",
        },
    });

    const handleRequestSubmit = async (data: RequestFormValues) => {
        setIsSubmitting(true);
        try {
            const headers = { "X-Tenant-ID": tenantId };
            const payload =
                data.identifierType === "email"
                    ? { email: data.identifier }
                    : { phone_number: data.identifier };

            await requestPasswordReset(payload, headers);

            toast.success("Reset code sent successfully!");

            // Redirect to completion page with identifier info
            router.push(
                `/dashboard/auth/users/${userId}/reset-password?identifier=${encodeURIComponent(
                    data.identifier
                )}&type=${data.identifierType}`
            );

            handleClose();
        } catch (error) {
            toast.error("Failed to send reset code. Please try again.");
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setOpen(false);
        setIsSubmitting(false);
        requestForm.reset({
            identifier: userEmail || userPhone || "",
            identifierType: userEmail ? "email" : "phone",
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                    <KeyRound className="mr-2 h-4 w-4" /> Reset Password
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5" />
                        Send Password Reset Code
                    </DialogTitle>
                    <DialogDescription>
                        Send a reset code to the user's email or phone number.
                    </DialogDescription>
                </DialogHeader>

                <Form {...requestForm}>
                    <form onSubmit={requestForm.handleSubmit(handleRequestSubmit)} className="space-y-4">
                        <Tabs
                            value={requestForm.watch("identifierType")}
                            onValueChange={(value) =>
                                requestForm.setValue("identifierType", value as "email" | "phone")
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
                                                <Input
                                                    type="email"
                                                    placeholder="user@example.com"
                                                    {...field}
                                                />
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
                                                <Input
                                                    type="tel"
                                                    placeholder="255712345678"
                                                    {...field}
                                                />
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

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Sending..." : "Send Reset Code"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
