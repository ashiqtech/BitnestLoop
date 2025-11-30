export interface UserData {
    email: string;
    balance: number;
    loopAmount: number;
    loopEndTime: number | null;
    loopStatus: 'active' | 'idle';
    loopDuration?: number; // Number of days
    savingsBalance: number;
    lastSavingsClaim?: number;
    referralCode: string;
    invitedBy: string | null;
    isAdmin: boolean;
    isBlocked: boolean;
    teamCommission: number;
    totalEarnings: number;
    joinedAt: any;
    teamCount?: number;
}

export interface Transaction {
    id: string;
    userId: string;
    userEmail: string;
    type: 'deposit' | 'withdraw';
    amount: number;
    address?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
}

export interface NotificationState {
    msg: string;
    type: 'success' | 'error';
}

declare global {
    var __firebase_config: string | undefined;
    var __app_id: string | undefined;
    var __initial_auth_token: string | undefined;
}