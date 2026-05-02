import { useState } from 'react';
import { cn } from '../../utils/cn';
import { api, startJobRunner } from '../../core/api';
import { useAppCtx } from '../../app/AppShell';
import { PrivacyScreen } from '../more/PrivacyScreen';
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
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [ecRelation, setEcRelation] = useState('');
  const [profileName, setProfileName] = useState('');
  const [profileDob, setProfileDob] = useState('');
  const [error, setError] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);

  const handleSendCode = async () => {
    if (authMethod === 'phone' && !phone) return;
    if (authMethod === 'email' && !email) return;
    setLoading(true);
    setError('');
    try {
      if (authMethod === 'phone') {
        await api.startPhoneAuth(phone);
        setGeneratedCode('PHONE_AUTH_PENDING');
      } else {
        await api.startEmailAuth(email);
        setGeneratedCode('EMAIL_LINK_SENT');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to send verification');
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    setOtpError('');
    setLoading(true);
    setError('');
    try {
      const userId = await api.verifyPhoneOtp(otp);
      login(userId);
      setStep('profile');
    } catch (e: any) {
      setOtpError(e?.message || 'Invalid code. Try again.');
    }
    setLoading(false);
  };

  const handleCreateProfile = async () => {
    if (!profileName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const profile = await api.createProfile({ name: profileName.trim(), type: profileType, dob: profileDob || undefined });
      if (ecName.trim() || ecPhone.trim()) {
        const ec = { id: Date.now().toString(), name: ecName.trim(), phone: ecPhone.trim(), relationship: ecRelation.trim() };
        const card = await api.getEmergencyCard(profile.id);
        await api.patchEmergencyCard(profile.id, { emergencyContacts: [...card.emergencyContacts, ec] });
      }
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
              <button onClick={handleSendCode} disabled={loading || (authMethod === 'phone' ? !phone : !email)} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] disabled:opacity-50 transition-colors">
                {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Send Verification Code'}
              </button>
              <div id="recaptcha-container" />
            </>
          ) : generatedCode === 'EMAIL_LINK_SENT' ? (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">📧</div>
                <p className="font-semibold text-emerald-800 mb-2">Check your email</p>
                <p className="text-sm text-emerald-700">We sent a sign-in link to <strong>{email}</strong>. Open the link on this device to continue.</p>
                <p className="text-xs text-emerald-600 mt-3">Link expires in 1 hour. Check your spam folder if you don't see it.</p>
              </div>
              <button onClick={() => setGeneratedCode('')} className="w-full py-2 text-sm text-gray-500">Use a different email</button>
            </>
          ) : (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-xs text-emerald-700 font-medium mb-1">Verification Code Sent</p>
                <p className="text-sm text-emerald-600">Please check your phone for a 6-digit code.</p>
              </div>
              {otpError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center"><p className="text-sm text-red-700 font-medium">{otpError}</p></div>}
              <input type="text" value={otp} onChange={e => { setOtp(e.target.value); setOtpError(''); }} placeholder="000000" maxLength={6} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none text-center text-2xl tracking-[0.5em] font-mono" autoComplete="one-time-code" />
              <button onClick={handleVerify} disabled={loading || otp.length < 4} className="w-full py-3 bg-[#1B6B4A] text-white rounded-xl font-semibold hover:bg-[#175f42] disabled:opacity-50 transition-colors">
                {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Verify'}
              </button>
            </>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-6 text-center">By continuing, you agree to our <button onClick={() => setShowPrivacy(true)} className="underline">Privacy Policy</button>.</p>
        <PrivacyScreen open={showPrivacy} onClose={() => setShowPrivacy(false)} />
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
                onClick={() => setProfileType(t as 'self' | 'child' | 'parent' | 'other')}
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
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Emergency Contact (Optional)</h3>
            <div className="space-y-3">
              <input type="text" value={ecName} onChange={e => setEcName(e.target.value)} placeholder="Contact Name" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="tel" value={ecPhone} onChange={e => setEcPhone(e.target.value)} placeholder="Phone" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none text-sm" />
                <input type="text" value={ecRelation} onChange={e => setEcRelation(e.target.value)} placeholder="Relationship" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-[#1B6B4A] outline-none text-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {ErrorBar}
      <div className="p-6 border-t border-gray-100">
        <button
          onClick={handleCreateProfile}
          disabled={loading || !profileName.trim()}
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
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-sm text-emerald-800 font-medium">Security Verified</p>
            <p className="text-xs text-emerald-700 mt-1">Biometric locking and hardware-backed encryption keys are managed by your device's Secure Enclave.</p>
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
