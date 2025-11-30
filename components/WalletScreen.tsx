import React, { useState, useEffect } from 'react';
import { UserData, Transaction } from '../types';
import { Firestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { User, EmailAuthProvider, reauthenticateWithCredential, Auth } from 'firebase/auth';
import { Copy, QrCode, ArrowDownLeft, ArrowUpRight, Clock, CheckCircle2, XCircle, Lock } from 'lucide-react';

interface WalletScreenProps {
    userData: UserData;
    db: Firestore | null;
    auth: Auth | null;
    appId: string;
    user: User;
    showNotification: (msg: string, type?: 'success' | 'error') => void;
    isDemo: boolean;
    onDepositRequest: (amount: number) => void;
    onWithdrawRequest: (amount: number, address: string) => void;
    mockTransactions?: Transaction[];
}

export default function WalletScreen({ 
    userData, 
    db, 
    auth,
    appId, 
    user, 
    showNotification, 
    isDemo, 
    onDepositRequest, 
    onWithdrawRequest,
    mockTransactions 
}: WalletScreenProps) {
    const [action, setAction] = useState<'deposit' | 'withdraw'>('deposit');
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawPassword, setWithdrawPassword] = useState('');
    const [depositReqAmount, setDepositReqAmount] = useState('');
    const [myTransactions, setMyTransactions] = useState<Transaction[]>([]);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (isDemo && mockTransactions) {
            setMyTransactions(mockTransactions.filter(t => t.userId === user.uid).sort((a,b) => b.createdAt - a.createdAt));
            return;
        }

        if (!db) return;

        const fetchTx = async () => {
            try {
                const q = query(
                    collection(db, 'artifacts', appId, 'public', 'data', 'transactions'),
                    where('userId', '==', user.uid),
                    orderBy('createdAt', 'desc'),
                    limit(10)
                );
                const snap = await getDocs(q);
                const txs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
                setMyTransactions(txs);
            } catch (e) {
                console.error("Error fetching transactions", e);
            }
        };
        fetchTx();
    }, [db, appId, user.uid, isDemo, mockTransactions]);

    const handleWithdrawSubmit = async () => {
        const amt = parseFloat(withdrawAmount);
        if (amt < 10) return showNotification('Minimum withdraw is $10', 'error');
        if (!withdrawAddress.startsWith('0x')) return showNotification('Invalid BEP20 Address', 'error');
        if (!withdrawPassword) return showNotification('Password required', 'error');

        setProcessing(true);

        if (!isDemo && auth && user.email) {
            try {
                const credential = EmailAuthProvider.credential(user.email, withdrawPassword);
                await reauthenticateWithCredential(user, credential);
            } catch (e) {
                 console.error(e);
                 setProcessing(false);
                 return showNotification('Incorrect Password. Withdrawal Failed.', 'error');
            }
        }
        
        onWithdrawRequest(amt, withdrawAddress);
        setWithdrawAmount('');
        setWithdrawAddress('');
        setWithdrawPassword('');
        setProcessing(false);
    };

    const handleDepositSubmit = () => {
        const amt = parseFloat(depositReqAmount);
        if (amt < 10) return showNotification('Minimum deposit is $10', 'error');
        
        onDepositRequest(amt);
        setDepositReqAmount('');
    };

    const copyAddress = () => {
        navigator.clipboard.writeText("0x6276807869ff608bf0d2a02e10136969bd4353c4");
        showNotification("Address copied to clipboard");
    }

    return (
        <div className="max-w-2xl mx-auto animate-fade-in pb-10">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Brokerage Wallet</h2>
            
            <div className="flex gap-4 mb-8 bg-gray-800 p-1.5 rounded-2xl border border-gray-700">
                <button 
                    onClick={() => setAction('deposit')} 
                    className={`flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${action === 'deposit' ? 'bg-green-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <ArrowDownLeft size={18} /> Deposit
                </button>
                <button 
                    onClick={() => setAction('withdraw')} 
                    className={`flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${action === 'withdraw' ? 'bg-green-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <ArrowUpRight size={18} /> Withdraw
                </button>
            </div>

            {action === 'deposit' ? (
                <div className="bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-700 text-center relative overflow-hidden">
                    <h3 className="text-xl font-bold mb-6 text-white">Deposit USDT (BEP20)</h3>
                    
                    <div className="bg-white p-4 inline-block rounded-xl mb-6 shadow-xl">
                         <div className="w-40 h-40 bg-gray-100 flex items-center justify-center text-gray-800 rounded-lg border-2 border-dashed border-gray-300">
                            <QrCode size={64} className="opacity-50" />
                         </div>
                    </div>
                    
                    <p className="text-sm text-gray-400 mb-2">Deposit Address (BNB Smart Chain)</p>
                    <div 
                        onClick={copyAddress}
                        className="bg-gray-900 p-4 rounded-xl flex justify-between items-center break-all text-xs md:text-sm font-mono text-green-500 border border-green-500/30 cursor-pointer hover:bg-gray-900/80 transition"
                    >
                        <span className="truncate mr-2">0x6276807869ff608bf0d2a02e10136969bd4353c4</span>
                        <Copy size={16} className="text-white flex-shrink-0" />
                    </div>

                    <div className="mt-8 bg-gray-900/50 p-4 rounded-xl border border-gray-700 text-left">
                        <h4 className="font-bold text-white mb-3 text-sm uppercase">Notify Admin of Transfer</h4>
                        <div className="flex gap-2">
                            <input 
                                type="number" 
                                value={depositReqAmount} 
                                onChange={(e) => setDepositReqAmount(e.target.value)}
                                placeholder="Enter Amount Sent ($)" 
                                className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-green-500 outline-none"
                            />
                            <button onClick={handleDepositSubmit} className="bg-green-500 hover:bg-green-400 text-black px-4 py-2 rounded-lg font-bold text-sm">
                                Submit Request
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">After transferring funds, enter the exact amount above to speed up the approval process.</p>
                    </div>

                    <div className="mt-6 text-left text-xs text-gray-500 space-y-2 bg-black/20 p-4 rounded-lg">
                        <p className="flex items-center gap-2"><span className="w-1 h-1 bg-green-500 rounded-full"></span> Minimum deposit: $10</p>
                        <p className="flex items-center gap-2"><span className="w-1 h-1 bg-green-500 rounded-full"></span> Only send USDT (BEP20).</p>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-800 p-6 md:p-8 rounded-2xl border border-gray-700">
                    <h3 className="text-xl font-bold mb-6 text-white">Withdraw USDT</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider font-bold">Address (BEP20)</label>
                            <input 
                                value={withdrawAddress}
                                onChange={(e) => setWithdrawAddress(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white focus:border-green-500 outline-none transition" 
                                placeholder="0x..." 
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider font-bold">Amount (Min $10)</label>
                            <div className="relative">
                                <input 
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white focus:border-green-500 outline-none transition" 
                                    placeholder="0.00" 
                                />
                                <button onClick={() => setWithdrawAmount(userData.balance.toString())} className="absolute right-3 top-3 text-xs bg-gray-800 text-green-500 px-2 py-1 rounded border border-gray-700 hover:border-green-500 transition">MAX</button>
                            </div>
                        </div>
                        <div>
                             <label className="text-xs text-gray-400 mb-2 block uppercase tracking-wider font-bold">Security Password</label>
                             <div className="relative">
                                <input 
                                    type="password"
                                    value={withdrawPassword}
                                    onChange={(e) => setWithdrawPassword(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white focus:border-green-500 outline-none transition pl-10" 
                                    placeholder="Enter Login Password" 
                                />
                                <Lock className="absolute left-3 top-4 text-gray-500" size={18} />
                            </div>
                        </div>

                        <div className="flex justify-between text-sm text-gray-400 pt-2 border-t border-gray-700">
                            <span>Available in Brokerage:</span>
                            <span className="text-white font-mono">${userData.balance.toFixed(2)}</span>
                        </div>
                        <button 
                            disabled={processing}
                            onClick={handleWithdrawSubmit}
                            className="w-full bg-green-500 text-black font-bold py-4 rounded-xl mt-4 hover:bg-green-400 transition shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:bg-gray-600 disabled:text-gray-400"
                        >
                            {processing ? 'Verifying...' : 'Request Withdrawal'}
                        </button>
                        <p className="text-xs text-gray-500 text-center">Withdrawals are processed manually by admin within 24 hours.</p>
                    </div>
                </div>
            )}

            {/* Recent Transactions List */}
            <div className="mt-8">
                <h3 className="text-gray-400 text-sm font-bold uppercase mb-4">Recent Requests</h3>
                <div className="space-y-3">
                    {myTransactions.length === 0 ? (
                        <p className="text-gray-600 text-sm text-center py-4">No recent transactions</p>
                    ) : (
                        myTransactions.map(tx => (
                            <div key={tx.id} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${tx.type === 'deposit' ? 'bg-green-900/30 text-green-500' : 'bg-red-900/30 text-red-500'}`}>
                                        {tx.type === 'deposit' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-white capitalize">{tx.type}</p>
                                        <p className="text-xs text-gray-500">{new Date(tx.createdAt?.seconds ? tx.createdAt.seconds * 1000 : tx.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono font-bold text-white">${tx.amount.toFixed(2)}</p>
                                    <div className="flex items-center justify-end gap-1 text-xs">
                                        {tx.status === 'pending' && <><Clock size={12} className="text-yellow-500"/> <span className="text-yellow-500">Pending</span></>}
                                        {tx.status === 'approved' && <><CheckCircle2 size={12} className="text-green-500"/> <span className="text-green-500">Success</span></>}
                                        {tx.status === 'rejected' && <><XCircle size={12} className="text-red-500"/> <span className="text-red-500">Rejected</span></>}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}