import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { ErrorCard } from "@/components/ui/error-card";
import { RewardsConfig } from "../types";
import { useRewardsStore } from "../store";
import { Can } from "@/components/auth/can";

export function RewardsSettingsForm() {
  const session = useSession();
  const { config, updateConfig, loading, error, fetchConfig } =
    useRewardsStore();

  const [formData, setFormData] = useState<RewardsConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const tenantId = session.data?.user?.tenant_id;

  // Derived state for form controls
  const isLoading = loading || session.status === "loading";
  const hasError = error !== null;
  const isFormReady = !isLoading && !hasError && formData !== null;

  // Load config when component mounts or tenantId changes
  useEffect(() => {
    const loadConfig = async () => {
      if (!tenantId) return;

      try {
        await fetchConfig(tenantId);
      } catch (err) {
        toast.error("Failed to load rewards configuration");
      }
    };

    loadConfig();
  }, [tenantId, fetchConfig]);

  // Update form data when config changes
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    if (!formData) return;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : parseInt(value) || 0,
    });
  };

  const handleSwitchChange = (checked: boolean) => {
    if (!formData) return;

    setFormData({
      ...formData,
      is_active: checked,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !formData) {
      toast.error("Error", {
        description:
          "No tenant ID found or form data is missing. Please try again.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await updateConfig(formData, tenantId);
      toast.success("Settings updated", {
        description: "Rewards configuration has been updated successfully",
      });
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error
            ? error.message
            : "Failed to update rewards configuration",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading && !formData) {
    return <Spinner />;
  }

  // Error state
  if (hasError && !formData) {
    return (
      <ErrorCard
        title="Error Loading Configuration"
        description={error?.message || "Failed to load rewards configuration"}
        onRetry={() => tenantId && fetchConfig(tenantId)}
      />
    );
  }

  // Form is ready to be displayed
  return formData ? (
    <Card className="border shadow-sm">
      <CardHeader className="border-b bg-muted/50">
        <CardTitle className="flex items-center gap-2">
          <span className="p-1.5 rounded-full bg-primary/10 text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="M20 12h2" />
              <path d="M2 12h2" />
            </svg>
          </span>
          Rewards Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Points Earning Card */}
            <div className="border rounded-lg p-4 bg-card">
              <h3 className="text-sm font-semibold mb-3 text-primary">
                Points Earning
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="points_per_tzs" className="text-base">
                    Points Per TZS
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-40">
                      <Input
                        id="points_per_tzs"
                        name="points_per_tzs"
                        type="number"
                        min="1"
                        value={formData.points_per_tzs}
                        onChange={handleChange}
                        className="w-full"
                        disabled={!formData.is_active}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      TZS spent to earn 1 point
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Example: If set to 100, customers earn 1 point for every TZS
                    100 spent.
                  </p>
                </div>
              </div>
            </div>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">
                  Redemption Configuration
                </h3>
                <p className="text-sm text-muted-foreground">
                  Set up how points can be redeemed for rewards.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="redemption_points">Points Required</Label>
                    <div className="relative">
                      <Input
                        id="redemption_points"
                        name="redemption_points"
                        type="number"
                        min="1"
                        value={formData.redemption_points || ""}
                        onChange={handleChange}
                        disabled={
                          !formData.is_active || loading || isSubmitting
                        }
                        className="w-full"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Points needed for coupon
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="redemption_value_tzs" className="text-base">
                    Coupon Value (TZS)
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-40">
                      <Input
                        id="redemption_value_tzs"
                        name="redemption_value_tzs"
                        type="number"
                        min="1"
                        value={formData.redemption_value_tzs || ""}
                        onChange={handleChange}
                        disabled={
                          !formData.is_active || loading || isSubmitting
                        }
                        className="w-full"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      TZS discount value
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Current rate: {formData.redemption_points} points = TZS{" "}
                    {formData.redemption_value_tzs} discount
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="border rounded-lg p-4 bg-card">
              <h3 className="text-sm font-semibold mb-3 text-primary">
                Referral Program
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="referral_bonus_points" className="text-base">
                    Referral Bonus Points
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-40">
                      <Input
                        id="referral_bonus_points"
                        name="referral_bonus_points"
                        type="number"
                        min="0"
                        value={formData.referral_bonus_points || ""}
                        onChange={handleChange}
                        disabled={
                          !formData.is_active || loading || isSubmitting
                        }
                        className="w-full"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Points for successful referral
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Points awarded to the referrer when a new user completes
                    their first purchase.
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`border rounded-lg p-4 ${formData.is_active ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"}`}
            >
              <h3 className="text-sm font-semibold mb-3 text-primary">
                Program Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {formData.is_active ? "Active" : "Inactive"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formData.is_active
                        ? "Rewards program is currently active."
                        : "Rewards program is currently inactive."}
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={handleSwitchChange}
                    disabled={loading || isSubmitting}
                    className={`${formData.is_active ? "data-[state=checked]:bg-green-500/50" : "data-[state=checked]:bg-destructive"}`}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.is_active
                    ? "Disabling will prevent customers from earning or redeeming points."
                    : "Enabling will allow customers to start earning and redeeming points."}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 mt-4">
            <div className="flex justify-between items-center">
              <div>
                {isSubmitting && (
                  <p className="text-sm text-muted-foreground">
                    Saving changes...
                  </p>
                )}
              </div>
              <Can permission="rewards:update">
                <Button
                  type="submit"
                  disabled={loading || isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {loading || isSubmitting
                    ? "Updating..."
                    : "Save Rewards Configuration"}
                </Button>
              </Can>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  ) : null;
}
