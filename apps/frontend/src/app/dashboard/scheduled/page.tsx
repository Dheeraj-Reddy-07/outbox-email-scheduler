'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Badge from '../../../components/ui/Badge';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Campaign } from '../../../types';
import { Calendar, RefreshCw, Search, Mail, Clock, Star } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export default function ScheduledPage() {
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingStar, setTogglingStar] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    let filtered = campaigns;
    
    if (searchQuery) {
      filtered = filtered.filter(campaign => 
        campaign.subject.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    filtered.sort((a, b) => {
      if (a.isStarred && !b.isStarred) return -1;
      if (!a.isStarred && b.isStarred) return 1;
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });
    
    setFilteredCampaigns(filtered);
  }, [campaigns, searchQuery]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/campaigns`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const scheduledCampaigns = (data.campaigns || []).filter(
          (c: Campaign) => c.status === 'SCHEDULED' || c.status === 'RUNNING'
        );
        setCampaigns(scheduledCampaigns);
      } else {
        setError('Failed to fetch campaigns');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleStar = async (campaignId: string) => {
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
    starred: campaigns.filter(c => c.isStarred).length,
    pendingEmails: campaigns.reduce((sum, c) => sum + (c.recipientCount || 0) - (c.sentCount || 0), 0),
  };

  if (loading) {
    return (
      <DashboardLayout title="Scheduled Campaigns" subtitle="Campaigns waiting to be processed">
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} height="88px" />
            ))}
          </div>
          <Skeleton height="350px" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Scheduled Campaigns" subtitle="Campaigns waiting to be processed">
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-xs text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Campaigns</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
              <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Starred</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.starred}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-md">
              <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending Emails</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.pendingEmails}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4 mb-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            className="px-3 py-2 text-xs bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
            onClick={fetchCampaigns}
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md">
        {filteredCampaigns.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No scheduled campaigns"
            description={campaigns.length === 0 
              ? "Schedule a campaign and it will appear here"
              : "No campaigns match your search"
            }
            action={campaigns.length === 0 ? {
              label: 'Create Campaign',
              onClick: () => window.location.href = '/dashboard/compose'
            } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Star
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Scheduled For
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Progress
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                {filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <button
                        onClick={() => toggleStar(campaign.id)}
                        disabled={togglingStar === campaign.id}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={campaign.isStarred ? 'Unstar' : 'Star'}
                      >
                        <Star 
                          className={`w-4 h-4 ${campaign.isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'} ${togglingStar === campaign.id ? 'animate-spin' : ''}`} 
                        />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{campaign.subject}</div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Badge variant={campaign.status.toLowerCase() as any}>
                        {campaign.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(campaign.startAt).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {campaign.sentCount || 0} / {campaign.recipientCount || 0}
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