'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Badge from '../../../components/ui/Badge';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Button from '../../../components/ui/Button';
import { EmailJob } from '../../../types';
import { Send, RefreshCw, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function SentPage() {
  const [emailJobs, setEmailJobs] = useState<EmailJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<EmailJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSentEmails();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = emailJobs.filter(job => 
        job.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.campaign?.subject?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredJobs(filtered);
    } else {
      setFilteredJobs(emailJobs);
    }
  }, [emailJobs, searchQuery]);

  const fetchSentEmails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/email/sent`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setEmailJobs(data.emailJobs || []);
      } else {
        setError('Failed to fetch sent emails');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: emailJobs.length,
    successful: emailJobs.filter(j => j.status === 'SENT').length,
    failed: emailJobs.filter(j => j.status === 'FAILED').length,
  };

  if (loading) {
    return (
      <DashboardLayout title="Sent Emails" subtitle="Email delivery history across your campaigns">
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
    <DashboardLayout title="Sent Emails" subtitle="Email delivery history across your campaigns">
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
              <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Successful</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.successful}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{stats.failed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4 mb-5">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by recipient or campaign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            className="px-3 py-2 text-xs bg-gray-100 text-gray-900 dark:bg-slate-800 dark:text-white rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2"
            onClick={fetchSentEmails}
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
            icon={Send}
            title="No sent emails yet"
            description={emailJobs.length === 0 
              ? "Once your worker processes a campaign, delivery history will appear here"
              : "No emails match your search criteria"
            }
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
                    Sent At
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
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
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {job.sentAt ? new Date(job.sentAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Badge variant={job.status.toLowerCase() as any}>
                        {job.status}
                      </Badge>
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