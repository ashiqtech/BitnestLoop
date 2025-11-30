import React from 'react';
import { UserData } from '../types';
import { Repeat, PiggyBank, Users, CheckCircle, ArrowRight, Wallet, ArrowDownLeft, ArrowUpRight, Share2, Award } from 'lucide-react';

interface HomeScreenProps {
    userData: UserData;
    setPage: (page: string) => void;
}

export default function HomeScreen({ userData, setPage }: HomeScreenProps) {
    
    return (
        <div className="max-w-4xl mx-auto animate-fade-in">
            
            {/* Top Liquidity Hero Section */}
            <div className="mb-10 text-center relative pt-4">
                <div className="flex flex-col items-center justify-center">
                    <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 tracking-tighter mb-2">
                        $3,568,058,754
                    </h2>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-gray-400 text-sm uppercase tracking-[0.2em] font-bold">Liquidity</span>
                        <div className="bg-yellow-500/10 border border-yellow-500/50 px-2 py-0.5 rounded text-yellow-500 text-xs font-bold flex items-center gap-1">
                            <Award size={10} /> №1
                        </div>
                    </div>
                    
                    <p className="text-gray-300 text-sm md:text-base font-medium max-w-lg mx-auto leading-relaxed mb-6">
                        Join BitNest to create a new <span className="text-white font-bold">Web 3.0</span> economy financial system
                    </p>

                    <button 
                        onClick={() => setPage('team')}
                        className="bg-green-500 hover:bg-green-400 text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)] transition transform active:scale-95"
                    >
                        <Share2 size={18} /> Invite Friends
                    </button>
                </div>
            </div>

            {/* BitNest Zone - Navigation Grid */}
             <div className="bg-gray-800/50 backdrop-blur rounded-2xl p-6 border border-gray-700/50 mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-green-400">BitNest Zone</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Loop', icon: Repeat, page: 'loop' },
                        { label: 'Saving Box', icon: PiggyBank, page: 'savings' },
                        { label: 'My Team', icon: Users, page: 'team' },
                        { label: 'Partner', icon: CheckCircle, page: 'partners' }
                    ].map((item, i) => (
                        <button key={i} onClick={() => setPage(item.page)} className="bg-gray-800 hover:bg-gray-700 p-4 rounded-xl flex flex-col items-center gap-3 transition border border-gray-700 hover:border-green-500/50 group">
                            <div className="bg-gray-900 p-3 rounded-full text-green-500 group-hover:text-white group-hover:bg-green-500 transition">
                                <item.icon size={24} />
                            </div>
                            <span className="text-sm font-medium text-gray-300">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Feature Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div onClick={() => setPage('loop')} className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border border-gray-700 hover:border-green-500 transition cursor-pointer relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition transform group-hover:scale-110 duration-500">
                        <Repeat size={100} />
                    </div>
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-2 text-white">
                        <Repeat className="text-green-500" /> BitNest Loop
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">Yield protocol based on Ethereum VM. Provide liquidity risk-free.</p>
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-black group-hover:bg-white transition">
                        <ArrowRight size={20} />
                    </div>
                </div>

                <div onClick={() => setPage('savings')} className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-2xl border border-gray-700 hover:border-green-500 transition cursor-pointer relative overflow-hidden group">
                     <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition transform group-hover:scale-110 duration-500">
                        <PiggyBank size={100} />
                    </div>
                    <h3 className="text-xl font-bold flex items-center gap-2 mb-2 text-white">
                        <PiggyBank className="text-green-500" /> Saving Box
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">Safe and efficient savings service based on blockchain technology.</p>
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-black group-hover:bg-white transition">
                        <ArrowRight size={20} />
                    </div>
                </div>
            </div>

            {/* Brokerage Wallet Section - Bottom */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-2xl border border-gray-700 shadow-2xl relative overflow-hidden mb-12">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Wallet size={120} />
                </div>
                <div className="text-center mb-6 relative z-10">
                    <h2 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Brokerage Wallet</h2>
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tighter">
                        <span className="text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                            {userData?.balance?.toLocaleString('en-US', {style: 'currency', currency: 'USD'}) || '$0.00'}
                        </span>
                    </h1>
                    <p className="text-xs text-gray-500">Available Liquid Assets</p>
                </div>
                
                <div className="flex gap-4 max-w-sm mx-auto relative z-10">
                    <button 
                        onClick={() => setPage('wallet')} 
                        className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition transform active:scale-95"
                    >
                        <ArrowDownLeft size={18} /> Deposit
                    </button>
                    <button 
                        onClick={() => setPage('wallet')} 
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition transform active:scale-95"
                    >
                        <ArrowUpRight size={18} /> Withdraw
                    </button>
                </div>
            </div>

            {/* About Text Footer */}
            <div className="mt-12 mb-6 text-center space-y-4 border-t border-gray-800 pt-8">
                <h3 className="text-2xl font-bold text-white tracking-tight">BitNest</h3>
                <h4 className="text-green-500 font-bold text-sm uppercase tracking-widest">Next-Generation Blockchain Finance Ecosystem</h4>
                <p className="text-gray-400 text-sm leading-relaxed max-w-3xl mx-auto">
                    BitNest is a decentralized finance (DeFi) platform powered by secure smart contracts, built to deliver transparent, accessible, and borderless financial solutions. Our ecosystem enables global users to manage digital assets, grow income opportunities, and participate in a trustless peer-to-peer economy without traditional banking barriers.
                </p>
                <p className="text-gray-500 text-xs max-w-2xl mx-auto">
                    With a focus on security, simplicity, and sustainability, BitNest is shaping the future of decentralized financial services for everyone.
                </p>
            </div>
        </div>
    );
}