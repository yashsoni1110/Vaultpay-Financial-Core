import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Shield } from 'lucide-react';
import Sidebar from './Sidebar';

export default function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Mobile Header (visible only on mobile via CSS) */}
      <div className="mobile-header">
        <div className="mobile-logo flex items-center gap-2">
          <div className="sidebar-logo-icon" style={{ width: 32, height: 32 }}>
            <Shield size={16} color="white" />
          </div>
          <span className="sidebar-logo-text" style={{ fontSize: '1rem' }}>VaultPay</span>
        </div>
        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={24} color="var(--text-primary)" />
        </button>
      </div>

      <Sidebar isOpen={isSidebarOpen} closeSidebar={() => setIsSidebarOpen(false)} />
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
