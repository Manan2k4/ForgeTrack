import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface JobTypeHistoryEntry {
  rate: number;
  effectiveFromYear: number;
  effectiveFromMonth: number;
}

interface JobType {
  _id: string;
  partType: 'sleeve' | 'rod' | 'pin' | 'general';
  jobName: string;
  rate: number;
  rateHistory?: JobTypeHistoryEntry[];
}

export function AddRate() {
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [hikeMonth, setHikeMonth] = useState<string>(''); // YYYY-MM
  const [hikeRate, setHikeRate] = useState<string>('');
  const [savingHike, setSavingHike] = useState(false);
  const [editingHike, setEditingHike] = useState<{ jobId: string; index: number } | null>(null);

  const fetchJobTypes = async () => {
    try {
      setLoading(true);
      const response = await apiService.getJobTypes();
      if (response.success && response.data) {
        console.log('=== Job Types Fetch Debug ===');
        console.log('Total job types fetched:', response.data.length);
        console.log('All job types:', response.data);
        
        const byPartType = response.data.reduce((acc: any, jt: JobType) => {
          acc[jt.partType] = (acc[jt.partType] || 0) + 1;
          return acc;
        }, {});
        console.log('Breakdown by partType:', byPartType);
        console.log('Pin job types:', response.data.filter((jt: JobType) => jt.partType === 'pin'));
        console.log('============================');
        
        setJobTypes(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load job types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobTypes();
  }, []);

  const groupedJobTypes = jobTypes.reduce((acc, jt) => {
    if (!acc[jt.partType]) acc[jt.partType] = [];
    acc[jt.partType].push(jt);
    return acc;
  }, {} as Record<string, JobType[]>);

  const partTypeLabels: Record<string, string> = {
    sleeve: 'Sleeve Workshop',
    rod: 'Rod Workshop',
    pin: 'Pin Workshop',
    general: 'General Services'
  };

  const formatMonthYear = (y: number, m: number) => {
    if (!y || !m) return '';
    try {
      const d = new Date(y, m - 1, 1);
      return d.toLocaleString('default', { month: 'short', year: 'numeric' });
    } catch {
      return `${m.toString().padStart(2, '0')}/${y}`;
    }
  };

  const handleAddOrUpdateHike = async (job: JobType) => {
    const rateNum = parseFloat(hikeRate);
    if (isNaN(rateNum) || rateNum < 0) {
      toast.error('Please enter a valid hike rate (≥ 0)');
      return;
    }
    if (!hikeMonth || !/^\d{4}-\d{2}$/.test(hikeMonth)) {
      toast.error('Please select a valid effective month');
      return;
    }
    const [yearStr, monthStr] = hikeMonth.split('-');
    const effectiveFromYear = Number(yearStr);
    const effectiveFromMonth = Number(monthStr);
    setSavingHike(true);
    try {
      if (editingHike && editingHike.jobId === job._id && editingHike.index >= 0) {
        const resp = await apiService.updateJobTypeHike(job._id, editingHike.index, {
          rate: rateNum,
          effectiveFromYear,
          effectiveFromMonth,
        });
        if (resp.success) {
          toast.success('Hike updated in rate history');
          setHikeMonth('');
          setHikeRate('');
          setEditingHike(null);
          fetchJobTypes();
        }
      } else {
        const resp = await apiService.addJobTypeHike(job._id, { rate: rateNum, effectiveFromYear, effectiveFromMonth });
        if (resp.success) {
          toast.success('Hike added to rate history');
          setHikeMonth('');
          setHikeRate('');
          // Refresh list so history + current rate update
          fetchJobTypes();
        }
      }
    } catch (error: any) {
      toast.error(error?.message || (editingHike ? 'Failed to update hike' : 'Failed to add hike'));
    } finally {
      setSavingHike(false);
    }
  };

  const handleDeleteHike = async (job: JobType, origIndex: number) => {
    if (origIndex < 0) {
      toast.error('Could not locate selected history entry');
      return;
    }
    const confirmed = window.confirm('Delete this hike entry from rate history?');
    if (!confirmed) return;

    try {
      const resp = await apiService.deleteJobTypeHike(job._id, origIndex);
      if (resp.success) {
        toast.success('Hike deleted from rate history');
        if (editingHike && editingHike.jobId === job._id && editingHike.index === origIndex) {
          setEditingHike(null);
          setHikeMonth('');
          setHikeRate('');
        }
        fetchJobTypes();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete hike');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading job types...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Job Type Rates</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set rates (Rs/piece) for each job type
          </p>
        </div>
      </div>

      {Object.keys(groupedJobTypes).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No job types found. Add job types first from the "Add Job Type" page.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Always show all four groups, even if empty */}
          {(['sleeve', 'rod', 'pin', 'general'] as const).map((partType) => {
            const jobs = groupedJobTypes[partType] || [];
            return (
              <Card key={partType}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {partTypeLabels[partType] || partType}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {jobs.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No {partTypeLabels[partType]} job types found. Add them from the "Add Job Type" page.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground w-1/2">Job Name</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground w-1/3">Rate (Rs/piece)</th>
                            <th className="text-center py-3 px-4 font-medium text-muted-foreground w-1/6">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobs.map((job) => {
                            const isExpanded = expandedJobId === job._id;
                            const originalHistory = Array.isArray(job.rateHistory) ? job.rateHistory : [];
                            const history = [...originalHistory];
                            history.sort((a, b) => {
                              const av = a.effectiveFromYear * 100 + a.effectiveFromMonth;
                              const bv = b.effectiveFromYear * 100 + b.effectiveFromMonth;
                              return bv - av; // latest first
                            });
                            return (
                              <React.Fragment key={job._id}>
                                <tr className="border-b border-border last:border-0">
                                  <td className="py-3 px-4 text-foreground">{job.jobName}</td>
                                  <td className="py-3 px-4">
                                    <span className="text-foreground font-medium">
                                      Rs {(job.rate || 0).toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center space-x-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        if (isExpanded) {
                                          setExpandedJobId(null);
                                          setHikeMonth('');
                                          setHikeRate('');
                                        } else {
                                          setExpandedJobId(job._id);
                                          setHikeMonth('');
                                          setHikeRate('');
                                        }
                                      }}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className="bg-muted/40 border-b border-border last:border-0">
                                    <td className="py-3 px-4" colSpan={3}>
                                      <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-sm font-medium text-muted-foreground">Rate history</span>
                                        </div>
                                        {history.length === 0 ? (
                                          <p className="text-sm text-muted-foreground">No rate history entries yet. Add a hike below.</p>
                                        ) : (
                                          <table className="w-full text-sm border border-border rounded-md overflow-hidden">
                                            <thead className="bg-muted">
                                              <tr>
                                                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Effective from</th>
                                                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Rate (Rs/piece)</th>
                                                <th className="px-3 py-2 text-left font-medium text-muted-foreground text-right">Actions</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {history.map((h, idx) => {
                                                const origIndex = originalHistory.findIndex((orig) =>
                                                  orig.effectiveFromYear === h.effectiveFromYear &&
                                                  orig.effectiveFromMonth === h.effectiveFromMonth &&
                                                  Number(orig.rate) === Number(h.rate)
                                                );

                                                const monthInputValue = `${h.effectiveFromYear}-${String(h.effectiveFromMonth).padStart(2, '0')}`;

                                                return (
                                                  <tr key={idx} className="border-t border-border">
                                                    <td className="px-3 py-1.5">{formatMonthYear(h.effectiveFromYear, h.effectiveFromMonth)}</td>
                                                    <td className="px-3 py-1.5">Rs {(h.rate || 0).toFixed(2)}</td>
                                                    <td className="px-3 py-1.5 text-right space-x-1">
                                                      <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                          if (origIndex < 0) {
                                                            toast.error('Could not locate selected history entry');
                                                            return;
                                                          }
                                                          setExpandedJobId(job._id);
                                                          setEditingHike({ jobId: job._id, index: origIndex });
                                                          setHikeMonth(monthInputValue);
                                                          setHikeRate(String(h.rate ?? ''));
                                                        }}
                                                      >
                                                        <Pencil className="w-3 h-3" />
                                                      </Button>
                                                      <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteHike(job, origIndex)}
                                                      >
                                                        <Trash2 className="w-3 h-3" />
                                                      </Button>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        )}
                                        <div className="flex flex-wrap items-end gap-3 mt-2">
                                          <div className="flex flex-col gap-1">
                                            <label className="text-xs text-muted-foreground">Effective month</label>
                                            <input
                                              type="month"
                                              className="px-3 py-1.5 rounded-md border border-input bg-background text-sm"
                                              value={hikeMonth}
                                              onChange={(e) => setHikeMonth(e.target.value)}
                                            />
                                          </div>
                                          <div className="flex flex-col gap-1">
                                            <label className="text-xs text-muted-foreground">New rate (Rs/piece)</label>
                                            <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              className="w-32 px-3 py-1.5 rounded-md border border-input bg-background text-sm"
                                              value={hikeRate}
                                              onChange={(e) => setHikeRate(e.target.value)}
                                              placeholder="0.00"
                                            />
                                          </div>
                                          <Button
                                            size="sm"
                                            className="mt-4"
                                            disabled={savingHike}
                                            onClick={() => handleAddOrUpdateHike(job)}
                                          >
                                            {savingHike
                                              ? 'Saving…'
                                              : editingHike && editingHike.jobId === job._id
                                                ? 'Update Hike'
                                                : 'Add Hike'}
                                          </Button>
                                          {editingHike && editingHike.jobId === job._id && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="mt-4"
                                              disabled={savingHike}
                                              onClick={() => {
                                                setEditingHike(null);
                                                setHikeMonth('');
                                                setHikeRate('');
                                              }}
                                            >
                                              Cancel
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
