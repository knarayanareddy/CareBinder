import { AppProvider, useAppCtx, AppShell, ErrorBoundary } from './app/AppShell';
import { api, startJobRunner, stopJobRunner } from './core/api';
import { useEffect, useState } from 'react';
import { OnboardingFlow } from './features/onboarding';
import { TodayTab } from './features/today';
import { MedsTab } from './features/meds';
import { RecordsTab } from './features/records';
import { CareTeamTab } from './features/careteam';
import { MoreTab } from './features/more';

function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-[#1B6B4A] to-[#175f42] text-white">
      <div className="text-6xl mb-4">💊</div>
      <h1 className="text-3xl font-bold mb-2">CareBinder</h1>
      <p className="text-[#c2e6cb] text-sm">Family Health Organizer</p>
      <div className="mt-8"><div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" /></div>
    </div>
  );
}

function AppContent() {
  const { userId, login, logout, activeTab, activeProfileId } = useAppCtx();
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Boot: restore session or start fresh
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const restored = await api.restoreSession();
        if (!mounted) return;
        if (restored) {
          login(restored);
          startJobRunner();
        }
      } catch {
        try { await api.logout(); } catch {}
        if (mounted) logout();
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; stopJobRunner(); };
  }, []);

  // Auto-detect when onboarding is truly done (user + profile both exist)
  useEffect(() => {
    if (userId && activeProfileId && !onboardingDone) {
      setOnboardingDone(true);
    }
  }, [userId, activeProfileId, onboardingDone]);


  if (loading) return <SplashScreen />;

  // Main decision: show onboarding OR main app
  // Onboarding is shown when:
  //   - No user (first time) OR
  //   - User exists but profile not yet created (mid-onboarding after auth) OR
  //   - onboardingDone is false (explicitly not done yet)
  const showMainApp = onboardingDone && userId && activeProfileId;

  if (!showMainApp) {
    return <OnboardingFlow onComplete={() => { startJobRunner(); setOnboardingDone(true); }} />;
  }

  const showProfileSwitcher = ['today', 'meds', 'records'].includes(activeTab);
  return (
    <AppShell showProfileSwitcher={showProfileSwitcher}>
      {activeTab === 'today' && <TodayTab />}
      {activeTab === 'meds' && <MedsTab />}
      {activeTab === 'records' && <RecordsTab />}
      {activeTab === 'careteam' && <CareTeamTab />}
      {activeTab === 'more' && <MoreTab />}
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <div className="h-full">
          <AppContent />
        </div>
      </AppProvider>
    </ErrorBoundary>
  );
}
