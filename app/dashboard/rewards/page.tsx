"use client";

import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RewardsSettingsForm } from "@/features/rewards/components/settings-form";

import { withAuthorization } from "@/components/auth/with-authorization";
import { withModuleAuthorization } from "@/components/auth/with-module-authorization";
import { Can } from "@/components/auth/can";

function RewardsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 mb-0">
        <div className="flex flex-col">
          <h2 className="text-3xl font-bold tracking-tight">
            Rewards & Referrals
          </h2>
          <p className="text-muted-foreground">
            Manage rewards and referrals for marketplace
          </p>
        </div>
      </div>
      <Separator />

      <Tabs defaultValue="settings" className="space-y-4 p-6 pt-0">
        {/* <TabsList className="w-full pb-0 mb-4">
          <TabsTrigger value="settings">
            Configurationsa
          </TabsTrigger>
          <TabsTrigger value="referrals">
            Referrals
          </TabsTrigger>
          <TabsTrigger value="redemptions">
            Redemptions
          </TabsTrigger>
        </TabsList> */}

        <TabsContent value="settings" className="space-y-4 mt-4">
          <RewardsSettingsForm />
        </TabsContent>

        {/* <TabsContent value="referrals" className="space-y-4 mt-4">
          <ReferralsOverview />
        </TabsContent> */}

        {/* <TabsContent value="redemptions" className="space-y-4 mt-4">
          <RedemptionReport />
        </TabsContent> */}
      </Tabs>
    </div>
  );
}
export default withModuleAuthorization(withAuthorization(RewardsPage, {
  permission: "rewards:read",
}), "rewards-referals");
