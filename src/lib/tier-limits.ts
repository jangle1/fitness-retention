import type { TrainerTier } from "@/types/database";

export const TIER_LIMITS = {
  free: {
    maxSessionsPerMonth: 20,
    maxActiveClients: 10,
    canCustomBrand: false,
    canSendSms: false,
    canSeeNudges: false,
    canReferClients: false,
    canGenerateReports: false,
  },
  paid: {
    maxSessionsPerMonth: Infinity,
    maxActiveClients: Infinity,
    canCustomBrand: true,
    canSendSms: true,
    canSeeNudges: true,
    canReferClients: true,
    canGenerateReports: true,
  },
} as const;

export function getTierLimits(tier: TrainerTier) {
  return TIER_LIMITS[tier];
}

export function isAtSessionCap(tier: TrainerTier, sessionsThisMonth: number): boolean {
  const limits = getTierLimits(tier);
  return sessionsThisMonth >= limits.maxSessionsPerMonth;
}

export function isAtClientCap(tier: TrainerTier, activeClients: number): boolean {
  const limits = getTierLimits(tier);
  return activeClients >= limits.maxActiveClients;
}
