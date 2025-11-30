import React, { useState } from 'react';
import { UserData } from '../types';
import { Repeat, Clock, ArrowLeft, MoreHorizontal } from 'lucide-react';
import { LOOP_PROFIT_PERCENT } from '../constants';

interface LoopScreenProps {
    userData: UserData;
    onStart: (amount: string, days: string) => void;
    onClaim: () => void;
    setPage: (page: string) => void;
}

const formatDate = (seconds: number) => {
    if (!seconds) return 'Pending';
    return new Date(seconds).toLocaleString();
};

export default function LoopScreen({ userData, onStart, onClaim, setPage }: LoopScreenProps) {
    const [amount, setAmount] = useState('');
    const [days, setDays] = useState('1');
    const active = userData.loopStatus === 'active';
    const remainingTime = active && userData.loopEndTime ? Math.max(0, userData.loopEndTime - new Date().getTime()) : 0;
    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));

    const calculateExpectedProfit = () => {
        const amt = parseFloat(amount);
        const d = parseInt(days);
        if (isNaN(amt) || isNaN(d)) return 0;
        // 5% per day
        return amt * LOOP_PROFIT_PERCENT * d;
    };

    return (
        <div className="max-w-2xl mx-auto animate-fade-in relative">
            {/* Header Area with 3 Dots */}
            <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-2 text-green-500">
                    <Repeat /> <span className="text-xl font-bold text-white">BitNest Loop</span>
                </div>
                <MoreHorizontal className="text-gray-400" />
            </div>

            {/* Back Button positioned below header */}
            <button 
                onClick={() => setPage('home')}
                className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition text-sm font-medium"
            >
                <ArrowLeft size={16} /> Back to Home
            </button>

            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-6 relative overflow-hidden">
                <div className="flex justify-between mb-4">
                    <span className="text-gray-400 text-sm">From Brokerage Wallet</span>
                    <span className="text-gray-400 text-sm">Available: <span className="text-white font-mono">${userData.balance.toFixed(2)}</span></span>
                </div>
                
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block uppercase font-bold">Amount (USDT)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="Min $10"
                                className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white text-lg focus:border-green-500 outline-none pr-20 transition-colors"
                                disabled={active}
                            />
                            <button 
                                onClick={() => setAmount(userData.balance.toString())}
                                className="absolute right-2 top-2 bottom-2 px-3 bg-gray-800 text-green-500 text-xs font-bold rounded-lg hover:bg-gray-700 uppercase transition"
                                disabled={active}
                            >
                                Max
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 mb-1 block uppercase font-bold">Duration (Days)</label>
                        <input 
                            type="number" 
                            value={days}
                            onChange={(e) => setDays(e.target.value)}
                            placeholder="Enter days (e.g. 1, 7, 30)"
                            className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white text-lg focus:border-green-500 outline-none transition-colors"
                            disabled={active}
                            min="1"
                        />
                    </div>
                </div>

                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 mb-6">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                        <span>Daily Rate</span>
                        <span className="text-green-500 font-bold">{(LOOP_PROFIT_PERCENT * 100).toFixed(2)}%</span>
                    </div>
                     <div className="flex justify-between text-sm text-gray-300 pt-2 border-t border-gray-700">
                        <span>Estimated Profit</span>
                        <span className="text-green-400 font-bold text-lg">+${calculateExpectedProfit().toFixed(2)}</span>
                    </div>
                </div>

                {!active ? (
                    <button 
                        onClick={() => onStart(amount, days)}
                        className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] transition transform active:scale-95"
                    >
                        Start Loop
                    </button>
                ) : (
                    <div className="text-center bg-gray-900/50 p-4 rounded-xl border border-green-500/30">
                        <div className="text-3xl font-mono text-white mb-4 flex justify-center items-center gap-3">
                            <Clock className="text-green-500 animate-pulse" />
                            {hours}h {minutes}m
                        </div>
                        {remainingTime <= 0 ? (
                            <button onClick={onClaim} className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 rounded-xl animate-pulse shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                                Claim Reward
                            </button>
                        ) : (
                            <button disabled className="w-full bg-gray-700 text-gray-400 font-bold py-3 rounded-xl cursor-not-allowed">
                                Processing...
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Active Orders
                </h3>
                {active ? (
                    <div className="flex justify-between items-center bg-gray-900 p-4 rounded-lg border-l-4 border-green-500 shadow-md">
                        <div>
                            <p className="text-white font-bold text-lg">${userData.loopAmount.toFixed(2)} USDT</p>
                            <p className="text-xs text-gray-400">Ends: {formatDate(userData.loopEndTime || 0)}</p>
                        </div>
                        <span className="text-yellow-500 text-sm font-bold bg-yellow-500/10 px-3 py-1 rounded-full animate-pulse">Running</span>
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-4 text-sm">No active orders</p>
                )}
            </div>
        </div>
    );
}