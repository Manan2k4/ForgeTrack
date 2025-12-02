import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface JobType {
  _id: string;
  partType: 'sleeve' | 'rod' | 'pin';
  jobName: string;
  rate: number;
}

export function AddRate() {
  const [jobTypes, setJobTypes] = useState<JobType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<string>('');

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

  const handleUpdateRate = async (id: string) => {
    const rate = parseFloat(editRate);
    if (isNaN(rate) || rate < 0) {
      toast.error('Please enter a valid rate (≥ 0)');
      return;
    }

    try {
      const response = await apiService.updateJobType(id, { rate });
      if (response.success) {
        toast.success('Rate updated successfully');
        setEditingId(null);
        setEditRate('');
        fetchJobTypes();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update rate');
    }
  };

  const groupedJobTypes = jobTypes.reduce((acc, jt) => {
    if (!acc[jt.partType]) acc[jt.partType] = [];
    acc[jt.partType].push(jt);
    return acc;
  }, {} as Record<string, JobType[]>);

  const partTypeLabels: Record<string, string> = {
    sleeve: 'Sleeve Workshop',
    rod: 'Rod Workshop',
    pin: 'Pin Workshop'
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
          {/* Always show all three workshops, even if empty */}
          {(['sleeve', 'rod', 'pin'] as const).map((partType) => {
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
                          {jobs.map((job) => (
                            <tr key={job._id} className="border-b border-border last:border-0">
                              <td className="py-3 px-4 text-foreground">{job.jobName}</td>
                              <td className="py-3 px-4">
                                {editingId === job._id ? (
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={editRate}
                                      onChange={(e) => setEditRate(e.target.value)}
                                      className="w-32 px-3 py-1.5 rounded-md border border-input bg-background"
                                      placeholder="0.00"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateRate(job._id)}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setEditingId(null);
                                        setEditRate('');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-foreground font-medium">
                                    Rs {(job.rate || 0).toFixed(2)}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {editingId !== job._id && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingId(job._id);
                                      setEditRate(String(job.rate || 0));
                                    }}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
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
