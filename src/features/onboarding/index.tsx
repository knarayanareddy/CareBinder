import { useState } from 'react';
import { cn } from '../../utils/cn';
import { api, startJobRunner } from '../../core/api';
import { useAppCtx } from '../../app/AppShell';
import { Shield, Bell, Camera, Lock, Phone, Mail, ChevronRight, User, Baby, Users as UsersIcon, UserPlus, Check, Loader2, AlertCircle } from 'lucide-react';

export function OnboardingFlow({ onComplete }: { onComplete?: () => void }) {
  const { login, setActiveProfileId } = useAppCtx();
  const [step, setStep] = useState<'permissions' | 'auth' | 'profile' | 'security'>('permissions');
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileType, setProfileType] = useState<'self' | 'child' | 'parent' | 'other'>('self');
  const [profileName, setProfileName] = useState('');
  const [profileDob, setProfileDob] = useState('');
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    if (!phone && !email) return;
    setLoading(true);
    setError('');
    try {
      const { code } = await api.authStart(authMethod, authMethod === 'phone' ? phone : email);
      setGeneratedCode(code);
    } catch (e: any) {
      setError(e?.message || 'Failed to send code');
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (otp !== generatedCode) { setOtpError('Invalid code. Try again.'); return; }
    setOtpError('');
    setLoading(true);
    setError('');
    try {
      const { userId } = await api.authVerify(otp);
      login(userId);
      setStep('profile');
    } catch (e: any) {
      setError(e?.message || 'Verification failed');
    }
    setLoading(false);
  };

  const handleCreateProfile = async () => {
    if (!profileName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const profile = await api.createProfile({ name: profileName.trim(), type: profileType, dob: profileDob || undefined });
      setActiveProfileId(profile.id);
      setStep('security');
    } catch (e: any) {
      setError(e?.message || 'Failed to create profile');
    }
    setLoading(false);
  };

  const handleComplete = () => {
    startJobRunner();
    if (onComplete) onComplete();
  };

  // ── ERROR BAR ──
  const ErrorBar = error ? (
    <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
      <AlertCircle size={16} className="text-red-600 shrink-0" />
      <p className="text-sm text-red-700">{error}</p>
      <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
    </div>
  ) : null;

  // ── STEP: PERMISSIONS ──
  if (step === 'permissions') return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-5xl mb-6">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Permissions</h1>
        <p className="text-gray-500 text-sm mb-8 text-center">CareBinder needs a few permissions to work properly.</p>
        <div className="w-full max-w-sm space-y-4">
          <PermCard icon={<Bell size={20} />} title="Notifications" desc="Remind you about medications" />
          <PermCard icon={<Camera size={20} />} title="Camera" desc="Scan health records" />
          <PermCard icon={<Lock size={20} />} title="Secure Storage" desc="Protect health data" />
        </div>
      </div>
      <div className="p-6">
        <button onClick={() => setStep('auth')} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] transition-colors">Continue</button>
      </div>
    </div>
  );

  // ── STEP: AUTH ──
  if (step === 'auth') return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-5xl mb-6">🔐</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h1>
        <p className="text-gray-500 text-sm mb-8 text-center">Secure your health data</p>
        <div className="w-full max-w-sm space-y-4">
          <div className="flex bg-gray-100 rounded-xl p-1">
            <button onClick={() => { setAuthMethod('phone'); setGeneratedCode(''); }} className={cn('flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors', authMethod === 'phone' ? 'bg-white shadow' : 'text-gray-500')}><Phone size={16} />Phone</button>
            <button onClick={() => { setAuthMethod('email'); setGeneratedCode(''); }} className={cn('flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors', authMethod === 'email' ? 'bg-white shadow' : 'text-gray-500')}><Mail size={16} />Email</button>
          </div>
          {!generatedCode ? (
            <>
              {authMethod === 'phone'
                ? <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none text-lg" />
                : <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" />}
              <button onClick={handleSendCode} disabled={loading || (!phone && !email)} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] disabled:opacity-50 transition-colors">
                {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Send Verification Code'}
              </button>
            </>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                <p className="text-xs text-blue-700 font-medium mb-1">Demo Verification Code</p>
                <p className="text-3xl font-bold text-blue-800 tracking-[0.3em] font-mono">{generatedCode}</p>
                <p className="text-xs text-blue-500 mt-1">Enter this code to continue</p>
              </div>
              {otpError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><p className="text-sm text-red-700 font-medium">{otpError}</p></div>}
              <input type="text" value={otp} onChange={e => { setOtp(e.target.value); setOtpError(''); }} placeholder="000000" maxLength={6} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none text-center text-2xl tracking-[0.5em] font-mono" autoComplete="one-time-code" />
              <button onClick={handleVerify} disabled={loading || otp.length < 4} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] disabled:opacity-50 transition-colors">
                {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Verify'}
              </button>
            </>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-6 text-center">By continuing, you agree to our Privacy Policy.</p>
      </div>
      {ErrorBar}
    </div>
  );

  // ── STEP: CREATE PROFILE ──
  if (step === 'profile') return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👤</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Profile</h1>
          <p className="text-gray-500 text-sm">Who are you managing care for?</p>
        </div>
        <div className="max-w-sm mx-auto space-y-6">
          <div className="grid grid-cols-2 gap-3">
            {([
              ['self', 'Self', User],
              ['child', 'Child', Baby],
              ['parent', 'Parent', UsersIcon],
              ['other', 'Other', UserPlus],
            ] as [string, string, typeof User][]).map(([t, l, I]) => (
              <button
                key={t}
                onClick={() => setProfileType(t as any)}
                className={cn(
                  'flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-colors',
                  profileType === t ? 'border-[#1B6B4A] bg-[#e6f4ea] text-[#1B6B4A]' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'
                )}
              >
                <I size={24} />
                <span className="text-sm font-medium">{l}</span>
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="e.g., Mom, Emma"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input type="date" value={profileDob} onChange={e => setProfileDob(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none" />
          </div>
        </div>
      </div>
      {ErrorBar}
      <div className="p-6 border-t border-gray-100">
        <button
          onClick={handleCreateProfile}
          disabled={loading || !profileName.trim() || !profileDob}
          className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <ChevronRight size={18} />}
          {loading ? 'Creating...' : 'Continue'}
        </button>
      </div>
    </div>
  );

  // ── STEP: SECURITY ──
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🛡️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Security Setup</h1>
          <p className="text-gray-500 text-sm">Protect your health information</p>
        </div>
        <div className="max-w-sm mx-auto space-y-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#e6f4ea] flex items-center justify-center"><Shield size={20} className="text-[#1B6B4A]" /></div>
              <div>
                <p className="font-medium text-gray-800">Data Encryption</p>
                <p className="text-xs text-gray-500">All records encrypted with AES-256-GCM</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-medium">Demo Mode</p>
            <p className="text-xs text-blue-700 mt-1">In production, biometric lock and device binding would be enforced. This prototype uses auto-generated encryption keys stored locally.</p>
          </div>
        </div>
      </div>
      <div className="p-6 border-t border-gray-100">
        <button onClick={handleComplete} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] flex items-center justify-center gap-2 transition-colors">
          Get Started <Check size={18} />
        </button>
      </div>
    </div>
  );
}

function PermCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
      <div className="text-[#1B6B4A]">{icon}</div>
      <div><p className="font-medium text-gray-800">{title}</p><p className="text-xs text-gray-500">{desc}</p></div>
    </div>
  );
}
