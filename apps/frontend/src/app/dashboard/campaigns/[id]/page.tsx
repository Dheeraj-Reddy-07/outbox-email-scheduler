'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import Badge from '../../../../components/ui/Badge';
import Button from '../../../../components/ui/Button';
import Skeleton from '../../../../components/ui/Skeleton';
import { Campaign, EmailJob } from '../../../../types';
import { ArrowLeft, Calendar, Clock, Zap, RefreshCw, FileText, AlertCircle } from 'lucide-react';
import { useToast } from '../../../../components/ui/Toast';

interface CampaignDetail extends Campaign {
  emailJobs: EmailJob[];
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { showToast } = useToast();

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id) fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/campaigns/${id}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setCampaign(data.campaign);
      } else if (response.status === 404) {
        setError('Campaign not found.');
      } else {
        setError('Failed to load campaign details.');
      }
    } catch {
      setError('Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this campaign?')) return;
    setCancelling(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/campaigns/${id}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        showToast('Campaign cancelled successfully', 'success');
        await fetchCampaign();
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to cancel campaign', 'error');
      }
    } catch {
      showToast('Network error occurred', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const stats = campaign
    ? {
        total: campaign.emailJobs.length,
        sent: campaign.emailJobs.filter(j => j.status === 'SENT').length,
        pending: campaign.emailJobs.filter(j => j.status === 'PENDING').length,
        scheduled: campaign.emailJobs.filter(j => j.status === 'SCHEDULED').length,
        failed: campaign.emailJobs.filter(j => j.status === 'FAILED').length,
        cancelled: campaign.emailJobs.filter(j => j.status === 'CANCELLED').length,
      }
    : null;

  const progress = stats && stats.total > 0 ? (stats.sent / stats.total) * 100 : 0;

  if (loading) {
    return (
      <DashboardLayout title="Campaign Details">
        <div className="max-w-6xl mx-auto space-y-5">
          <Skeleton height="100px" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} height="88px" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton height="180px" />
            <Skeleton height="180px" />
          </div>
          <Skeleton height="350px" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Campaign Details">
      <div className="max-w-5xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
        >
          <ArrowLeft className="w-3 h-3 mr-1.5" />
          Back
        </button>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-xs text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {campaign && stats && (
          <>
            {/* Campaign Header */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5 mb-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{campaign.subject}</h2>
                  <div className="flex items-center gap-2">
                    <Badge variant={campaign.status.toLowerCase() as any}>
                      {campaign.status}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {(campaign.status === 'SCHEDULED' || campaign.status === 'RUNNING') && (
                  <Button
                    variant="danger"
                    onClick={handleCancel}
                    isLoading={cancelling}
                    size="sm"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Overview */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Delivery Progress</h3>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-800 rounded-full h-2 mb-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="grid grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Sent</p>
                  <p className="font-medium text-gray-900 dark:text-white">{stats.sent}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Pending</p>
                  <p className="font-medium text-gray-900 dark:text-white">{stats.pending}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Scheduled</p>
                  <p className="font-medium text-gray-900 dark:text-white">{stats.scheduled}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Failed</p>
                  <p className="font-medium text-gray-900 dark:text-white">{stats.failed}</p>
                </div>
              </div>
            </div>

            {/* Campaign Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Scheduling Configuration</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">Start Time</p>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">
                        {new Date(campaign.startAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">Delay Between Emails</p>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{campaign.delaySeconds}s</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Zap className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">Hourly Email Limit</p>
                      <p className="text-xs font-medium text-gray-900 dark:text-white">{campaign.hourlyLimit}/hr</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Email Content</h3>
                <div
                  className="text-xs text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto bg-gray-50 dark:bg-slate-800 rounded-md p-3"
                  dangerouslySetInnerHTML={{ __html: campaign.body }}
                />
              </div>
            </div>

            {/* Email Jobs Table */}
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Email Jobs ({campaign.emailJobs.length})
                </h3>
                <button
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1.5"
                  onClick={fetchCampaign}
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
              </div>

              {campaign.emailJobs.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-xs">
                  No email jobs found for this campaign.
                </div>
              ) : (() => {
                const hasErrors = campaign.emailJobs.some(j => !!j.lastError);
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-slate-800">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recipient</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Scheduled</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sent</th>
                          <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attempts</th>
                          {hasErrors && <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Error</th>}
                          <th className="px-4 py-2.5 text-left text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                        {campaign.emailJobs.map((job) => (
                          <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                            <td className="px-4 py-2.5 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white">
                              {job.recipientEmail}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <Badge variant={job.status.toLowerCase() as any}>
                                {job.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                              {job.scheduledAt ? new Date(job.scheduledAt).toLocaleString() : '—'}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                              {job.sentAt ? new Date(job.sentAt).toLocaleString() : '—'}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 text-center">
                              {job.attempts}
                            </td>
                            {hasErrors && (
                              <td className="px-4 py-2.5 text-xs text-red-600 dark:text-red-400 max-w-xs truncate">
                                {job.lastError ? (
                                  <div className="flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{job.lastError}</span>
                                  </div>
                                ) : '—'}
                              </td>
                            )}
                            <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                              {job.previewUrl ? (
                                <a
                                  href={job.previewUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  View Email
                                </a>
                              ) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
