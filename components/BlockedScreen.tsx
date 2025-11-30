import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { SUPPORT_EMAIL } from '../constants';

interface BlockedScreenProps {
    onLogout: () => void;
}

export default function BlockedScreen({ onLogout }: BlockedScreenProps) {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-8">
            <div className="bg-red-900/20 p-6 rounded-full mb-6 animate-pulse">
                <ShieldAlert size={80} className="text-red-600" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Account Restricted</h1>
            <p className="text-gray-400 mb-8 max-w-md">
                Your account has been suspended due to policy violations or suspicious activity. 
                Please contact support at <span className="text-green-500 font-bold hover:underline cursor-pointer">{SUPPORT_EMAIL}</span> for assistance.
            </p>
            <button onClick={onLogout} className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-3 rounded-full font-bold transition border border-gray-700 hover:border-red-500">
                Sign Out
            </button>
        </div>
    );
}