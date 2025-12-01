import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { apiService } from '../../services/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Pencil, Trash2, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { formatToDMY } from '../../utils/date';

export function OvertimeNote() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState<string>('');
  const [hours, setHours] = useState<string>('');
  const [rate, setRate] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [monthYear, setMonthYear] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loadingList, setLoadingList] = useState(false);
  const [rows, setRows] = useState<Array<{ id: string; date: string; hours: number; rate?: number }>>([]);
  const [editingId, setEditingId] = useState<string>('');
  const [editHours, setEditHours] = useState<string>('');
  const [editRate, setEditRate] = useState<string>('');
  const [deleting, setDeleting] = useState<{ id?: string; confirming: boolean; loading?: boolean }>({ id: undefined, confirming: false, loading: false });

  useEffect(() => {
    (async () => {
      try {
        const res = await apiService.getEmployees({ includeInactive: false });
        setEmployees(res.data || []);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to load employees');
      }
    })();
  }, []);

  const selectedEmp = useMemo(() => employees.find(e => (e._id || e.id) === employeeId), [employees, employeeId]);

  useEffect(() => {
    const run = async () => {
      if (!employeeId || !monthYear) { setRows([]); return; }
      const [y, m] = monthYear.split('-').map(Number);
      if (!y || !m) return;
      setLoadingList(true);
      try {
        const res = await apiService.listOvertime({ employeeId, month: m, year: y });
        const list = (res as any).data || [];
        const mapped = Array.isArray(list) ? list.map((r: any) => ({
          id: String(r._id || r.id),
          date: String(r.date),
          hours: Number(r.hours || 0) || 0,
          rate: r.rate != null ? Number(r.rate) : undefined,
        })) : [];
        setRows(mapped);
      } catch (e: any) {
        // Fallback to attendance listing if overtime endpoint not available
        try {
          const attRes = await apiService.listAttendance({ employeeId, month: m, year: y });
          const records: any[] = (attRes as any).data || [];
          const mapped = Array.isArray(records) ? records.map((r: any) => {
            const id = String(r._id || r.id || `${r.date}`);
            const date = String(r.date || r.attendanceDate || r.day || '');
            let hours = Number(r.overtimeHours ?? r.overtime ?? r.otHours ?? r.h ?? 0) || 0;
            let rate = r.overtimeRate != null ? Number(r.overtimeRate) : undefined;
            if ((!hours || !rate) && r.note) {
              const note = String(r.note);
              if (note.startsWith('OT:')) {
                const parts = note.split(':');
                const nh = Number(parts[1]);
                const nr = parts[2] != null ? Number(parts[2]) : undefined;
                if (Number.isFinite(nh)) hours = nh;
                if (nr != null && Number.isFinite(nr)) rate = nr;
              } else if (note.trim().startsWith('{')) {
                try {
                  const j = JSON.parse(note);
                  if (j.overtimeHours != null) hours = Number(j.overtimeHours) || hours;
                  if (j.overtimeRate != null) rate = Number(j.overtimeRate);
                } catch {}
              }
            }
            return { id, date, hours, rate };
          }).filter(r => (r.hours || 0) > 0) : [];
          setRows(mapped);
        } catch (err) {
          toast.error(e?.message || 'Failed to load overtime');
          setRows([]);
        }
      } finally { setLoadingList(false); }
    };
    run();
  }, [employeeId, monthYear]);

  const submit = async () => {
    if (!employeeId) return toast.error('Select employee');
    if (!date) return toast.error('Select date');
    const h = Number(hours);
    if (!Number.isFinite(h) || h <= 0) return toast.error('Enter overtime hours');
    const r = rate ? Number(rate) : undefined;
    setSaving(true);
    try {
      // Pre-check: ensure employee is present on selected date
      try {
        const [y, m] = date.split('-').map(Number);
        if (!y || !m) throw new Error('Invalid date');
        const attRes = await apiService.listAttendance({ employeeId, month: m, year: y });
        const records: any[] = (attRes as any).data || [];
        const isPresent = records.some((rec: any) => {
          const recDate = String(rec.date || rec.attendanceDate || rec.day || '').substring(0, 10);
          return recDate === date && (rec.present === true || rec.present === 'true');
        });
        if (!isPresent) {
          toast.error(`Employee was absent on ${date}. Cannot register overtime.`);
          setSaving(false);
          return;
        }
      } catch (preErr) {
        // If attendance endpoint is unavailable, let backend enforce the rule on createOvertime
      }
      try {
        await (apiService as any).createOvertime({ employeeId, date, hours: h, rate: r });
      } catch (err: any) {
        const msg = String(err?.message || '');
        const status = (err as any)?.status;
        // Surface validation errors clearly
        if (status === 400) {
          const serverMsg = (err?.body && (err.body.message || err.body.error)) || msg || 'Validation error';
          toast.error(serverMsg);
          throw new Error(serverMsg);
        }
        // If backend forbids due to absence, do NOT fallback
        if (/absent/i.test(msg)) {
          toast.error(msg);
          throw err;
        }
        // Only fallback when dedicated overtime route is missing
        if (status === 404 || /Route not found/i.test(msg)) {
          const note = r != null ? `OT:${h}:${r}` : `OT:${h}`;
          await apiService.saveAttendance({ employeeId, date, present: false, note });
        } else {
          throw err;
        }
      }
      toast.success('Overtime saved');
      setHours('');
      setRate('');
      // refresh list
      await reloadRows();
    } catch (e: any) {
      const msg = (e?.message || '').trim();
      toast.error(msg || 'Failed to note overtime');
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (row: { id: string; hours: number; rate?: number }) => {
    setEditingId(row.id);
    setEditHours(String(row.hours ?? ''));
    setEditRate(row.rate != null ? String(row.rate) : '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const h = Number(editHours);
    if (!Number.isFinite(h) || h < 0) return toast.error('Invalid hours');
    const r = editRate !== '' ? Number(editRate) : undefined;
    try {
      await (apiService as any).updateOvertime(editingId, { hours: h, ...(r != null ? { rate: r } : {}) });
      toast.success('Overtime updated');
      setEditingId('');
      // refresh
      await reloadRows();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update overtime');
    }
  };

  const deleteRow = async (id: string) => {
    if (!id) return;
    // Try dedicated overtime delete first
    try {
      const delRes = await (apiService as any).deleteOvertime(id);
      console.debug('deleteOvertime response', delRes);
      if (!delRes || delRes.success === false) {
        throw new Error((delRes && (delRes.message || delRes.error)) || 'Delete failed');
      }
      // refresh authoritative data and inform user
      await reloadRows();
      toast.success('Overtime deleted');
      return;
    } catch (err: any) {
      // continue to fallback to attendance-based deletion
      console.warn('deleteOvertime failed, falling back to attendance cleanup', err?.message || err);
      toast.error('Overtime delete via endpoint failed; attempting attendance cleanup');
    }

    // Fallback: find matching attendance record for the same date and remove OT note/fields
    try {
      const [y, m] = monthYear.split('-').map(Number);
      if (!employeeId || !y || !m) return toast.error('Missing employee or month');
      const attRes = await apiService.listAttendance({ employeeId, month: m, year: y });
      console.debug('listAttendance response', attRes);
      const records: any[] = (attRes as any).data || [];
      console.debug('attendance records count', records.length);

      // Attempt to find the date for this row id
      // Our row id may be an attendance _id or a fallback date string
      const row = rows.find(r => r.id === id);
      const targetDate = row?.date;

      // Find attendance record that matches the date
      const rec = records.find((r: any) => {
        const rDate = String(r.date || r.attendanceDate || r.day || '').substring(0, 10);
        const tDate = String(targetDate || '').substring(0, 10);
        return rDate && tDate && (rDate === tDate || new Date(rDate).toDateString() === new Date(tDate).toDateString());
      });

      if (!rec) {
        console.debug('No matching attendance record found. targetDate=', targetDate, 'records=', records.map(r => ({ date: r.date || r.attendanceDate || r.day, id: r._id || r.id })));
        // As a last resort, attempt a direct upsert using the target date to clear any OT note.
        const fallbackDate = String(targetDate || '').substring(0, 10);
        if (!fallbackDate) {
          return toast.error('Could not locate matching attendance record to remove OT');
        }
        try {
          // First attempt: present=false, note=undefined (clear)
          const saResp1 = await apiService.saveAttendance({ employeeId, date: fallbackDate, present: false, note: undefined });
          console.debug('saveAttendance (direct clear, present=false) response', saResp1);
          setRows(prev => prev.filter(r => r.id !== id));
          await reloadRows();
          toast.success('Overtime removed (attendance updated)');
          return;
        } catch (err1) {
          console.warn('saveAttendance direct-clear failed (present=false)', err1);
          // Second attempt: some backends require empty string note and present=true to upsert
          try {
            const saResp2 = await apiService.saveAttendance({ employeeId, date: fallbackDate, present: true, note: '' });
            console.debug('saveAttendance (direct clear, present=true note="") response', saResp2);
            setRows(prev => prev.filter(r => r.id !== id));
            await reloadRows();
            toast.success('Overtime removed (attendance updated)');
            return;
          } catch (err2) {
            console.error('saveAttendance direct-clear retry failed', err2);
            return toast.error('Failed to remove overtime entry');
          }
        }
      }

      console.debug('Found attendance record to update/clear', rec);

      // Prepare updated note by stripping OT tokens or OT JSON
      let newNote: string | null = rec.note || null;
      if (typeof newNote === 'string') {
        newNote = newNote.replace(/OT:[\d.:-]+;?/g, '').trim();
        if (newNote === '') newNote = null;
      }

      // Preserve present flag unless we know it's an OT-only placeholder
      const presentFlag = (rec.present === false || rec.present === 'false') ? false : Boolean(rec.present);

      // NOTE: Many backends in this project do not implement DELETE/PUT on /attendance.
      // To be robust, always use `saveAttendance` (POST /attendance) as an upsert to clear OT notes.
      try {
        const recDate = String(rec.date || rec.attendanceDate || rec.day || '').substring(0, 10);
        // Attempt with preserved present flag and cleared note
        try {
          const saResp = await apiService.saveAttendance({ employeeId, date: recDate, present: presentFlag, note: newNote ?? undefined });
          console.debug('saveAttendance (clear) response', saResp);
          setRows(prev => prev.filter(r => r.id !== id));
          await reloadRows();
          toast.success('Overtime removed (attendance updated)');
          return;
        } catch (errA) {
          console.warn('saveAttendance clear failed with preserved present flag', errA);
          // Retry with present=true and empty note if backend enforces presence
          const saRespRetry = await apiService.saveAttendance({ employeeId, date: recDate, present: true, note: '' });
          console.debug('saveAttendance (retry present=true note="") response', saRespRetry);
          setRows(prev => prev.filter(r => r.id !== id));
          await reloadRows();
          toast.success('Overtime removed (attendance updated)');
          return;
        }
      } catch (err) {
        console.error('saveAttendance fallback failed', err);
        throw err;
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to remove overtime entry');
    }
  };

  // centralized reload helper: prefer overtime endpoint, fallback to attendance parsing
  async function reloadRows() {
    try {
      const [y, m] = monthYear.split('-').map(Number);
      if (!employeeId || !y || !m) return setRows([]);
      try {
        const res = await apiService.listOvertime({ employeeId, month: m, year: y });
        const list = (res as any).data || [];
        const mapped = Array.isArray(list) ? list.map((r: any) => ({ id: String(r._id || r.id), date: String(r.date), hours: Number(r.hours || 0) || 0, rate: r.rate != null ? Number(r.rate) : undefined })) : [];
        setRows(mapped);
        return;
      } catch (e) {
        // fallback to attendance
      }
      const attRes = await apiService.listAttendance({ employeeId, month: m, year: y });
      const records: any[] = (attRes as any).data || [];
      const mapped = Array.isArray(records) ? records.map((r: any) => {
        const id = String(r._id || r.id || `${r.date}`);
        const date = String(r.date || r.attendanceDate || r.day || '');
        let hours = Number(r.overtimeHours ?? r.overtime ?? r.otHours ?? r.h ?? 0) || 0;
        let rate = r.overtimeRate != null ? Number(r.overtimeRate) : undefined;
        if ((!hours || !rate) && r.note) {
          const note = String(r.note);
          if (note.startsWith('OT:')) {
            const parts = note.split(':');
            const nh = Number(parts[1]);
            const nr = parts[2] != null ? Number(parts[2]) : undefined;
            if (Number.isFinite(nh)) hours = nh;
            if (nr != null && Number.isFinite(nr)) rate = nr;
          } else if (note.trim().startsWith('{')) {
            try { const j = JSON.parse(note); if (j.overtimeHours != null) hours = Number(j.overtimeHours) || hours; if (j.overtimeRate != null) rate = Number(j.overtimeRate); } catch {}
          }
        }
        return { id, date, hours, rate };
      }).filter(r => (r.hours || 0) > 0) : [];
      setRows(mapped);
    } catch (err) {
      console.error('reloadRows failed', err);
      setRows([]);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Overtime Note</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Employee</label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {(employees || []).map((e: any) => (
                    <SelectItem key={e.id || e._id} value={e.id || e._id}>
                      {e.name} {e.department ? `(${e.department})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Month & Year</label>
              <Input type="month" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Hours</label>
              <Input type="number" min={0} step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rate (optional)</label>
              <Input type="number" min={0} step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={selectedEmp?.dailyRojRate ? `Default ≈ ₹${(selectedEmp.dailyRojRate/8).toFixed(2)}` : 'auto (roj/8)'} />
            </div>
            <div>
              <Button onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Overtime rate defaults to Daily Roj rate ÷ 8 if not provided.</p>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Overtime Entries {employeeId && selectedEmp ? `- ${selectedEmp.name}` : ''}</h3>
              {loadingList && <span className="text-xs text-muted-foreground">Loading…</span>}
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Hours</TableHead>
                    <TableHead className="text-center">Rate</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">{employeeId ? 'No overtime entries for selected month' : 'Select an employee to view entries'}</TableCell>
                    </TableRow>
                  ) : rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatToDMY(r.date)}</TableCell>
                      <TableCell className="text-center">
                        {editingId === r.id ? (
                          <Input type="number" min={0} step="0.25" value={editHours} onChange={(e) => setEditHours(e.target.value)} />
                        ) : (
                          r.hours
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {editingId === r.id ? (
                          <Input type="number" min={0} step="0.01" value={editRate} onChange={(e) => setEditRate(e.target.value)} />
                        ) : (
                          r.rate != null ? `₹${Number(r.rate).toFixed(2)}` : '—'
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {editingId === r.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <Button size="sm" variant="outline" onClick={saveEdit}><Save className="w-4 h-4 mr-1" />Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId('')}><X className="w-4 h-4 mr-1" />Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => beginEdit(r)}><Pencil className="w-4 h-4 mr-1" />Edit</Button>
                            <Button size="sm" variant="destructive" onClick={() => setDeleting({ id: r.id, confirming: true, loading: false })}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirm Dialog (ViewLogs pattern) */}
      <Dialog open={!!deleting.confirming} onOpenChange={(open) => setDeleting(prev => ({ ...prev, confirming: open }))}>
        <DialogContent aria-describedby="delete-overtime-desc">
          <DialogHeader>
            <DialogTitle>Delete Overtime Entry</DialogTitle>
          </DialogHeader>
            <p id="delete-overtime-desc">Are you sure you want to delete this overtime entry? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting({ id: undefined, confirming: false, loading: false })} disabled={!!deleting.loading}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleting.id) return;
                setDeleting(prev => ({ ...prev, loading: true }));
                try {
                  console.debug('Dialog: calling deleteRow for id', deleting.id);
                  await deleteRow(deleting.id);
                } catch (err: any) {
                  console.error('Delete dialog: deleteRow failed', err);
                  toast.error(err?.message || 'Failed to delete overtime');
                } finally {
                  setDeleting({ id: undefined, confirming: false, loading: false });
                }
              }}
              disabled={!!deleting.loading}
            >
              {deleting.loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
