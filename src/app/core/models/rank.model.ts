export interface Rank {
    id: number;
    name: string;
    bonusPercent: number;
    minDeposit: number;
    iconUrl?: string;
    color?: string;
    status: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface RankCreate {
    name: string;
    bonusPercent: number;
    minDeposit: number;
    iconUrl?: string;
    color?: string;
}

export interface RankUpdate {
    name?: string;
    bonusPercent?: number;
    minDeposit?: number;
    iconUrl?: string;
    color?: string;
    status?: number;
}

export interface UserRankInfo {
    rankId?: number;
    rankName: string;
    bonusPercent: number;
    iconUrl?: string;
    color?: string;
    currentDeposit: number;
    nextRankMinDeposit?: number;
    nextRankName?: string;
    periodDays: number;
    // CTV info (realtime from API)
    isCollaborator?: boolean;
    ctvBonusPercent?: number;
}

export interface RankFilter {
    name?: string;
    status?: string;
    page?: number;
    limit?: number;
    sort?: string;
}
