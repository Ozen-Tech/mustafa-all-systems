import { apiClient } from './apiClient';

export type Rarity = 'COMMON' | 'RARE' | 'EPIC';
export type ChestKind = 'STORE' | 'DAY';

export const RARITY_LABEL: Record<Rarity, string> = { COMMON: 'Comum', RARE: 'Raro', EPIC: 'Épico' };
export const RARITY_COLOR: Record<Rarity, string> = { COMMON: '#9CA3AF', RARE: '#3b82f6', EPIC: '#f59e0b' };

export interface AchievementItem {
  code: string;
  icon: string;
  title: string;
  description: string;
  rarity: Rarity;
  xp: number;
  secret: boolean;
  unlockedAt: string | null;
  progress: { value: number; target: number } | null;
}

export interface GamificationProfile {
  level: number;
  title: string;
  xp: number;
  levelStartXp: number;
  nextLevelXp: number;
  progress: number;
  todayXp: number;
  pendingChests: Array<{ id: string; kind: ChestKind; createdAt: string }>;
  chestOdds: Record<ChestKind, Array<{ rarity: Rarity; weight: number; min: number; max: number }>>;
  achievements: AchievementItem[];
  recent: Array<{ label: string; amount: number; source: string; createdAt: string }>;
}

export interface UnlockedAchievement {
  code: string;
  icon: string;
  title: string;
  description: string;
  rarity: Rarity;
  xp: number;
}

export interface SyncResult {
  gained: Array<{ source: string; amount: number; label: string }>;
  xpGained: number;
  newChests: number;
  newAchievements: UnlockedAchievement[];
  levelBefore: number;
  levelAfter: number;
  profile: GamificationProfile;
}

export interface OpenChestResult {
  chest: { id: string; kind: ChestKind; rarity: Rarity; xp: number };
  newAchievements: UnlockedAchievement[];
  levelBefore: number;
  levelAfter: number;
  profile: GamificationProfile;
}

export const gamificationService = {
  async getProfile(): Promise<GamificationProfile> {
    const { data } = await apiClient.get('/promoters/me/gamification');
    return data;
  },
  async sync(): Promise<SyncResult> {
    const { data } = await apiClient.post('/promoters/me/gamification/sync');
    return data;
  },
  async openChest(chestId: string): Promise<OpenChestResult> {
    const { data } = await apiClient.post(`/promoters/me/chests/${chestId}/open`);
    return data;
  },
};
