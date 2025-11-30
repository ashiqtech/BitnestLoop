import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { Firestore, collection, query, where, getDocs } from 'firebase/firestore';
import { Users, Wallet, Copy, Share2, Link as LinkIcon } from 'lucide-react';
import { REFERRAL_TIERS } from '../constants';

interface TeamScreenProps {
    userData: UserData;
    db: Firestore | null;
    appId: string;
    isDemo: boolean;
}

export default function TeamScreen({ userData, db, appId, isDemo }: TeamScreenProps) {
    const [teamCount, setTeamCount] = useState(0);

    useEffect(() => {
        if (isDemo) {
            // Check local storage for simulated team count
            try {
                // Ensure we use the exact same uppercase format as AuthScreen
                const cleanCode = userData.referralCode.trim().toUpperCase();
                const demoCount = localStorage.getItem(`bitnest_demo_team_${cleanCode}`);
                setTeamCount(demoCount ? parseInt(demoCount) : 0);
            } catch (e) {
                setTeamCount(0);
            }
            return;
        }
        if (!db) return;

        const fetchTeam = async () => {
             const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('invitedBy', '==', userData.referralCode));
             const snap = await getDocs(q);
             setTeamCount(snap.size);
        };
        fetchTeam();
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

             <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-blue-500 transition group">
                    <Users className="text-blue-500 mb-3 group-hover:scale-110 transition" size={32} />
                    <h3 className="text-3xl font-bold text-white">{teamCount}</h3>
                    <p className="text-xs text-gray-400 mt-1">Direct Invites</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-green-500 transition group">
                    <Wallet className="text-green-500 mb-3 group-hover:scale-110 transition" size={32} />
                    <h3 className="text-3xl font-bold text-white">${userData.teamCommission?.toFixed(2) || '0.00'}</h3>
                    <p className="text-xs text-gray-400 mt-1">Total Commission</p>
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