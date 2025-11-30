import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithCustomToken, 
    onAuthStateChanged, 
    signOut,
    User,
    Auth
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    updateDoc, 
    onSnapshot, 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc,
    increment,
    serverTimestamp,
    Firestore
} from 'firebase/firestore';
import { ShieldAlert } from 'lucide-react';

import { UserData, NotificationState, Transaction } from './types';
import { 
    LOOP_MIN, 
    LOOP_MAX, 
    LOOP_PROFIT_PERCENT, 
    SAVING_MIN, 
    SAVING_MAX, 
    SAVING_DAILY_PERCENT, 
    REFERRAL_TIERS,
    ADMIN_EMAIL 
} from './constants';

// Component Imports
import Layout from './components/Layout';
import AuthScreen from './components/AuthScreen';
import BlockedScreen from './components/BlockedScreen';
import HomeScreen from './components/HomeScreen';
import LoopScreen from './components/LoopScreen';
import SavingsScreen from './components/SavingsScreen';
import TeamScreen from './components/TeamScreen';
import WalletScreen from './components/WalletScreen';
import AdminPanel from './components/AdminPanel';
import PartnerScreen from './components/PartnerScreen';

export default function App() {
    const [user, setUser] = useState<User | any | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('home');
    const [notification, setNotification] = useState<NotificationState | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // Demo Mode State for Transactions
    const [mockTransactions, setMockTransactions] = useState<Transaction[]>([]);

    // Initialize Firebase
    const firebaseConfig = useMemo(() => {
        try {
            return JSON.parse(window.__firebase_config || '{}');
        } catch {
            return {};
        }
    }, []);
    
    const appId = window.__app_id || 'bitnest-default';
    
    // Safety check: ensure apiKey exists
    const isConfigValid = useMemo(() => {
        return !!firebaseConfig?.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY';
    }, [firebaseConfig]);

    // If config is invalid, we run in Demo Mode
    const isDemo = !isConfigValid;

    const app = useMemo(() => {
        if (!isConfigValid) return null;
        try {
            return initializeApp(firebaseConfig);
        } catch (e) {
            console.error("Firebase init failed:", e);
            return null;
        }
    }, [firebaseConfig, isConfigValid]);

    const auth = useMemo(() => {
        if (!app) return null;
        return getAuth(app);
    }, [app]);

    const db = useMemo(() => {
        if (!app) return null;
        return getFirestore(app);
    }, [app]);

    const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // --- Mock Auth Logic for Demo Mode ---
    const handleMockLogin = (email: string) => {
        const mockUser = { uid: 'demo-user-123', email: email };
        const defaultMockData: UserData = {
            email: email,
            balance: 1000,
            loopAmount: 0,
            loopEndTime: null,
            loopStatus: 'idle',
            savingsBalance: 500,
            referralCode: 'BNDEMO',
            invitedBy: null,
            isAdmin: email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
            isBlocked: false,
            teamCommission: 50,
            totalEarnings: 120,
            joinedAt: new Date()
        };
        
        setUser(mockUser);
        setUserData(defaultMockData);
        setLoading(false);
        showNotification('Signed in (Demo Mode)');
    };

    // --- Auth & Profile Sync ---
    useEffect(() => {
        // If Demo mode, skip real auth listener
        if (isDemo) {
            // Simulate checking session
            setTimeout(() => {
                setLoading(false);
            }, 1000);
            return;
        }

        if (!auth || !db) return;

        const initAuth = async () => {
            if (window.__initial_auth_token) {
                try {
                    await signInWithCustomToken(auth, window.__initial_auth_token);
                } catch (e) {
                    console.error("Auth failed", e);
                }
            }
        };
        initAuth();

        let unsubscribeProfile: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            
            if (unsubscribeProfile) {
                unsubscribeProfile();
                unsubscribeProfile = null;
            }

            if (currentUser) {
                const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', currentUser.uid);
                unsubscribeProfile = onSnapshot(userRef, async (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data() as UserData;
                        setUserData(data);
                        if (data.isBlocked) {
                            showNotification('Your account has been blocked by Admin.', 'error');
                        }
                    } else {
                        // Create default profile if missing
                        const defaultData: UserData = {
                            email: currentUser.email || 'user@bitnest.com',
                            balance: 0,
                            loopAmount: 0,
                            loopEndTime: null,
                            loopStatus: 'idle',
                            savingsBalance: 0,
                            referralCode: 'BN' + Math.floor(100000 + Math.random() * 900000),
                            invitedBy: null,
                            isAdmin: currentUser.email === ADMIN_EMAIL,
                            isBlocked: false,
                            teamCommission: 0,
                            totalEarnings: 0,
                            joinedAt: serverTimestamp()
                        };
                        
                        setUserData(defaultData);
                        try {
                            await setDoc(userRef, defaultData);
                        } catch (err) {
                            console.error("Failed to create profile", err);
                        }
                    }
                    setLoading(false);
                });
            } else {
                setUserData(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, [auth, db, appId, isDemo]);

    // --- Financial Logic ---

    const distributeCommissions = async (buyerId: string, amount: number) => {
        if (isDemo || !userData || !userData.invitedBy || !db) return;

        let currentReferrerCode = userData.invitedBy;
        let tierIndex = 0;
        
        try {
            const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
            
            while (tierIndex < 5 && currentReferrerCode) {
                const q = query(usersRef, where('referralCode', '==', currentReferrerCode));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) break;

                const referrerDoc = querySnapshot.docs[0];
                const referrerData = referrerDoc.data();
                const commission = amount * REFERRAL_TIERS[tierIndex];

                if (commission > 0) {
                    await updateDoc(referrerDoc.ref, {
                        balance: increment(commission),
                        teamCommission: increment(commission)
                    });
                }

                currentReferrerCode = referrerData.invitedBy;
                tierIndex++;
            }
        } catch (err) {
            console.error("Commission Error", err);
        }
    };

    const handleStartLoop = async (amountStr: string, daysStr: string) => {
        if (!user || !userData || userData.isBlocked) return;
        const amt = parseFloat(amountStr);
        const days = parseInt(daysStr) || 1;
        
        if (isNaN(amt) || amt < LOOP_MIN || amt > LOOP_MAX) {
            showNotification(`Amount must be between $${LOOP_MIN} and $${LOOP_MAX}`, 'error');
            return;
        }
        if (days < 1) {
             showNotification(`Minimum duration is 1 day`, 'error');
             return;
        }
        if (userData.balance < amt) {
            showNotification('Insufficient Brokerage Balance', 'error');
            return;
        }

        const endTime = new Date();
        endTime.setHours(endTime.getHours() + (days * 24));

        if (isDemo) {
            setUserData({
                ...userData,
                balance: userData.balance - amt,
                loopAmount: userData.loopAmount + amt,
                loopEndTime: endTime.getTime(),
                loopStatus: 'active',
                loopDuration: days
            });
            showNotification('Loop Started (Demo Mode)');
            return;
        }

        try {
            const userRef = doc(db!, 'artifacts', appId, 'public', 'data', 'users', user.uid);
            await updateDoc(userRef, {
                balance: increment(-amt),
                loopAmount: increment(amt),
                loopEndTime: endTime.getTime(),
                loopStatus: 'active',
                loopDuration: days
            });

            await distributeCommissions(user.uid, amt);
            showNotification('Loop Started Successfully!');
        } catch (e: any) {
            showNotification(e.message || 'Error starting loop', 'error');
        }
    };

    const handleClaimLoop = async () => {
        if (!userData || !user || userData.loopStatus !== 'active') return;
        
        const now = new Date().getTime();
        if (userData.loopEndTime && now < userData.loopEndTime) {
            showNotification('Loop cycle not finished yet.', 'error');
            return;
        }

        const principal = userData.loopAmount;
        const days = userData.loopDuration || 1;
        // Profit is calculated per day
        const profit = principal * LOOP_PROFIT_PERCENT * days;
        const totalReturn = principal + profit;

        if (isDemo) {
            setUserData({
                ...userData,
                balance: userData.balance + totalReturn,
                loopAmount: 0,
                loopEndTime: null,
                loopStatus: 'idle',
                totalEarnings: userData.totalEarnings + profit,
                loopDuration: 0
            });
            showNotification(`Claimed $${totalReturn.toFixed(2)} to Brokerage Wallet (Demo)!`);
            return;
        }

        try {
            const userRef = doc(db!, 'artifacts', appId, 'public', 'data', 'users', user.uid);
            await updateDoc(userRef, {
                balance: increment(totalReturn),
                loopAmount: 0,
                loopEndTime: null,
                loopStatus: 'idle',
                totalEarnings: increment(profit),
                loopDuration: 0
            });
            showNotification(`Claimed $${totalReturn.toFixed(2)} to Brokerage Wallet!`);
        } catch (e: any) {
            showNotification(e.message || 'Error claiming loop', 'error');
        }
    };

    const handleAddToSavings = async (amountStr: string) => {
        if (!user || !userData) return;
        const amt = parseFloat(amountStr);
        if (isNaN(amt) || amt < SAVING_MIN || amt > SAVING_MAX) {
            showNotification(`Amount must be $${SAVING_MIN} - $${SAVING_MAX}`, 'error');
            return;
        }
        if (userData.balance < amt) {
            showNotification('Insufficient Brokerage Balance', 'error');
            return;
        }

        if (isDemo) {
            setUserData({
                ...userData,
                balance: userData.balance - amt,
                savingsBalance: userData.savingsBalance + amt,
                lastSavingsClaim: new Date().getTime()
            });
            showNotification(`Added $${amt} to Savings (Demo Mode)`);
            return;
        }

        try {
            const userRef = doc(db!, 'artifacts', appId, 'public', 'data', 'users', user.uid);
            await updateDoc(userRef, {
                balance: increment(-amt),
                savingsBalance: increment(amt),
                lastSavingsClaim: new Date().getTime()
            });
             await distributeCommissions(user.uid, amt);
            showNotification(`Added $${amt} to Savings Box`);
        } catch (e: any) {
            showNotification(e.message || 'Error adding savings', 'error');
        }
    };

    const handleClaimSavingsInterest = async () => {
        if (!userData || !user || userData.savingsBalance <= 0) return;

        const now = new Date().getTime();
        const lastClaim = userData.lastSavingsClaim || 0;
        const oneDay = 86400000; 

        if (now - lastClaim < oneDay && !isDemo) { // Allow claiming in demo for testing
            showNotification('You can only claim rewards once every 24 hours.', 'error');
            return;
        }

        const interest = userData.savingsBalance * SAVING_DAILY_PERCENT;

        if (isDemo) {
            setUserData({
                ...userData,
                balance: userData.balance + interest,
                totalEarnings: userData.totalEarnings + interest,
                lastSavingsClaim: now
            });
            showNotification(`Collected Reward: $${interest.toFixed(2)} (Demo)`);
            return;
        }

        try {
            const userRef = doc(db!, 'artifacts', appId, 'public', 'data', 'users', user.uid);
            await updateDoc(userRef, {
                balance: increment(interest),
                totalEarnings: increment(interest),
                lastSavingsClaim: now
            });
            showNotification(`Collected Daily Savings Reward: $${interest.toFixed(2)}`);
        } catch (e: any) {
            showNotification(e.message || 'Error claiming interest', 'error');
        }
    };

    const handleWithdrawSavings = async (amountStr: string) => {
        if (!userData || !user || userData.savingsBalance <= 0) return;
        const amt = parseFloat(amountStr);

        if (isNaN(amt) || amt <= 0) {
            showNotification("Invalid amount", "error");
            return;
        }

        if (amt > userData.savingsBalance) {
             showNotification("Insufficient savings balance", "error");
             return;
        }
        
        if (isDemo) {
            setUserData({
                ...userData,
                balance: userData.balance + amt,
                savingsBalance: userData.savingsBalance - amt
            });
            showNotification(`$${amt} withdrawn to Brokerage Wallet (Demo).`);
            return;
        }

        try {
            const userRef = doc(db!, 'artifacts', appId, 'public', 'data', 'users', user.uid);
            await updateDoc(userRef, {
                balance: increment(amt),
                savingsBalance: increment(-amt)
            });
            showNotification(`$${amt} withdrawn to Brokerage Wallet.`);
        } catch (e: any) {
            showNotification(e.message || 'Error withdrawing savings', 'error');
        }
    };

    // --- Transactions Logic ---

    const handleDepositRequest = async (amount: number) => {
        if (isDemo) {
            const newTx: Transaction = {
                id: 'tx-' + Math.random().toString(36).substr(2, 9),
                userId: user.uid,
                userEmail: user.email,
                type: 'deposit',
                amount: amount,
                status: 'pending',
                createdAt: new Date()
            };
            setMockTransactions([newTx, ...mockTransactions]);
            showNotification('Deposit request submitted to Admin (Demo)');
            return;
        }

        try {
            await addDoc(collection(db!, 'artifacts', appId, 'public', 'data', 'transactions'), {
                userId: user.uid,
                userEmail: userData?.email,
                type: 'deposit',
                amount: amount,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            showNotification('Deposit request submitted. Waiting for approval.');
        } catch (e: any) {
            showNotification('Failed to submit deposit request', 'error');
        }
    };

    const handleWithdrawRequest = async (amount: number, address: string) => {
        if (userData!.balance < amount) {
             showNotification('Insufficient balance', 'error');
             return;
        }

        if (isDemo) {
             const newTx: Transaction = {
                id: 'tx-' + Math.random().toString(36).substr(2, 9),
                userId: user.uid,
                userEmail: user.email,
                type: 'withdraw',
                amount: amount,
                address: address,
                status: 'pending',
                createdAt: new Date()
            };
            setMockTransactions([newTx, ...mockTransactions]);
            // Deduct immediately in demo
            setUserData({...userData!, balance: userData!.balance - amount});
            showNotification('Withdrawal request submitted (Demo)');
            return;
        }

        try {
            // Deduct balance immediately
            const userRef = doc(db!, 'artifacts', appId, 'public', 'data', 'users', user.uid);
            await updateDoc(userRef, { balance: increment(-amount) });

            // Create request
            await addDoc(collection(db!, 'artifacts', appId, 'public', 'data', 'transactions'), {
                userId: user.uid,
                userEmail: userData?.email,
                type: 'withdraw',
                amount: amount,
                address: address,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            showNotification('Withdrawal request submitted. Balance deducted.');
        } catch (e: any) {
             showNotification('Failed to submit withdraw request', 'error');
        }
    };

    const handleApproveTransaction = async (tx: Transaction) => {
        if (isDemo) {
            setMockTransactions(mockTransactions.map(t => 
                t.id === tx.id ? { ...t, status: 'approved' } : t
            ));
            if (tx.type === 'deposit') {
                 // Find user and update (simulated for current user only in demo for simplicity)
                 if (tx.userId === user.uid) {
                     setUserData({...userData!, balance: userData!.balance + tx.amount});
                 }
            }
            showNotification('Transaction Approved (Demo)');
            return;
        }

        try {
            const txRef = doc(db!, 'artifacts', appId, 'public', 'data', 'transactions', tx.id);
            await updateDoc(txRef, { status: 'approved' });

            if (tx.type === 'deposit') {
                const userRef = doc(db!, 'artifacts', appId, 'public', 'data', 'users', tx.userId);
                await updateDoc(userRef, { balance: increment(tx.amount) });
            }
            showNotification('Transaction Approved');
        } catch(e) {
            showNotification('Error approving transaction', 'error');
        }
    };

    const handleRejectTransaction = async (tx: Transaction) => {
        if (isDemo) {
             setMockTransactions(mockTransactions.map(t => 
                t.id === tx.id ? { ...t, status: 'rejected' } : t
            ));
            if (tx.type === 'withdraw' && tx.userId === user.uid) {
                 // Refund
                 setUserData({...userData!, balance: userData!.balance + tx.amount});
            }
            showNotification('Transaction Rejected (Demo)');
            return;
        }

        try {
            const txRef = doc(db!, 'artifacts', appId, 'public', 'data', 'transactions', tx.id);
            await updateDoc(txRef, { status: 'rejected' });

            if (tx.type === 'withdraw') {
                // Refund the user
                const userRef = doc(db!, 'artifacts', appId, 'public', 'data', 'users', tx.userId);
                await updateDoc(userRef, { balance: increment(tx.amount) });
            }
            showNotification('Transaction Rejected. Funds refunded.');
        } catch(e) {
            showNotification('Error rejecting transaction', 'error');
        }
    };

    const handleLogout = () => {
        if (isDemo) {
            setUser(null);
            setUserData(null);
            showNotification('Logged out');
        } else {
            if (auth) signOut(auth);
        }
    };

    // --- Renders ---

    if (loading) return <div className="min-h-screen bg-black text-green-500 flex items-center justify-center font-bold text-xl tracking-widest animate-pulse">LOADING BITNEST...</div>;

    if (!user) {
        return <AuthScreen 
            mode={authMode} 
            setMode={setAuthMode} 
            auth={auth} 
            db={db} 
            appId={appId}
            onError={(msg) => showNotification(msg, 'error')}
            onSuccess={(msg) => showNotification(msg, 'success')}
            notification={notification}
            isDemo={isDemo}
            onMockLogin={handleMockLogin}
        />;
    }

    if (!userData) {
        return <div className="min-h-screen bg-black text-green-500 flex items-center justify-center font-bold text-xl tracking-widest animate-pulse">CREATING PROFILE...</div>;
    }

    if (userData.isBlocked) {
        return <BlockedScreen onLogout={handleLogout} />;
    }

    return (
        <Layout 
            userData={userData}
            currentPage={currentPage} 
            setCurrentPage={setCurrentPage}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            onLogout={handleLogout}
            notification={notification}
        >
            {currentPage === 'home' && <HomeScreen userData={userData} setPage={setCurrentPage} />}
            {currentPage === 'loop' && <LoopScreen userData={userData} onStart={handleStartLoop} onClaim={handleClaimLoop} setPage={setCurrentPage} />}
            {currentPage === 'savings' && <SavingsScreen userData={userData} onAdd={handleAddToSavings} onClaim={handleClaimSavingsInterest} onWithdraw={handleWithdrawSavings} setPage={setCurrentPage} />}
            {currentPage === 'team' && <TeamScreen userData={userData} db={db} appId={appId} isDemo={isDemo} />}
            {currentPage === 'wallet' && <WalletScreen 
                userData={userData} 
                db={db}
                auth={auth}
                appId={appId} 
                user={user} 
                showNotification={showNotification} 
                isDemo={isDemo} 
                onDepositRequest={handleDepositRequest}
                onWithdrawRequest={handleWithdrawRequest}
                mockTransactions={mockTransactions}
            />}
            {currentPage === 'admin' && <AdminPanel 
                db={db} 
                appId={appId} 
                currentUser={userData} 
                showNotification={showNotification} 
                isDemo={isDemo} 
                mockTransactions={mockTransactions}
                onApprove={handleApproveTransaction}
                onReject={handleRejectTransaction}
            />}
            {currentPage === 'partners' && <PartnerScreen setPage={setCurrentPage} />}
        </Layout>
    );
}