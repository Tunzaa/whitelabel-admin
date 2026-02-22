import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';
import { RewardsConfig, RewardsConfigResponse } from './types';

interface RewardsStore {
  config: RewardsConfig | null;
  loading: boolean;
  error: Error | null;
  fetchConfig: (tenantId: string) => Promise<void>;
  updateConfig: (updates: Partial<RewardsConfig>, tenantId: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  config: null,
  loading: false,
  error: null,
};

export const useRewardsStore = create<RewardsStore>((set, get) => ({
  ...initialState,

  fetchConfig: async (tenantId: string) => {
    set({ loading: true, error: null });

    try {
      if (!tenantId) {
        throw new Error('No tenant ID provided');
      }

      const response = await apiClient.get<RewardsConfigResponse>('/rewards/config', undefined, { 'X-Tenant-ID': tenantId });


      if (!response.data) {
        throw new Error('No data received from server');
      }

      const config: RewardsConfig = {
        id: response.data.id,
        points_per_tzs: response.data.points_per_tzs,
        redemption_points: response.data.redemption_points,
        redemption_value_tzs: response.data.redemption_value_tzs,
        referral_bonus_points: response.data.referral_bonus_points,
        is_active: response.data.is_active,
      };

      set({ config, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error : new Error('Failed to load rewards configuration'),
        loading: false
      });
      throw error;
    }
  },

  updateConfig: async (updates: Partial<RewardsConfig>, tenantId: string) => {
    const currentConfig = get().config;

    if (!currentConfig) {
      throw new Error('No configuration loaded');
    }

    const updatedConfig = { ...currentConfig, ...updates };
    set({ loading: true, error: null });

    try {
      if (!tenantId) {
        throw new Error('No tenant ID provided');
      }

      const payload = {
        id: updatedConfig.id,
        points_per_tzs: updatedConfig.points_per_tzs,
        redemption_points: updatedConfig.redemption_points,
        redemption_value_tzs: updatedConfig.redemption_value_tzs,
        referral_bonus_points: updatedConfig.referral_bonus_points,
        is_active: updatedConfig.is_active,
      };

      const response = await apiClient.put<RewardsConfigResponse>('/rewards/config', payload, { 'X-Tenant-ID': tenantId });


      const config: RewardsConfig = {
        id: response.data.id,
        points_per_tzs: response.data.points_per_tzs,
        redemption_points: response.data.redemption_points,
        redemption_value_tzs: response.data.redemption_value_tzs,
        referral_bonus_points: response.data.referral_bonus_points,
        is_active: response.data.is_active,
      };

      set({ config, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error : new Error('Failed to update rewards configuration'),
        loading: false
      });
      throw error;
    }
  },

  reset: () => set(initialState),
}));
