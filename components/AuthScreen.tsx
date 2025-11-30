import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, Auth, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { Firestore, doc, setDoc, serverTimestamp, updateDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { SUPPORT_EMAIL, ADMIN_EMAIL, generateReferralCode } from '../constants';
import { NotificationState } from '../types';
import { CheckCircle2 } from 'lucide-react';

interface AuthScreenProps {
    mode: 'signin' | 'signup' | 'forgot';
    setMode: (mode: 'signin' | 'signup' | 'forgot') => void;
    auth: Auth | null;
    db: Firestore | null;
    appId: string;
    onError: (msg: string) => void;
    onSuccess: (msg: string) => void;
    notification: NotificationState | null;
    isDemo: boolean;
    onMockLogin: (email: string, remember: boolean, showNotify: boolean, invitedByCode?: string) => void;
}

export default function AuthScreen({ mode, setMode, auth, db, appId, onError, onSuccess, notification, isDemo, onMockLogin }: AuthScreenProps) {
    const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', referralCode: '' });
    const [rememberMe, setRememberMe] = useState(true);
    const [loading, setLoading] = useState(false);
    const [isReferralLocked, setIsReferralLocked] = useState(false);

    // --- STEP 1: CAPTURE REFERRAL CODE ---
    useEffect(() => {
        const initReferral = async () => {
            const params = new URLSearchParams(window.location.search);
            const urlRef = params.get('ref');
            let finalCode = '';

            // A. Check URL
            if (urlRef) {
                finalCode = urlRef.trim().toUpperCase();
                localStorage.setItem('bitnest_referral_code', finalCode);
                
                // Clean URL
                const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                window.history.replaceState({path: newUrl}, '', newUrl);
                
                // Force Signup Mode
                setMode('signup');
            } 
            // B. Check Storage if URL is empty
            else {
                const stored = localStorage.getItem('bitnest_referral_code');
                if (stored) finalCode = stored;
            }

            // C. Update State & Lock
            if (finalCode) {
                setFormData(prev => ({ ...prev, referralCode: finalCode }));
                setIsReferralLocked(true);
                
                // Track Click (Once per session)
                const storageKey = `bitnest_click_${finalCode}`;
                if (!sessionStorage.getItem(storageKey)) {
                    sessionStorage.setItem(storageKey, 'true');
                    
                    if (isDemo) {
                        const key = `bitnest_demo_clicks_${finalCode}`;
                        const current = parseInt(localStorage.getItem(key) || '0');
                        localStorage.setItem(key, (current + 1).toString());
                    } else if (db) {
                        try {
                            const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('referralCode', '==', finalCode));
                            const snap = await getDocs(q);
                            if (!snap.empty) {
                                await updateDoc(snap.docs[0].ref, { referralClicks: increment(1) });
                            }
                        } catch (e) { console.warn("Click tracking failed", e); }
                    }
                }
            }
        };
        initReferral();
    }, [isDemo, db, appId, setMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            // --- STEP 2: PREPARE DATA ---
            // Priority: 1. Form Input, 2. LocalStorage, 3. URL (if somehow missed)
            const storedCode = localStorage.getItem('bitnest_referral_code');
            const rawInviterCode = formData.referralCode || storedCode || '';
            const inviterCode = rawInviterCode.trim().toUpperCase();

            // --- DEMO MODE ---
            if (isDemo) {
                setTimeout(() => {
                    setLoading(false);
                    if (mode === 'signup') {
                        if (formData.password !== formData.confirmPassword) { onError("Passwords do not match"); return; }
                        onMockLogin(formData.email, rememberMe, true, inviterCode || undefined);
                    } else if (mode === 'forgot') {
                        onSuccess("Reset link sent");
                        setMode('signin');
                    } else {
                        onMockLogin(formData.email, rememberMe, true);
                    }
                }, 1000);
                return;
            }

            // --- REAL MODE ---
            if (!auth || !db) throw new Error("Connection failed");

            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

            if (mode === 'signup') {
                if (formData.password !== formData.confirmPassword) throw new Error("Passwords do not match");
                if (formData.password.length < 6) throw new Error("Password must be at least 6 characters");
                
                // 1. Create Auth User
                const uc = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                const isAdmin = formData.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

                // 2. Increment Referrer Count (If code exists)
                if (inviterCode) {
                    try {
                        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('referralCode', '==', inviterCode));
                        const snap = await getDocs(q);
                        if (!snap.empty) {
                            await updateDoc(snap.docs[0].ref, { teamCount: increment(1) });
                        }
                    } catch (e) {
                        console.error("Referral increment error:", e);
                    }
                }

                // 3. Create User Profile
                // Using merge: true ensures if App.tsx accidentally created a stub, we fill it properly
                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uc.user.uid), {
                    email: formData.email,
                    username: formData.email.split('@')[0],
                    nickname: '',
                    balance: 0,
                    loopAmount: 0,
                    loopEndTime: null,
                    loopStatus: 'idle',
                    savingsBalance: 0,
                    referralCode: generateReferralCode(),
                    invitedBy: inviterCode || null, // <--- CRITICAL: Saving the code
                    isAdmin: isAdmin,
                    isBlocked: false,
                    teamCommission: 0,
                    totalEarnings: 0,
                    joinedAt: serverTimestamp(),
                    teamCount: 0,
                    referralClicks: 0
                }, { merge: true });
                
                localStorage.removeItem('bitnest_referral_code'); // Cleanup
                onSuccess("Account created! Welcome.");
            } 
            else if (mode === 'signin') {
                await signInWithEmailAndPassword(auth, formData.email, formData.password);
                onSuccess("Signed in successfully.");
            } 
            else if (mode === 'forgot') {
                await sendPasswordResetEmail(auth, formData.email);
                onSuccess("Reset link sent to email.");
                setMode('signin');
            }
        } catch (err: any) {
            onError(err.message);
        } finally {
            if (!isDemo) setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative">
             {notification && (
                <div className={`absolute top-10 px-6 py-3 rounded-full shadow-lg font-bold animate-bounce z-50 ${notification.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-500 text-black'}`}>
                    {notification.msg}
                </div>
            )}
            
            <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-700"></div>
                <h2 className="text-3xl font-bold text-center text-white mb-2 tracking-tighter">BIT<span className="text-green-500">NEST</span></h2>
                <p className="text-center text-gray-400 mb-8 text-sm">
                    {mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Reset Password' : 'Login to Continue'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input 
                        type="email" 
                        placeholder="Email" 
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none transition-colors"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        required
                    />
                    {mode !== 'forgot' && (
                        <input 
                            type="password" 
                            placeholder="Password" 
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none transition-colors"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            required
                        />
                    )}
                    {mode === 'signup' && (
                        <>
                            <input 
                                type="password" 
                                placeholder="Confirm Password" 
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none transition-colors"
                                value={formData.confirmPassword}
                                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                                required
                            />
                            
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Referral Code (Optional)" 
                                    className={`w-full bg-gray-800 border rounded-lg p-3 text-white outline-none transition-colors ${isReferralLocked ? 'border-green-500/50 bg-green-900/10' : 'border-gray-700 focus:border-green-500'}`}
                                    value={formData.referralCode}
                                    onChange={e => setFormData({...formData, referralCode: e.target.value})}
                                />
                                {isReferralLocked && (
                                    <div className="absolute right-3 top-3 text-green-500 flex items-center gap-1 text-xs font-bold bg-gray-900 px-2 rounded">
                                        <CheckCircle2 size={14} /> Applied
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {mode !== 'forgot' && (
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <input 
                                type="checkbox" 
                                id="remember" 
                                checked={rememberMe}
                                onChange={e => setRememberMe(e.target.checked)}
                                className="rounded bg-gray-800 border-gray-700 text-green-500 focus:ring-green-500 accent-green-500 w-4 h-4 cursor-pointer" 
                            />
                            <label htmlFor="remember" className="cursor-pointer select-none">Remember login</label>
                        </div>
                    )}

                    <button 
                        disabled={loading}
                        className="w-full bg-green-500 hover:bg-green-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-3 rounded-lg transition transform active:scale-95 shadow-[0_0_15px_rgba(34,197,94,0.3)] mt-2"
                    >
                        {loading ? 'Processing...' : (mode === 'signup' ? 'Sign Up' : mode === 'forgot' ? 'Send Reset Link' : 'Login')}
                    </button>
                </form>

                <div className="mt-6 flex flex-col gap-2 text-center text-sm text-gray-500">
                    {mode !== 'signin' && <button onClick={() => setMode('signin')} className="hover:text-green-500 transition-colors">Back to Login</button>}
                    {mode === 'signin' && (
                        <>
                            <button onClick={() => setMode('signup')} className="hover:text-green-500 transition-colors">Create New Account</button>
                            <button onClick={() => setMode('forgot')} className="hover:text-green-500 transition-colors">Forgot Password?</button>
                        </>
                    )}
                </div>
                <div className="mt-6 pt-4 border-t border-gray-800 text-center text-xs text-gray-600">
                    Support: <span className="text-green-600 hover:underline cursor-pointer">{SUPPORT_EMAIL}</span>
                </div>
            </div>
        </div>
    );
}