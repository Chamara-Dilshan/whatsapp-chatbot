'use client';

import { useEffect, useState, useCallback } from 'react';
import UsageBar from '../../../components/UsageBar';
import LoadingSpinner from '../../../components/LoadingSpinner';
import Badge from '../../../components/Badge';
import { useAuth } from '../../../contexts/AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ── Types ────────────────────────────────────────────────────────────────────

interface Subscription {
  plan: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface UsageCurrent {
  inboundMessagesCount: number;
  outboundMessagesCount: number;
  automationEventsCount: number;
  aiCallsCount: number;
}

interface Limits {
  plan: string;
  maxAgents: number;
  maxInboundPerMonth: number;
  maxOutboundPerDay: number;
  maxProducts: number | null;
  automationEnabled: boolean;
  analyticsEnabled: boolean;
  aiEnabled: boolean;
  maxAiCallsPerMonth: number;
}

interface UsageData {
  current: UsageCurrent;
  limits: Limits;
}

interface SubscriptionData {
  subscription: Subscription;
  limits: Limits;
}

// ── Plan card config ─────────────────────────────────────────────────────────

const PLAN_CARDS = [
  {
    key: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    color: 'gray',
    features: [
      '1 agent',
      '500 inbound messages / month',
      '100 outbound messages / day',
      '50 products',
      '50 AI calls / month',
      'Basic inbox & cases',
    ],
    cta: null, // current or no upgrade needed
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '$49',
    period: 'per month',
    color: 'blue',
    highlight: true,
    features: [
      '3 agents',
      '5,000 inbound messages / month',
      '1,000 outbound messages / day',
      '500 products',
      '1,000 AI calls / month',
      'Automation & analytics',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
  },
  {
    key: 'business',
    name: 'Business',
    price: '$149',
    period: 'per month',
    color: 'purple',
    features: [
      '10 agents',
      '50,000 inbound messages / month',
      '10,000 outbound messages / day',
      'Unlimited products',
      '10,000 AI calls / month',
      'Automation & analytics',
      'Dedicated support',
    ],
    cta: 'Upgrade to Business',
  },
];

// ── Badge color map ──────────────────────────────────────────────────────────

const statusVariant: Record<string, 'green' | 'yellow' | 'red' | 'gray'> = {
  active: 'green',
  trialing: 'yellow',
  past_due: 'red',
  canceled: 'gray',
};

// ── Component ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [subRes, usageRes] = await Promise.all([
        fetch(`${API_BASE}/billing/subscription`, { headers }),
        fetch(`${API_BASE}/billing/usage`, { headers }),
      ]);

      if (!subRes.ok || !usageRes.ok) throw new Error('Failed to load billing data');

      const [sub, usage] = await Promise.all([subRes.json(), usageRes.json()]);
      setSubData(sub);
      setUsageData(usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check for success/canceled query params from Stripe redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === '1') {
      // Refresh after successful checkout
      setTimeout(() => fetchData(), 2000);
    }
  }, [fetchData]);

  const handleUpgrade = async (plan: 'pro' | 'business') => {
    setUpgrading(plan);
    setActionError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/billing/create-checkout-session`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        const data = await res.json();
        const errObj = data.error;
        const message =
          typeof errObj === 'string'
            ? errObj
            : errObj?.message || 'Failed to create checkout session';
        throw new Error(message);
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Upgrade failed');
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setActionError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_BASE}/billing/create-portal-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        const errObj = data.error;
        const message =
          typeof errObj === 'string'
            ? errObj
            : errObj?.message || 'Failed to open billing portal';
        throw new Error(message);
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !subData || !usageData) {
    return (
      <div className="p-8">
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          {error ?? 'Failed to load billing data'}
        </div>
      </div>
    );
  }

  const { subscription, limits: subLimits } = subData;
  const { current, limits } = usageData;
  const currentPlan = subscription.plan;
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your subscription and monitor usage
        </p>
      </div>

      {/* Non-owner info banner */}
      {!isOwner && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">View-only access</p>
              <p className="mt-0.5 text-sm text-amber-700">
                Only the account owner can manage billing and upgrade plans. Contact your account owner to make changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action error banner */}
      {actionError && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="ml-4 text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Current subscription summary */}
      <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900 capitalize">
                {currentPlan} Plan
              </h2>
              <Badge variant={statusVariant[subscription.status] ?? 'gray'}>
                {subscription.status.replace('_', ' ')}
              </Badge>
              {subscription.cancelAtPeriodEnd && (
                <Badge variant="yellow">Cancels at period end</Badge>
              )}
            </div>
            {subscription.currentPeriodEnd && (
              <p className="mt-1 text-sm text-gray-500">
                {subscription.cancelAtPeriodEnd ? 'Access until' : 'Renews on'}{' '}
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Portal button — only for owners on paid plans */}
          {isOwner && currentPlan !== 'free' && isActive && (
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {portalLoading ? <LoadingSpinner size="sm" /> : null}
              Manage Subscription
            </button>
          )}
        </div>
      </div>

      {/* Usage section */}
      <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Current Month Usage</h2>
        <div className="space-y-5">
          <UsageBar
            label="Inbound Messages"
            used={current.inboundMessagesCount}
            limit={limits.maxInboundPerMonth}
          />
          <UsageBar
            label="Outbound Messages (daily limit)"
            used={current.outboundMessagesCount}
            limit={limits.maxOutboundPerDay}
          />
          {limits.automationEnabled && (
            <UsageBar
              label="Automation Events"
              used={current.automationEventsCount}
              limit={Math.max(current.automationEventsCount + 1, 1000)}
              unit="events"
            />
          )}
          <UsageBar
            label="AI Calls"
            used={current.aiCallsCount}
            limit={limits.maxAiCallsPerMonth || 50}
            unit="calls"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-4">
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{subLimits.maxAgents}</p>
            <p className="text-xs text-gray-500">Max Agents</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">
              {subLimits.maxProducts ?? '∞'}
            </p>
            <p className="text-xs text-gray-500">Max Products</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">
              {subLimits.automationEnabled ? '✓' : '✗'}
            </p>
            <p className="text-xs text-gray-500">Automation</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">
              {subLimits.analyticsEnabled ? '✓' : '✗'}
            </p>
            <p className="text-xs text-gray-500">Analytics</p>
          </div>
        </div>
      </div>

      {/* Plan cards */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-gray-900">Available Plans</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PLAN_CARDS.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            return (
              <div
                key={plan.key}
                className={`relative rounded-xl border p-5 ${
                  plan.highlight
                    ? 'border-blue-300 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white'
                } ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-blue-600 px-3 py-0.5 text-xs font-semibold text-white">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-3">
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-gray-900">{plan.price}</span>
                    <span className="text-sm text-gray-500">/ {plan.period}</span>
                  </div>
                </div>

                <ul className="mb-4 space-y-1.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-green-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="rounded-lg bg-gray-100 py-2 text-center text-sm font-medium text-gray-500">
                    Current Plan
                  </div>
                ) : plan.cta && isOwner ? (
                  <button
                    onClick={() => handleUpgrade(plan.key as 'pro' | 'business')}
                    disabled={!!upgrading}
                    className={`w-full rounded-lg py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                      plan.highlight
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {upgrading === plan.key ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoadingSpinner size="sm" /> Redirecting...
                      </span>
                    ) : (
                      plan.cta
                    )}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
