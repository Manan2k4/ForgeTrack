import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';
import { apiService } from '../../services/api';
import { formatToDMY } from '../../utils/date';

interface Employee { id: string; name: string; department?: string; isActive?: boolean; employmentType?: 'Contract'|'Monthly'|'Daily Roj'; }
interface AttendanceRow { _id?: string; employeeId: string; date: string; present: boolean; note?: string; }

// Removed ALL employees option per request

function AttendanceInner() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState<string>('');
  const [monthYear, setMonthYear] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  });
  const [days, setDays] = useState<string[]>([]);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => { (async () => {
    try {
      const res = await apiService.getEmployees({ includeInactive: false } as any);
      const list = Array.isArray((res as any).data) ? (res as any).data : [];
      setEmployees(list.map((e: any) => ({ id: String(e._id || e.id || ''), name: e.name || '', department: e.department, isActive: e.isActive !== false, employmentType: e.employmentType })));
    } catch (e: any) { toast.error(e?.message || 'Failed to load employees'); }
  })(); }, []);

  const computeDays = (my: string) => {
    const parts = my.split('-');
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    // Guard invalid date; default to current
    const now = new Date();
    const year = Number.isFinite(y) ? y : now.getFullYear();
    const month = Number.isFinite(m) ? m : (now.getMonth() + 1);
    // JS Date month is 0-based; to get days in selected 1-based month, pass (month, 0) next month
    const count = new Date(year, month, 0).getDate();
    const arr: string[] = [];
    for (let d=1; d<=count; d++) arr.push(`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    setDays(arr);
  };
  useEffect(() => { computeDays(monthYear); }, [monthYear]);

  const load = async () => {
    if (!monthYear) return;
    const [y,m] = monthYear.split('-').map(Number);
    setLoading(true);
    try {
      const res = await apiService.listAttendance({ employeeId: employeeId || undefined, month: m, year: y });
      const list = Array.isArray((res as any).data) ? (res as any).data : [];
      setRecords(list.filter((r:any) => r && r.employeeId && r.date));
    } catch (e: any) { toast.error(e?.message || 'Failed to load attendance'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [employeeId, monthYear]);

  const setPresent = async (date: string, empId: string, present: boolean) => {
    try {
      await apiService.saveAttendance({ employeeId: empId, date, present });
      await load();
    } catch (e: any) { toast.error(e?.message || 'Failed to save'); }
  };

  const recordsByDateEmp = useMemo(() => {
    const map = new Map<string, AttendanceRow>();
    records.forEach(r => map.set(`${r.employeeId}|${r.date}`, r));
    return map;
  }, [records]);

  const visibleEmployees = useMemo(() => {
    try {
      return employees.filter(e => !employeeId || e.id === employeeId);
    } catch {
      return [] as Employee[];
    }
  }, [employees, employeeId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Employee (optional)</label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}{e.department ? ` (${e.department})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Month & Year</label>
              <Input type="month" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} />
            </div>
            <div>
              <Button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mark Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {renderError ? (
              <div className="text-sm text-red-600">{renderError}</div>
            ) : days.length === 0 || visibleEmployees.length === 0 ? (
              <div className="text-sm text-muted-foreground">Select a valid month to view grid.</div>
            ) : (
            (() => {
              try {
                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center">Date</TableHead>
                        {visibleEmployees.map((e) => (
                          <TableHead key={e.id} className="text-center">{e.name}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {days.map((d) => (
                        <TableRow key={d}>
                          <TableCell className="text-center">{formatToDMY(d)}</TableCell>
                          {visibleEmployees.map((e) => {
                            const key = `${e.id}|${d}`;
                            const rec = recordsByDateEmp.get(key);
                            const present = rec ? !!rec.present : false;
                            return (
                              <TableCell key={key} className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPresent(d, e.id, true)}
                                    style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: present ? '#16a34a' : '#e5e7eb', border: '1px solid #9ca3af' }}
                                    aria-label="Present"
                                    title="Present"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setPresent(d, e.id, false)}
                                    style={{ width: 24, height: 24, borderRadius: 4, backgroundColor: !present ? '#dc2626' : '#e5e7eb', border: '1px solid #9ca3af' }}
                                    aria-label="Absent"
                                    title="Absent"
                                  />
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                );
              } catch (err: any) {
                setRenderError(err?.message || 'Failed to render attendance grid');
                return null;
              }
            })()
            )}
          </div>
        </CardContent>
      </Card>
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
