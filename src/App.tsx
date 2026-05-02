import { lazy, Suspense, useEffect, useState } from 'react';
import { AppProvider, useAppCtx, AppShell, ErrorBoundary } from './app/AppShell';
import { ToastProvider } from './core/toast';
import { api, startJobRunner, stopJobRunner } from './core/api';
import { scheduleReminders } from './core/notifications';
import { OnboardingFlow } from './features/onboarding';
import { isSignInWithEmailLink } from 'firebase/auth';
import { app, auth, VAPID_KEY } from './core/firebase';
import { pullAllFromCloud, saveFcmToken } from './core/firestoreSync';

// Code-split each tab — only the active tab's bundle is loaded
const TodayTab    = lazy(() => import('./features/today').then(m => ({ default: m.TodayTab })));
const MedsTab     = lazy(() => import('./features/meds').then(m => ({ default: m.MedsTab })));
const RecordsTab  = lazy(() => import('./features/records').then(m => ({ default: m.RecordsTab })));
const CareTeamTab = lazy(() => import('./features/careteam').then(m => ({ default: m.CareTeamTab })));
const MoreTab     = lazy(() => import('./features/more').then(m => ({ default: m.MoreTab })));

function SplashScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-[#1B6B4A] to-[#175f42] text-white">
      <div className="text-6xl mb-4">💊</div>
      <h1 className="text-3xl font-bold mb-2">CareBinder</h1>
      <p className="text-[#c2e6cb] text-sm">Family Health Organizer</p>
      <div className="mt-8">
        <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
}

function TabSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 bg-white rounded-2xl shadow-sm animate-pulse" />
      ))}
    </div>
  );
}

async function registerFcmToken(userId: string) {
  try {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    if (!(await isSupported())) return;
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (token) await saveFcmToken(userId, token);
  } catch { /* FCM is non-critical */ }
}

function AppContent() {
  const { userId, login, logout, activeTab, activeProfileId } = useAppCtx();
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Boot: restore session
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Handle email sign-in link callback
        if (isSignInWithEmailLink(auth, window.location.href)) {
          const userId = await api.completeEmailLinkAuth();
          if (userId && mounted) {
            login(userId);
            startJobRunner();
            pullAllFromCloud(userId).catch(() => {});
          }
          if (mounted) setLoading(false);
          return;
        }

        const restored = await api.restoreSession();
        if (!mounted) return;
        if (restored) {
          login(restored);
          startJobRunner();
          // Pull cloud data in background
          pullAllFromCloud(restored).catch(() => {});
          // Register FCM token in background
          registerFcmToken(restored);
        }
      } catch {
        try { await api.logout(); } catch {}
        if (mounted) logout();
      }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; stopJobRunner(); };
  }, []);

  // Schedule reminders whenever the active profile is known
  useEffect(() => {
    if (activeProfileId) scheduleReminders(activeProfileId).catch(() => {});
  }, [activeProfileId]);

  useEffect(() => {
    if (userId && activeProfileId && !onboardingDone) setOnboardingDone(true);
  }, [userId, activeProfileId, onboardingDone]);

  if (loading) return <SplashScreen />;

  const showMainApp = onboardingDone && userId && activeProfileId;

  if (!showMainApp) {
    return <OnboardingFlow onComplete={() => { startJobRunner(); setOnboardingDone(true); }} />;
  }

  const showProfileSwitcher = ['today', 'meds', 'records'].includes(activeTab);

  return (
    <AppShell showProfileSwitcher={showProfileSwitcher}>
      <Suspense fallback={<TabSkeleton />}>
        {activeTab === 'today'    && <TodayTab />}
        {activeTab === 'meds'     && <MedsTab />}
        {activeTab === 'records'  && <RecordsTab />}
        {activeTab === 'careteam' && <CareTeamTab />}
        {activeTab === 'more'     && <MoreTab />}
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <div className="h-full">
            <AppContent />
          </div>
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
