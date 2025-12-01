import React, { useEffect, useMemo, useState, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { apiService } from '../../services/api';

interface Row {
  id: string;
  name: string;
  department?: string;
  employmentType?: 'Contract' | 'Monthly' | 'Daily Roj';
  salaryPerDay?: number; // Monthly only
  dailyRojRate?: number; // Daily Roj only
  isActive?: boolean;
}

const EmploymentTypes = ['Contract','Monthly','Daily Roj'] as const;

export function SalaryDetail() {
  const [rows, setRows] = useState<Row[]>([]);
  // Legacy edits removed; each row now manages its own transient input state.

  useEffect(() => {
    (async () => {
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
        }));
        setRows(list);
        // Row-specific state now handled by RowEditor components
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load employees');
      }
    })();
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
    const save = async () => {
      setSaving(true);
      await persistRow(r.id, {
        employmentType: localType,
        salaryPerDay: context === 'Monthly' && salaryPerDay !== '' ? Number(salaryPerDay) : undefined,
        dailyRojRate: context === 'Daily Roj' && dailyRojRate !== '' ? Number(dailyRojRate) : undefined,
      });
      setSaving(false);
    };
    return (
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
        <TableCell>
          <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </TableCell>
      </TableRow>
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
