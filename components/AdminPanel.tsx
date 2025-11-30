import React, { useState, useEffect, useMemo } from 'react';
import { UserData, Transaction } from '../types';
import { Firestore, collection, query, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { ADMIN_EMAIL } from '../constants';

interface AdminPanelProps {
    db: Firestore | null;
    appId: string;
    currentUser: UserData;
    showNotification: (msg: string, type?: 'success' | 'error') => void;
    isDemo: boolean;
    mockTransactions?: Transaction[];
    onApprove?: (tx: Transaction) => void;
    onReject?: (tx: Transaction) => void;
}

export default function AdminPanel({ 
    db, 
    appId, 
    currentUser, 
    showNotification, 
    isDemo,
    mockTransactions,
    onApprove,
    onReject
}: AdminPanelProps) {
    const [tab, setTab] = useState<'users' | 'requests'>('users');
    const [allUsers, setAllUsers] = useState<(UserData & { id: string })[]>([]);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [selectedUser, setSelectedUser] = useState<(UserData & { id: string }) | null>(null);
    const [editBalance, setEditBalance] = useState<number | string>(0);
    const [editLoop, setEditLoop] = useState<number | string>(0);
    const [editSavings, setEditSavings] = useState<number | string>(0);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Calculate Referral Counts Live
    const referralCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        allUsers.forEach(u => {
            if (u.invitedBy) {
                // Normalize code just in case
                const code = u.invitedBy.trim().toUpperCase();
                counts[code] = (counts[code] || 0) + 1;
            }
        });
        return counts;
    }, [allUsers]);

    // Fetch Users
    useEffect(() => {
        if (!currentUser?.isAdmin) return;
        
        if (isDemo) {
            // "Real" Admin Panel for Demo Mode: Scan Local Storage
            const users: (UserData & { id: string })[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('bitnest_data_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key) || '{}');
                        if (data.email) {
                            users.push({
                                ...data,
                                id: 'uid-' + data.email.replace(/[^a-zA-Z0-9]/g, '')
                            });
                        }
                    } catch (e) {
                        console.error("Error parsing user data", key);
                    }
                }
            }
            setAllUsers(users);
            return;
        }

        if (!db) return;

        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
        const unsub = onSnapshot(q, (snap) => {
            const users = snap.docs.map(d => ({id: d.id, ...d.data()} as UserData & { id: string }));
            setAllUsers(users);
        });
        return () => unsub();
    }, [currentUser, db, appId, isDemo, refreshTrigger]);

    // Fetch Transactions
    useEffect(() => {
        if (!currentUser?.isAdmin) return;

        if (isDemo && mockTransactions) {
            setAllTransactions(mockTransactions);
            return;
        }

        if (!db) return;

        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const txs = snap.docs.map(d => ({id: d.id, ...d.data()} as Transaction));
            setAllTransactions(txs);
        });
        return () => unsub();
    }, [currentUser, db, appId, isDemo, mockTransactions]);

    const handleAction = async (userId: string, action: string) => {
        if (isDemo) {
            // "Real" Action Implementation for Demo Mode
            const targetUser = allUsers.find(u => u.id === userId);
            if (!targetUser) return;

            const key = `bitnest_data_${targetUser.email}`;
            const storedData = localStorage.getItem(key);
            
            if (storedData) {
                const data = JSON.parse(storedData);
                
                if (action === 'block') data.isBlocked = true;
                if (action === 'unblock') data.isBlocked = false;
                if (action === 'reset_balance') {
                    data.balance = 0;
                    data.savingsBalance = 0;
                    data.loopAmount = 0;
                }
                if (action === 'update_balance') {
                    data.balance = parseFloat(editBalance.toString());
                    data.loopAmount = parseFloat(editLoop.toString());
                    data.savingsBalance = parseFloat(editSavings.toString());
                }

                localStorage.setItem(key, JSON.stringify(data));
                setRefreshTrigger(prev => prev + 1); // Refresh the list
                setSelectedUser(null);
                showNotification('User updated successfully');
            }
            return;
        }

        const userRef = doc(db!, 'artifacts', appId, 'public', 'data', 'users', userId);
        try {
            if (action === 'block') await updateDoc(userRef, { isBlocked: true });
            if (action === 'unblock') await updateDoc(userRef, { isBlocked: false });
            if (action === 'reset_balance') await updateDoc(userRef, { balance: 0, savingsBalance: 0, loopAmount: 0 });
            if (action === 'update_balance') {
                await updateDoc(userRef, { 
                    balance: parseFloat(editBalance.toString()),
                    loopAmount: parseFloat(editLoop.toString()),
                    savingsBalance: parseFloat(editSavings.toString())
                });
                setSelectedUser(null);
            }
            showNotification('Action successful');
        } catch (e) {
            showNotification('Error executing admin action', 'error');
        }
    };

    const openEdit = (user: UserData & { id: string }) => {
        setSelectedUser(user);
        setEditBalance(user.balance);
        setEditLoop(user.loopAmount);
        setEditSavings(user.savingsBalance);
    };

    return (
        <div className="max-w-7xl mx-auto animate-fade-in">
            <h2 className="text-3xl font-black text-red-500 mb-6 border-b border-red-900 pb-4 tracking-tighter">
                SUPER ADMIN PANEL
            </h2>

            {/* Admin Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-blue-500">
                    <p className="text-gray-400 text-xs uppercase">Total Users</p>
                    <p className="text-2xl font-bold">{allUsers.length}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-green-500">
                    <p className="text-gray-400 text-xs uppercase">User Holdings</p>
                    <p className="text-2xl font-bold">${allUsers.reduce((acc, u) => acc + (u.balance||0) + (u.savingsBalance||0) + (u.loopAmount||0), 0).toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-yellow-500">
                    <p className="text-gray-400 text-xs uppercase">Pending Requests</p>
                    <p className="text-2xl font-bold">{allTransactions.filter(t => t.status === 'pending').length}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-purple-500">
                    <p className="text-gray-400 text-xs uppercase">Total Referrals</p>
                    <p className="text-2xl font-bold">{allUsers.filter(u => u.invitedBy).length}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
                <button 
                    onClick={() => setTab('users')} 
                    className={`px-6 py-2 rounded-lg font-bold transition ${tab === 'users' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                    User Management
                </button>
                <button 
                    onClick={() => setTab('requests')} 
                    className={`px-6 py-2 rounded-lg font-bold transition ${tab === 'requests' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                >
                    Transaction Requests
                </button>
            </div>

            {tab === 'users' ? (
                <div className="bg-gray-800 rounded-xl overflow-hidden overflow-x-auto border border-gray-700">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-900 text-gray-400 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">User Details</th>
                                <th className="p-4">Assets</th>
                                <th className="p-4">Ref Stats</th>
                                <th className="p-4">Invited By</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {allUsers.map(u => (
                                <tr key={u.id} className="hover:bg-gray-700/50 transition">
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white">{u.email}</span>
                                            <span className="text-[10px] text-gray-500 font-mono">UID: {u.id}</span>
                                            {u.isAdmin && <span className="text-red-500 text-[10px] font-bold border border-red-500 px-1 rounded w-fit mt-1">ADMIN</span>}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col text-xs">
                                            <span className="text-green-400">Wallet: ${u.balance?.toFixed(2)}</span>
                                            <span className="text-yellow-500">Loop: ${u.loopAmount?.toFixed(2)}</span>
                                            <span className="text-blue-400">Savings: ${u.savingsBalance?.toFixed(2)}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3 font-bold text-white">
                                            <div className="text-center">
                                                <div className="bg-gray-700 px-2 py-0.5 rounded text-xs">{u.referralClicks || 0}</div>
                                                <span className="text-[9px] text-gray-500 font-normal">Clicks</span>
                                            </div>
                                            <div className="text-center">
                                                <div className="bg-blue-900 px-2 py-0.5 rounded text-xs text-blue-200">{u.teamCount || 0}</div>
                                                <span className="text-[9px] text-gray-500 font-normal">Joins</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs">
                                        <div className="flex flex-col">
                                            <span className="text-gray-300">Code: {u.referralCode}</span>
                                            <span className="text-gray-500">{u.invitedBy ? `By: ${u.invitedBy}` : 'No Inviter'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {u.isBlocked ? <span className="text-red-500 font-bold bg-red-900/20 px-2 py-1 rounded text-xs">BLOCKED</span> : <span className="text-green-500 bg-green-900/20 px-2 py-1 rounded text-xs">Active</span>}
                                    </td>
                                    <td className="p-4 flex gap-2">
                                        {u.email !== ADMIN_EMAIL && (
                                            <>
                                                <button 
                                                    onClick={() => openEdit(u)}
                                                    className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-white text-xs font-bold transition"
                                                >
                                                    Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(u.id, u.isBlocked ? 'unblock' : 'block')}
                                                    className={`px-3 py-1 rounded text-white text-xs font-bold transition ${u.isBlocked ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500'}`}
                                                >
                                                    {u.isBlocked ? 'Unblock' : 'Block'}
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if(confirm('DANGER: Reset Balance to 0?')) handleAction(u.id, 'reset_balance');
                                                    }}
                                                    className="bg-gray-700 hover:bg-red-900 text-red-500 px-3 py-1 rounded text-xs font-bold transition"
                                                >
                                                    Zero
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-900 text-gray-400 uppercase text-xs font-bold">
                            <tr>
                                <th className="p-4">Type</th>
                                <th className="p-4">User</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4">Details</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {allTransactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-gray-700/50 transition">
                                    <td className="p-4 font-bold uppercase text-xs">{tx.type}</td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-white text-xs">{tx.userEmail}</span>
                                            <span className="text-[10px] text-gray-500 font-mono">{tx.userId}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono font-bold text-white">${tx.amount.toFixed(2)}</td>
                                    <td className="p-4 text-xs max-w-xs truncate">
                                        {tx.type === 'withdraw' ? `To: ${tx.address}` : 'Deposit Request'}
                                    </td>
                                    <td className="p-4">
                                        {tx.status === 'pending' && <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded text-xs font-bold">PENDING</span>}
                                        {tx.status === 'approved' && <span className="bg-green-500/20 text-green-500 px-2 py-1 rounded text-xs font-bold">APPROVED</span>}
                                        {tx.status === 'rejected' && <span className="bg-red-500/20 text-red-500 px-2 py-1 rounded text-xs font-bold">REJECTED</span>}
                                    </td>
                                    <td className="p-4">
                                        {tx.status === 'pending' && onApprove && onReject && (
                                            <div className="flex gap-2">
                                                <button onClick={() => onApprove(tx)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs font-bold">Approve</button>
                                                <button onClick={() => onReject(tx)} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-bold">Reject</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {allTransactions.length === 0 && <p className="text-center p-8 text-gray-500">No transactions found.</p>}
                </div>
            )}

            {/* Edit Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-gray-800 p-6 rounded-xl w-full max-w-sm border border-gray-700 shadow-2xl">
                        <h3 className="font-bold mb-4 text-white">Edit Assets for <span className="text-green-500 block text-sm truncate">{selectedUser.email}</span></h3>
                        
                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Wallet Balance</label>
                                <input 
                                    type="number" 
                                    value={editBalance} 
                                    onChange={(e) => setEditBalance(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 p-2 rounded text-white focus:border-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Active Loop Amount</label>
                                <input 
                                    type="number" 
                                    value={editLoop} 
                                    onChange={(e) => setEditLoop(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 p-2 rounded text-white focus:border-green-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase">Savings Balance</label>
                                <input 
                                    type="number" 
                                    value={editSavings} 
                                    onChange={(e) => setEditSavings(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 p-2 rounded text-white focus:border-green-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => handleAction(selectedUser.id, 'update_balance')} className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold py-2 rounded-lg transition">Save</button>
                            <button onClick={() => setSelectedUser(null)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}