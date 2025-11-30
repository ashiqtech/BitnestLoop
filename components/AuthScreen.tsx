import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, Auth, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { Firestore, doc, setDoc, query, collection, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { SUPPORT_EMAIL, ADMIN_EMAIL } from '../constants';
import { NotificationState } from '../types';

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
    onMockLogin: (email: string, remember: boolean) => void;
}

const generateReferralCode = () => 'BN' + Math.floor(100000 + Math.random() * 900000);

export default function AuthScreen({ mode, setMode, auth, db, appId, onError, onSuccess, notification, isDemo, onMockLogin }: AuthScreenProps) {
    const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', referralCode: '' });
    const [rememberMe, setRememberMe] = useState(true);
    const [loading, setLoading] = useState(false);

    // Auto-fill referral code from URL
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const refCode = params.get('ref');
        if (refCode) {
            setFormData(prev => ({ ...prev, referralCode: refCode }));
            if (mode === 'signin') setMode('signup');
        }
    }, [mode, setMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        // --- Demo Mode Logic ---
        if (isDemo) {
            setTimeout(() => {
                setLoading(false);
                if (mode === 'signup') {
                    if (formData.password !== formData.confirmPassword) {
                        onError("Passwords do not match");
                        return;
                    }
                    if (formData.password.length < 6) {
                         onError("Password must be at least 6 characters");
                         return;
                    }

                    // Increment Demo Team Count if referral code exists
                    if (formData.referralCode) {
                        const cleanCode = formData.referralCode.trim().toUpperCase();
                        const key = `bitnest_demo_team_${cleanCode}`;
                        const current = parseInt(localStorage.getItem(key) || '0');
                        localStorage.setItem(key, (current + 1).toString());
                    }

                    onMockLogin(formData.email, rememberMe);
                } else if (mode === 'forgot') {
                    onSuccess("Reset link sent");
                    setMode('signin');
                } else {
                    onMockLogin(formData.email, rememberMe);
                }
            }, 1000);
            return;
        }

        // --- Real Firebase Logic ---
        try {
            if (!auth || !db) throw new Error("Connection failed");

            // Set Persistence
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);

            if (mode === 'signup') {
                if (formData.password !== formData.confirmPassword) throw new Error("Passwords do not match");
                if (formData.password.length < 6) throw new Error("Password must be at least 6 characters");
                
                const uc = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                const isAdmin = formData.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

                // Check referral
                let inviterCode = null;
                if (formData.referralCode) {
                    // Normalize code to uppercase
                    const cleanCode = formData.referralCode.trim().toUpperCase();
                    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('referralCode', '==', cleanCode));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        inviterCode = cleanCode;
                    }
                }

                await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uc.user.uid), {
                    email: formData.email,
                    balance: 0,
                    loopAmount: 0,
                    loopEndTime: null,
                    loopStatus: 'idle',
                    savingsBalance: 0,
                    referralCode: generateReferralCode(),
                    invitedBy: inviterCode,
                    isAdmin: isAdmin,
                    isBlocked: false,
                    teamCommission: 0,
                    totalEarnings: 0,
                    joinedAt: serverTimestamp()
                });
                onSuccess("Account created! Welcome.");
            } else if (mode === 'signin') {
                await signInWithEmailAndPassword(auth, formData.email, formData.password);
                onSuccess("Signed in successfully.");
            } else if (mode === 'forgot') {
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
                            <input 
                                type="text" 
                                placeholder="Referral Code (Optional)" 
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-green-500 outline-none transition-colors"
                                value={formData.referralCode}
                                onChange={e => setFormData({...formData, referralCode: e.target.value})}
                            />
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