import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';
import { Download, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  _id?: string;
  id?: string;
  name: string;
  employmentType?: string;
  dailyRojRate?: number;
  active?: boolean;
}

interface AttendanceSummaryItem {
  employeeId: string;
  presentDays: number;
}

export function SalaryRoj() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  const [showEmployeeList, setShowEmployeeList] = useState(false);

  const [monthYear, setMonthYear] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
  });

  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummaryItem | null>(null);
  const [upadTotal, setUpadTotal] = useState(0);
  const [loanInstallment, setLoanInstallment] = useState(0);
  const [pendingLoan, setPendingLoan] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exportInfo, setExportInfo] = useState<{ html: string; filename: string } | null>(null);
  const [searched, setSearched] = useState(false);
  const [overtimeRows, setOvertimeRows] = useState<Array<{ date: string; hours: number; rate?: number }>>([]);
  const [overtimeTotalHours, setOvertimeTotalHours] = useState(0);
  const [overtimeRateDefault, setOvertimeRateDefault] = useState(0);

  useEffect(() => { loadEmployees(); }, []);

  async function loadEmployees() {
    try {
      setLoadingEmployees(true);
      const res = await apiService.getEmployees({ includeInactive: false });
      if (res.success && Array.isArray(res.data)) {
        const raw: Employee[] = res.data;
        const normalized = raw.map(r => ({ ...r, employmentType: (r.employmentType || '').toLowerCase() }));
        const rojSet = new Set(['daily roj','roj','daily','daily wage','roj worker']);
        const filtered = normalized.filter(e => rojSet.has(e.employmentType || '') && e.active !== false);
        setEmployees(filtered.length ? filtered : raw.filter(e => e.active !== false));
      }
    } catch (e: any) { toast.error(e.message || 'Failed to load employees'); }
    finally { setLoadingEmployees(false); }
  }

  const getId = (e: Employee) => String(e._id || e.id || '');

  const selectedEmployee = useMemo(
    () => employees.find(e => getId(e) === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  // Fetch overtime from backend overtime endpoint (fallback to attendance) when employee/month changes
  useEffect(() => {
    const run = async () => {
      if (!selectedEmployeeId || !monthYear) { setOvertimeRows([]); setOvertimeTotalHours(0); return; }
      const [yearStr, monthStr] = monthYear.split('-');
      const year = Number(yearStr); const month = Number(monthStr);
      if (!year || !month) return;
      try {
        // Prefer overtime API if available
        let rows: Array<{ date: string; hours: number; rate?: number }> = [];
        try {
          const otRes = await apiService.listOvertime({ employeeId: selectedEmployeeId, month, year });
          const list = (otRes as any).data || [];
          rows = Array.isArray(list) ? list.map((r: any) => ({
            date: String(r.date),
            hours: Number(r.hours || 0) || 0,
            rate: r.rate != null ? Number(r.rate) : undefined,
          })) : [];
        } catch {
          const res = await apiService.listAttendance({ employeeId: selectedEmployeeId, month, year });
          const records: any[] = (res as any).data || [];
          rows = Array.isArray(records) ? records.map((r: any) => {
            const date = String(r.date || r.day || r.workDate || r.attendanceDate || '');
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
            return { date, hours, rate };
          }).filter(r => r.hours > 0) : [];
        }
        setOvertimeRows(rows);
        setOvertimeTotalHours(rows.reduce((s, it) => s + (it.hours || 0), 0));
        setOvertimeRateDefault((selectedEmployee?.dailyRojRate || 0) / 8 || 0);
      } catch (e) {
        setOvertimeRows([]);
        setOvertimeTotalHours(0);
        setOvertimeRateDefault((selectedEmployee?.dailyRojRate || 0) / 8 || 0);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmployeeId, monthYear]);

  async function handleSearch() {
    if (!selectedEmployeeId) { toast.error('Select employee'); return; }
    if (!monthYear) { toast.error('Select month & year'); return; }
    const [yearStr, monthStr] = monthYear.split('-');
    const year = Number(yearStr); const month = Number(monthStr);
    if (!year || !month) { toast.error('Invalid month/year'); return; }
    setLoading(true);
    try {
      const attRes = await apiService.attendanceSummary({ month, year });
      const list: AttendanceSummaryItem[] = (attRes as any).data || [];
      const found = list.find(i => {
        const attId = String((i as any).employeeId || (i as any)._id || (i as any).id || '');
        return attId === selectedEmployeeId;
      }) || null;
      setAttendanceSummary(found);
      // Upad
      try {
        const upadRes = await apiService.listUpad({ employeeId: selectedEmployeeId, month, year });
        const entries = (upadRes as any).data || [];
        const total = Array.isArray(entries) ? entries.reduce((s: number, v: any) => s + (Number(v.amount) || 0), 0) : 0;
        setUpadTotal(total);
      } catch { setUpadTotal(0); }
      // Loan (use Contract Salary schema)
      try {
        const loanDataRes = await (apiService as any).getEmployeeLoanData(selectedEmployeeId);
        const payload = (loanDataRes as any).data || {};
        const loans = Array.isArray(payload.loans) ? payload.loans : [];
        const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];
        const stats = payload.stats || {};

        const emiForMonth = loans.reduce((sum: number, l: any) => {
          if (l.status !== 'active') return sum;
          const started = (Number(year) > Number(l.startYear)) || (Number(year) === Number(l.startYear) && Number(month) >= Number(l.startMonth));
          if (!started) return sum;
          const txForLoanThisMonth = transactions.filter((t: any) => String(t.loan) === String(l._id) && Number(t.month) === month && Number(t.year) === year);
          const hasManual = txForLoanThisMonth.some((t: any) => (t.mode || 'salary-deduction') === 'manual-payment');
          if (hasManual) return sum + 0;
          if (txForLoanThisMonth.length > 0) {
            return sum + txForLoanThisMonth.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
          }
          return sum + (Number(l.defaultInstallment) || 0);
        }, 0);
        setLoanInstallment(emiForMonth);

        const pendingTotal = loans.reduce((acc: number, l: any) => {
          if (l.status !== 'active') return acc;
          const started = (Number(year) > Number(l.startYear)) || (Number(year) === Number(l.startYear) && Number(month) >= Number(l.startMonth));
          if (!started) return acc;
          let pending = stats[String(l._id)]?.pendingAmount;
          if (typeof pending !== 'number') pending = 0;
          const txForLoanThisMonth = transactions.filter((t: any) => String(t.loan) === String(l._id) && Number(t.month) === month && Number(t.year) === year);
          const hasManual = txForLoanThisMonth.some((t: any) => (t.mode || 'salary-deduction') === 'manual-payment');
          const salarySum = txForLoanThisMonth
            .filter((t: any) => (t.mode || 'salary-deduction') === 'salary-deduction')
            .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
          if (salarySum > 0) {
            // keep backend pending as-is
          } else if (hasManual) {
            // manual waives EMI; principal unchanged
            pending = Math.max(0, pending);
          } else {
            // auto-deduction for the month
            pending = Math.max(0, pending - (Number(l.defaultInstallment) || 0));
          }
          return acc + pending;
        }, 0);
        setPendingLoan(pendingTotal || 0);
      } catch { setLoanInstallment(0); setPendingLoan(0); }
      // Overtime is already fetched via effect on selection/month change
      if (!found) toast.info('No attendance recorded for this employee in selected month (showing 0 days)');
      buildExport(year, month);
      setSearched(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load salary');
    } finally { setLoading(false); }
  }

  const presentDays = attendanceSummary?.presentDays || 0;
  const rate = selectedEmployee?.dailyRojRate || 0;
  const basic = presentDays * rate;
  const overtimeHours = overtimeTotalHours;
  const overtimeRate = overtimeRateDefault || rate / 8 || 0;
  const overtimeAmount = overtimeHours * overtimeRate;
  const netAmount = (basic + overtimeAmount) - upadTotal - loanInstallment;

  function buildExport(year: number, month: number) {
    if (!selectedEmployee) { setExportInfo(null); return; }
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    const html = `\n<html><head><meta charset="UTF-8"></head><body>\n<h2>Salary Summary (Daily Roj) - ${selectedEmployee.name}</h2>\n<div style="color:#666;margin-bottom:8px;">${monthName} ${year}</div>\n<table border="0" style="border-collapse:collapse;font-family:Arial;font-size:13px;">\n<thead>\n<tr>\n  <th style="padding:6px;border-bottom:1px solid #ccc;">Present Days</th>\n  <th style="padding:6px;border-bottom:1px solid #ccc;">Roj Rate</th>\n  <th style="padding:6px;border-bottom:1px solid #ccc;">Basic</th>\n  <th style="padding:6px;border-bottom:1px solid #ccc;">Overtime Hours</th>\n  <th style="padding:6px;border-bottom:1px solid #ccc;">Overtime Rate</th>\n  <th style="padding:6px;border-bottom:1px solid #ccc;">Overtime Amount</th>\n  <th style="padding:6px;border-bottom:1px solid #ccc;">Upad</th>\n  <th style="padding:6px;border-bottom:1px solid #ccc;">Pend. Loan</th>\n  <th style="padding:6px;border-bottom:1px solid #ccc;">Loan Installment</th>\n  <th style="padding:6px;border-bottom:1px solid #ccc;">Net Amount</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n  <td style="padding:6px;text-align:center;">${presentDays}</td>\n  <td style="padding:6px;text-align:center;">₹${rate.toFixed(2)}</td>\n  <td style="padding:6px;text-align:center;">₹${basic.toFixed(2)}</td>\n  <td style="padding:6px;text-align:center;">${overtimeHours}</td>\n  <td style="padding:6px;text-align:center;">₹${overtimeRate.toFixed(2)}</td>\n  <td style="padding:6px;text-align:center;">₹${overtimeAmount.toFixed(2)}</td>\n  <td style="padding:6px;text-align:center;">₹${upadTotal.toFixed(2)}</td>\n  <td style="padding:6px;text-align:center;">₹${pendingLoan.toFixed(2)}</td>\n  <td style="padding:6px;text-align:center;">₹${loanInstallment.toFixed(2)}</td>\n  <td style="padding:6px;text-align:center;font-weight:600;">₹${netAmount.toFixed(2)}</td>\n</tr>\n</tbody>\n</table>\n</body></html>`;
    const filename = `${selectedEmployee.name.replace(/\s+/g,'_')}_${year}_${month}_roj_salary.xls`;
    setExportInfo({ html: '\uFEFF' + html, filename });
  }

  function handleExcel(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!exportInfo) return;
    const blob = new Blob([exportInfo.html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    e.currentTarget.href = url;
    e.currentTarget.download = exportInfo.filename;
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} }, 20000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Salary (Roj)</h2>
        <p className="text-sm text-muted-foreground">Daily Roj employee salary based on attendance</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Search Criteria</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Employee (Daily Roj)</label>
              {!selectedEmployeeId ? (
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    disabled={loadingEmployees}
                    onClick={() => setShowEmployeeList(v => !v)}
                  >
                    {loadingEmployees ? 'Loading...' : 'Select employee'}
                  </Button>
                  {showEmployeeList && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded shadow max-h-60 overflow-y-auto">
                      {employees.map(emp => (
                        <button
                          key={getId(emp)}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-accent"
                          onClick={() => {
                            setSelectedEmployeeId(getId(emp));
                            setSelectedEmployeeName(emp.name);
                            setShowEmployeeList(false);
                          }}
                        >
                          {emp.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 bg-primary/10 rounded border">
                  <span className="text-sm font-medium">{selectedEmployeeName}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSelectedEmployeeId('');
                      setSelectedEmployeeName('');
                      setAttendanceSummary(null);
                      setExportInfo(null);
                    }}
                  >✕</button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Month & Year</label>
              <input
                type="month"
                className="w-full px-3 py-2 rounded border bg-background"
                value={monthYear}
                onChange={e => setMonthYear(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleSearch} disabled={loading || !selectedEmployeeId}>
              <Search className="w-4 h-4 mr-2" />
              {loading ? 'Loading...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overtime detailed table removed to avoid duplication; kept summary columns in Salary Report */}

      {(selectedEmployee && searched) && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-lg">Salary Report - {selectedEmployee.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{new Date(monthYear + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
              </div>
              <a
                href="#"
                onClick={handleExcel}
                className="inline-flex items-center px-3 py-2 border rounded text-sm hover:bg-accent/5"
              >
                <Download className="w-4 h-4 mr-2" /> Excel
              </a>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Present Days</TableHead>
                    <TableHead className="text-center">Roj Rate</TableHead>
                    <TableHead className="text-center">Basic</TableHead>
                    <TableHead className="text-center">Overtime Hours</TableHead>
                    <TableHead className="text-center">Overtime Rate</TableHead>
                    <TableHead className="text-center">Overtime Amount</TableHead>
                    <TableHead className="text-center">Upad</TableHead>
                    <TableHead className="text-center">Pend. Loan</TableHead>
                    <TableHead className="text-center">Loan Installment</TableHead>
                    <TableHead className="text-center">Net Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-center font-semibold">{presentDays}</TableCell>
                    <TableCell className="text-center">₹{rate.toFixed(2)}</TableCell>
                    <TableCell className="text-center">₹{basic.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{overtimeHours}</TableCell>
                    <TableCell className="text-center">₹{overtimeRate.toFixed(2)}</TableCell>
                    <TableCell className="text-center">₹{overtimeAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-center">₹{upadTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-center">₹{pendingLoan.toFixed(2)}</TableCell>
                    <TableCell className="text-center">₹{loanInstallment.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-bold">₹{netAmount.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
