import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { LiveIntakeView } from './components/intake/LiveIntakeView';
import { RepSalesView } from './components/reps/RepSalesView';
import { GiftsView } from './components/gifts/GiftsView';
import { ReturnsView } from './components/returns/ReturnsView';
import { POSView } from './components/pos/POSView';
import { AccountingView } from './components/accounting/AccountingView';
import { ReportsView } from './components/reports/ReportsView';
import { LoginModal } from './components/auth/LoginModal';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const { hasAccess, currentUser } = useApp();

  // If user role changes and they don't have access to activeTab, redirect to first allowed tab or dashboard
  useEffect(() => {
    if (!hasAccess(activeTab)) {
      if (currentUser.role === 'REP') {
        setActiveTab('rep-sales');
      } else if (currentUser.role === 'CASHIER') {
        setActiveTab('pos');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser, activeTab, hasAccess]);

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col font-sans selection:bg-[#0071E3] selection:text-white">
      {/* Apple Frosted Navbar */}
      <Navbar currentTab={activeTab} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Apple Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* View Container */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
          {activeTab === 'intake' && hasAccess('intake') && <LiveIntakeView />}
          {(activeTab === 'rep-sales' || activeTab === 'dispatch') && hasAccess('rep-sales') && <RepSalesView />}
          {activeTab === 'gifts' && hasAccess('gifts') && <GiftsView />}
          {activeTab === 'returns' && hasAccess('returns') && <ReturnsView />}
          {activeTab === 'pos' && hasAccess('pos') && <POSView />}
          {activeTab === 'accounting' && hasAccess('accounting') && <AccountingView />}
          {activeTab === 'reports' && hasAccess('reports') && <ReportsView />}
        </main>
      </div>

      {/* Login & Role Switcher Modal */}
      <LoginModal />
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
