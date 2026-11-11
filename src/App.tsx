import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Menubar } from './components/layout/Menubar';
import { TabType } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { LiveIntakeView } from './components/intake/LiveIntakeView';
import { SlaughterCuttingView } from './components/production/SlaughterCuttingView';
import { ReadyForSaleView } from './components/ready/ReadyForSaleView';
import { CustodyView } from './components/custody/CustodyView';
import { RepSalesView } from './components/reps/RepSalesView';
import { GiftsView } from './components/gifts/GiftsView';
import { POSView } from './components/pos/POSView';
import { AccountingView } from './components/accounting/AccountingView';
import { ReportsView } from './components/reports/ReportsView';
import { LoginScreen } from './components/auth/LoginScreen';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedIntakeForProductionId, setSelectedIntakeForProductionId] = useState<string | null>(null);
  const { hasAccess, currentUser, isAuthenticated } = useApp();

  const handleSendToSlaughter = (intakeId: string) => {
    setSelectedIntakeForProductionId(intakeId);
    setActiveTab('production');
  };

  // Redirect if current role lacks permission for activeTab
  useEffect(() => {
    if (isAuthenticated && !hasAccess(activeTab)) {
      if (currentUser.role === 'REP') {
        setActiveTab('rep-sales');
      } else if (currentUser.role === 'CASHIER') {
        setActiveTab('pos');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser, activeTab, hasAccess, isAuthenticated]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#1D1D1F] flex flex-col selection:bg-[#0071E3] selection:text-white">
      <Menubar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-4 md:p-6 lg:p-7 max-w-[1440px] mx-auto w-full overflow-x-hidden">
        {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
        {activeTab === 'intake' && hasAccess('intake') && (
          <LiveIntakeView
            onNavigate={setActiveTab}
            onSendToSlaughter={handleSendToSlaughter}
          />
        )}
        {activeTab === 'production' && hasAccess('production') && (
          <SlaughterCuttingView
            onNavigate={setActiveTab}
            preselectedIntakeId={selectedIntakeForProductionId}
            onClearPreselect={() => setSelectedIntakeForProductionId(null)}
          />
        )}
        {activeTab === 'ready-for-sale' && hasAccess('ready-for-sale') && (
          <ReadyForSaleView onNavigate={setActiveTab} />
        )}
        {activeTab === 'custody' && hasAccess('custody') && (
          <CustodyView onNavigate={setActiveTab} />
        )}
        {(activeTab === 'rep-sales' || activeTab === 'dispatch' || activeTab === 'returns') &&
          hasAccess('rep-sales') && <RepSalesView />}
        {activeTab === 'gifts' && hasAccess('gifts') && <GiftsView />}
        {activeTab === 'pos' && hasAccess('pos') && <POSView />}
        {activeTab === 'accounting' && hasAccess('accounting') && <AccountingView />}
        {activeTab === 'reports' && hasAccess('reports') && <ReportsView />}
      </main>
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
