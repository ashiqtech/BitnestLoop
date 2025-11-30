export const ADMIN_EMAIL = 'cryptodrop077@gmail.com';
export const SUPPORT_EMAIL = 'bitnessuport567@gmail.com';

// Financial Rules
export const LOOP_MIN = 10;
export const LOOP_MAX = 5000;
export const LOOP_PROFIT_PERCENT = 0.05; // 5%
export const LOOP_DURATION_HOURS = 24;

export const SAVING_MIN = 10;
export const SAVING_MAX = 4000;
export const SAVING_DAILY_PERCENT = 0.10; // 10%

export const REFERRAL_TIERS = [0.13, 0.05, 0.03, 0.02, 0.01]; // 13%, 5%, 3%, 2%, 1%

export const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};