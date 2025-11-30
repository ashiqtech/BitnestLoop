import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithCustomToken, 
    onAuthStateChanged, 
    signOut,
    setPersistence,
    browserLocalPersistence,
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
            // Check for window variable or environment variable
            return JSON.parse((window as any).__firebase_config || '{}');
        } catch {
            return {};
        }
    }, []);
    
    const appId = (window as any).__app_id || 'bitnest-default';
    
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
        const authInstance = getAuth(app);
        // Persistence is handled dynamically in AuthScreen for Real Mode
        return authInstance;
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
    const handleMockLogin = (email: string, remember: boolean = true, showNotify: boolean = true) => {
        const mockUser = { uid: 'demo-user-' + email.replace(/[^a-zA-Z0-9]/g, ''), email: email };
        
        // Retrieve stored data or create default
        let storedData = null;
        try {
            const saved = localStorage.getItem(`bitnest_data_${email}`);
            if (saved) storedData = JSON.parse(saved);
        } catch (e) {}

        const defaultMockData: UserData = {
            email: email,
            balance: 0,
            loopAmount: 0,
            loopEndTime: null,
            loopStatus: 'idle',
            savingsBalance: 0,
            referralCode: 'BN' + Math.floor(100000 + Math.random() * 900000),
            invitedBy: null,
            isAdmin: email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
            isBlocked: false,
            teamCommission: 0,
            totalEarnings: 0,
            joinedAt: new Date().toISOString()
        };
        
        const finalData = storedData || defaultMockData;

        // Inject team count for demo
        try {
            const code = finalData.referralCode.trim().toUpperCase();
            const count = parseInt(localStorage.getItem(`bitnest_demo_team_${code}`) || '0');
            finalData.teamCount = count;
        } catch (e) {}

        setUser(mockUser);
        setUserData(finalData);
        setLoading(false);
        
        // Save session based on Remember Me
        if (remember) {
            localStorage.setItem('bitnest_demo_session', email);
            sessionStorage.removeItem('bitnest_demo_session');
        } else {
            sessionStorage.setItem('bitnest_demo_session', email);
            localStorage.removeItem('bitnest_demo_session');
        }
        
        // Always save user data to localStorage so it persists between sessions even if login session expires
        localStorage.setItem(`bitnest_data_${email}`, JSON.stringify(finalData));
        
        if (showNotify) showNotification('Signed in successfully');
    };

    // --- Auth & Profile Sync ---
    useEffect(() => {
        // Persistence Logic for Demo
        if (isDemo) {
            // Load transactions from local storage
            const savedTxs = localStorage.getItem('bitnest_transactions');
            if (savedTxs) {
                setMockTransactions(JSON.parse(savedTxs));
            }

            const localSession = localStorage.getItem('bitnest_demo_session');
            const sessionSession = sessionStorage.getItem('bitnest_demo_session');
            const savedSession = localSession || sessionSession;

            if (savedSession) {
                handleMockLogin(savedSession, !!localSession, false);
            } else {
                setLoading(false);
            }
            return;
        }

        if (!auth || !db) return;

        const initAuth = async () => {
            if ((window as any).__initial_auth_token) {
                try {
                    await signInWithCustomToken(auth, (window as any).__initial_auth_token);
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
                        
                        // Fetch Team Count Live for UI Badge
                        try {
                             const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('invitedBy', '==', data.referralCode));
                             const countSnap = await getDocs(q);
                             data.teamCount = countSnap.size;
                        } catch(e) {
                             console.log("Error fetching team count", e);
                        }

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
                            joinedAt: serverTimestamp(),
                            teamCount: 0
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

    // Save Demo Data on Change
    useEffect(() => {
        if (isDemo && userData && user) {
            localStorage.setItem(`bitnest_data_${user.email}`, JSON.stringify(userData));
        }
    }, [userData, isDemo, user]);

    // Save Demo Transactions on Change
    useEffect(() => {
        if (isDemo) {
            localStorage.setItem('bitnest_transactions', JSON.stringify(mockTransactions));
        }
    }, [mockTransactions, isDemo]);

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
            showNotification('Loop Started Successfully');
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
            showNotification(`Claimed $${totalReturn.toFixed(2)} to Brokerage Wallet!`);
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
            showNotification(`Added $${amt} to Savings Box`);
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

        if (now - lastClaim < oneDay && !isDemo) { 
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
            showNotification(`Collected Daily Savings Reward: $${interest.toFixed(2)}`);
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
            showNotification(`$${amt} withdrawn to Brokerage Wallet.`);
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
                createdAt: new Date().toISOString()
            };
            setMockTransactions([newTx, ...mockTransactions]);
            showNotification('Deposit request submitted to Admin');
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
                createdAt: new Date().toISOString()
            };
            setMockTransactions([newTx, ...mockTransactions]);
            // Deduct immediately in demo
            setUserData({...userData!, balance: userData!.balance - amount});
            showNotification('Withdrawal request submitted');
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
                 // We need to update the specific user's balance in local storage
                 const userKey = `bitnest_data_${tx.userEmail}`;
                 const storedUser = localStorage.getItem(userKey);
                 if (storedUser) {
                     const uData = JSON.parse(storedUser);
                     uData.balance += tx.amount;
                     localStorage.setItem(userKey, JSON.stringify(uData));
                     
                     // If it's the current user, update state
                     if (user.email === tx.userEmail) {
                         setUserData({...userData!, balance: userData!.balance + tx.amount});
                     }
                 }
            }
            showNotification('Transaction Approved');
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
            
            if (tx.type === 'withdraw') {
                 // Refund the user in local storage
                 const userKey = `bitnest_data_${tx.userEmail}`;
                 const storedUser = localStorage.getItem(userKey);
                 if (storedUser) {
                     const uData = JSON.parse(storedUser);
                     uData.balance += tx.amount;
                     localStorage.setItem(userKey, JSON.stringify(uData));

                     // If it's the current user, update state
                     if (user.email === tx.userEmail) {
                         setUserData({...userData!, balance: userData!.balance + tx.amount});
                     }
                 }
            }
            showNotification('Transaction Rejected');
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
            localStorage.removeItem('bitnest_demo_session');
            sessionStorage.removeItem('bitnest_demo_session');
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