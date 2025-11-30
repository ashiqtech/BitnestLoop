import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { Firestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { Users, Wallet, Copy, Share2, Link as LinkIcon, MousePointerClick } from 'lucide-react';
import { REFERRAL_TIERS } from '../constants';

interface TeamScreenProps {
    userData: UserData;
    db: Firestore | null;
    appId: string;
    isDemo: boolean;
}

export default function TeamScreen({ userData, db, appId, isDemo }: TeamScreenProps) {
    const [teamCount, setTeamCount] = useState(userData.teamCount || 0);

    // Sync state if userData changes
    useEffect(() => {
        if (userData.teamCount !== undefined) {
             setTeamCount(userData.teamCount);
        }
    }, [userData.teamCount]);

    useEffect(() => {
        if (isDemo) return;
        if (!db) return;

        // Real-time self-correction listener (backup to direct increment)
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('invitedBy', '==', userData.referralCode));
        
        const unsubscribe = onSnapshot(q, (snap) => {
             // Only update if discrepancy found to avoid flicker
             if (snap.size !== teamCount) {
                 setTeamCount(snap.size);
             }
        }, (error) => {
            console.error("Error fetching team count:", error);
        });

        return () => unsubscribe();
    }, [db, appId, userData.referralCode, isDemo]);

    // Construct invite link safely
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const inviteLink = `${origin}?ref=${userData.referralCode}`;

    const copyCode = () => {
        navigator.clipboard.writeText(userData.referralCode);
        alert("Referral code copied!");
    };

    const copyLink = () => {
        navigator.clipboard.writeText(inviteLink);
        alert("Invite link copied!");
    };

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
             <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 mb-8 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-green-500"></div>
                
                <p className="text-gray-400 mb-4 text-sm uppercase tracking-widest">My Referral Code</p>
                <div className="flex justify-center items-center gap-4 bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 mb-6">
                    <h2 className="text-3xl font-mono font-bold text-green-500 tracking-wider">{userData.referralCode}</h2>
                    <button onClick={copyCode} className="text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded-lg transition">
                        <Copy size={20}/>
                    </button>
                </div>

                <div className="flex items-center gap-2 bg-black/20 p-3 rounded-lg border border-gray-700/50">
                    <LinkIcon size={16} className="text-blue-400" />
                    <input 
                        type="text" 
                        readOnly 
                        value={inviteLink} 
                        className="bg-transparent text-xs text-gray-400 flex-1 outline-none"
                    />
                    <button onClick={copyLink} className="text-blue-400 text-xs font-bold uppercase hover:underline">Copy Link</button>
                </div>
             </div>

             <div className="grid grid-cols-3 gap-3 mb-8">
                 <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-yellow-500 transition group text-center">
                    <div className="flex justify-center">
                        <MousePointerClick className="text-yellow-500 mb-2 group-hover:scale-110 transition" size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{userData.referralClicks || 0}</h3>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">Link Clicks</p>
                </div>

                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-blue-500 transition group text-center">
                    <div className="flex justify-center">
                        <Users className="text-blue-500 mb-2 group-hover:scale-110 transition" size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-white">{teamCount}</h3>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">Signups</p>
                </div>

                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 hover:border-green-500 transition group text-center">
                    <div className="flex justify-center">
                        <Wallet className="text-green-500 mb-2 group-hover:scale-110 transition" size={24} />
                    </div>
                    <h3 className="text-2xl font-bold text-white">${userData.teamCommission?.toFixed(2) || '0.00'}</h3>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">Commission</p>
                </div>
             </div>

             <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                <div className="p-4 bg-gray-900 border-b border-gray-700 flex items-center justify-between">
                    <h3 className="font-bold text-white">Commission Tiers</h3>
                    <Share2 size={16} className="text-gray-500" />
                </div>
                <div className="p-4 space-y-3">
                    {REFERRAL_TIERS.map((rate, i) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-750 transition">
                            <span className="text-gray-400 text-sm font-medium">Level {i+1}</span>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-24 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500" style={{ width: `${rate * 500}%` }}></div>
                                </div>
                                <span className="text-green-500 font-bold w-12 text-right">{(rate * 100).toFixed(0)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
        </div>
    );
}