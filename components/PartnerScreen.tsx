import React from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface PartnerScreenProps {
    setPage: (page: string) => void;
}

export default function PartnerScreen({ setPage }: PartnerScreenProps) {
    const partners = [
        {
            name: 'MetaMask',
            logo: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
            color: 'bg-orange-500/10 border-orange-500/50'
        },
        {
            name: 'Trust Wallet',
            logo: 'https://avatars.githubusercontent.com/u/32179889?s=200&v=4',
            color: 'bg-blue-500/10 border-blue-500/50'
        },
        {
            name: 'Coinbase',
            logo: 'https://avatars.githubusercontent.com/u/1885080?s=200&v=4',
            color: 'bg-blue-600/10 border-blue-600/50'
        },
        {
            name: 'Binance',
            logo: 'https://public.bnbstatic.com/20190405/eb2349c3-42f4-4a52-9595-31095a1a673c.png',
            color: 'bg-yellow-500/10 border-yellow-500/50'
        }
    ];

    return (
        <div className="max-w-2xl mx-auto animate-fade-in">
            <button 
                onClick={() => setPage('home')}
                className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition text-sm font-medium"
            >
                <ArrowLeft size={16} /> Back to Home
            </button>

            <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Our Partners</h2>
                <p className="text-gray-400 text-sm">Trusted by world-leading industry giants</p>
            </div>

            <div className="grid gap-4">
                {partners.map((partner, i) => (
                    <div key={i} className={`flex items-center justify-between p-6 rounded-2xl border ${partner.color} hover:bg-gray-800 transition group backdrop-blur-sm`}>
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 flex items-center justify-center bg-white rounded-full p-2 shadow-lg">
                                <img src={partner.logo} alt={partner.name} className="w-full h-full object-contain" />
                            </div>
                            <span className="text-xl font-bold text-white group-hover:text-green-500 transition">{partner.name}</span>
                        </div>
                        <CheckCircle2 className="text-green-500 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                ))}
            </div>

            <div className="mt-12 text-center text-xs text-gray-500">
                <p>Strategic partnerships ensure the highest level of security and liquidity for BitNest users.</p>
            </div>
        </div>
    );
}