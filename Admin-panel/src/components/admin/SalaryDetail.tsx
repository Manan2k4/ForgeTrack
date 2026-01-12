import React, { useEffect, useMemo, useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { apiService } from '../../services/api';
import { Pencil, Trash2 } from 'lucide-react';

interface Row {
  id: string;
  name: string;
  department?: string;
  employmentType?: 'Contract' | 'Monthly' | 'Daily Roj';
  salaryPerDay?: number; // Monthly only
  dailyRojRate?: number; // Daily Roj only
  isActive?: boolean;
  salaryHistory?: Array<{ rate: number; effectiveFromYear: number; effectiveFromMonth: number }>;
  rojRateHistory?: Array<{ rate: number; effectiveFromYear: number; effectiveFromMonth: number }>;
}

const EmploymentTypes = ['Contract','Monthly','Daily Roj'] as const;

export function SalaryDetail() {
  const [rows, setRows] = useState<Row[]>([]);
  // Legacy edits removed; each row now manages its own transient input state.

  async function loadEmployees() {
    try {
      const res = await apiService.getEmployees({ includeInactive: true });
      const list: Row[] = (res.data || []).map((e: any) => ({
        id: e.id || e._id,
        name: e.name,
        department: e.department,
        employmentType: (e.employmentType as any) || 'Contract',
        salaryPerDay: typeof e.salaryPerDay === 'number' ? e.salaryPerDay : undefined,
        dailyRojRate: typeof e.dailyRojRate === 'number' ? e.dailyRojRate : undefined,
        isActive: e.isActive !== false,
        salaryHistory: Array.isArray(e.salaryHistory) ? e.salaryHistory : undefined,
        rojRateHistory: Array.isArray(e.rojRateHistory) ? e.rojRateHistory : undefined,
      }));
      setRows(list);
      // Row-specific state now handled by RowEditor components
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load employees');
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  const groups = useMemo(() => {
    const byType: Record<string, Row[]> = { Contract: [], Monthly: [], 'Daily Roj': [] };
    rows.forEach(r => {
      const key = (r.employmentType || 'Contract') as string;
      (byType[key] = byType[key] || []).push(r);
    });
    return byType;
  }, [rows]);

  const persistRow = async (id: string, payload: { employmentType?: Row['employmentType']; salaryPerDay?: number; dailyRojRate?: number }) => {
    try {
      await apiService.updateEmployee(id, payload as any);
      setRows(prev => prev.map(r => r.id === id ? { ...r, ...payload } : r));
      toast.success('Saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save details');
    }
  };

  const RowEditor = memo(function RowEditor({ r, context }: { r: Row; context: 'Contract' | 'Monthly' | 'Daily Roj' }) {
    const [localType, setLocalType] = useState<Row['employmentType']>(r.employmentType || 'Contract');
    const [salaryPerDay, setSalaryPerDay] = useState<string>(r.salaryPerDay !== undefined ? String(r.salaryPerDay) : '');
    const [dailyRojRate, setDailyRojRate] = useState<string>(r.dailyRojRate !== undefined ? String(r.dailyRojRate) : '');
    const [saving, setSaving] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [hikeMonth, setHikeMonth] = useState<string>('');
    const [hikeRate, setHikeRate] = useState<string>('');
    const [savingHike, setSavingHike] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    const history = useMemo(() => {
      if (context === 'Monthly') {
        return Array.isArray(r.salaryHistory) ? [...r.salaryHistory] : [];
      }
      if (context === 'Daily Roj') {
        return Array.isArray(r.rojRateHistory) ? [...r.rojRateHistory] : [];
      }
      return [] as Array<{ rate: number; effectiveFromYear: number; effectiveFromMonth: number }>;
    }, [r.salaryHistory, r.rojRateHistory, context]);

    const sortedHistory = useMemo(() => {
      const list = [...history];
      list.sort((a, b) => {
        const av = Number(a.effectiveFromYear) * 100 + Number(a.effectiveFromMonth);
        const bv = Number(b.effectiveFromYear) * 100 + Number(b.effectiveFromMonth);
        return bv - av; // latest first
      });
      return list;
    }, [history]);

    const save = async () => {
      setSaving(true);
      await persistRow(r.id, {
        employmentType: localType,
        salaryPerDay: context === 'Monthly' && salaryPerDay !== '' ? Number(salaryPerDay) : undefined,
        dailyRojRate: context === 'Daily Roj' && dailyRojRate !== '' ? Number(dailyRojRate) : undefined,
      });
      setSaving(false);
    };
    const addOrUpdateHike = async () => {
      if (context === 'Contract') return;
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
      if (!effectiveFromYear || !effectiveFromMonth) {
        toast.error('Invalid effective month');
        return;
      }
      const type = context === 'Monthly' ? 'monthly' : 'roj';
      setSavingHike(true);
      try {
        if (editingIndex !== null && editingIndex >= 0) {
          const resp = await apiService.updateEmployeeHike(r.id, editingIndex, {
            type,
            rate: rateNum,
            effectiveFromYear,
            effectiveFromMonth,
          });
          if (resp && resp.success) {
            toast.success('Hike updated in rate history');
            setHikeMonth('');
            setHikeRate('');
            setEditingIndex(null);
            await loadEmployees();
          }
        } else {
          const resp = await apiService.addEmployeeHike(r.id, { rate: rateNum, effectiveFromYear, effectiveFromMonth, type });
          if (resp && resp.success) {
            toast.success('Hike added to rate history');
            setHikeMonth('');
            setHikeRate('');
            await loadEmployees();
          }
        }
      } catch (e: any) {
        toast.error(e?.message || (editingIndex !== null ? 'Failed to update hike' : 'Failed to add hike'));
      } finally {
        setSavingHike(false);
      }
    };

    const deleteHike = async (origIndex: number) => {
      if (context === 'Contract') return;
      if (origIndex < 0) {
        toast.error('Could not locate selected history entry');
        return;
      }
      const confirmed = window.confirm('Delete this hike entry from rate history?');
      if (!confirmed) return;

      const type = context === 'Monthly' ? 'monthly' : 'roj';
      try {
        const resp = await apiService.deleteEmployeeHike(r.id, origIndex, type);
        if (resp && resp.success) {
          toast.success('Hike deleted from rate history');
          // If we were editing this entry, reset edit state
          if (editingIndex === origIndex) {
            setEditingIndex(null);
            setHikeMonth('');
            setHikeRate('');
          }
          await loadEmployees();
        }
      } catch (e: any) {
        toast.error(e?.message || 'Failed to delete hike');
      }
    };

    const colSpan = context === 'Contract' ? 4 : 5;

    return (
      <>
        <TableRow key={r.id}>
          <TableCell>{r.name}</TableCell>
          <TableCell>{r.department || '-'}</TableCell>
          <TableCell className="max-w-[180px]">
            <Select value={localType || 'Contract'} onValueChange={(v) => setLocalType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EmploymentTypes.map(t => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
              </SelectContent>
            </Select>
          </TableCell>
          {context === 'Monthly' && (
            <TableCell className="max-w-[160px]">
              <Input
                inputMode="decimal"
                type="number"
                step="0.01"
                placeholder="0"
                value={salaryPerDay}
                onChange={(e) => setSalaryPerDay(e.target.value)}
              />
            </TableCell>
          )}
          {context === 'Daily Roj' && (
            <TableCell className="max-w-[160px]">
              <Input
                inputMode="decimal"
                type="number"
                step="0.01"
                placeholder="0"
                value={dailyRojRate}
                onChange={(e) => setDailyRojRate(e.target.value)}
              />
            </TableCell>
          )}
          <TableCell className="space-x-2">
            <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            {(context === 'Monthly' || context === 'Daily Roj') && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (expanded) {
                    setExpanded(false);
                    setHikeMonth('');
                    setHikeRate('');
                  } else {
                    setExpanded(true);
                    setHikeMonth('');
                    setHikeRate('');
                  }
                }}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
          </TableCell>
        </TableRow>
        {expanded && (context === 'Monthly' || context === 'Daily Roj') && (
          <TableRow className="bg-muted/40">
            <TableCell colSpan={colSpan}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Rate history</span>
                </div>
                {sortedHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rate history entries yet. Add a hike below.</p>
                ) : (
                  <table className="w-full text-sm border border-border rounded-md overflow-hidden">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Effective from</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Rate (Rs/day)</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHistory.map((h, idx) => {
                        const originalIndex = history.findIndex((orig) =>
                          orig.effectiveFromYear === h.effectiveFromYear &&
                          orig.effectiveFromMonth === h.effectiveFromMonth &&
                          Number(orig.rate) === Number(h.rate)
                        );

                        const monthInputValue = `${h.effectiveFromYear}-${String(h.effectiveFromMonth).padStart(2, '0')}`;

                        return (
                          <tr key={idx} className="border-t border-border">
                            <td className="px-3 py-1.5">{`${String(h.effectiveFromMonth).padStart(2, '0')}/${h.effectiveFromYear}`}</td>
                            <td className="px-3 py-1.5">Rs {(h.rate || 0).toFixed(2)}</td>
                            <td className="px-3 py-1.5 text-right space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (originalIndex < 0) {
                                    toast.error('Could not locate selected history entry');
                                    return;
                                  }
                                  setExpanded(true);
                                  setEditingIndex(originalIndex);
                                  setHikeMonth(monthInputValue);
                                  setHikeRate(String(h.rate ?? ''));
                                }}
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteHike(originalIndex)}
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
                    <label className="text-xs text-muted-foreground">New rate (Rs/day)</label>
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
                    onClick={addOrUpdateHike}
                  >
                    {savingHike ? 'Saving…' : editingIndex !== null ? 'Update Hike' : 'Add Hike'}
                  </Button>
                  {editingIndex !== null && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-4"
                      disabled={savingHike}
                      onClick={() => {
                        setEditingIndex(null);
                        setHikeMonth('');
                        setHikeRate('');
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </TableCell>
          </TableRow>
        )}
      </>
    );
  });

  const Section = ({ title, data }: { title: 'Contract Employees' | 'Monthly Employees' | 'Daily Roj Employees'; data: Row[] }) => (
    // Editable cell component to prevent focus loss/scroll-to-top by isolating state
    // Propagates changes to parent only on blur
    // Using a nested component keeps input focused while typing without re-rendering parent table rows
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Employment Type</TableHead>
                {title === 'Monthly Employees' && (<TableHead>Salary per day</TableHead>)}
                {title === 'Daily Roj Employees' && (<TableHead>Daily Roj Rate</TableHead>)}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={title === 'Contract Employees' ? 4 : 5} className="text-center text-muted-foreground">No employees</TableCell>
                </TableRow>
              ) : (
                data.map((r) => <RowEditor key={r.id} r={r} context={title.replace(' Employees','') as any} />)
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Section title="Contract Employees" data={groups['Contract'] || []} />
      <Section title="Monthly Employees" data={groups['Monthly'] || []} />
      <Section title="Daily Roj Employees" data={groups['Daily Roj'] || []} />
    </div>
  );
}

// EditableNumber removed; RowEditor now manages inline state directly.
