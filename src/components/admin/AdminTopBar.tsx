import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AdminTopBarProps {
  sidebarCollapsed: boolean;
}

const AdminTopBar: React.FC<AdminTopBarProps> = ({ sidebarCollapsed }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const notifications = [
    {
      id: '1',
      type: 'warning',
      title: 'High Volume Transaction',
      description: 'Wallet 0x8a...4f2 moved 50M KRW',
      time: '10m ago',
      unread: true,
    },
    {
      id: '2',
      type: 'info',
      title: 'New Merchant Application',
      description: 'Seomyeon Coffee requested validation',
      time: '25m ago',
      unread: true,
    },
    {
      id: '3',
      type: 'success',
      title: 'Settlement Complete',
      description: 'Batch #2024-1228 processed',
      time: '1h ago',
      unread: false,
    },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Handle search navigation
      console.log('Search:', searchQuery);
    }
  };

  return (
    <header
      className={`fixed top-0 right-0 h-16 flex items-center justify-between px-6 z-30 transition-all duration-300 ${
        sidebarCollapsed ? 'left-[72px]' : 'left-[260px]'
      }`}
      style={{
        background: 'rgba(15, 20, 25, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-xl">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users, merchants, transactions..."
            className="w-full h-10 pl-12 pr-4 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all"
          />
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-2 py-1 rounded bg-white/5 text-[10px] text-gray-500 font-mono">
            <span>Ctrl</span>
            <span>K</span>
          </kbd>
        </div>
      </form>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-6">
        {/* Quick Actions */}
        <button
          className="h-10 w-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          title="Quick Add"
        >
          <span className="material-symbols-outlined text-[22px]">add</span>
        </button>

        {/* Blockchain Status */}
        <button
          onClick={() => navigate('/admin/blockchain')}
          className="hidden md:flex items-center gap-2 h-10 px-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500/20 transition-all"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs font-medium">Xphere</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfile(false);
            }}
            className="h-10 w-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/5 transition-all relative"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 top-12 w-80 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <h3 className="text-white font-semibold text-sm">Notifications</h3>
                  <button className="text-xs text-primary hover:underline">
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                        notif.unread ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            notif.type === 'warning'
                              ? 'bg-red-500/20 text-red-500'
                              : notif.type === 'info'
                              ? 'bg-blue-500/20 text-blue-500'
                              : 'bg-green-500/20 text-green-500'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {notif.type === 'warning'
                              ? 'warning'
                              : notif.type === 'info'
                              ? 'info'
                              : 'check_circle'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium">{notif.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {notif.description}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1">{notif.time}</p>
                        </div>
                        {notif.unread && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-white/5">
                  <button
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/admin/notifications');
                    }}
                    className="w-full py-2 rounded-lg bg-white/5 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                  >
                    View All Notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifications(false);
            }}
            className="flex items-center gap-3 h-10 pl-1 pr-3 rounded-xl hover:bg-white/5 transition-all"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-white text-sm font-medium leading-tight">Admin</p>
              <p className="text-gray-500 text-[10px]">Super Admin</p>
            </div>
            <span className="material-symbols-outlined text-gray-400 text-[18px] hidden md:block">
              expand_more
            </span>
          </button>

          {/* Profile Dropdown */}
          {showProfile && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfile(false)}
              />
              <div className="absolute right-0 top-12 w-56 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-white font-medium text-sm">Admin User</p>
                  <p className="text-gray-500 text-xs">admin@localpay.kr</p>
                </div>
                <div className="py-2">
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[18px]">person</span>
                    Profile
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[18px]">settings</span>
                    Settings
                  </button>
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/5 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[18px]">help</span>
                    Help Center
                  </button>
                </div>
                <div className="py-2 border-t border-white/5">
                  <button
                    onClick={() => navigate('/')}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminTopBar;
