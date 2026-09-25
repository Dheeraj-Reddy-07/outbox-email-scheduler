'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import StatCard from '../../../components/ui/StatCard';
import Badge from '../../../components/ui/Badge';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Button from '../../../components/ui/Button';
import { Campaign } from '../../../types';
import { Mail, Calendar, Send, AlertCircle, Users, TrendingUp, Trash2, Star } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../components/ui/Toast';

export default function OverviewPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingStar, setTogglingStar] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/campaigns`, {
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

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return;

    setDeletingId(campaignId);
    try {
      const response = await fetch(`/campaigns/${campaignId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        showToast('Campaign deleted successfully', 'success');
        setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to delete campaign', 'error');
      }
    } catch (err) {
      showToast('Network error occurred', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStar = async (campaignId: string) => {
    setTogglingStar(campaignId);
    try {
      const response = await fetch(`/campaigns/${campaignId}/star`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(prev => 
          prev.map(c => 
            c.id === campaignId 
              ? { ...c, isStarred: data.isStarred }
              : c
          )
        );
        showToast(data.isStarred ? 'Campaign starred' : 'Campaign unstarred', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Failed to toggle star', 'error');
      }
    } catch (err) {
      console.error('Failed to toggle star:', err);
      showToast('Network error occurred', 'error');
    } finally {
      setTogglingStar(null);
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
    // Use Indian timezone for greeting
    const indianTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const indianDate = new Date(indianTime);
    const hour = indianDate.getHours();
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
      <div className="max-w-[1400px] mx-auto space-y-6">
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-6">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Activity Overview */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Activity Overview</h3>
          </div>
          <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* Campaign Status — 7/12 cols (~58%) */}
            <div className="lg:col-span-7">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Campaign Status</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { label: 'Scheduled', value: stats.scheduled, color: 'bg-blue-500' },
                  { label: 'Running',   value: stats.running,   color: 'bg-amber-500' },
                  { label: 'Completed', value: stats.completed, color: 'bg-green-500' },
                  { label: 'Failed',    value: stats.totalFailed, color: 'bg-red-500' },
                ] as const).map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${color} shrink-0`}></span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white tabular-nums">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Pipeline — 5/12 cols (~42%) */}
            <div className="lg:col-span-5">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Delivery Pipeline</p>
              <div className="rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 px-4 py-4 flex items-center justify-between h-[calc(100%-28px)]">
                {([
                  { label: 'Scheduled', value: stats.scheduled, Icon: Calendar, iconColor: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                  { label: 'Sending',   value: stats.running,   Icon: Send,     iconColor: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                  { label: 'Delivered', value: stats.completed, Icon: AlertCircle, iconColor: 'text-green-500 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
                ] as const).map(({ label, value, Icon, iconColor, bg }, i, arr) => (
                  <div key={label} className="flex items-center gap-2 flex-1">
                    <div className="flex flex-col items-center flex-1 text-center">
                      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-1.5`}>
                        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                      </div>
                      <span className="text-base font-bold text-gray-900 dark:text-white leading-none mb-0.5 tabular-nums">{value}</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex items-center shrink-0 pb-4">
                        <div className="w-4 h-px bg-gray-300 dark:bg-slate-600"></div>
                        <svg width="6" height="8" viewBox="0 0 6 8" className="text-gray-300 dark:text-slate-600 fill-current shrink-0">
                          <path d="M0 0l6 4-6 4V0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Recent Campaigns */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent campaigns</h3>
            <a
              href="/dashboard/compose"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-md transition-colors"
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
                <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Star
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Recipients
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Sent
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStar(campaign.id)}
                          disabled={togglingStar === campaign.id}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={campaign.isStarred ? 'Unstar' : 'Star'}
                        >
                          <Star 
                            className={`w-4 h-4 ${campaign.isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} ${togglingStar === campaign.id ? 'animate-spin' : ''}`} 
                          />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{campaign.subject}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={campaign.status.toLowerCase() as any}>
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {campaign.recipientCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {campaign.sentCount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(campaign.createdAt).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <a
                            href={`/dashboard/campaigns/${campaign.id}`}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            View
                          </a>
                          <button
                            onClick={() => handleDelete(campaign.id)}
                            disabled={deletingId === campaign.id}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            {deletingId === campaign.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}