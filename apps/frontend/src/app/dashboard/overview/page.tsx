'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import StatCard from '../../../components/ui/StatCard';
import Badge from '../../../components/ui/Badge';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import { Campaign } from '../../../types';
import { Mail, Calendar, Send, AlertCircle, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

export default function OverviewPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/campaigns`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } else {
        setError('Failed to fetch campaigns');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: campaigns.length,
    scheduled: campaigns.filter(c => c.status === 'SCHEDULED').length,
    running: campaigns.filter(c => c.status === 'RUNNING').length,
    completed: campaigns.filter(c => c.status === 'COMPLETED').length,
    totalRecipients: campaigns.reduce((sum, c) => sum + (c.recipientCount || 0), 0),
    totalSent: campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0),
    totalFailed: campaigns.reduce((sum, c) => sum + (c.failedCount || 0), 0),
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <DashboardLayout title="Overview">
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height="88px" />
            ))}
          </div>
          <Skeleton height="280px" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title={user ? `${getGreeting()}, ${user.name?.split(' ')[0] || ''}` : getGreeting()}
      subtitle="Here's what's happening with your email campaigns"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-xs text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          title="Total Campaigns"
          value={stats.total}
          icon={Calendar}
        />
        <StatCard
          title="Scheduled"
          value={stats.scheduled}
          icon={Calendar}
        />
        <StatCard
          title="Emails Sent"
          value={stats.totalSent}
          icon={Send}
        />
        <StatCard
          title="Total Recipients"
          value={stats.totalRecipients}
          icon={Users}
        />
      </div>

      {/* Activity Overview - Shared Container */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Activity Overview</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Email Activity */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Campaign Status</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 dark:bg-slate-800/50 p-2.5 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                  <span className="text-[11px] text-gray-600 dark:text-gray-400">Scheduled</span>
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-white">{stats.scheduled}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/50 p-2.5 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                  <span className="text-[11px] text-gray-600 dark:text-gray-400">Running</span>
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-white">{stats.running}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/50 p-2.5 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <span className="text-[11px] text-gray-600 dark:text-gray-400">Completed</span>
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-white">{stats.completed}</span>
              </div>
              <div className="bg-gray-50 dark:bg-slate-800/50 p-2.5 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                  <span className="text-[11px] text-gray-600 dark:text-gray-400">Failed</span>
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-white">{stats.totalFailed}</span>
              </div>
            </div>
          </div>

          {/* Delivery Pipeline */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Delivery Pipeline</h4>
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="w-6 h-6 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center mb-1.5">
                    <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white block">{stats.scheduled}</span>
                  <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Scheduled</span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="h-px bg-gray-300 dark:bg-slate-700 w-full max-w-[30px]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-700 mx-0.5"></div>
                  <div className="h-px bg-gray-300 dark:bg-slate-700 w-full max-w-[30px]"></div>
                </div>
                <div className="text-center flex-1">
                  <div className="w-6 h-6 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded flex items-center justify-center mb-1.5">
                    <Send className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white block">{stats.running}</span>
                  <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sending</span>
                </div>
                <div className="flex-1 flex items-center justify-center">
                  <div className="h-px bg-gray-300 dark:bg-slate-700 w-full max-w-[30px]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-700 mx-0.5"></div>
                  <div className="h-px bg-gray-300 dark:bg-slate-700 w-full max-w-[30px]"></div>
                </div>
                <div className="text-center flex-1">
                  <div className="w-6 h-6 mx-auto bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center mb-1.5">
                    <AlertCircle className="w-3 h-3 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white block">{stats.completed}</span>
                  <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delivered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Campaigns */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Recent campaigns</h3>
          <a
            href="/dashboard/compose"
            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            + Create campaign
          </a>
        </div>

        {campaigns.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No campaigns yet"
            description="Create your first email campaign to start scheduling outreach"
            action={{
              label: 'Create Campaign',
              onClick: () => window.location.href = '/dashboard/compose'
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Recipients
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{campaign.subject}</div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Badge variant={campaign.status.toLowerCase() as any}>
                        {campaign.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {campaign.recipientCount || 0}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {campaign.sentCount || 0}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium">
                      <a
                        href={`/dashboard/campaigns/${campaign.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}