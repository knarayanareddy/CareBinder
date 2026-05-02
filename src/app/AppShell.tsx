import { useEffect, useState, useRef, createContext, useContext, Component, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../core/db';
import { api, type Profile } from '../core/api';
import { OfflineBanner, ProfileChip } from '../designsystem';
import { CalendarClock, Pill, FolderOpen, Users, MoreHorizontal, Bell } from 'lucide-react';
import { cn } from '../utils/cn';

// ═══════════════════════════════════════════════
// ERROR BOUNDARY
// ═══════════════════════════════════════════════

interface EBState { hasError: boolean; error?: Error }
export class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: any) { console.error('[CareBinder ERROR]', error, info); }
  render() {
    if (this.state.hasError) {
      const msg = this.state.error?.message || 'Unknown error';
      const stack = this.state.error?.stack?.split('\n').slice(0, 8).join('\n') || '';
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
          <div className="text-5xl mb-4">😵</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h2>
          <pre className="text-xs text-left bg-red-50 text-red-800 p-4 rounded-xl mb-4 max-w-lg overflow-x-auto whitespace-pre-wrap break-words">{msg}</pre>
          <details className="mb-4 max-w-lg w-full">
            <summary className="text-sm text-gray-500 cursor-pointer mb-2">Stack trace</summary>
            <pre className="text-xs text-left bg-gray-100 text-gray-700 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">{stack}</pre>
          </details>
          <div className="flex gap-3">
            <button onClick={() => { try { indexedDB.deleteDatabase('CareBinderDB'); localStorage.clear(); } catch {} window.location.reload(); }} className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Reset Data &amp; Reload</button>
            <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }} className="px-6 py-2.5 bg-[#1B6B4A] text-white rounded-xl font-medium hover:bg-[#175f42]">Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ═══════════════════════════════════════════════
// APP CONTEXT
// ═══════════════════════════════════════════════

type TabId = 'today' | 'meds' | 'records' | 'careteam' | 'more';
const tabs: { id: TabId; label: string; Icon: typeof CalendarClock }[] = [
  { id: 'today', label: 'Today', Icon: CalendarClock },
  { id: 'meds', label: 'Meds', Icon: Pill },
  { id: 'records', label: 'Records', Icon: FolderOpen },
  { id: 'careteam', label: 'Care Team', Icon: Users },
  { id: 'more', label: 'More', Icon: MoreHorizontal },
];

interface AppCtx {
  userId: string | null;
  authenticated: boolean;
  activeProfileId: string | null;
  activeProfile: Profile | undefined;
  profiles: Profile[];
  activeTab: TabId;
  isOffline: boolean;
  setTab: (t: TabId) => void;
  setActiveProfileId: (id: string) => void;
  login: (userId: string) => void;
  logout: () => void;
  unreadCount: number;
}

const AppContext = createContext<AppCtx | null>(null);
export function useAppCtx() { const c = useContext(AppContext); if (!c) throw new Error('No AppContext'); return c; }

// Singleton profile tracker — survives React re-renders and hot reloads
let _lastKnownProfileId: string | null = null;

export function AppProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(_lastKnownProfileId);
  const profileIdRef = useRef(activeProfileId);

  // Query all profiles — safe, no .equals() with potentially null key
  const profiles: Profile[] = useLiveQuery(() => db.profiles.toArray(), []) ?? [];

  // Auto-select first profile if we don't have one and profiles exist
  useEffect(() => {
    if (!activeProfileId && profiles.length > 0) {
      const id = profiles[0].id;
      _lastKnownProfileId = id;
      profileIdRef.current = id;
      setActiveProfileId(id);
      api.setActiveProfile(id);
    }
  }, [profiles, activeProfileId]);

  const unreadCount = useLiveQuery(async () => {
    const pid = profileIdRef.current;
    if (!pid) return 0;
    try { return await db.updates.where('profileId').equals(pid).filter(u => !u.read).count(); }
    catch { return 0; }
  }, [profileIdRef.current]) ?? 0;

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const handleSetActiveProfileId = (id: string) => {
    _lastKnownProfileId = id;
    profileIdRef.current = id;
    setActiveProfileId(id);
    api.setActiveProfile(id);
  };

  const handleLogin = (id: string) => setUserId(id);

  const handleLogout = () => {
    _lastKnownProfileId = null;
    profileIdRef.current = null;
    setActiveProfileId(null);
    setUserId(null);
  };

  const ctx: AppCtx = {
    userId, authenticated: !!userId, activeProfileId,
    activeProfile: profiles.find(p => p.id === activeProfileId),
    profiles, activeTab, isOffline,
    setTab: setActiveTab,
    setActiveProfileId: handleSetActiveProfileId,
    login: handleLogin,
    logout: handleLogout,
    unreadCount,
  };

  return <AppContext.Provider value={ctx}>{children}</AppContext.Provider>;
}

// ═══════════════════════════════════════════════
// APP SHELL (LAYOUT)
// ═══════════════════════════════════════════════

export function AppShell({ children, showProfileSwitcher }: { children: ReactNode; showProfileSwitcher: boolean }) {
  const { activeTab, setTab, profiles, activeProfileId, setActiveProfileId, isOffline, unreadCount } = useAppCtx();
  return (
    <div className="flex flex-col h-full bg-[#F5F6FA]">
      {isOffline && <OfflineBanner />}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shrink-0">
        <span className="text-xl font-bold text-[#1B6B4A]">CareBinder</span>
        <button className="relative p-2 rounded-full hover:bg-gray-100" aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount})` : ''}`}>
          <Bell size={20} className="text-gray-600" />
          {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
      </header>
      {showProfileSwitcher && profiles.length > 0 && (
        <div className="bg-white px-4 py-2 flex gap-2 overflow-x-auto border-b border-gray-50 shrink-0">
          {profiles.map(p => <ProfileChip key={p.id} name={p.name} color={p.avatarColor} active={p.id === activeProfileId} onClick={() => setActiveProfileId(p.id)} />)}
        </div>
      )}
      <main className="flex-1 overflow-y-auto"><ErrorBoundary>{children}</ErrorBoundary></main>
      <nav className="bg-white border-t border-gray-100 shrink-0" role="navigation" aria-label="Main navigation">
        <div className="flex justify-around items-center py-1">
          {tabs.map(({ id, label, Icon }) => {
            const active = activeTab === id;
            return (
              <button key={id} onClick={() => setTab(id)} className={cn('flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors min-w-[64px]', active ? 'text-[#1B6B4A]' : 'text-gray-400 hover:text-gray-600')} aria-label={label} aria-current={active ? 'page' : undefined}>
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                <span className={cn('text-[11px] font-medium', active && 'font-semibold')}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
