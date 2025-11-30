import React, { useState, useEffect } from 'react';
import { UserData, Transaction } from '../types';
import { User, updatePassword, reauthenticateWithCredential, EmailAuthProvider, Auth } from 'firebase/auth';
import { Firestore, doc, updateDoc, collection, query, where, getDocs, orderBy, increment } from 'firebase/firestore';
import { User as UserIcon, Shield, History, ArrowLeft, Save, Copy, CheckCircle2, AlertCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface ProfileScreenProps {
    userData: UserData;
    user: User;
    db: Firestore | null;
    auth: Auth | null;
    appId: string;
    setPage: (page: string) => void;
    showNotification: (msg: string, type?: 'success' | 'error') => void;
    isDemo: boolean;
}

export default function ProfileScreen({ 
    userData, 
    user, 
    db, 
    auth, 
    appId, 
    setPage, 
    showNotification,
    isDemo
}: ProfileScreenProps) {
    const [activeTab, setActiveTab] = useState<'info' | 'security' | 'history'>('info');
    const [isLoading, setIsLoading] = useState(false);

    // Profile State
    const [username, setUsername] = useState(userData.username || '');
    const [nickname, setNickname] = useState(userData.nickname || '');
    const [manualReferral, setManualReferral] = useState('');

    // Security State
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    // History State
    const [historyTab, setHistoryTab] = useState<'deposit' | 'withdraw'>('deposit');
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    // Fetch Transactions for History
    useEffect(() => {
        if (activeTab === 'history') {
            if (isDemo) {
                const saved = localStorage.getItem('bitnest_transactions');
                if (saved) {
                    const allTxs: Transaction[] = JSON.parse(saved);
                    setTransactions(allTxs.filter(t => t.userId === user.uid));
                }
                return;
            }

            if (!db) return;
            const fetchHistory = async () => {
                const q = query(
                    collection(db, 'artifacts', appId, 'public', 'data', 'transactions'),
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                const snap = await getDocs(q);
                setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
            };
            fetchHistory();
        }
    }, [activeTab, db, appId, user.uid, isDemo]);

    // --- Actions ---

    const handleUpdateProfile = async () => {
        setIsLoading(true);
        if (isDemo) {
            const key = `bitnest_data_${user.email}`;
            const stored = JSON.parse(localStorage.getItem(key) || '{}');
            const updated = { ...stored, username, nickname };
            localStorage.setItem(key, JSON.stringify(updated));
            // Note: Parent component needs to detect this change or we need a refresh. 
            // For now, demo update acts locally.
            showNotification('Profile updated (Demo)');
            setIsLoading(false);
            return;
        }

        try {
            const userRef = doc(db!, 'artifacts', appId, 'public', 'data', 'users', user.uid);
            await updateDoc(userRef, { username, nickname });
            showNotification('Profile updated successfully');
        } catch (e) {
            showNotification('Failed to update profile', 'error');
        }
        setIsLoading(false);
    };

    const handleManualReferral = async () => {
        if (!manualReferral) return;
        if (manualReferral === userData.referralCode) {
            showNotification("You cannot refer yourself", 'error');
            return;
        }
        
        setIsLoading(true);
        const code = manualReferral.trim().toUpperCase();

        if (isDemo) {
            // Demo Logic
            const key = `bitnest_data_${user.email}`;
            const stored = JSON.parse(localStorage.getItem(key) || '{}');
            stored.invitedBy = code;
            localStorage.setItem(key, JSON.stringify(stored));
            showNotification('Referral linked (Demo)');
            setIsLoading(false);
            return;
        }

        try {
            // 1. Verify code exists
            const usersRef = collection(db!, 'artifacts', appId, 'public', 'data', 'users');
            const q = query(usersRef, where('referralCode', '==', code));
            const snap = await getDocs(q);

            if (snap.empty) {
                showNotification("Invalid referral code", 'error');
                setIsLoading(false);
                return;
            }

            const referrerDoc = snap.docs[0];
            
            // 2. Update current user
            const userRef = doc(db!, 'artifacts', appId, 'public', 'data', 'users', user.uid);
            await updateDoc(userRef, { invitedBy: code });

            // 3. Increment referrer team count
            await updateDoc(referrerDoc.ref, { teamCount: increment(1) });

            showNotification("Referral code linked successfully!");
            setManualReferral('');
        } catch (e) {
            showNotification('Error linking referral', 'error');
        }
        setIsLoading(false);
    };

    const handleChangePassword = async () => {
        if (newPass !== confirmPass) return showNotification("New passwords do not match", 'error');
        if (newPass.length < 6) return showNotification("Password must be 6+ chars", 'error');
        if (isDemo) return showNotification("Password change simulated (Demo)", 'success');

        setIsLoading(true);
        try {
            if (!auth || !user.email) throw new Error("Auth Error");
            
            // Re-authenticate
            const credential = EmailAuthProvider.credential(user.email, currentPass);
            await reauthenticateWithCredential(user, credential);
            
            // Update
            await updatePassword(user, newPass);
            
            showNotification("Password changed successfully");
            setCurrentPass('');
            setNewPass('');
            setConfirmPass('');
        } catch (e: any) {
            showNotification(e.message || "Failed to change password", 'error');
        }
        setIsLoading(false);
    };

    const copyCode = () => {
        navigator.clipboard.writeText(userData.referralCode);
        showNotification("Invite code copied");
    };

    return (
        <div className="max-w-4xl mx-auto animate-fade-in pb-10">
            <button 
                onClick={() => setPage('home')}
                className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition text-sm font-medium"
            >
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            <div className="grid md:grid-cols-4 gap-6">
                {/* Sidebar Tabs */}
                <div className="md:col-span-1 space-y-2">
                    <button 
                        onClick={() => setActiveTab('info')}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === 'info' ? 'bg-green-500 text-black font-bold' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                        <UserIcon size={18} /> Profile Info
                    </button>
                    <button 
                        onClick={() => setActiveTab('security')}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === 'security' ? 'bg-green-500 text-black font-bold' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                        <Shield size={18} /> Security
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${activeTab === 'history' ? 'bg-green-500 text-black font-bold' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                        <History size={18} /> History
                    </button>
                </div>

                {/* Content Area */}
                <div className="md:col-span-3 bg-gray-800 rounded-2xl p-6 border border-gray-700">
                    
                    {/* INFO TAB */}
                    {activeTab === 'info' && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Personal Information</h3>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Display Name (Username)</label>
                                    <input 
                                        value={username} 
                                        onChange={e => setUsername(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-green-500 outline-none"
                                        placeholder="Enter Username"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Nickname</label>
                                    <input 
                                        value={nickname} 
                                        onChange={e => setNickname(e.target.value)}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-green-500 outline-none"
                                        placeholder="Enter Nickname"
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleUpdateProfile}
                                disabled={isLoading}
                                className="bg-green-500 hover:bg-green-400 text-black font-bold py-2 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save size={18} /> Save Changes
                            </button>

                            <h3 className="text-xl font-bold text-white mt-8 mb-4 border-b border-gray-700 pb-2">Referral Status</h3>
                            
                            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">My Invite Code</p>
                                    <p className="text-2xl font-mono text-green-500 font-bold tracking-wider">{userData.referralCode}</p>
                                </div>
                                <button onClick={copyCode} className="text-gray-400 hover:text-white p-2 bg-gray-800 rounded-lg"><Copy size={20}/></button>
                            </div>

                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold mb-2">Referred By</p>
                                {userData.invitedBy ? (
                                    <div className="flex items-center gap-2 text-green-500 bg-green-900/20 p-3 rounded-lg border border-green-500/30">
                                        <CheckCircle2 size={18} />
                                        <span className="font-mono font-bold">Linked: {userData.invitedBy}</span>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <input 
                                            value={manualReferral}
                                            onChange={e => setManualReferral(e.target.value)}
                                            placeholder="Enter Friend's Code"
                                            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-green-500 outline-none"
                                        />
                                        <button 
                                            onClick={handleManualReferral}
                                            disabled={isLoading || !manualReferral}
                                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 rounded-lg disabled:opacity-50"
                                        >
                                            Link
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* SECURITY TAB */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Change Password</h3>
                            
                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg flex items-start gap-3 text-yellow-500 text-sm mb-4">
                                <AlertCircle size={20} className="shrink-0" />
                                <p>For security reasons, you must verify your current password before creating a new one.</p>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Current Password</label>
                                <input 
                                    type="password"
                                    value={currentPass}
                                    onChange={e => setCurrentPass(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-green-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold block mb-1">New Password</label>
                                <input 
                                    type="password"
                                    value={newPass}
                                    onChange={e => setNewPass(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-green-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Confirm New Password</label>
                                <input 
                                    type="password"
                                    value={confirmPass}
                                    onChange={e => setConfirmPass(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:border-green-500 outline-none"
                                />
                            </div>

                            <button 
                                onClick={handleChangePassword}
                                disabled={isLoading || !currentPass || !newPass}
                                className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-lg shadow-lg disabled:opacity-50 mt-4"
                            >
                                {isLoading ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>
                    )}

                    {/* HISTORY TAB */}
                    {activeTab === 'history' && (
                        <div>
                            <div className="flex gap-2 mb-6 border-b border-gray-700 pb-4">
                                <button 
                                    onClick={() => setHistoryTab('deposit')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition ${historyTab === 'deposit' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white bg-gray-900'}`}
                                >
                                    Deposit History
                                </button>
                                <button 
                                    onClick={() => setHistoryTab('withdraw')}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition ${historyTab === 'withdraw' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white bg-gray-900'}`}
                                >
                                    Withdrawal History
                                </button>
                            </div>

                            <div className="space-y-3">
                                {transactions.filter(t => t.type === historyTab).length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">No {historyTab} transactions found.</p>
                                ) : (
                                    transactions
                                        .filter(t => t.type === historyTab)
                                        .map(tx => (
                                            <div key={tx.id} className="bg-gray-900 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-full ${tx.type === 'deposit' ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'}`}>
                                                        {tx.type === 'deposit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-white capitalize">{tx.type} Request</p>
                                                        <p className="text-xs text-gray-500">{new Date(tx.createdAt?.seconds ? tx.createdAt.seconds * 1000 : tx.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-mono font-bold text-white">${tx.amount.toFixed(2)}</p>
                                                    <div className="flex items-center justify-end gap-1 text-xs">
                                                        <span className={`px-2 py-0.5 rounded font-bold ${
                                                            tx.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                                                            tx.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                                                            'bg-yellow-500/20 text-yellow-500'
                                                        }`}>
                                                            {tx.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}