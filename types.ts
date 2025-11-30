export interface UserData {
    email: string;
    username?: string; // New
    nickname?: string; // New
    balance: number;
    loopAmount: number;
    loopEndTime: number | null;
    loopStatus: 'active' | 'idle';
    loopDuration?: number; // Number of days
    savingsBalance: number;
    lastSavingsClaim?: number;
    referralCode: string; // Acts as inviteCode
    invitedBy: string | null; // Acts as referredByCode
    isAdmin: boolean;
    isBlocked: boolean;
    teamCommission: number;
    totalEarnings: number;
    joinedAt: any;
    teamCount?: number;
    referralClicks?: number;
}

export interface UserData {
  email: string;
  balance: number;
  referralCode: string;
  referralCount: number;
  team: string[];
  isAdmin: boolean;
}

export interface NotificationState {
  type: "success" | "error";
  msg: string;
}
export const getRefFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("ref");
};

export const registerUser = (email: string) => {

  const ref = getRefFromUrl();

  let users: any = JSON.parse(localStorage.getItem("USERS") || "[]");

  const referralCode = "REF" + Math.floor(Math.random() * 1000000);

  const newUser = {
    email,
    balance: 0,
    referralCode,
    referralCount: 0,
    team: [],
    isAdmin: false
  };

  // ✅ Add referral logic
  if (ref) {
    const refUser = users.find((u:any)=>u.referralCode === ref);

    if (refUser) {
      refUser.team.push(email);
      refUser.referralCount += 1;
    }
  }

  users.push(newUser);
  localStorage.setItem("USERS", JSON.stringify(users));

  return newUser;
};


export interface NotificationState {
    msg: string;
    type: 'success' | 'error';
}

declare global {
    var __firebase_config: string | undefined;
    var __app_id: string | undefined;
    var __initial_auth_token: string | undefined;
}