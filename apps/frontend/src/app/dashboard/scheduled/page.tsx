'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Badge from '../../../components/ui/Badge';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { EmailJob } from '../../../types';
import { Calendar, RefreshCw, Search, Mail, Clock } from 'lucide-react';

export default function ScheduledPage() {
  const [emailJobs, setEmailJobs] = useState<EmailJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'PENDING' | 'SCHEDULED'>('all');

  useEffect(() => {
    fetchScheduledEmails();
  }, []);

  useEffect(() => {
    let filtered = emailJobs;
    
    if (searchQuery) {
      filtered = filtered.filter(job => 
        job.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.campaign?.subject?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }
    
    setFilteredJobs(filtered);
  }, [emailJobs, searchQuery, statusFilter]);

  const fetchScheduledEmails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/email/scheduled`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setEmailJobs(data.emailJobs || []);
      } else {
        setError('Failed to fetch scheduled emails');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: emailJobs.length,
    pending: emailJobs.filter(j => j.status === 'PENDING').length,
    scheduled: emailJobs.filter(j => j.status === 'SCHEDULED').length,
  };

  if (loading) {
    return (
      <DashboardLayout title="Scheduled Emails" subtitle="Emails waiting to be processed by your campaigns">
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
    <DashboardLayout title="Scheduled Emails" subtitle="Emails waiting to be processed by your campaigns">
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
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 dark:bg-slate-800 rounded-md">
              <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md">
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Scheduled</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.scheduled}</p>
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
                placeholder="Search by recipient or campaign..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className={`px-3 py-2 text-xs rounded-md transition-all ${
                statusFilter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={`px-3 py-2 text-xs rounded-md transition-all ${
                statusFilter === 'PENDING' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
              onClick={() => setStatusFilter('PENDING')}
            >
              Pending
            </button>
            <button
              className={`px-3 py-2 text-xs rounded-md transition-all ${
                statusFilter === 'SCHEDULED' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
              onClick={() => setStatusFilter('SCHEDULED')}
            >
              Scheduled
            </button>
          </div>
          <button
            className="px-3 py-2 text-xs bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
            onClick={fetchScheduledEmails}
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* Email Jobs Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md">
        {filteredJobs.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No scheduled emails"
            description={emailJobs.length === 0 
              ? "Schedule a campaign and your pending emails will appear here"
              : "No emails match your current filters"
            }
            action={emailJobs.length === 0 ? {
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
                    Recipient
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Scheduled For
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Attempts
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{job.recipientEmail}</div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {job.campaign?.subject || 'N/A'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Badge variant={job.status.toLowerCase() as any}>
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {job.scheduledAt ? new Date(job.scheduledAt).toLocaleString() : 'Not scheduled'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {job.attempts}
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