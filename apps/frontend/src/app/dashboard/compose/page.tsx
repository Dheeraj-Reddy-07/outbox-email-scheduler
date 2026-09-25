'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import Button from '../../../components/ui/Button';
import { CreateCampaignRequest } from '../../../types';
import { useToast } from '../../../components/ui/Toast';
import { Upload, FileText, Clock, Zap, Users, Calendar } from 'lucide-react';

export default function ComposePage() {
  const [formData, setFormData] = useState<CreateCampaignRequest>({
    subject: '',
    body: '',
    startAt: '',
    delaySeconds: 10,
    hourlyLimit: 100,
    recipientEmails: [],
    senderEmail: 'sender1',
  });

  const [recipientInput, setRecipientInput] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [invalidEmails, setInvalidEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const parseEmails = (content: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const lines = content.split(/[\n,;]+/).map(line => line.trim()).filter(line => line);
    
    const valid: string[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();

    lines.forEach(email => {
      if (seen.has(email)) return;
      seen.add(email);

      if (emailRegex.test(email)) {
        valid.push(email);
      } else {
        invalid.push(email);
      }
    });

    return { valid, invalid };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const { valid, invalid } = parseEmails(content);
      setParsedEmails(valid);
      setInvalidEmails(invalid);
      setFormData(prev => ({ ...prev, recipientEmails: valid }));
    };
    reader.readAsText(file);
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      showToast('Only CSV or TXT files are supported', 'error');
      return;
    }
    processFile(file);
  };

  const handleManualInput = () => {
    const { valid, invalid } = parseEmails(recipientInput);
    setParsedEmails(valid);
    setInvalidEmails(invalid);
    setFormData(prev => ({ ...prev, recipientEmails: valid }));
  };

  const clearRecipients = () => {
    setParsedEmails([]);
    setInvalidEmails([]);
    setRecipientInput('');
    setFileName('');
    setFormData(prev => ({ ...prev, recipientEmails: [] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject || !formData.body || formData.recipientEmails.length === 0) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    if (!formData.startAt) {
      showToast('Please select a start time', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showToast('Campaign created successfully!', 'success');
        // Reset form
        setFormData({
          subject: '',
          body: '',
          startAt: '',
          delaySeconds: 10,
          hourlyLimit: 100,
          recipientEmails: [],
          senderEmail: 'sender1',
        });
        setRecipientInput('');
        setFileName('');
        setParsedEmails([]);
        setInvalidEmails([]);
      } else {
        const data = await response.json();
        showToast(data.error || 'Failed to create campaign', 'error');
      }
    } catch (err) {
      showToast('Network error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Set default start time to 1 hour from now
  useEffect(() => {
    const defaultStart = new Date(Date.now() + 60 * 60 * 1000);
    setFormData(prev => ({ ...prev, startAt: defaultStart.toISOString().slice(0, 16) }));
  }, []);

  // Calculate estimated completion time
  const calculateEstimatedTime = () => {
    if (parsedEmails.length === 0 || formData.delaySeconds === 0) return null;
    
    const totalSeconds = parsedEmails.length * formData.delaySeconds;
    const minutes = Math.ceil(totalSeconds / 60);
    
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    const hours = Math.ceil(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  const estimatedTime = calculateEstimatedTime();
  const isValid = formData.subject && formData.body && parsedEmails.length > 0 && formData.startAt;

  return (
    <DashboardLayout title="Compose Campaign">
      <div className="max-w-5xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campaign */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Campaign Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Sender
                </label>
                <select
                  value={formData.senderEmail || 'sender1'}
                  onChange={(e) => setFormData(prev => ({ ...prev, senderEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="sender1">Primary (dheerajredddymagunta@gmail.com)</option>
                  <option value="sender2">Secondary (dheerajredddymagunta+2@gmail.com)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Subject
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formData.subject.length}/255
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={255}
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Campaign subject"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-end mb-1.5">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Email body
                  </label>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formData.body.length}/10000
                  </span>
                </div>
                <textarea
                  value={formData.body}
                  maxLength={10000}
                  onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                  rows={8}
                  placeholder="Write your email content here..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none leading-relaxed"
                  required
                />
              </div>
            </div>
          </div>

          {/* Recipients */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Recipients</h3>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Upload CSV/TXT
                  </label>
                  <div 
                    className={`border ${isDragging ? 'border-solid border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-dashed border-gray-300 dark:border-slate-700'} rounded-md p-3 text-center hover:border-gray-400 dark:hover:border-slate-600 transition-colors`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 block w-full h-full"
                    >
                      {fileName || (isDragging ? 'Drop file here' : 'Click or drag file to upload')}
                    </label>
                  </div>
                </div>
                <div className="flex items-end">
                  <span className="text-xs text-gray-500 dark:text-gray-400 pb-3">or</span>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Manual input
                  </label>
                  <textarea
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    rows={2}
                    placeholder="Enter email addresses..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleManualInput}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Parse emails
              </button>

              {parsedEmails.length > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-green-800 dark:text-green-300 font-medium">
                      {parsedEmails.length} recipients ready
                    </p>
                    <button
                      type="button"
                      onClick={clearRecipients}
                      className="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="max-h-20 overflow-y-auto">
                    {parsedEmails.slice(0, 8).map((email, index) => (
                      <div key={index} className="text-xs text-green-700 dark:text-green-400 py-0.5">
                        {email}
                      </div>
                    ))}
                    {parsedEmails.length > 8 && (
                      <p className="text-xs text-green-600 dark:text-green-500">
                        ...and {parsedEmails.length - 8} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {invalidEmails.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <p className="text-xs text-red-800 dark:text-red-300 font-medium mb-2">
                    {invalidEmails.length} invalid emails
                  </p>
                  <div className="max-h-20 overflow-y-auto">
                    {invalidEmails.slice(0, 4).map((email, index) => (
                      <div key={index} className="text-xs text-red-700 dark:text-red-400 py-0.5">
                        {email}
                      </div>
                    ))}
                    {invalidEmails.length > 4 && (
                      <p className="text-xs text-red-600 dark:text-red-500">
                        ...and {invalidEmails.length - 4} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Scheduling</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Start time
                </label>
                <input
                  type="datetime-local"
                  value={formData.startAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, startAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Delay (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.delaySeconds}
                  onChange={(e) => setFormData(prev => ({ ...prev, delaySeconds: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Hourly limit
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.hourlyLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, hourlyLimit: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {estimatedTime && (
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-800">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Estimated completion: <span className="font-medium text-gray-900 dark:text-white">~{estimatedTime}</span>
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              isLoading={loading}
              disabled={!isValid}
            >
              Schedule Campaign
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}