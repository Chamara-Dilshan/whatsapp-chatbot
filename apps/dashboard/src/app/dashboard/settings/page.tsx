'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import Modal from '../../../components/Modal';
import Badge from '../../../components/Badge';

interface Template {
  id: string;
  intent: string;
  name: string;
  body: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'policies' | 'templates' | 'language' | 'ai'>('policies');

  // WhatsApp state
  const [waStatus, setWaStatus] = useState<any>(null);
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const [waFormData, setWaFormData] = useState({
    phoneNumberId: '',
    displayPhone: '',
    wabaId: '',
    accessToken: '',
    appSecret: '',
    webhookVerifyToken: '',
    catalogId: '',
  });
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);

  // Policies state
  const [policies, setPolicies] = useState<any>(null);
  const [policiesLoading, setPoliciesLoading] = useState(false);
  const [policiesError, setPoliciesError] = useState<string | null>(null);
  const [policiesData, setPoliciesData] = useState({
    returnPolicy: '',
    shippingPolicy: '',
    faqContent: '',
    timezone: 'UTC',
    autoReplyDelay: '0',
    businessHours: {
      mon: { enabled: false, open: '09:00', close: '17:00' },
      tue: { enabled: false, open: '09:00', close: '17:00' },
      wed: { enabled: false, open: '09:00', close: '17:00' },
      thu: { enabled: false, open: '09:00', close: '17:00' },
      fri: { enabled: false, open: '09:00', close: '17:00' },
      sat: { enabled: false, open: '09:00', close: '17:00' },
      sun: { enabled: false, open: '09:00', close: '17:00' },
    },
  });

  // Language & Tone state
  const [langData, setLangData] = useState({
    defaultLanguage: 'EN',
    tone: 'FRIENDLY',
    autoDetectLanguage: false,
  });
  const [langSaving, setLangSaving] = useState(false);
  const [langError, setLangError] = useState<string | null>(null);
  const [langSuccess, setLangSuccess] = useState(false);

  // AI state
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState(false);
  const [aiUsage, setAiUsage] = useState<{ used: number; limit: number } | null>(null);

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDeleteTemplateModal, setShowDeleteTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateFormData, setTemplateFormData] = useState({
    intent: '',
    name: '',
    body: '',
    isActive: true,
  });
  const [templateFormLoading, setTemplateFormLoading] = useState(false);
  const [templateFormError, setTemplateFormError] = useState<string | null>(null);

  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  useEffect(() => {
    loadWhatsAppStatus();
    loadPolicies();
    loadTemplates();
    loadAiUsage();
  }, []);

  // WhatsApp functions
  const loadWhatsAppStatus = async () => {
    try {
      const status = await api.getWhatsAppStatus();
      setWaStatus(status);
    } catch (err: any) {
      console.error('Failed to load WhatsApp status:', err);
    }
  };

  const handleConnectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaLoading(true);
    setWaError(null);

    try {
      await api.connectWhatsApp({
        phoneNumberId: waFormData.phoneNumberId,
        displayPhone: waFormData.displayPhone,
        wabaId: waFormData.wabaId || undefined,
        accessToken: waFormData.accessToken,
        appSecret: waFormData.appSecret,
        webhookVerifyToken: waFormData.webhookVerifyToken,
        catalogId: waFormData.catalogId || undefined,
      });
      await loadWhatsAppStatus();
      setWaFormData({
        phoneNumberId: '',
        displayPhone: '',
        wabaId: '',
        accessToken: '',
        appSecret: '',
        webhookVerifyToken: '',
        catalogId: '',
      });
    } catch (err: any) {
      setWaError(err.message || 'Failed to connect WhatsApp');
    } finally {
      setWaLoading(false);
    }
  };

  const handleUpdateCatalog = async () => {
    if (!waFormData.catalogId) return;

    setWaLoading(true);
    setWaError(null);

    try {
      await api.updateWhatsAppCatalog(waFormData.catalogId);
      await loadWhatsAppStatus();
      alert('Catalog ID updated successfully');
    } catch (err: any) {
      setWaError(err.message || 'Failed to update catalog');
    } finally {
      setWaLoading(false);
    }
  };

  // Policies functions
  const loadPolicies = async () => {
    try {
      const data = await api.getPolicies();
      setPolicies(data);

      // Populate form
      setPoliciesData({
        returnPolicy: data.returnPolicy || '',
        shippingPolicy: data.shippingPolicy || '',
        faqContent: data.faqContent || '',
        timezone: data.timezone || 'UTC',
        autoReplyDelay: data.autoReplyDelay?.toString() || '0',
        businessHours: data.businessHours ? {
          ...Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
            const d = data.businessHours[day];
            const isValidTime = (v: string) => /^\d{2}:\d{2}/.test(v);
            const enabled = d ? (d.enabled !== undefined ? !!d.enabled : isValidTime(d.open)) : false;
            return [day, {
              enabled,
              open: (d && isValidTime(d.open)) ? d.open : '09:00',
              close: (d && isValidTime(d.close)) ? d.close : '17:00',
            }];
          })),
        } as typeof policiesData.businessHours : policiesData.businessHours,
      });

      // Also populate language/tone tab
      setLangData({
        defaultLanguage: data.defaultLanguage || 'EN',
        tone: data.tone || 'FRIENDLY',
        autoDetectLanguage: data.autoDetectLanguage || false,
      });

      // Populate AI toggle
      setAiEnabled(data.aiEnabled || false);
    } catch (err: any) {
      console.error('Failed to load policies:', err);
    }
  };

  const loadAiUsage = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/billing/usage`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setAiUsage({
          used: data.current?.aiCallsCount || 0,
          limit: data.limits?.maxAiCallsPerMonth || 50,
        });
      }
    } catch {
      // Best effort
    }
  };

  const handleSaveLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    setLangSaving(true);
    setLangError(null);
    setLangSuccess(false);
    try {
      await api.updatePolicies({
        defaultLanguage: langData.defaultLanguage as 'EN' | 'SI' | 'TA',
        tone: langData.tone as 'FRIENDLY' | 'FORMAL' | 'SHORT',
        autoDetectLanguage: langData.autoDetectLanguage,
      });
      setLangSuccess(true);
      setTimeout(() => setLangSuccess(false), 3000);
    } catch (err: any) {
      setLangError(err.message || 'Failed to save language settings');
    } finally {
      setLangSaving(false);
    }
  };

  const handleToggleAi = async (enabled: boolean) => {
    setAiSaving(true);
    setAiError(null);
    setAiSuccess(false);
    try {
      await api.updatePolicies({ aiEnabled: enabled });
      setAiEnabled(enabled);
      setAiSuccess(true);
      setTimeout(() => setAiSuccess(false), 3000);
    } catch (err: any) {
      setAiError(err.message || 'Failed to update AI settings');
    } finally {
      setAiSaving(false);
    }
  };

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setPoliciesLoading(true);
    setPoliciesError(null);

    try {
      const businessHours: any = {};
      Object.keys(policiesData.businessHours).forEach((day) => {
        const dayData = policiesData.businessHours[day as keyof typeof policiesData.businessHours];
        if (dayData.enabled) {
          businessHours[day] = {
            open: dayData.open,
            close: dayData.close,
          };
        }
      });

      await api.updatePolicies({
        returnPolicy: policiesData.returnPolicy || undefined,
        shippingPolicy: policiesData.shippingPolicy || undefined,
        faqContent: policiesData.faqContent || undefined,
        timezone: policiesData.timezone,
        autoReplyDelay: parseInt(policiesData.autoReplyDelay) || 0,
        businessHours,
      });
      await loadPolicies();
      alert('Policies updated successfully');
    } catch (err: any) {
      setPoliciesError(err.message || 'Failed to update policies');
    } finally {
      setPoliciesLoading(false);
    }
  };

  // Templates functions
  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const data = await api.getTemplates();
      setTemplates(data || []);
    } catch (err: any) {
      setTemplatesError(err.message || 'Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const openCreateTemplateModal = () => {
    setSelectedTemplate(null);
    setTemplateFormData({
      intent: '',
      name: '',
      body: '',
      isActive: true,
    });
    setTemplateFormError(null);
    setShowTemplateModal(true);
  };

  const openEditTemplateModal = (template: Template) => {
    setSelectedTemplate(template);
    setTemplateFormData({
      intent: template.intent,
      name: template.name,
      body: template.body,
      isActive: template.isActive,
    });
    setTemplateFormError(null);
    setShowTemplateModal(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTemplateFormLoading(true);
    setTemplateFormError(null);

    try {
      if (selectedTemplate) {
        await api.updateTemplate(selectedTemplate.id, templateFormData);
      } else {
        await api.createTemplate(templateFormData);
      }
      setShowTemplateModal(false);
      await loadTemplates();
    } catch (err: any) {
      setTemplateFormError(err.message || 'Failed to save template');
    } finally {
      setTemplateFormLoading(false);
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    setTemplateFormLoading(true);
    setTemplateFormError(null);

    try {
      await api.deleteTemplate(selectedTemplate.id);
      setShowDeleteTemplateModal(false);
      setSelectedTemplate(null);
      await loadTemplates();
    } catch (err: any) {
      setTemplateFormError(err.message || 'Failed to delete template');
    } finally {
      setTemplateFormLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div>
        <h1 className="mb-4 text-2xl font-bold text-gray-900 md:mb-6 md:text-3xl">Settings</h1>

        <div className="space-y-6">
          {/* User Profile */}
          <div className="rounded-lg bg-white p-4 shadow md:p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">User Profile</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-900 md:text-sm">Name</label>
                <div className="mt-1 text-sm text-gray-900 md:text-base">{user?.name}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-900 md:text-sm">Email</label>
                <div className="mt-1 text-sm text-gray-900 md:text-base">{user?.email}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-900 md:text-sm">Role</label>
                <div className="mt-1 capitalize text-sm text-gray-900 md:text-base">{user?.role}</div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-900 md:text-sm">Tenant ID</label>
                <div className="mt-1 font-mono text-xs text-gray-900 md:text-sm">{user?.tenantId}</div>
              </div>
            </div>
          </div>

          {/* WhatsApp Configuration */}
          <div className="rounded-lg bg-white p-4 shadow md:p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">WhatsApp Configuration</h2>

            {waError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                {waError}
              </div>
            )}

            {waStatus && waStatus.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-md bg-green-50 p-4">
                  <p className="font-medium text-green-800">✓ WhatsApp Connected</p>
                  <div className="mt-2 space-y-1 text-sm text-green-800">
                    <div>Phone: {waStatus[0].displayPhone}</div>
                    {waStatus[0].wabaId && <div>WABA ID: {waStatus[0].wabaId}</div>}
                  </div>
                </div>

                {isAdmin && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-900">Catalog ID</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={waFormData.catalogId}
                        onChange={(e) => setWaFormData({ ...waFormData, catalogId: e.target.value })}
                        placeholder={waStatus[0].catalogId || 'Enter catalog ID'}
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        onClick={handleUpdateCatalog}
                        disabled={waLoading || !waFormData.catalogId}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              isAdmin && (
                <form onSubmit={handleConnectWhatsApp} className="space-y-4">
                  <p className="text-sm text-gray-800">
                    Get credentials from Meta Business Manager → WhatsApp → API Setup
                  </p>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-900">
                      Phone Number ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={waFormData.phoneNumberId}
                      onChange={(e) => setWaFormData({ ...waFormData, phoneNumberId: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-900">
                      Display Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={waFormData.displayPhone}
                      onChange={(e) => setWaFormData({ ...waFormData, displayPhone: e.target.value })}
                      placeholder="+1234567890"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-900">
                      WABA ID
                    </label>
                    <input
                      type="text"
                      value={waFormData.wabaId}
                      onChange={(e) => setWaFormData({ ...waFormData, wabaId: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-900">
                      Access Token <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showAccessToken ? 'text' : 'password'}
                        required
                        value={waFormData.accessToken}
                        onChange={(e) => setWaFormData({ ...waFormData, accessToken: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccessToken(!showAccessToken)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showAccessToken ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-900">
                      App Secret <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showAppSecret ? 'text' : 'password'}
                        required
                        value={waFormData.appSecret}
                        onChange={(e) => setWaFormData({ ...waFormData, appSecret: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAppSecret(!showAppSecret)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showAppSecret ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-900">
                      Webhook Verify Token <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={waFormData.webhookVerifyToken}
                      onChange={(e) => setWaFormData({ ...waFormData, webhookVerifyToken: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-900">
                      Catalog ID
                    </label>
                    <input
                      type="text"
                      value={waFormData.catalogId}
                      onChange={(e) => setWaFormData({ ...waFormData, catalogId: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={waLoading}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {waLoading ? 'Connecting...' : 'Connect WhatsApp'}
                  </button>
                </form>
              )
            )}

            {!isAdmin && (
              <p className="text-sm text-gray-800">
                Only owners and admins can configure WhatsApp settings.
              </p>
            )}
          </div>

          {/* Policies & Templates */}
          <div className="rounded-lg bg-white p-4 shadow md:p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">Policies & Templates</h2>

            {/* Tabs */}
            <div className="mb-4 border-b border-gray-200">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('policies')}
                  className={`border-b-2 px-1 py-2 text-sm font-medium ${
                    activeTab === 'policies'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-800'
                  }`}
                >
                  Policies
                </button>
                <button
                  onClick={() => setActiveTab('templates')}
                  className={`border-b-2 px-1 py-2 text-sm font-medium ${
                    activeTab === 'templates'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-800'
                  }`}
                >
                  Templates
                </button>
                <button
                  onClick={() => setActiveTab('language')}
                  className={`border-b-2 px-1 py-2 text-sm font-medium ${
                    activeTab === 'language'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-800'
                  }`}
                >
                  Language & Tone
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`border-b-2 px-1 py-2 text-sm font-medium ${
                    activeTab === 'ai'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-800'
                  }`}
                >
                  AI
                </button>
              </div>
            </div>

            {/* Policies Tab */}
            {activeTab === 'policies' && (
              <form onSubmit={handleSavePolicies} className="space-y-4">
                {policiesError && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                    {policiesError}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-900">Return Policy</label>
                  <textarea
                    rows={4}
                    value={policiesData.returnPolicy}
                    onChange={(e) => setPoliciesData({ ...policiesData, returnPolicy: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-900">Shipping Policy</label>
                  <textarea
                    rows={4}
                    value={policiesData.shippingPolicy}
                    onChange={(e) => setPoliciesData({ ...policiesData, shippingPolicy: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-900">FAQ Content</label>
                  <textarea
                    rows={4}
                    value={policiesData.faqContent}
                    onChange={(e) => setPoliciesData({ ...policiesData, faqContent: e.target.value })}
                    disabled={!isAdmin}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">Business Hours</label>
                  <div className="space-y-2">
                    {Object.keys(policiesData.businessHours).map((day) => {
                      const dayData = policiesData.businessHours[day as keyof typeof policiesData.businessHours];
                      return (
                        <div key={day} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id={`day-${day}`}
                            checked={dayData.enabled}
                            onChange={(e) => setPoliciesData({
                              ...policiesData,
                              businessHours: {
                                ...policiesData.businessHours,
                                [day]: { ...dayData, enabled: e.target.checked },
                              },
                            })}
                            disabled={!isAdmin}
                            className="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <label htmlFor={`day-${day}`} className="w-12 shrink-0 text-sm capitalize text-gray-900">
                            {day}
                          </label>
                          <input
                            type="time"
                            value={dayData.open}
                            onChange={(e) => setPoliciesData({
                              ...policiesData,
                              businessHours: {
                                ...policiesData.businessHours,
                                [day]: { ...dayData, open: e.target.value },
                              },
                            })}
                            disabled={!dayData.enabled || !isAdmin}
                            className="w-32 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                          />
                          <span className="shrink-0 text-sm text-gray-600">to</span>
                          <input
                            type="time"
                            value={dayData.close}
                            onChange={(e) => setPoliciesData({
                              ...policiesData,
                              businessHours: {
                                ...policiesData.businessHours,
                                [day]: { ...dayData, close: e.target.value },
                              },
                            })}
                            disabled={!dayData.enabled || !isAdmin}
                            className="w-32 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-900">Timezone</label>
                    <select
                      value={policiesData.timezone}
                      onChange={(e) => setPoliciesData({ ...policiesData, timezone: e.target.value })}
                      disabled={!isAdmin}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="America/Los_Angeles">America/Los_Angeles</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Asia/Kolkata">Asia/Kolkata</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-900">
                      Auto Reply Delay (ms)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={policiesData.autoReplyDelay}
                      onChange={(e) => setPoliciesData({ ...policiesData, autoReplyDelay: e.target.value })}
                      disabled={!isAdmin}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none disabled:bg-gray-50"
                    />
                  </div>
                </div>

                {isAdmin && (
                  <button
                    type="submit"
                    disabled={policiesLoading}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {policiesLoading ? 'Saving...' : 'Save Policies'}
                  </button>
                )}
              </form>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-4">
                {templatesError && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                    {templatesError}
                  </div>
                )}

                {isAdmin && (
                  <button
                    onClick={openCreateTemplateModal}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
                  >
                    + Create Template
                  </button>
                )}

                {templatesLoading ? (
                  <p className="text-sm text-gray-800">Loading templates...</p>
                ) : templates.length === 0 ? (
                  <p className="text-sm text-gray-800">
                    No templates configured. Create templates to customize bot responses.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Intent</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                          {isAdmin && (
                            <th className="px-4 py-2 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {templates.map((template) => (
                          <tr key={template.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">{template.intent}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{template.name}</td>
                            <td className="px-4 py-2">
                              <Badge variant={template.isActive ? 'green' : 'gray'} size="sm">
                                {template.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-2 text-right">
                                <button
                                  onClick={() => openEditTemplateModal(template)}
                                  className="mr-2 text-blue-600 hover:text-blue-800"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedTemplate(template);
                                    setShowDeleteTemplateModal(true);
                                  }}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  🗑️
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Language & Tone Tab */}
            {activeTab === 'language' && (
              <form onSubmit={handleSaveLanguage} className="space-y-6">
                {langError && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{langError}</div>
                )}
                {langSuccess && (
                  <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
                    Language & tone settings saved successfully!
                  </div>
                )}

                {/* Default Language */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-900">
                    Default Language
                  </label>
                  <select
                    value={langData.defaultLanguage}
                    onChange={(e) => setLangData({ ...langData, defaultLanguage: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={!isAdmin}
                  >
                    <option value="EN">English (EN)</option>
                    <option value="SI">Sinhala (SI)</option>
                    <option value="TA">Tamil (TA)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Bot will reply in this language unless overridden by detection or customer choice.
                  </p>
                </div>

                {/* Tone */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-900">Reply Tone</label>
                  <select
                    value={langData.tone}
                    onChange={(e) => setLangData({ ...langData, tone: e.target.value })}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={!isAdmin}
                  >
                    <option value="FRIENDLY">Friendly (warm, emoji-friendly)</option>
                    <option value="FORMAL">Formal (professional, no emoji)</option>
                    <option value="SHORT">Short (brief and concise)</option>
                  </select>
                </div>

                {/* Auto-detect */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="autoDetectLanguage"
                    checked={langData.autoDetectLanguage}
                    onChange={(e) =>
                      setLangData({ ...langData, autoDetectLanguage: e.target.checked })
                    }
                    disabled={!isAdmin}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <div>
                    <label htmlFor="autoDetectLanguage" className="block text-sm font-medium text-gray-900">
                      Auto-detect customer language
                    </label>
                    <p className="text-xs text-gray-500">
                      Detects Sinhala / Tamil from Unicode character ranges and overrides the default language.
                      Customer can also type "English", "සිංහල", or "தமிழ்" to switch languages.
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    type="submit"
                    disabled={langSaving}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {langSaving ? 'Saving...' : 'Save Language Settings'}
                  </button>
                )}
              </form>
            )}
            {/* AI Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-6">
                {aiError && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{aiError}</div>
                )}
                {aiSuccess && (
                  <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
                    AI settings saved successfully!
                  </div>
                )}

                {/* AI Toggle */}
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={aiEnabled}
                    onClick={() => !aiSaving && isAdmin && handleToggleAi(!aiEnabled)}
                    disabled={aiSaving || !isAdmin}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                      aiEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        aiEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <div>
                    <label className="block text-sm font-medium text-gray-900">
                      Enable AI-powered responses
                    </label>
                    <p className="text-xs text-gray-500">
                      When enabled, AI will classify unrecognized messages and generate contextual replies
                      when no template matches. Rules-based detection always runs first (free and fast).
                    </p>
                  </div>
                </div>

                {/* AI Usage */}
                {aiUsage && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-900">
                      AI Calls This Month
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 flex-1 rounded-full bg-gray-200">
                        <div
                          className={`h-2.5 rounded-full transition-all ${
                            aiUsage.used / aiUsage.limit >= 0.95
                              ? 'bg-red-500'
                              : aiUsage.used / aiUsage.limit >= 0.8
                                ? 'bg-orange-500'
                                : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, (aiUsage.used / aiUsage.limit) * 100)}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-sm text-gray-600">
                        {aiUsage.used} / {aiUsage.limit}
                      </span>
                    </div>
                  </div>
                )}

                {/* How it works */}
                <div className="rounded-md bg-blue-50 p-4">
                  <p className="text-sm font-medium text-blue-800">How AI works:</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-blue-700">
                    <li>Incoming messages are first matched against 8 keyword rules (free, instant)</li>
                    <li>If no rule matches, AI classifies the intent (uses 1 AI call)</li>
                    <li>If no template exists for the intent, AI generates a contextual reply (uses 1 AI call)</li>
                    <li>If AI quota is exhausted, the bot falls back to the default template response</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* n8n Automation */}
          <div className="rounded-lg bg-white p-4 shadow md:p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">n8n Automation</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-900">Webhook URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/automation/webhook`}
                    readOnly
                    className="flex-1 overflow-hidden text-ellipsis rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/automation/webhook`
                      );
                      alert('Copied to clipboard!');
                    }}
                    className="shrink-0 rounded-md bg-gray-200 px-3 py-2 text-sm text-gray-900 hover:bg-gray-300"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="rounded-md bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-800">Setup Instructions:</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-blue-700">
                  <li>Configure your n8n workflow to send events to the webhook URL above</li>
                  <li>Add the automation key in the header: <code className="rounded bg-blue-100 px-1">X-Automation-Key</code></li>
                  <li>The webhook accepts POST requests with action and payload data</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Template Create/Edit Modal */}
      <Modal
        isOpen={showTemplateModal}
        onClose={() => {
          setShowTemplateModal(false);
          setSelectedTemplate(null);
        }}
        title={selectedTemplate ? 'Edit Template' : 'Create Template'}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowTemplateModal(false);
                setSelectedTemplate(null);
              }}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTemplate}
              disabled={templateFormLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {templateFormLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveTemplate} className="space-y-4">
          {templateFormError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {templateFormError}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              Intent <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={templateFormData.intent}
              onChange={(e) => setTemplateFormData({ ...templateFormData, intent: e.target.value })}
              placeholder="e.g., greeting, refund_cancel, order_tracking"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={templateFormData.name}
              onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-900">
              Body <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              required
              value={templateFormData.body}
              onChange={(e) => setTemplateFormData({ ...templateFormData, body: e.target.value })}
              placeholder="Template text. You can use placeholders like {{customerName}}"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="templateActive"
              checked={templateFormData.isActive}
              onChange={(e) => setTemplateFormData({ ...templateFormData, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="templateActive" className="text-sm font-medium text-gray-900">
              Active
            </label>
          </div>
        </form>
      </Modal>

      {/* Template Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteTemplateModal}
        onClose={() => {
          setShowDeleteTemplateModal(false);
          setSelectedTemplate(null);
        }}
        title="Delete Template"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowDeleteTemplateModal(false);
                setSelectedTemplate(null);
              }}
              className="rounded-md bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteTemplate}
              disabled={templateFormLoading}
              className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
            >
              {templateFormLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        }
      >
        {templateFormError && (
          <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {templateFormError}
          </div>
        )}
        <p className="text-sm text-gray-900">
          Are you sure you want to delete the template <strong>{selectedTemplate?.name}</strong>?
        </p>
      </Modal>
    </div>
  );
}
