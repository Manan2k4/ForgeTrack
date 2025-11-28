import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Download, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Employee {
  _id: string;
  name: string;
  username: string;
  department: string;
}

interface DailyLog {
  date: string;
  logs: Array<{
    jobName: string;
    partType: string;
    totalParts: number;
    rejection: number;
    okParts: number;
    rate: number;
    amount: number;
    code: string;
    partName: string;
  }>;
  dayTotal: number;
}

interface SalaryData {
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  dailyLogs: DailyLog[];
  monthTotal: number;
}

export function EmployeeSalary() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const [monthYear, setMonthYear] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [upadTotal, setUpadTotal] = useState(0);
  const [loanInstallmentTotal, setLoanInstallmentTotal] = useState(0);
  const [pendingLoanTotal, setPendingLoanTotal] = useState(0);
  const [waivedLoans, setWaivedLoans] = useState<string[]>([]);
  const [exportUrl, setExportUrl] = useState<string>('');
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await apiService.getEmployees({ includeInactive: false });
      if (response.success && response.data) {
        console.log('Raw API response:', response.data);
        console.log('First employee:', response.data[0]);
        console.log('Keys of first employee:', response.data[0] ? Object.keys(response.data[0]) : 'no employees');
        setEmployees(response.data);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to load employees');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleSearch = async () => {
    if (!selectedEmployeeId) {
      toast.error('Please select an employee');
      return;
    }

    if (!monthYear) {
      toast.error('Please select month and year');
      return;
    }

    const [year, month] = monthYear.split('-').map(Number);
    
    console.log('Search params:', { selectedEmployeeId, month, year, monthYear });

    try {
      setLoading(true);
      const response = await apiService.getEmployeeSalary(selectedEmployeeId, month, year);
      if (response.success && response.data) {
        setSalaryData(response.data);

        if (response.data.dailyLogs.length === 0) {
          toast.info('No work logs found for selected period');
        }

        // Fetch Upad total for this employee & month
        try {
          const upadRes = await apiService.listUpad({ employeeId: selectedEmployeeId, month, year });
          const upadEntries = (upadRes as any).data || [];
          const upadSum = Array.isArray(upadEntries)
            ? upadEntries.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0)
            : 0;
          setUpadTotal(upadSum);
        } catch (e: any) {
          console.error('Failed to load Upad for salary view', e);
          setUpadTotal(0);
        }

        // Fetch loan info using aggregated endpoint: prefer recorded transactions for the selected month
        try {
          const loanDataRes = await apiService.getEmployeeLoanData(selectedEmployeeId);
          const payload = (loanDataRes as any).data || {};
          const loans = Array.isArray(payload.loans) ? payload.loans : [];
          const transactions = Array.isArray(payload.transactions) ? payload.transactions : [];
          const stats = payload.stats || {};

          // For each active loan, if there are transactions recorded for the selected month/year, use their sum for that month; otherwise use defaultInstallment
          const emiForMonth = loans.reduce((sum: number, l: any) => {
            if (l.status !== 'active') return sum;
            // Only consider loans that have started by the selected month/year
            const started = (Number(year) > Number(l.startYear)) || (Number(year) === Number(l.startYear) && Number(month) >= Number(l.startMonth));
            if (!started) return sum;
            const txForLoanThisMonth = transactions.filter((t: any) => String(t.loan) === String(l._id) && Number(t.month) === month && Number(t.year) === year);

            // If any manual payment exists for this loan in the selected month,
            // nullify the EMI for that loan (treat as 0 for the salary report).
            const hasManual = txForLoanThisMonth.some((t: any) => (t.mode || 'salary-deduction') === 'manual-payment');
            if (hasManual) return sum + 0;

            if (txForLoanThisMonth.length > 0) {
              return sum + txForLoanThisMonth.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
            }
            return sum + (Number(l.defaultInstallment) || 0);
          }, 0);

          setLoanInstallmentTotal(emiForMonth);

          // Track loans which have a manual payment recorded for this month so we can show an EMI-waived indicator
          const waived = loans.reduce((acc: string[], l: any) => {
            if (l.status !== 'active') return acc;
            const started = (Number(year) > Number(l.startYear)) || (Number(year) === Number(l.startYear) && Number(month) >= Number(l.startMonth));
            if (!started) return acc;
            const txForLoanThisMonth = transactions.filter((t: any) => String(t.loan) === String(l._id) && Number(t.month) === month && Number(t.year) === year);
            const hasManual = txForLoanThisMonth.some((t: any) => (t.mode || 'salary-deduction') === 'manual-payment');
            if (hasManual) acc.push(String(l._id));
            return acc;
          }, [] as string[]);
          setWaivedLoans(waived);

          // Pending loan total (rules):
          // - If salary-deduction exists for the month: use backend pending as-is (actual deduction).
          // - If ONLY manual-payment exists: manual waives salary deduction; principal unchanged (leave pending as-is).
          // - If no transactions exist: subtract one defaultInstallment (auto-deduction).
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
          setPendingLoanTotal(pendingTotal || 0);
        } catch (e: any) {
          console.error('Failed to load loan data for salary view', e);
          setLoanInstallmentTotal(0);
          setPendingLoanTotal(0);
          setWaivedLoans([]);
        }

      } // end if(response.success && response.data)
    } catch (err: any) {
      console.error('Failed to load salary data', err);
      toast.error(err?.message || 'Failed to load salary data');
    } finally {
      setLoading(false);
    }
  };

  // Helper that builds the HTML and filename synchronously so an anchor click can use it
  const buildExportHtmlAndFilename = () => {
    if (!salaryData) return null as any;
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const periodLabel = `${months[salaryData.month - 1] || ''} ${salaryData.year}`;

    // Determine job columns and compute month totals
    const jobColumns: string[] = [];
    const jobLabelMap: Record<string, string> = {} as any;
    const qtyTotals: Record<string, number> = {};
    const rateByJob: Record<string, number> = {};

    salaryData.dailyLogs.forEach((day) => {
      day.logs.forEach((log) => {
        const key = `${log.jobName}|${log.partType}`;
        if (!jobColumns.includes(key)) {
          jobColumns.push(key);
          jobLabelMap[key] = `${log.jobName} (${log.partType})`;
        }
        qtyTotals[key] = (qtyTotals[key] || 0) + (log.okParts || 0);
        // Prefer the latest non-zero rate seen
        if (typeof log.rate === 'number' && log.rate > 0) rateByJob[key] = log.rate;
      });
    });
    jobColumns.sort((a,b) => jobLabelMap[a].localeCompare(jobLabelMap[b]));

    // Build a compact summary table: job-type columns + monetary summary columns (no leading metric column)
    let table = `<table border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:13px;width:100%;">`;
    // Header row: job type columns
    table += `<thead><tr>`;
    jobColumns.forEach((k) => {
      table += `<th style="text-align:center;padding:8px;border-bottom:1px solid #ddd;">${jobLabelMap[k]}</th>`;
    });
    const extraHeaders = ['Basic','Upad','Pend. Loan','Loan Installment','Net Amount'];
    extraHeaders.forEach((h) => {
      table += `<th style=\"text-align:center;padding:8px;border-bottom:1px solid #ddd;\">${h}</th>`;
    });
    table += `</tr></thead><tbody>`;

    // Qty (total OKParts for month)
    table += `<tr>`;
    jobColumns.forEach((k) => {
      const q = qtyTotals[k] || 0;
      table += `<td style="text-align:center;padding:8px;font-weight:600;">${q ? q.toFixed(3) : ''}</td>`;
    });
    extraHeaders.forEach(() => { table += `<td style=\"text-align:center;padding:8px;\"></td>`; });
    table += `</tr>`;

    // Rate row
    table += `<tr>`;
    jobColumns.forEach((k) => {
      const r = rateByJob[k] || 0;
      table += `<td style="text-align:center;padding:8px;">${r ? `₹${r.toFixed(2)}` : ''}</td>`;
    });
    extraHeaders.forEach(() => { table += `<td style=\"text-align:center;padding:8px;\"></td>`; });
    table += `</tr>`;

    // Amount row (qty * rate)
    table += `<tr>`;
    let grandAmount = 0;
    jobColumns.forEach((k) => {
      const q = qtyTotals[k] || 0;
      const r = rateByJob[k] || 0;
      const amt = q * r;
      grandAmount += amt;
      table += `<td style="text-align:center;padding:8px;">${amt ? `₹${amt.toFixed(2)}` : ''}</td>`;
    });
    const basic = salaryData.monthTotal || 0;
    const upad = (typeof (window as any) !== 'undefined' ? (typeof (upadTotal) === 'number' ? upadTotal : 0) : 0);
    const loanInstallment = (typeof (window as any) !== 'undefined' ? (typeof (loanInstallmentTotal) === 'number' ? loanInstallmentTotal : 0) : 0);
    const pendingLoan = (typeof (window as any) !== 'undefined' ? (typeof (pendingLoanTotal) === 'number' ? pendingLoanTotal : 0) : 0);
    const netAmount = basic - upad - loanInstallment;
    table += `<td style=\"text-align:center;padding:8px;\">₹${basic.toFixed(2)}</td>`;
    table += `<td style=\"text-align:center;padding:8px;\">₹${upad.toFixed(2)}</td>`;
    table += `<td style=\"text-align:center;padding:8px;\">₹${pendingLoan.toFixed(2)}</td>`;
    table += `<td style=\"text-align:center;padding:8px;\">₹${loanInstallment.toFixed(2)}</td>`;
    table += `<td style=\"text-align:center;padding:8px;font-weight:700;\">₹${netAmount.toFixed(2)}</td>`;
    table += `</tr>`;

    table += `</tbody></table>`;

    const html = `<html><head><meta charset="UTF-8"></head><body><h2>Salary Summary - ${salaryData.employeeName}</h2><div style="color:#666;margin-bottom:8px;">${periodLabel}</div>${table}</body></html>`;

    // Prepend BOM to help Excel detect UTF-8 and render rupee symbol correctly
    const bom = '\uFEFF';
    const filename = `${salaryData.employeeName.replace(/\s+/g, '_')}_${salaryData.month}_${salaryData.year}_salary_summary.xls`;
    return { html: bom + html, filename };
  };

  // Anchor click handler: create blob URL synchronously and assign to clicked anchor so browser performs download as a direct user-initiated navigation
  const handleAnchorExcelClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!salaryData) return;
    const info = buildExportHtmlAndFilename();
    if (!info) return;
    // DEBUG: log the generated HTML and filename so we can confirm runtime uses the new schema
    // Open DevTools Console and click the Excel button to inspect this output.
    // Remove or silence this log once confirmed.
    // eslint-disable-next-line no-console
    console.debug('EXPORT_INFO', { filename: info.filename, htmlPreview: (info.html || '').slice(0, 200) });
    const blob = new Blob([info.html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    try {
      const a = e.currentTarget;
      a.href = downloadUrl;
      // Use the generated filename directly so users can overwrite existing files
      a.download = info.filename;
      // Revoke after a while
      setTimeout(() => { try { URL.revokeObjectURL(downloadUrl); } catch (err) {} }, 30_000);
    } catch (err) {
      console.error('Failed to set anchor download', err);
    }
    // Allow navigation to proceed (user click will navigate to blob URL and trigger download)
  };

  const getMonthName = (m: number) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[m - 1] || '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Employee Salary</h2>
        <p className="text-sm text-muted-foreground mt-1">
          View and download employee salary reports
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Employee
              </label>
              <div className="space-y-2 relative">
                {!selectedEmployeeId ? (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      onClick={() => setShowEmployeeList(!showEmployeeList)}
                      disabled={loadingEmployees}
                    >
                      {loadingEmployees ? 'Loading...' : '-- Select an employee --'}
                    </Button>
                    {showEmployeeList && (
                      <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {employees.map((emp) => {
                          console.log('Rendering button for emp:', emp);
                          const empId = emp._id || (emp as any).id;
                          return (
                            <button
                              key={empId}
                              type="button"
                              className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
                              onClick={() => {
                                console.log('Button clicked - emp object:', emp);
                                console.log('emp._id:', emp._id, 'emp.id:', (emp as any).id);
                                const employeeId = emp._id || (emp as any).id;
                                console.log('Using employeeId:', employeeId);
                                setSelectedEmployeeId(employeeId);
                                setSelectedEmployeeName(`${emp.name} (${emp.department})`);
                                setShowEmployeeList(false);
                                console.log('State updated - ID:', employeeId, 'Name:', emp.name);
                              }}
                            >
                              {emp.name} - {emp.department}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2 bg-primary/10 rounded-md border border-primary/20">
                    <div>
                      <span className="text-sm font-medium text-foreground">{selectedEmployeeName}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedEmployeeId('');
                        setSelectedEmployeeName('');
                        console.log('Selection cleared');
                      }}
                      className="text-muted-foreground hover:text-foreground ml-2"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Month & Year
              </label>
              <input
                type="month"
                value={monthYear}
                onChange={(e) => setMonthYear(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={handleSearch} disabled={loading || !selectedEmployeeId}>
              <Search className="w-4 h-4 mr-2" />
              {loading ? 'Loading...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {salaryData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  Salary Report - {salaryData.employeeName}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {getMonthName(salaryData.month)} {salaryData.year}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex rounded-md border border-border overflow-hidden">
                  <button
                    type="button"
                    className={`px-3 py-2 text-sm ${viewMode === 'summary' ? 'bg-primary/10 text-foreground' : 'bg-background text-muted-foreground'}`}
                    onClick={() => setViewMode('summary')}
                  >
                    Summary
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-2 text-sm ${viewMode === 'detailed' ? 'bg-primary/10 text-foreground' : 'bg-background text-muted-foreground'}`}
                    onClick={() => setViewMode('detailed')}
                  >
                    Detailed
                  </button>
                </div>
                <a
                  onClick={handleAnchorExcelClick}
                  className="inline-flex items-center px-3 py-2 border border-border rounded-md text-sm text-foreground bg-background hover:bg-accent/5 transition-colors"
                  href="#"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </a>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {salaryData.dailyLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No work logs found for selected period
              </p>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const jobColumns: string[] = [];
                  const jobLabelMap: Record<string, string> = {};

                  salaryData.dailyLogs.forEach((day) => {
                    day.logs.forEach((log) => {
                      const key = `${log.jobName}|${log.partType}`;
                      if (!jobColumns.includes(key)) {
                        jobColumns.push(key);
                        const label = `${log.jobName} (${log.partType})`;
                        jobLabelMap[key] = label;
                      }
                    });
                  });

                  jobColumns.sort((a, b) => jobLabelMap[a].localeCompare(jobLabelMap[b]));

                  const qtyTotals: Record<string, number> = {};
                  const rateByJob: Record<string, number> = {};
                  const amountByJob: Record<string, number> = {};

                  salaryData.dailyLogs.forEach((day) => {
                    day.logs.forEach((log) => {
                      const key = `${log.jobName}|${log.partType}`;
                      qtyTotals[key] = (qtyTotals[key] || 0) + log.okParts;
                      rateByJob[key] = log.rate;
                      amountByJob[key] = (amountByJob[key] || 0) + log.amount;
                    });
                  });

                  const basic = salaryData.monthTotal;
                  const upad = upadTotal;
                  const pendingLoan = pendingLoanTotal;
                  const loanInstallment = loanInstallmentTotal;
                  const netAmount = basic - upad - loanInstallment;
                  // Grand amount across all job columns for the month (for Day Total column in totals row)
                  const grandAmount = Object.values(amountByJob).reduce((s, v) => s + (v || 0), 0);

                  if (viewMode === 'summary') {
                    // Summary layout: columns are job types; rows are Qty, Rate, Amount; footer shows salary summary
                    const grandAmount = Object.values(amountByJob).reduce((s, v) => s + (v || 0), 0);
                    const extraHeaders = ['Basic', 'Upad', 'Pend. Loan', 'Loan Installment', 'Net Amount'];
                    return (
                      <div key="salary-summary" className="border border-border rounded-lg p-4">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {jobColumns.map((key) => (
                                  <TableHead key={key} className="text-center">
                                    {jobLabelMap[key]}
                                  </TableHead>
                                ))}
                                {extraHeaders.map((h) => (
                                  <TableHead key={h} className="text-center">{h}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow className="bg-muted/50 font-semibold">
                                {jobColumns.map((key) => (
                                  <TableCell key={key} className="text-center">{qtyTotals[key] ? qtyTotals[key].toFixed(3) : ''}</TableCell>
                                ))}
                                {extraHeaders.map((h) => (<TableCell key={`qty-${h}`} className="text-center"></TableCell>))}
                              </TableRow>
                              <TableRow className="font-semibold">
                                {jobColumns.map((key) => (
                                  <TableCell key={key} className="text-center">{rateByJob[key] ? `₹${rateByJob[key].toFixed(2)}` : ''}</TableCell>
                                ))}
                                {extraHeaders.map((h) => (<TableCell key={`rate-${h}`} className="text-center"></TableCell>))}
                              </TableRow>
                              <TableRow className="font-semibold">
                                {jobColumns.map((key) => (
                                  <TableCell key={key} className="text-center">{amountByJob[key] ? `₹${amountByJob[key].toFixed(2)}` : ''}</TableCell>
                                ))}
                                {/* Monetary summary columns */}
                                <TableCell className="text-center">₹{basic.toFixed(2)}</TableCell>
                                <TableCell className="text-center">₹{upad.toFixed(2)}</TableCell>
                                <TableCell className="text-center">₹{pendingLoan.toFixed(2)}</TableCell>
                                <TableCell className="text-center">₹{loanInstallment.toFixed(2)}</TableCell>
                                <TableCell className="text-center font-bold">₹{netAmount.toFixed(2)}</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                        {waivedLoans.length > 0 && (
                          <div className="mt-2 text-sm text-emerald-700 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" clipRule="evenodd" />
                            </svg>
                            <span>Manual payment recorded — EMI waived for {waivedLoans.length} loan{waivedLoans.length > 1 ? 's' : ''}.</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Detailed view (existing)
                  const rows = salaryData.dailyLogs.map((day) => {
                    const dateObj = new Date(day.date);
                    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
                    const qtyByJob: Record<string, number> = {};
                    day.logs.forEach((log) => {
                      const key = `${log.jobName}|${log.partType}`;
                      qtyByJob[key] = (qtyByJob[key] || 0) + log.okParts;
                    });
                    return { date: formattedDate, qtyByJob, dayTotal: day.dayTotal };
                  });

                  return (
                    <div key="salary-detailed" className="border border-border rounded-lg p-4">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-center">Date</TableHead>
                              {jobColumns.map((key) => (
                                <TableHead key={key} className="text-center">
                                  {jobLabelMap[key]}
                                </TableHead>
                              ))}
                              <TableHead className="text-center">Day Total (₹)</TableHead>
                              <TableHead className="text-center">Basic</TableHead>
                              <TableHead className="text-center">Upad</TableHead>
                              <TableHead className="text-center">Pend. Loan</TableHead>
                              <TableHead className="text-center">Loan Installment</TableHead>
                              <TableHead className="text-center">Net Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((row, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="text-center">{row.date}</TableCell>
                                {jobColumns.map((key) => (
                                  <TableCell key={key} className="text-center">{row.qtyByJob[key] ? row.qtyByJob[key].toFixed(3) : ''}</TableCell>
                                ))}
                                <TableCell className="text-center font-semibold">₹{row.dayTotal.toFixed(2)}</TableCell>
                                {/* Monthly totals are not per-day; leave empty in daily rows */}
                                <TableCell className="text-center"></TableCell>
                                <TableCell className="text-center"></TableCell>
                                <TableCell className="text-center"></TableCell>
                                <TableCell className="text-center"></TableCell>
                                <TableCell className="text-center"></TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted font-semibold">
                              <TableCell className="whitespace-nowrap text-center">Qty Work</TableCell>
                              {jobColumns.map((key) => (
                                <TableCell key={key} className="text-center">{qtyTotals[key] ? qtyTotals[key].toFixed(3) : ''}</TableCell>
                              ))}
                              <TableCell />
                              <TableCell />
                              <TableCell />
                              <TableCell />
                              <TableCell />
                              <TableCell />
                            </TableRow>
                            <TableRow className="font-semibold">
                              <TableCell className="whitespace-nowrap text-center">Rate</TableCell>
                              {jobColumns.map((key) => (
                                <TableCell key={key} className="text-center">{rateByJob[key] ? `₹${rateByJob[key].toFixed(2)}` : ''}</TableCell>
                              ))}
                              <TableCell />
                              <TableCell />
                              <TableCell />
                              <TableCell />
                              <TableCell />
                              <TableCell />
                            </TableRow>
                            <TableRow className="font-semibold">
                              <TableCell className="whitespace-nowrap text-center">Amount</TableCell>
                              {jobColumns.map((key) => (
                                <TableCell key={key} className="text-center">{amountByJob[key] ? `₹${amountByJob[key].toFixed(2)}` : ''}</TableCell>
                              ))}
                              {/* Day Total (₹) for the entire month */}
                              <TableCell className="text-center font-bold">₹{grandAmount.toFixed(2)}</TableCell>
                              {/* Monetary summary columns aligned with their headers */}
                              <TableCell className="text-center">₹{basic.toFixed(2)}</TableCell>
                              <TableCell className="text-center">₹{upad.toFixed(2)}</TableCell>
                              <TableCell className="text-center">₹{pendingLoan.toFixed(2)}</TableCell>
                              <TableCell className="text-center">₹{loanInstallment.toFixed(2)}</TableCell>
                              <TableCell className="text-center font-bold">₹{netAmount.toFixed(2)}</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                      {waivedLoans.length > 0 && (
                        <div className="mt-2 text-sm text-emerald-700 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" clipRule="evenodd" /></svg>
                          <span>Manual payment recorded — EMI waived for {waivedLoans.length} loan{waivedLoans.length > 1 ? 's' : ''}.</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


