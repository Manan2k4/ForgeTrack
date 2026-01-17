import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';
import { Download, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  _id?: string; // backend may send _id
  id?: string;  // or id
  name: string;
  department?: string;
  employmentType?: string;
  salaryPerDay?: number;
   salaryHistory?: Array<{ rate: number; effectiveFromYear: number; effectiveFromMonth: number }>;
  active?: boolean;
}

interface AttendanceSummaryItem {
  employeeId: string;
  presentDays: number;
}

export function SalaryMonth() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [employeeQuery, setEmployeeQuery] = useState('');

  const [monthYear, setMonthYear] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummaryItem | null>(null);
  const [upadTotal, setUpadTotal] = useState(0);
  const [loanInstallment, setLoanInstallment] = useState(0);
  const [pendingLoan, setPendingLoan] = useState(0);
  const [loading, setLoading] = useState(false);

  const [exportInfo, setExportInfo] = useState<{ html: string; filename: string } | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => { loadEmployees(); }, []);

  async function loadEmployees() {
    try {
      setLoadingEmployees(true);
      const res = await apiService.getEmployees({ includeInactive: false });
      if (res.success && Array.isArray(res.data)) {
        const raw: Employee[] = res.data;
        const normalized = raw.map(r => ({ ...r, employmentType: (r.employmentType || '').toLowerCase() }));
        const monthlySet = new Set(['monthly','month','monthly salary','contract monthly']);
        const filtered = normalized.filter(e => monthlySet.has(e.employmentType || '') && e.active !== false);
        setEmployees(filtered.length ? filtered : raw.filter(e => e.active !== false));
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to load employees');
    } finally {
      setLoadingEmployees(false);
    }
  }

  const getId = (e: Employee) => String(e._id || e.id || '');

  const selectedEmployee = useMemo(
    () => employees.find(e => getId(e) === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  function computeLoanForMonth(
    loans: any[] | undefined,
    transactions: any[] | undefined,
    year: number,
    month: number
  ): { emiForMonth: number; pendingTotal: number } {
    const loanList = Array.isArray(loans) ? loans : [];
    const txList = Array.isArray(transactions) ? transactions : [];
    let emiForMonth = 0;
    let pendingTotal = 0;

    loanList.forEach((l: any) => {
      const principal = Number(l.principal) || 0;
      if (!principal) return;
      const started = (Number(year) > Number(l.startYear)) || (Number(year) === Number(l.startYear) && Number(month) >= Number(l.startMonth));
      if (!started) return;

      const loanTx = txList.filter((t: any) => String(t.loan) === String(l._id));
      const beforeMonthTx = loanTx.filter((t: any) => {
        const ty = Number(t.year); const tm = Number(t.month);
        return ty < year || (ty === year && tm < month);
      });
      const paidBefore = beforeMonthTx.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);

      const thisMonthTx = loanTx.filter((t: any) => Number(t.year) === year && Number(t.month) === month);
      const salaryTx = thisMonthTx.filter((t: any) => (t.mode || 'salary-deduction') === 'salary-deduction');
      const manualTx = thisMonthTx.filter((t: any) => (t.mode || 'salary-deduction') === 'manual-payment');

      let emiForLoan = 0;
      let paidInMonthForPrincipal = 0;

      if (salaryTx.length > 0) {
        const salarySum = salaryTx.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
        const manualSum = manualTx.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
        emiForLoan = salarySum;
        paidInMonthForPrincipal = salarySum + manualSum;
      } else if (manualTx.length > 0) {
        const manualSum = manualTx.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
        emiForLoan = 0; // paid outside salary
        paidInMonthForPrincipal = manualSum;
      } else {
        const defaultInstallment = Number(l.defaultInstallment) || 0;
        const pendingAtStart = Math.max(0, principal - paidBefore);
        if (defaultInstallment > 0 && pendingAtStart > 0) {
          const autoEmi = Math.min(pendingAtStart, defaultInstallment);
          emiForLoan = autoEmi;
          paidInMonthForPrincipal = autoEmi;
        }
      }

      const paidThroughMonth = paidBefore + paidInMonthForPrincipal;
      const pendingAtEnd = Math.max(0, principal - paidThroughMonth);

      emiForMonth += emiForLoan;
      pendingTotal += pendingAtEnd;
    });

    return { emiForMonth, pendingTotal };
  }

  function getRateForMonth(baseRate: number | undefined, history: Array<{ rate: number; effectiveFromYear: number; effectiveFromMonth: number }> | undefined, year: number, month: number): number {
    const fallback = typeof baseRate === 'number' ? baseRate : 0;
    if (!year || !month) return fallback;
    const list = Array.isArray(history) ? history : [];
    if (!list.length) return fallback;
    const target = year * 100 + month;
    const applicable = list
      .filter(h => {
        if (!h) return false;
        const y = Number(h.effectiveFromYear);
        const m = Number(h.effectiveFromMonth);
        if (!y || !m) return false;
        return (y * 100 + m) <= target;
      })
      .sort((a, b) => {
        const av = Number(a.effectiveFromYear) * 100 + Number(a.effectiveFromMonth);
        const bv = Number(b.effectiveFromYear) * 100 + Number(b.effectiveFromMonth);
        return bv - av;
      })[0];
    if (applicable && typeof applicable.rate === 'number') {
      return Number(applicable.rate) || fallback;
    }
    return fallback;
  }

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
      // Upad (compute once and reuse for UI + export)
      let upadTotalForMonth = 0;
      try {
        const upadRes = await apiService.listUpad({ employeeId: selectedEmployeeId, month, year });
        const entries = (upadRes as any).data || [];
        upadTotalForMonth = Array.isArray(entries)
          ? entries.reduce((s: number, v: any) => s + (Number(v.amount) || 0), 0)
          : 0;
        setUpadTotal(upadTotalForMonth);
      } catch {
        upadTotalForMonth = 0;
        setUpadTotal(0);
      }

      // Loan (compute once and reuse for UI + export) using as-of-month logic
      let loanEmiForMonth = 0;
      let pendingLoanForMonth = 0;
      try {
        const loanDataRes = await (apiService as any).getEmployeeLoanData(selectedEmployeeId);
        const payload = (loanDataRes as any).data || {};
        const loans = Array.isArray(payload.loans) ? payload.loans : [];
        const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];

        const result = computeLoanForMonth(loans, transactions, year, month);
        loanEmiForMonth = result.emiForMonth;
        pendingLoanForMonth = result.pendingTotal;
        setLoanInstallment(loanEmiForMonth);
        setPendingLoan(pendingLoanForMonth || 0);
      } catch {
        loanEmiForMonth = 0;
        pendingLoanForMonth = 0;
        setLoanInstallment(0);
        setPendingLoan(0);
      }
      if (!found) toast.info('No attendance recorded for this employee in selected month (showing 0 days)');

      // Build export using the same numbers as the on-screen table
      const exportPresentDays = (found?.presentDays ?? 0);
      const exportRate = getRateForMonth(selectedEmployee?.salaryPerDay, selectedEmployee?.salaryHistory, year, month);
      const exportBasic = exportPresentDays * exportRate;
      const exportUpadTotal = upadTotalForMonth;
      const exportLoanInstallment = loanEmiForMonth;
      const exportPendingLoan = pendingLoanForMonth;
      const exportNetAmount = exportBasic - exportUpadTotal - exportLoanInstallment;
      buildExport(year, month, {
        presentDays: exportPresentDays,
        rate: exportRate,
        basic: exportBasic,
        upadTotal: exportUpadTotal,
        loanInstallment: exportLoanInstallment,
        pendingLoan: exportPendingLoan,
        netAmount: exportNetAmount,
      });
      setSearched(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load salary');
    } finally { setLoading(false); }
  }

  const presentDays = attendanceSummary?.presentDays || 0;
  const [uiYearStr, uiMonthStr] = monthYear.split('-');
  const uiYear = Number(uiYearStr);
  const uiMonth = Number(uiMonthStr);
  const rate = getRateForMonth(selectedEmployee?.salaryPerDay, selectedEmployee?.salaryHistory, uiYear, uiMonth);
  const basic = presentDays * rate;
  const netAmount = basic - upadTotal - loanInstallment;

  interface ExportNumbers {
    presentDays: number;
    rate: number;
    basic: number;
    upadTotal: number;
    loanInstallment: number;
    pendingLoan: number;
    netAmount: number;
  }

  function buildExport(year: number, month: number, numbers: ExportNumbers) {
    if (!selectedEmployee) { setExportInfo(null); return; }
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
    const html = `
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body { margin: 8px; font-family: Arial, sans-serif; font-size: 10pt; }
      table { border-collapse: collapse; width: 100%; max-width: 100%; font-size: 10pt; }
      th, td { padding: 3px 4px; }
      .title-cell { text-align: center; font-size: 16pt; font-weight: bold; }
      .subtitle-cell { text-align: center; font-size: 14pt; font-weight: 600; color: #555; }
      .header-cell { border-bottom: 1px solid #ccc; }
      .center { text-align: center; }
      .net { font-weight: 600; }
      .spacer-row { height: 6px; }
    </style>
  </head>
  <body>
    <table border="0">
      <tr><td colspan="7" class="spacer-row">&nbsp;</td></tr>
      <tr>
        <td colspan="7" class="title-cell">Salary Report - ${selectedEmployee.name}</td>
      </tr>
      <tr>
        <td colspan="7" class="subtitle-cell">${monthName} ${year} (Monthly)</td>
      </tr>
    </table>
    <table border="0">
      <thead>
        <tr>
          <th class="header-cell">Present Days</th>
          <th class="header-cell">Rate / Day</th>
          <th class="header-cell">Basic</th>
          <th class="header-cell">Upad</th>
          <th class="header-cell">Pend. Loan</th>
          <th class="header-cell">Loan EMI</th>
          <th class="header-cell">Net Amt</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="center">${numbers.presentDays}</td>
          <td class="center">Rs ${numbers.rate.toFixed(2)}</td>
          <td class="center">Rs ${numbers.basic.toFixed(2)}</td>
          <td class="center">Rs ${numbers.upadTotal.toFixed(2)}</td>
          <td class="center">Rs ${numbers.pendingLoan.toFixed(2)}</td>
          <td class="center">Rs ${numbers.loanInstallment.toFixed(2)}</td>
          <td class="center net">Rs ${numbers.netAmount.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
    const filename = `${selectedEmployee.name.replace(/\s+/g,'_')}_${year}_${month}_monthly_salary.xls`;
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
        <h2 className="text-2xl font-semibold">Salary (Month)</h2>
        <p className="text-sm text-muted-foreground">Compute monthly salary from attendance</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Search Criteria</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Employee (Monthly)</label>
              {!selectedEmployeeId ? (
                <div className="relative">
                  <input
                    type="text"
                    placeholder={loadingEmployees ? 'Loading employees…' : 'Type to filter employees'}
                    className="w-full px-3 pr-9 py-2 rounded border-2 bg-background"
                    value={employeeQuery}
                    onChange={e => setEmployeeQuery(e.target.value)}
                    onFocus={() => {
                      if (!showEmployeeList) setShowEmployeeList(true);
                    }}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 px-2 flex items-center justify-center border-l border-input bg-background text-muted-foreground hover:text-foreground"
                    disabled={loadingEmployees}
                    onClick={() => setShowEmployeeList(v => !v)}
                  >
                    ▾
                  </button>
                  {showEmployeeList && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded shadow max-h-60 overflow-y-auto">
                      {employees
                        .filter(emp => {
                          const q = employeeQuery.trim().toLowerCase();
                          if (!q) return true;
                          return emp.name.toLowerCase().includes(q);
                        })
                        .map(emp => (
                          <button
                            key={getId(emp)}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-accent"
                            onClick={() => {
                              setSelectedEmployeeId(getId(emp));
                              setSelectedEmployeeName(emp.name);
                              setShowEmployeeList(false);
                              setEmployeeQuery('');
                            }}
                          >
                            {emp.name} {emp.department ? `- ${emp.department}` : ''}
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
                      setEmployeeQuery('');
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
                    <TableHead className="text-center">Rate / Day</TableHead>
                    <TableHead className="text-center">Basic</TableHead>
                    <TableHead className="text-center">Upad</TableHead>
                    <TableHead className="text-center">Pend. Loan</TableHead>
                    <TableHead className="text-center">Loan Installment</TableHead>
                    <TableHead className="text-center">Net Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-center font-semibold">{presentDays}</TableCell>
                    <TableCell className="text-center font-sans">Rs {rate.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-sans">Rs {basic.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-sans">Rs {upadTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-sans">Rs {pendingLoan.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-sans">Rs {loanInstallment.toFixed(2)}</TableCell>
                    <TableCell className="text-center font-bold font-sans">Rs {netAmount.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Note: Overtime is not applicable for Monthly employees in this system. If required later, it will be displayed here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
