'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import LoadingSpinner from '../../components/LoadingSpinner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const STEPS = [
  { id: 1, title: 'Connect WhatsApp', description: 'Link your WhatsApp Business account to start receiving messages' },
  { id: 2, title: 'Choose a Plan', description: 'Select the right plan for your business needs' },
  { id: 3, title: 'Configure', description: 'Set your language, timezone, and response tone' },
];

const PLAN_CARDS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: ['1 agent', '500 inbound messages / month', '100 outbound messages / day', '50 products', '50 AI calls / month', 'Basic inbox & cases'],
    highlight: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$49',
    period: 'per month',
    features: ['3 agents', '5,000 inbound messages / month', '1,000 outbound messages / day', '500 products', '1,000 AI calls / month', 'Automation & analytics', 'Priority support'],
    highlight: true,
  },
  {
    key: 'business',
    name: 'Business',
    price: '$149',
    period: 'per month',
    features: ['10 agents', '50,000 inbound messages / month', '10,000 outbound messages / day', 'Unlimited products', '10,000 AI calls / month', 'Automation & analytics', 'Dedicated support'],
    highlight: false,
  },
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Africa/Johannesburg',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Colombo', 'Asia/Dhaka', 'Asia/Bangkok',
  'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney',
];

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 — WhatsApp
  const [waForm, setWaForm] = useState({
    phoneNumberId: '',
    displayPhone: '',
    wabaId: '',
    accessToken: '',
    appSecret: '',
    webhookVerifyToken: '',
  });
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);

  // Step 2 — Plan
  const [planLoading, setPlanLoading] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  // Step 3 — Config
  const [configForm, setConfigForm] = useState({
    timezone: 'UTC',
    defaultLanguage: 'en',
    tone: 'professional',
  });
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleConnectWA = async (skip: boolean) => {
    if (skip) {
      setStep(2);
      return;
    }
    if (!waForm.phoneNumberId || !waForm.accessToken || !waForm.webhookVerifyToken) {
      setWaError('Phone Number ID, Access Token, and Webhook Verify Token are required');
      return;
    }
    setWaLoading(true);
    setWaError(null);
    try {
      await api.connectWhatsApp(waForm);
      setStep(2);
    } catch (err: any) {
      setWaError(err.message || 'Failed to connect WhatsApp');
    } finally {
      setWaLoading(false);
    }
  };

  const handleUpgrade = async (plan: 'pro' | 'business') => {
    setPlanLoading(plan);
    setPlanError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/billing/create-checkout-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const data = await res.json();
        const errObj = data.error;
        throw new Error(typeof errObj === 'string' ? errObj : errObj?.message || 'Failed to create checkout');
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      setPlanError(err.message || 'Upgrade failed');
    } finally {
      setPlanLoading(null);
    }
  };

  const handleSaveConfig = async (skip: boolean) => {
    if (skip) {
      router.push('/dashboard');
      return;
    }
    setConfigLoading(true);
    setConfigError(null);
    try {
      await api.updatePolicies({
        timezone: configForm.timezone,
        defaultLanguage: configForm.defaultLanguage,
        tone: configForm.tone,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setConfigError(err.message || 'Failed to save configuration');
    } finally {
      setConfigLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) return null;

  const currentStep = STEPS[step - 1];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💬</span>
            <span className="font-semibold text-gray-900">WhatsApp Bot</span>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip setup →
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Step indicator */}
        <nav className="mb-8">
          <ol className="flex items-center">
            {STEPS.map((s, i) => (
              <li key={s.id} className="flex flex-1 items-center">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                      step > s.id
                        ? 'bg-green-500 text-white'
                        : step === s.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step > s.id ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      s.id
                    )}
                  </div>
                  <span className={`hidden text-sm font-medium sm:block ${step === s.id ? 'text-gray-900' : 'text-gray-500'}`}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`mx-3 h-0.5 flex-1 transition-colors ${step > s.id ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </li>
            ))}
          </ol>
        </nav>

        {/* Card */}
        <div className="rounded-xl border bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900">{currentStep.title}</h1>
            <p className="mt-1 text-sm text-gray-500">{currentStep.description}</p>
          </div>

          {/* ── Step 1: Connect WhatsApp ── */}
          {step === 1 && (
            <div className="space-y-5">
              {waError && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{waError}</div>
              )}

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm text-blue-800">
                  You'll need a <strong>Meta Business account</strong> with WhatsApp Business API access.{' '}
                  <a
                    href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-900"
                  >
                    Get started with Meta →
                  </a>
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number ID <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={waForm.phoneNumberId}
                    onChange={(e) => setWaForm({ ...waForm, phoneNumberId: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Display Phone Number</label>
                  <input
                    type="text"
                    value={waForm.displayPhone}
                    onChange={(e) => setWaForm({ ...waForm, displayPhone: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="+1 555 000 0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">WhatsApp Business Account ID (WABA)</label>
                <input
                  type="text"
                  value={waForm.wabaId}
                  onChange={(e) => setWaForm({ ...waForm, wabaId: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="WABA ID from Meta Business Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Access Token <span className="text-red-500">*</span></label>
                <div className="relative mt-1">
                  <input
                    type={showAccessToken ? 'text' : 'password'}
                    value={waForm.accessToken}
                    onChange={(e) => setWaForm({ ...waForm, accessToken: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-20 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="EAAxxxxxxx..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessToken(!showAccessToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showAccessToken ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">App Secret</label>
                <div className="relative mt-1">
                  <input
                    type={showAppSecret ? 'text' : 'password'}
                    value={waForm.appSecret}
                    onChange={(e) => setWaForm({ ...waForm, appSecret: e.target.value })}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-20 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    placeholder="App Secret from Meta dashboard"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAppSecret(!showAppSecret)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    {showAppSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Webhook Verify Token <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={waForm.webhookVerifyToken}
                  onChange={(e) => setWaForm({ ...waForm, webhookVerifyToken: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  placeholder="A secret string you create"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Set this same string in the Meta webhook configuration as the verify token.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => handleConnectWA(true)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Skip for now
                </button>
                <button
                  onClick={() => handleConnectWA(false)}
                  disabled={waLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {waLoading && <LoadingSpinner size="sm" />}
                  Connect & Continue
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Choose Plan ── */}
          {step === 2 && (
            <div className="space-y-4">
              {planError && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{planError}</div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                {PLAN_CARDS.map((plan) => (
                  <div
                    key={plan.key}
                    className={`relative rounded-xl border p-4 ${
                      plan.highlight
                        ? 'border-blue-300 bg-blue-50 shadow-md'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {plan.highlight && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="whitespace-nowrap rounded-full bg-blue-600 px-3 py-0.5 text-xs font-semibold text-white">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="mb-3">
                      <h3 className="font-bold text-gray-900">{plan.name}</h3>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-extrabold text-gray-900">{plan.price}</span>
                        <span className="text-xs text-gray-500">/ {plan.period}</span>
                      </div>
                    </div>

                    <ul className="mb-4 space-y-1.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <span className="mt-0.5 text-green-500">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {plan.key === 'free' ? (
                      <button
                        onClick={() => setStep(3)}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Continue Free
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan.key as 'pro' | 'business')}
                        disabled={!!planLoading}
                        className={`w-full rounded-lg py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                          plan.highlight ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-gray-800'
                        }`}
                      >
                        {planLoading === plan.key ? (
                          <span className="flex items-center justify-center gap-2">
                            <LoadingSpinner size="sm" /> Redirecting...
                          </span>
                        ) : (
                          `Upgrade to ${plan.name}`
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-start pt-1">
                <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-700">
                  ← Back
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Configure ── */}
          {step === 3 && (
            <div className="space-y-5">
              {configError && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{configError}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Timezone</label>
                <select
                  value={configForm.timezone}
                  onChange={(e) => setConfigForm({ ...configForm, timezone: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Used for business hours and scheduling.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Default Language</label>
                <div className="mt-2 flex gap-3">
                  {[
                    { value: 'en', label: 'English' },
                    { value: 'si', label: 'Sinhala' },
                    { value: 'ta', label: 'Tamil' },
                  ].map((lang) => (
                    <button
                      key={lang.value}
                      type="button"
                      onClick={() => setConfigForm({ ...configForm, defaultLanguage: lang.value })}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        configForm.defaultLanguage === lang.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  The language used for automated responses. You can enable auto-detection in Settings later.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Response Tone</label>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {[
                    { value: 'professional', label: 'Professional', description: 'Formal and business-like' },
                    { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
                    { value: 'casual', label: 'Casual', description: 'Relaxed and informal' },
                  ].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setConfigForm({ ...configForm, tone: t.value })}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        configForm.tone === t.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p className={`text-sm font-medium ${configForm.tone === t.value ? 'text-blue-700' : 'text-gray-900'}`}>
                        {t.label}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setStep(2)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => handleSaveConfig(true)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Skip for now
                  </button>
                </div>
                <button
                  onClick={() => handleSaveConfig(false)}
                  disabled={configLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {configLoading && <LoadingSpinner size="sm" />}
                  Save & Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-gray-400">
          You can change all these settings anytime from the dashboard.
        </p>
      </main>
    </div>
  );
}
