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
    ShieldAlert,
    // FIX: LucideIcon type ko import kiya gaya
    LucideIcon 
} from 'lucide-react';
// NOTE: Make sure aapki '../types' file mein UserData mein teamCount field ho.
import { UserData, NotificationState } from '../types'; 

// === TYPESCRIPT FIX & ENHANCEMENT (UserData interface should be updated in '../types') ===
interface UserData {
    email: string;
    balance: number;
    isAdmin: boolean;
    teamCount?: number; 
    referralCount?: number;
}

interface NotificationState {
    type: 'success' | 'error';
    msg: string;
}
// === END of temporary type definitions ===


// Layout props
interface LayoutProps {
    userData: UserData;
    currentPage: string;
    setCurrentPage: (page: string) => void;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    onLogout: () => void;
    notification: NotificationState | null;
    children?: React.ReactNode; 
}

// NavBtn props
interface NavBtnProps {
    active: boolean;
    onClick: () => void;
    // FIX: icon prop ka type ab LucideIcon hai, jo TS2322 error ko solve karta hai
    icon: LucideIcon; 
    label: string;
    children?: React.ReactNode; // To display count/badge
}

// NavBtn component
const NavBtn: React.FC<NavBtnProps> = ({ active, onClick, icon: Icon, label, children }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-between w-full p-3 rounded-xl transition font-medium ${
            active
                ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`}
    >
        <div className="flex items-center gap-3">
            <Icon size={20} />
            <span>{label}</span>
        </div>
        {children}
    </button>
);

// Layout component
const Layout: React.FC<LayoutProps> = ({
    userData,
    currentPage,
    setCurrentPage,
    sidebarOpen,
    setSidebarOpen,
    onLogout,
    notification,
    children,
}) => {
    
    // Function to handle navigation and close sidebar on mobile
    const handleNavClick = (page: string) => {
        setCurrentPage(page);
        setSidebarOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans selection:bg-green-500 selection:text-black">
            {/* Notification */}
            {notification && (
                <div
                    className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg font-bold flex items-center gap-2 ${
                        notification.type === 'error' ? 'bg-red-600' : 'bg-green-500 text-black'
                    }`}
                >
                    {notification.type === 'error' && <ShieldAlert size={18} />}
                    {notification.msg}
                </div>
            )}

            {/* Navbar */}
            <div className="fixed top-0 w-full z-40 bg-black/80 backdrop-blur-md border-b border-gray-800 h-16 flex items-center justify-between px-4 lg:px-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden text-green-500 p-1 hover:bg-gray-800 rounded"
                    >
                        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                    <h1 className="text-2xl font-bold tracking-tighter text-white">
                        BIT<span className="text-green-500">NEST</span>
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end mr-2">
                        <span className="text-[10px] uppercase text-gray-500 tracking-wider font-bold">
                            Total Balance
                        </span>
                        <span className="text-green-400 font-mono font-bold">
                            ${userData?.balance?.toFixed(2) || '0.00'}
                        </span>
                    </div>
                    {/* Admin Button */}
                    {userData?.isAdmin && (
                        <button
                            onClick={() => handleNavClick('admin')}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-widest shadow-red-900/50 shadow-lg"
                        >
                            Admin
                        </button>
                    )}
                    <div className="bg-green-500 text-black px-4 py-1.5 rounded-full font-bold text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                        {userData.email.split('@')[0]}
                    </div>
                </div>
            </div>

            <div className="flex pt-16 h-screen">
                {/* Sidebar */}
                <aside
                    className={`fixed lg:static inset-y-0 left-0 w-64 bg-gray-900 border-r border-gray-800 transform ${
                        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0 transition-transform duration-200 z-30 pt-16 lg:pt-0`}
                >
                    <div className="flex flex-col h-full">
                        <nav className="p-4 space-y-2 flex-1">
                            <NavBtn
                                active={currentPage === 'home'}
                                onClick={() => handleNavClick('home')}
                                icon={Home}
                                label="Home"
                            />
                            <NavBtn
                                active={currentPage === 'loop'}
                                onClick={() => handleNavClick('loop')}
                                icon={Repeat}
                                label="BitNest Loop"
                            />
                            <NavBtn
                                active={currentPage === 'savings'}
                                onClick={() => handleNavClick('savings')}
                                icon={PiggyBank}
                                label="Saving Box"
                            />
                            <NavBtn
                                active={currentPage === 'team'}
                                onClick={() => handleNavClick('team')}
                                icon={Users}
                                label="My Team"
                            >
                                {/* Team Count Display */}
                                {userData.teamCount && (
                                    <span className="bg-green-700/50 text-white px-2 py-0.5 rounded-full text-xs font-mono font-semibold">
                                        {userData.teamCount}
                                    </span>
                                )}
                            </NavBtn>
                            <NavBtn
                                active={currentPage === 'wallet'}
                                onClick={() => handleNavClick('wallet')}
                                icon={Wallet}
                                label="Wallet"
                            />
                        </nav>
                        <div className="p-4 border-t border-gray-800">
                            <button
                                onClick={onLogout}
                                className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full p-3 rounded-lg transition hover:bg-red-900/20"
                            >
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
                <div
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm"
                ></div>
            )}
        </div>
    );
};

export default Layout;