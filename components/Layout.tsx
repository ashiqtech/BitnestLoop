import React from 'react';
import { 
    Home, 
    Repeat, 
    PiggyBank, 
    Users, 
    LogOut, 
    Wallet, 
    Menu,
    X,
    ShieldAlert
} from 'lucide-react';
import { UserData, NotificationState } from '../types';

interface LayoutProps {
    userData: UserData;
    currentPage: string;
    setCurrentPage: (page: string) => void;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    onLogout: () => void;
    notification: NotificationState | null;
    children?: React.ReactNode; // fixed
}

}

const NavBtn = ({ active, onClick, icon: Icon, label }: any) => (
    <button 
        onClick={onClick} 
        className={`flex items-center gap-3 w-full p-3 rounded-xl transition font-medium ${active ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
    >
        <Icon size={20} />
        <span>{label}</span>
    </button>
);

export default function Layout({ 
    userData, 
    currentPage, 
    setCurrentPage, 
    sidebarOpen, 
    setSidebarOpen, 
    onLogout, 
    notification,
    children 
}: LayoutProps) {
    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-green-500 selection:text-black">
            {/* Notification Toast */}
            {notification && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg font-bold animate-bounce flex items-center gap-2 ${notification.type === 'error' ? 'bg-red-600' : 'bg-green-500 text-black'}`}>
                    {notification.type === 'error' && <ShieldAlert size={18} />}
                    {notification.msg}
                </div>
            )}

            {/* Navbar */}
            <div className="fixed top-0 w-full z-40 bg-black/80 backdrop-blur-md border-b border-gray-800 h-16 flex items-center justify-between px-4 lg:px-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-green-500 p-1 hover:bg-gray-800 rounded">
                        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <h1 className="text-2xl font-bold tracking-tighter text-white">BIT<span className="text-green-500">NEST</span></h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end mr-2">
                        <span className="text-[10px] uppercase text-gray-500 tracking-wider font-bold">Total Balance</span>
                        <span className="text-green-400 font-mono font-bold">${userData?.balance?.toFixed(2) || '0.00'}</span>
                    </div>
                    {userData?.isAdmin && (
                        <button onClick={() => setCurrentPage('admin')} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-widest shadow-red-900/50 shadow-lg">
                            Admin
                        </button>
                    )}
                     <div className="bg-green-500 text-black px-4 py-1.5 rounded-full font-bold text-sm">
                        {userData.email.split('@')[0]}
                    </div>
                </div>
            </div>

            <div className="flex pt-16 h-screen">
                {/* Sidebar */}
                <aside className={`fixed lg:static inset-y-0 left-0 w-64 bg-gray-900 border-r border-gray-800 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 z-30 pt-16 lg:pt-0`}>
                    <div className="flex flex-col h-full">
                        <nav className="p-4 space-y-2 flex-1">
                            <NavBtn active={currentPage === 'home'} onClick={() => {setCurrentPage('home'); setSidebarOpen(false);}} icon={Home} label="Home" />
                            <NavBtn active={currentPage === 'loop'} onClick={() => {setCurrentPage('loop'); setSidebarOpen(false);}} icon={Repeat} label="BitNest Loop" />
                            <NavBtn active={currentPage === 'savings'} onClick={() => {setCurrentPage('savings'); setSidebarOpen(false);}} icon={PiggyBank} label="Saving Box" />
                            <NavBtn active={currentPage === 'team'} onClick={() => {setCurrentPage('team'); setSidebarOpen(false);}} icon={Users} label="My Team" />
                            <NavBtn active={currentPage === 'wallet'} onClick={() => {setCurrentPage('wallet'); setSidebarOpen(false);}} icon={Wallet} label="Wallet" />
                        </nav>
                        <div className="p-4 border-t border-gray-800">
                             <button onClick={onLogout} className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full p-3 rounded-lg transition hover:bg-red-900/20">
                                <LogOut size={20} />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-4 lg:p-8 overflow-y-auto pb-24 bg-[#0B0C10]">
                    {children}
                </main>
            </div>
            
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"></div>
            )}
        </div>
    );
}