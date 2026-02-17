'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import ResponsiveTable from '../../../components/ResponsiveTable';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [intents, setIntents] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [slaMetrics, setSlaMetrics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [overviewData, intentsData, agentsData, slaData] = await Promise.all([
        api.getOverviewAnalytics(),
        api.getIntentAnalytics(),
        api.getAgentAnalytics(),
        api.getSLAMetrics(),
      ]);

      setOverview(overviewData);
      setIntents(intentsData);
      setAgents(agentsData);
      setSlaMetrics(slaData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <h1 className="mb-4 text-2xl font-bold text-gray-900 md:mb-6 md:text-3xl">Analytics</h1>

      {/* Overview Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:mb-8">
        <div className="rounded-lg bg-white p-4 shadow md:p-6">
          <div className="text-xs font-medium text-gray-600 md:text-sm">Total Conversations</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">
            {overview?.totalConversations || 0}
          </div>
          <div className="mt-1 text-xs text-gray-500 md:text-sm">
            {overview?.activeConversations || 0} active
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow md:p-6">
          <div className="text-xs font-medium text-gray-600 md:text-sm">Total Cases</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">
            {overview?.totalCases || 0}
          </div>
          <div className="mt-1 text-xs text-gray-500 md:text-sm">
            {overview?.openCases || 0} open
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow md:p-6">
          <div className="text-xs font-medium text-gray-600 md:text-sm">Avg Response Time</div>
          <div className="mt-2 text-2xl font-bold text-gray-900 md:text-3xl">
            {overview?.avgResponseTime || 'N/A'}
          </div>
          <div className="mt-1 text-xs text-gray-500 md:text-sm">minutes</div>
        </div>

        <div className="rounded-lg bg-white p-4 shadow md:p-6">
          <div className="text-xs font-medium text-gray-600 md:text-sm">SLA Breaches</div>
          <div className="mt-2 text-2xl font-bold text-red-600 md:text-3xl">
            {overview?.slaBreaches || 0}
          </div>
          <div className="mt-1 text-xs text-gray-500 md:text-sm">total breaches</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Intent Distribution */}
        <div className="rounded-lg bg-white p-4 shadow md:p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">Intent Distribution</h2>
          {intents.length === 0 ? (
            <div className="text-gray-500">No data available</div>
          ) : (
            <div className="space-y-3">
              {intents.slice(0, 8).map((intent) => (
                <div key={intent.intent}>
                  <div className="flex justify-between text-xs md:text-sm">
                    <span className="font-medium text-gray-700">{intent.intent}</span>
                    <span className="text-gray-600">{intent.count}</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{
                        width: `${Math.min(
                          (intent.count / (intents[0]?.count || 1)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Performance */}
        <div className="rounded-lg bg-white p-4 shadow md:p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">Agent Performance</h2>
          {agents.length === 0 ? (
            <div className="text-gray-500">No data available</div>
          ) : (
            <ResponsiveTable
              columns={[
                { header: 'Agent', accessor: 'agentName' },
                { header: 'Assigned', accessor: 'assignedConversations' },
                { header: 'Resolved', accessor: 'resolvedCases' },
                {
                  header: 'Avg Time',
                  accessor: (row: any) =>
                    row.avgResolutionTime ? `${row.avgResolutionTime} min` : 'N/A',
                },
              ]}
              data={agents}
            />
          )}
        </div>

        {/* SLA Metrics */}
        <div className="rounded-lg bg-white p-4 shadow md:p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">SLA Performance by Priority</h2>
          {slaMetrics.length === 0 ? (
            <div className="text-gray-500">No data available</div>
          ) : (
            <ResponsiveTable
              columns={[
                {
                  header: 'Priority',
                  accessor: (row: any) => (
                    <span className="capitalize">{row.priority}</span>
                  ),
                },
                { header: 'Total', accessor: 'total' },
                { header: 'Resolved', accessor: 'resolved' },
                {
                  header: 'Breached',
                  accessor: 'breached',
                  className: 'text-red-600',
                },
                {
                  header: 'SLA Compliance',
                  accessor: (row: any) => (
                    <span
                      className={`font-semibold ${
                        row.slaCompliance >= 90
                          ? 'text-green-600'
                          : row.slaCompliance >= 70
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {row.slaCompliance}%
                    </span>
                  ),
                },
                {
                  header: 'Avg Response',
                  accessor: (row: any) =>
                    row.avgResponseTime ? `${row.avgResponseTime} min` : 'N/A',
                },
                {
                  header: 'Avg Resolution',
                  accessor: (row: any) =>
                    row.avgResolutionTime ? `${row.avgResolutionTime} min` : 'N/A',
                },
              ]}
              data={slaMetrics}
            />
          )}
        </div>
      </div>
    </div>
  );
}
