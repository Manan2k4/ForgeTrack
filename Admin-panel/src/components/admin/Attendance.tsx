import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { apiService } from '../../services/api';
import { parseDMYToISO } from '../../utils/date';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

interface Employee { id: string; name: string; department?: string; isActive?: boolean; employmentType?: 'Contract'|'Monthly'|'Daily Roj'; }

function AttendanceInner() {
  // Core state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState<string>('');
  const [dateInput, setDateInput] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  });
  const [monthYear, setMonthYear] = useState<string>(() => {
    const iso = parseDMYToISO(dateInput);
    if (iso) {
      const [y,m] = iso.split('-');
      return `${y}-${m}`;
    }
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  });
  const [monthlyPresentDaysInput, setMonthlyPresentDaysInput] = useState<string>('0'); // desired present days entered by admin
  const [monthlyOtHoursInput, setMonthlyOtHoursInput] = useState<string>('0'); // desired total overtime hours for the month
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [monthlyAttendance, setMonthlyAttendance] = useState<Array<{ _id?: string; date: string; present: boolean }>>([]);
  const [monthlyOvertime, setMonthlyOvertime] = useState<Array<{ _id?: string; date: string; hours: number }>>([]);

  // Derived metrics from actual stored daily records
  const presentCount = useMemo(() => monthlyAttendance.filter(r => r.present).length, [monthlyAttendance]);
  const overtimeTotal = useMemo(() => monthlyOvertime.reduce((s,o)=> s + (o.hours || 0), 0), [monthlyOvertime]);

  // Load employees once
  useEffect(() => { (async () => {
    try {
      const res = await apiService.getEmployees({ includeInactive: false } as any);
      const list = Array.isArray((res as any).data) ? (res as any).data : [];
      setEmployees(list.map((e: any) => ({ id: String(e._id || e.id || ''), name: e.name || '', department: e.department, isActive: e.isActive !== false, employmentType: e.employmentType })));
    } catch (e: any) { toast.error(e?.message || 'Failed to load employees'); }
  })(); }, []);

  const selectedEmployee = useMemo(() => employees.find(e => e.id === employeeId) || null, [employees, employeeId]);

  // Helper: parse month/year from input which can be dd/mm/yyyy OR mm/yyyy
  const parseMonthYear = (value: string): { year: number; month: number } | null => {
    if (!value) return null;
    const trimmed = value.trim();
    // Pattern mm/yyyy
    const mmYear = trimmed.match(/^([0-9]{1,2})\/([0-9]{4})$/);
    if (mmYear) {
      const month = Number(mmYear[1]);
      const year = Number(mmYear[2]);
      if (month >= 1 && month <= 12) return { year, month };
    }
    // Pattern dd/mm/yyyy
    const ddMmYear = trimmed.match(/^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/);
    if (ddMmYear) {
      const month = Number(ddMmYear[2]);
      const year = Number(ddMmYear[3]);
      if (month >= 1 && month <= 12) return { year, month };
    }
    return null;
  };

  // Derive monthYear whenever dateInput changes
  useEffect(() => {
    const parsed = parseMonthYear(dateInput);
    if (!parsed) return; // keep previous monthYear if invalid
    setMonthYear(`${parsed.year}-${String(parsed.month).padStart(2,'0')}`);
  }, [dateInput]);

  // Load month data when employee or derived monthYear changes
  useEffect(() => { (async () => {
    if (!employeeId || !monthYear) return;
    const [yearStr, monthStr] = monthYear.split('-');
    const year = Number(yearStr); const month = Number(monthStr);
    if (!year || !month) return;
    try {
      const attRes = await apiService.listAttendance({ employeeId, month, year });
      const attRows = Array.isArray((attRes as any).data) ? (attRes as any).data : [];
      setMonthlyAttendance(attRows.map((r:any)=> ({ _id: r._id, date: r.date, present: !!r.present })));
      try {
        const otRes = await apiService.listOvertime({ employeeId, month, year });
        const otRows = Array.isArray((otRes as any).data) ? (otRes as any).data : [];
        setMonthlyOvertime(otRows.map((o:any)=> ({ _id: o._id, date: o.date, hours: Number(o.hours||0) })));
      } catch { setMonthlyOvertime([]); }
    } catch (e:any){ toast.error(e?.message || 'Failed to load month'); }
  })(); }, [employeeId, monthYear]);

  const refreshMonth = async () => {
    if (!employeeId || !monthYear) return;
    // Accept mm/yyyy or dd/mm/yyyy; validate monthYear already derived
    const [yearStr, monthStr] = monthYear.split('-');
    const year = Number(yearStr); const month = Number(monthStr);
    if (!year || !month) return;
    try {
      const attRes = await apiService.listAttendance({ employeeId, month, year });
      const attRows = Array.isArray((attRes as any).data) ? (attRes as any).data : [];
      setMonthlyAttendance(attRows.map((r:any)=> ({ _id: r._id, date: r.date, present: !!r.present })));
      try {
        const otRes = await apiService.listOvertime({ employeeId, month, year });
        const otRows = Array.isArray((otRes as any).data) ? (otRes as any).data : [];
        setMonthlyOvertime(otRows.map((o:any)=> ({ _id: o._id, date: o.date, hours: Number(o.hours||0) })));
      } catch { setMonthlyOvertime([]); }
    } catch {}
  };

  // Apply desired monthly present days WITH reset logic (set all absent then mark first N days present)
  const applyMonthly = async () => {
    if (!employeeId) return toast.error('Select employee');
    const parsed = parseMonthYear(dateInput);
    if (!parsed) return toast.error('Enter mm/yyyy or dd/mm/yyyy');
    const desired = Number(monthlyPresentDaysInput) || 0;
    const { year, month } = parsed;
    if (!year || !month) return toast.error('Invalid month');
    const daysInMonth = new Date(year, month, 0).getDate();
    if (desired < 0 || desired > daysInMonth) return toast.error(`Present days must be 0-${daysInMonth}`);
    setLoading(true);
    setSaving(true);
    try {
      // 1. Reset existing attendance to absent (batch in parallel for speed)
      const resetPromises = monthlyAttendance
        .filter(rec => rec.present && rec._id)
        .map(rec => apiService.updateAttendance(rec._id as string, { present: false }));
      if (resetPromises.length) {
        await Promise.all(resetPromises);
      }

      // 2. Ensure records exist for first N days and set present (batch in parallel)
      const upsertPromises: Promise<any>[] = [];
      for (let day = 1; day <= desired; day++) {
        const dateIso = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const existing = monthlyAttendance.find(r => r.date.slice(0,10) === dateIso);
        if (existing && existing._id) {
          upsertPromises.push(apiService.updateAttendance(existing._id, { present: true }));
        } else if (!existing) {
          upsertPromises.push(apiService.saveAttendance({ employeeId, date: dateIso, present: true }));
        }
      }
      if (upsertPromises.length) {
        await Promise.all(upsertPromises);
      }

      // 3. Overtime aggregation: remove all existing overtime records for month, then create one record if total > 0 using first day of month (batch deletes)
      const deleteOtpromises = monthlyOvertime
        .filter(ot => ot._id)
        .map(ot => apiService.deleteOvertime(ot._id as string));
      if (deleteOtpromises.length) {
        await Promise.all(deleteOtpromises);
      }
      const otTotal = Number(monthlyOtHoursInput) || 0;
      if (otTotal > 0) {
        // Preserve original entry date if it exists; otherwise use typed dd/mm/yyyy day; else fallback to first of month
        const existingEntryIso = monthlyOvertime[0]?.date || monthlyAttendance[0]?.date;
        let entryIso = existingEntryIso && existingEntryIso.slice(0,10);
        if (!entryIso) {
          const ddMatch = dateInput.trim().match(/^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/);
          const entryDay = ddMatch ? String(Number(ddMatch[1])).padStart(2,'0') : '01';
          entryIso = `${year}-${String(month).padStart(2,'0')}-${entryDay}`;
        }
        await apiService.createOvertime({ employeeId, date: entryIso, hours: otTotal });
      }
      toast.success('Month applied');
      // Authoritative refresh to get real _ids
      await refreshMonth();
    } catch (e:any){ toast.error(e?.message || 'Apply failed'); }
    finally { setLoading(false); setSaving(false); }
  };

  const deleteMonth = async () => {
    if (!employeeId) return;
    if (!monthYear) return;
    setLoading(true);
    setDeleting(true);
    try {
      const [yearStr, monthStr] = monthYear.split('-');
      const year = Number(yearStr); const month = Number(monthStr);
      const attRes: any = await apiService.bulkDeleteAttendance({ employeeId, month, year });
      const otRes: any = await apiService.bulkDeleteOvertime({ employeeId, month, year });
      const attCount = Number(attRes?.deletedCount ?? attRes?.data?.deletedCount ?? 0);
      const otCount = Number(otRes?.deletedCount ?? otRes?.data?.deletedCount ?? 0);
      toast.success(`Deleted ${attCount} attendance and ${otCount} OT records`);
      await refreshMonth();
    } catch (e:any){ toast.error(e?.message || 'Delete failed'); }
    finally { setLoading(false); setDeleting(false); }
  };

  // Edit a single attendance record's present flag
  const editAttendanceRecord = async (id?: string, present?: boolean) => {
    if (!id) return;
    try {
      await apiService.updateAttendance(id, { present: !!present });
      await refreshMonth();
      toast.success('Attendance updated');
    } catch (e: any) {
      toast.error(e?.message || 'Update failed');
    }
  };

  // Delete a single attendance record
  const deleteAttendanceRecord = async (id?: string) => {
    if (!id) return;
    try {
      await apiService.deleteAttendance(id);
      await refreshMonth();
      toast.success('Attendance deleted');
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Attendance (Monthly)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Employee</label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}{e.department?` (${e.department})`:''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date / Month (dd/mm/yyyy or mm/yyyy)</label>
              <Input placeholder="mm/yyyy or dd/mm/yyyy" value={dateInput} onChange={(e)=> setDateInput(e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-1">Filtering uses extracted month & year; day ignored.</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Desired Present Days</label>
              <Input type="number" min={0} step="1" value={monthlyPresentDaysInput} onChange={(e)=> setMonthlyPresentDaysInput(e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-1">Recorded: {presentCount}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total OT Hours (Month)</label>
              <Input type="number" min={0} step="0.5" value={monthlyOtHoursInput} onChange={(e)=> setMonthlyOtHoursInput(e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-1">Current stored: {overtimeTotal}</p>
            </div>
            <div className="flex gap-2 pt-6 md:col-span-2">
              <Button
                disabled={loading || !employeeId}
                onClick={applyMonthly}
              >
                {saving ? 'Applying...' : 'Apply'}
              </Button>
              <Button variant="outline" disabled={loading || !employeeId} onClick={refreshMonth}>Refresh</Button>
              <Button variant="destructive" disabled={loading || !employeeId} onClick={() => setDeleteConfirmOpen(true)}>Delete Month</Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {employeeId && (
        <Card>
          <CardHeader><CardTitle>Month Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-2 text-left">Entry Date (Month)</th>
                    <th className="py-2 px-2 text-center">Present Days</th>
                    <th className="py-2 px-2 text-center">OT Hours (Total)</th>
                    <th className="py-2 px-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b last:border-0">
                    <td className="py-2 px-2">{(monthlyOvertime[0]?.date || monthlyAttendance[0]?.date || dateInput).slice(0,10)}</td>
                    <td className="py-2 px-2 text-center">{presentCount}</td>
                    <td className="py-2 px-2 text-center">{overtimeTotal || '-'}</td>
                    <td className="py-2 px-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={loading || !employeeId}
                          onClick={() => setEditOpen(true)}
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive" disabled={loading || !employeeId} onClick={() => setDeleteConfirmOpen(true)}>Delete</Button>
                        <Button size="sm" variant="outline" disabled={loading} onClick={refreshMonth}>Refresh</Button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Single-row month view. Adjust present days without assuming which specific dates were present; additions use earliest blank days, reductions remove latest present days.</p>
          </CardContent>
        </Card>
      )}
      {/* Daily records table removed per request; editing is performed via Apply based on totals without changing stored entry date. */}

      {/* Edit Modal (Monthly Entry) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Monthly Entry</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Entry Date (dd/mm/yyyy or mm/yyyy)</label>
              <Input placeholder="mm/yyyy or dd/mm/yyyy" value={dateInput} onChange={(e)=> setDateInput(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Desired Present Days</label>
              <Input type="number" min={0} step="1" value={monthlyPresentDaysInput} onChange={(e)=> setMonthlyPresentDaysInput(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total OT Hours (Month)</label>
              <Input type="number" min={0} step="0.5" value={monthlyOtHoursInput} onChange={(e)=> setMonthlyOtHoursInput(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={async () => { await applyMonthly(); setEditOpen(false); }}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm (Monthly Entry) */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Monthly Entry</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this month’s attendance and overtime records? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleting} onClick={async () => { await deleteMonth(); setDeleteConfirmOpen(false); }}>{deleting ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


export function Attendance() {
  try {
    return <AttendanceInner />;
  } catch (e: any) {
    return (
      <div className="p-6">
        <div className="text-red-600 font-medium mb-2">Failed to render Attendance.</div>
        <div className="text-sm text-muted-foreground mb-3">{e?.message || 'Unknown error'}</div>
      </div>
    );
  }
}
