import React, { useState } from 'react';
import { UserData } from '../types';
import { PiggyBank, ArrowRight, ChevronDown, PlusCircle, MinusCircle, ArrowLeft, MoreHorizontal } from 'lucide-react';

interface SavingsScreenProps {
    userData: UserData;
    onAdd: (amount: string) => void;
    onClaim: () => void;
    onWithdraw: (amount: string) => void;
    setPage: (page: string) => void;
}

export default function SavingsScreen({ userData, onAdd, onClaim, onWithdraw, setPage }: SavingsScreenProps) {
    const [openRule, setOpenRule] = useState<number | null>(null);
    const [inputMode, setInputMode] = useState<'none' | 'add' | 'withdraw'>('none');
    const [amount, setAmount] = useState('');

    const toggleRule = (i: number) => setOpenRule(openRule === i ? null : i);

    const handleSubmit = () => {
        if (!amount) return;
        if (inputMode === 'add') {
            onAdd(amount);
        } else if (inputMode === 'withdraw') {
            onWithdraw(amount);
        }
        setAmount('');
        setInputMode('none');
    };

    return (
        <div className="max-w-2xl mx-auto animate-fade-in relative">
            {/* Header Area with 3 Dots */}
            <div className="flex justify-between items-center mb-2">
                 <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                    <PiggyBank className="text-green-500" /> Saving Box
                 </h2>
                <MoreHorizontal className="text-gray-400" />
            </div>

            {/* Back Button positioned below header */}
            <button 
                onClick={() => setPage('home')}
                className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition text-sm font-medium"
            >
                <ArrowLeft size={16} /> Back to Home
            </button>

            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 mb-8 text-black shadow-[0_0_30px_rgba(16,185,129,0.3)] relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-1/4 translate-y-1/4">
                    <PiggyBank size={150} />
                </div>
                <p className="font-bold opacity-70 mb-1 text-sm uppercase tracking-wider">Total Savings</p>
                <h2 className="text-5xl font-black mb-8 tracking-tighter">${userData.savingsBalance.toFixed(2)} <span className="text-lg font-medium opacity-60">USDT</span></h2>
                
                <div className="flex gap-8 text-sm font-bold bg-black/10 p-4 rounded-xl backdrop-blur-sm">
                    <div>
                        <p className="opacity-60 text-xs uppercase">Daily Rate</p>
                        <p className="text-lg">10%</p>
                    </div>
                    <div>
                        <p className="opacity-60 text-xs uppercase">Total Earned</p>
                        <p className="text-lg">${userData.totalEarnings.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            {/* Input Area */}
            {inputMode !== 'none' && (
                <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 mb-6 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-white text-lg">
                            {inputMode === 'add' ? 'Add to Savings' : 'Withdraw Savings'}
                        </h3>
                        <button onClick={() => setInputMode('none')} className="text-gray-400 hover:text-white">Cancel</button>
                    </div>
                    <div className="relative mb-4">
                        <input 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter Amount"
                            className="w-full bg-gray-900 border border-gray-600 rounded-xl p-4 text-white text-lg focus:border-green-500 outline-none pr-20"
                        />
                         <button 
                            onClick={() => setAmount(inputMode === 'add' ? userData.balance.toString() : userData.savingsBalance.toString())}
                            className="absolute right-2 top-2 bottom-2 px-3 bg-gray-800 text-green-500 text-xs font-bold rounded-lg hover:bg-gray-700 uppercase transition"
                        >
                            Max
                        </button>
                    </div>
                    <div className="text-xs text-gray-400 mb-4 flex justify-between">
                        <span>Available to {inputMode}:</span>
                        <span className="text-white font-mono">
                            ${inputMode === 'add' ? userData.balance.toFixed(2) : userData.savingsBalance.toFixed(2)}
                        </span>
                    </div>
                    <button 
                        onClick={handleSubmit}
                        className={`w-full font-bold py-4 rounded-xl transition ${inputMode === 'add' ? 'bg-green-500 hover:bg-green-400 text-black' : 'bg-red-500 hover:bg-red-400 text-white'}`}
                    >
                        Confirm {inputMode === 'add' ? 'Deposit' : 'Withdrawal'}
                    </button>
                </div>
            )}

            {inputMode === 'none' && (
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <button 
                        onClick={() => setInputMode('add')}
                        className="bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
                    >
                        <PlusCircle size={20} /> Add Savings
                    </button>
                    <button 
                        onClick={() => setInputMode('withdraw')}
                        className="bg-gray-800 hover:bg-gray-700 text-green-500 border border-green-500 font-bold py-4 rounded-xl transition active:scale-95 flex items-center justify-center gap-2"
                    >
                        <MinusCircle size={20} /> Withdraw
                    </button>
                </div>
            )}

            <button 
                onClick={onClaim}
                className="w-full bg-gray-800 border border-gray-700 hover:border-green-500 text-white p-6 rounded-xl flex justify-between items-center group transition mb-6 shadow-md"
            >
                <div className="text-left">
                    <h4 className="font-bold text-lg group-hover:text-green-500 transition">Claim Daily Interest</h4>
                    <p className="text-gray-400 text-sm">Available every 24 hours</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center group-hover:bg-green-500 group-hover:text-black transition">
                    <ArrowRight size={20} />
                </div>
            </button>

             {/* Rules Accordion Style */}
             <div className="space-y-2">
                {[
                    { title: 'Savings Box Rules', content: 'Funds in the Savings Box are locked but generate 10% interest daily. You must claim interest every 24 hours manually.' },
                    { title: 'Rate of Return', content: 'The APY is calculated based on a fixed 10% daily return on the principal amount in the savings box.' },
                    { title: 'Security', content: 'Funds are secured in cold storage wallets. Withdrawals are processed instantly to your Brokerage Wallet.' }
                ].map((rule, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                        <button 
                            onClick={() => toggleRule(i)}
                            className="w-full p-4 flex justify-between items-center text-gray-300 hover:bg-gray-750 font-medium"
                        >
                            <span>{rule.title}</span>
                            <ChevronDown size={16} className={`transition-transform duration-300 ${openRule === i ? 'rotate-180' : ''}`} />
                        </button>
                        {openRule === i && (
                            <div className="p-4 pt-0 text-sm text-gray-400 bg-gray-800">
                                {rule.content}
                            </div>
                        )}
                    </div>
                ))}
             </div>
        </div>
    );
}