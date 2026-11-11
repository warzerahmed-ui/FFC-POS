import { useState, useEffect, lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Menubar } from './components/layout/Menubar';
import { TabType } from './types';
import { LoginScreen } from './components/auth/LoginScreen';

const DashboardView = lazy(() =>
  import('./components/dashboard/DashboardView').then(m => ({ default: m.DashboardView }))
);
const LiveIntakeView = lazy(() =>
  import('./components/intake/LiveIntakeView').then(m => ({ default: m.LiveIntakeView }))
);
const SlaughterCuttingView = lazy(() =>
  import('./components/production/SlaughterCuttingView').then(m => ({ default: m.SlaughterCuttingView }))
);
const ReadyForSaleView = lazy(() =>
  import('./components/ready/ReadyForSaleView').then(m => ({ default: m.ReadyForSaleView }))
);
const CustodyView = lazy(() =>
  import('./components/custody/CustodyView').then(m => ({ default: m.CustodyView }))
);
const RepSalesView = lazy(() =>
  import('./components/reps/RepSalesView').then(m => ({ default: m.RepSalesView }))
);
const GiftsView = lazy(() =>
  import('./components/gifts/GiftsView').then(m => ({ default: m.GiftsView }))
);
const POSView = lazy(() =>
  import('./components/pos/POSView').then(m => ({ default: m.POSView }))
);
const AccountingView = lazy(() =>
  import('./components/accounting/AccountingView').then(m => ({ default: m.AccountingView }))
);
const ReportsView = lazy(() =>
  import('./components/reports/ReportsView').then(m => ({ default: m.ReportsView }))
);
const SettingsView = lazy(() =>
  import('./components/settings/SettingsView').then(m => ({ default: m.SettingsView }))
);

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedIntakeForProductionId, setSelectedIntakeForProductionId] = useState<string | null>(null);
  const { hasAccess, currentUser, isAuthenticated } = useApp();

  const handleSendToSlaughter = (intakeId: string) => {
    setSelectedIntakeForProductionId(intakeId);
    setActiveTab('production');
  };

  // Redirect if current role/account lacks permission for activeTab
  useEffect(() => {
    if (isAuthenticated && !hasAccess(activeTab)) {
      const fallbackOrder: TabType[] = [
        'dashboard',
        'rep-sales',
        'pos',
        'accounting',
        'reports',
        'intake',
        'production',
        'ready-for-sale',
        'custody',
        'gifts',
        'settings',
      ];
      const firstAllowed = fallbackOrder.find(t => hasAccess(t));
      if (firstAllowed && firstAllowed !== activeTab) {
        setActiveTab(firstAllowed);
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
        <Suspense
          fallback={
            <div className="apple-card p-10 text-center text-xs font-bold text-[#86868B]">
              بارکردنی بەش...
            </div>
          }
        >
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
          {activeTab === 'rep-sales' && hasAccess('rep-sales') && <RepSalesView />}
          {activeTab === 'gifts' && hasAccess('gifts') && <GiftsView />}
          {activeTab === 'pos' && hasAccess('pos') && <POSView />}
          {activeTab === 'accounting' && hasAccess('accounting') && <AccountingView />}
          {activeTab === 'reports' && hasAccess('reports') && <ReportsView />}
          {activeTab === 'settings' && hasAccess('settings') && <SettingsView />}
        </Suspense>
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
