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
            const txForLoanThisMonth = transactions.filter((t: any) => String(t.loan) === String(l._id) && Number(t.month) === month && Number(t.year) === year);

            // If any manual payment exists for this loan in the selected month,
            // nullify the EMI for that loan (treat as 0 for the salary report).
            const hasManual = txForLoanThisMonth.some((t: any) => (t.mode || 'salary-deduction') === 'manual-payment');
            if (hasManual) {
              return sum + 0;
            }

            if (txForLoanThisMonth.length > 0) {
              return sum + txForLoanThisMonth.reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);
            }
            return sum + (Number(l.defaultInstallment) || 0);
          }, 0);

          setLoanInstallmentTotal(emiForMonth);

          // Track loans which have a manual payment recorded for this month so we can show an EMI-waived indicator
          const waived = loans.reduce((acc: string[], l: any) => {
            if (l.status !== 'active') return acc;
            const txForLoanThisMonth = transactions.filter((t: any) => String(t.loan) === String(l._id) && Number(t.month) === month && Number(t.year) === year);
            const hasManual = txForLoanThisMonth.some((t: any) => (t.mode || 'salary-deduction') === 'manual-payment');
            if (hasManual) acc.push(String(l._id));
            return acc;
          }, [] as string[]);
          setWaivedLoans(waived);

          // Pending loan total: sum pendingAmount for active loans from stats (fallback to 0)
          const pendingTotal = loans.reduce((acc: number, l: any) => {
            if (l.status !== 'active') return acc;
            const s = stats[String(l._id)]?.pendingAmount;
            return acc + (typeof s === 'number' ? s : 0);
          }, 0);
          setPendingLoanTotal(pendingTotal || 0);
        } catch (e: any) {
          console.error('Failed to load Loan info for salary view', e);
          setLoanInstallmentTotal(0);
          setPendingLoanTotal(0);
          setWaivedLoans([]);
        }
      } else {
        setSalaryData(null);
        setUpadTotal(0);
        setLoanInstallmentTotal(0);
        setPendingLoanTotal(0);
      }
    } catch (error: any) {
      console.error('Salary fetch error:', error);
      toast.error(error.message || 'Failed to fetch salary data');
      setSalaryData(null);
    } finally {
      setLoading(false);
    }
  };

  // CSV export removed per design request; keep only Excel export matching the report layout

  const downloadExcel = async () => {
    if (!salaryData) return;
    // Build HTML with two-column layout: left = detailed table, right = vertical summary
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const periodLabel = `${months[salaryData.month - 1] || ''} ${salaryData.year}`;

    // Build main table HTML (left column)
    let leftTable = `
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>
            <th style="border-bottom:1px solid #ddd;padding:8px;text-align:left;">Date</th>
            <th style="border-bottom:1px solid #ddd;padding:8px;text-align:center;">${''}</th>
            <th style="border-bottom:1px solid #ddd;padding:8px;text-align:right;">Day Total (₹)</th>
          </tr>
        </thead>
        <tbody>
    `;

    // Determine jobColumns like the UI does
    const jobColumns: string[] = [];
    const jobLabelMap: Record<string, string> = {} as any;
    salaryData.dailyLogs.forEach((day) => {
      day.logs.forEach((log) => {
        const key = `${log.jobName}|${log.partType}`;
        if (!jobColumns.includes(key)) {
          jobColumns.push(key);
          jobLabelMap[key] = `${log.jobName} (${log.partType})`;
        }
      });
    });
    jobColumns.sort((a,b) => jobLabelMap[a].localeCompare(jobLabelMap[b]));

    // Header with dynamic job columns (we will only include the first job column header cell to match screenshot)
    leftTable = `
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>
            <th style="border-bottom:1px solid #ddd;padding:8px;text-align:left;">Date</th>
            <th style="border-bottom:1px solid #ddd;padding:8px;text-align:center;">${jobColumns.length > 0 ? jobLabelMap[jobColumns[0]] : ''}</th>
            <th style="border-bottom:1px solid #ddd;padding:8px;text-align:right;">Day Total (₹)</th>
          </tr>
        </thead>
        <tbody>
    `;

    // Compute column text lengths and build rows
    let maxDateLen = 0;
    let maxJobLen = 0;
    let maxTotalLen = 0;

    const rowsHtml: string[] = [];
    salaryData.dailyLogs.forEach((day) => {
      const dateObj = new Date(day.date);
      const formattedDate = `${String(dateObj.getDate()).padStart(2,'0')}/${String(dateObj.getMonth()+1).padStart(2,'0')}/${dateObj.getFullYear()}`;
      maxDateLen = Math.max(maxDateLen, formattedDate.length);

      // find qty for first job column
      let firstQty = '';
      if (jobColumns.length > 0) {
        const key = jobColumns[0];
        const qty = day.logs.reduce((acc, log) => {
          const k = `${log.jobName}|${log.partType}`;
          if (k === key) return acc + (log.okParts || 0);
          return acc;
        }, 0);
        firstQty = qty ? qty.toFixed(3) : '';
      }
      maxJobLen = Math.max(maxJobLen, (jobColumns.length > 0 ? (jobLabelMap[jobColumns[0]] || '').length : 0), firstQty.length);

      const totalText = `₹${day.dayTotal.toFixed(2)}`;
      maxTotalLen = Math.max(maxTotalLen, totalText.length);

      rowsHtml.push(`<tr style="height:28px;"><td style="padding:12px;border-bottom:1px solid #eee;">${formattedDate}</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:center;">${firstQty}</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">${totalText}</td></tr>`);
    });

    // Estimate pixel widths from character counts (approximate). Add padding.
    // Use slightly larger char width and minimums so exported table has more breathing room
    const charPx = 9; // approximate average char width used for layout
    const dateWidth = Math.min(400, Math.max(120, Math.ceil(maxDateLen * charPx + 40)));
    const jobWidth = Math.min(800, Math.max(140, Math.ceil(maxJobLen * charPx + 40)));
    const totalWidth = Math.min(260, Math.max(120, Math.ceil(maxTotalLen * charPx + 40)));

    const colgroup = `<colgroup><col style="width:${dateWidth}px;"/><col style="width:${jobWidth}px;"/><col style="width:${totalWidth}px;"/></colgroup>`;

    // Insert colgroup into table header with more spacious styling
    leftTable = `
      <table style="border-collapse:separate;border-spacing:0 8px;width:100%;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45;">
        ${colgroup}
        <thead>
          <tr>
            <th style="background:#fafafa;border-bottom:1px solid #ddd;padding:12px 12px 10px 12px;text-align:left;font-weight:600;">Date</th>
            <th style="background:#fafafa;border-bottom:1px solid #ddd;padding:12px;text-align:center;font-weight:600;">${jobColumns.length > 0 ? jobLabelMap[jobColumns[0]] : ''}</th>
            <th style="background:#fafafa;border-bottom:1px solid #ddd;padding:12px;text-align:right;font-weight:600;">Day Total (₹)</th>
          </tr>
        </thead>
        <tbody>
    `;

    leftTable += rowsHtml.join('');

    // Qty Work & Rate & Amount rows (aggregate)
    const qtyTotals: Record<string, number> = {};
    const rateByJob: Record<string, number> = {};
    const amountByJob: Record<string, number> = {};
    salaryData.dailyLogs.forEach((day) => {
      day.logs.forEach((log) => {
        const key = `${log.jobName}|${log.partType}`;
        qtyTotals[key] = (qtyTotals[key] || 0) + (log.okParts || 0);
        rateByJob[key] = log.rate;
        amountByJob[key] = (amountByJob[key] || 0) + (log.amount || 0);
      });
    });

    const basic = salaryData.monthTotal;

    leftTable += `<tr style="background:#f6f6f6;font-weight:bold;"><td style="padding:12px;">Qty Work</td><td style="padding:12px;text-align:center;">${jobColumns.length>0 && qtyTotals[jobColumns[0]] ? qtyTotals[jobColumns[0]].toFixed(3) : ''}</td><td></td></tr>`;
    leftTable += `<tr style="font-weight:bold;"><td style="padding:12px;">Rate</td><td style="padding:12px;text-align:center;">${jobColumns.length>0 && rateByJob[jobColumns[0]] ? `₹${rateByJob[jobColumns[0]].toFixed(2)}` : ''}</td><td></td></tr>`;
    leftTable += `<tr style="font-weight:bold;"><td style="padding:12px;">Amount</td><td style="padding:12px;text-align:center;">${jobColumns.length>0 && amountByJob[jobColumns[0]] ? `₹${amountByJob[jobColumns[0]].toFixed(2)}` : ''}</td><td style="text-align:right;font-weight:bold;padding:12px;">₹${basic.toFixed(2)}</td></tr>`;

    leftTable += `</tbody></table>`;

    // Right column: vertical summary
    const upad = upadTotal;
    const pendingLoan = pendingLoanTotal;
    const loanInstallment = loanInstallmentTotal;

    let rightHtml = `
      <div style="padding-left:16px;">
        <div style="margin-bottom:8px;"><strong>Basic</strong><div>₹${basic.toFixed(2)}</div></div>
        <div style="margin-bottom:8px;"><strong>Upad</strong><div>₹${upad.toFixed(2)}</div></div>
        <div style="margin-bottom:8px;"><strong>Pend. Loan</strong><div>₹${pendingLoan.toFixed(2)}</div></div>
        <div style="margin-bottom:8px;"><strong>Loan Installment</strong><div>₹${loanInstallment.toFixed(2)}</div></div>
    `;

    if (waivedLoans.length > 0) {
      rightHtml += `<div style="margin-top:6px;color:#097969;">\u2713 Manual payment recorded — EMI waived for ${waivedLoans.length} loan${waivedLoans.length>1?'s':''}.</div>`;
    }

    rightHtml += `<div style="margin-top:16px;border-top:1px solid #ddd;padding-top:8px;"><strong>Net Amount</strong><div style="font-weight:bold;color:#0b6623;">₹${(basic - upad - loanInstallment).toFixed(2)}</div></div>`;
    rightHtml += `</div>`;

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body>
        <h2>Salary Report - ${salaryData.employeeName}</h2>
        <div style="color:#666;margin-bottom:12px;">${periodLabel}</div>
        <div style="display:flex;gap:16px;">
          <div style="flex:1;">${leftTable}</div>
          <div style="width:260px;">${rightHtml}</div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const filename = `${salaryData.employeeName.replace(/\s+/g, '_')}_${salaryData.month}_${salaryData.year}_salary.xls`;

    // Edge/IE fallback
    const nav: any = (window.navigator as any);
    if (nav && typeof nav.msSaveOrOpenBlob === 'function') {
      try { nav.msSaveOrOpenBlob(blob, filename); toast.success('Excel file saved'); } catch (e) { console.error(e); toast.error('Save failed'); }
      return;
    }

    // Client-side blob + visible user-click link to avoid extensions blocking programmatic clicks
    try {
      const downloadUrl = URL.createObjectURL(blob);
      try { setExportUrl(downloadUrl); } catch (e) { /* ignore */ }

      // Keep the URL around for a short period so user can click it. Revoke after 30s.
      setTimeout(() => { try { URL.revokeObjectURL(downloadUrl); setExportUrl(''); } catch (e) {} }, 30_000);

      toast.success('Download ready — click the link next to the Excel button to save the file');
    } catch (e: any) {
      console.error('Client-side export failed', e);
      toast.error(e?.message || 'Export failed — please try again');
    }
  };

  // Helper that builds the HTML and filename synchronously so an anchor click can use it
  const buildExportHtmlAndFilename = () => {
    if (!salaryData) return null as any;
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const periodLabel = `${months[salaryData.month - 1] || ''} ${salaryData.year}`;

    // (Re-use same table building logic as in downloadExcel) -- simplified: reuse downloadExcel's HTML generation by calling it indirectly
    // For brevity, rebuild a compact HTML similar to the existing one.
    // Build leftTable quickly (only first job column shown)
    const jobColumns: string[] = [];
    const jobLabelMap: Record<string, string> = {} as any;
    salaryData.dailyLogs.forEach((day) => {
      day.logs.forEach((log) => {
        const key = `${log.jobName}|${log.partType}`;
        if (!jobColumns.includes(key)) {
          jobColumns.push(key);
          jobLabelMap[key] = `${log.jobName} (${log.partType})`;
        }
      });
    });
    jobColumns.sort((a,b) => jobLabelMap[a].localeCompare(jobLabelMap[b]));

    let leftTable = `<table style="border-collapse:separate;border-spacing:0 8px;width:100%;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45;">`;
    leftTable += `<colgroup><col style="width:140px;"/><col style="width:220px;"/><col style="width:120px;"/></colgroup>`;
    leftTable += `<thead><tr><th style="padding:12px;text-align:left;">Date</th><th style="padding:12px;text-align:center;">${jobColumns.length>0?jobLabelMap[jobColumns[0]]:''}</th><th style="padding:12px;text-align:right;">Day Total (₹)</th></tr></thead><tbody>`;
    salaryData.dailyLogs.forEach((day) => {
      const dateObj = new Date(day.date);
      const formattedDate = `${String(dateObj.getDate()).padStart(2,'0')}/${String(dateObj.getMonth()+1).padStart(2,'0')}/${dateObj.getFullYear()}`;
      let firstQty = '';
      if (jobColumns.length > 0) {
        const key = jobColumns[0];
        const qty = day.logs.reduce((acc, log) => {
          const k = `${log.jobName}|${log.partType}`;
          if (k === key) return acc + (log.okParts || 0);
          return acc;
        }, 0);
        firstQty = qty ? qty.toFixed(3) : '';
      }
      leftTable += `<tr style="height:28px;"><td style="padding:12px;">${formattedDate}</td><td style="padding:12px;text-align:center;">${firstQty}</td><td style="padding:12px;text-align:right;">₹${day.dayTotal.toFixed(2)}</td></tr>`;
    });
    leftTable += `</tbody></table>`;

    const basic = salaryData.monthTotal;
    const upad = upadTotal;
    const pendingLoan = pendingLoanTotal;
    const loanInstallment = loanInstallmentTotal;

    const rightHtml = `<div style="padding-left:16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45;"><div style="margin-bottom:8px;"><strong>Basic</strong><div>₹${basic.toFixed(2)}</div></div><div style="margin-bottom:8px;"><strong>Upad</strong><div>₹${upad.toFixed(2)}</div></div><div style="margin-bottom:8px;"><strong>Pend. Loan</strong><div>₹${pendingLoan.toFixed(2)}</div></div><div style="margin-bottom:8px;"><strong>Loan Installment</strong><div>₹${loanInstallment.toFixed(2)}</div></div>${waivedLoans.length>0?`<div style="margin-top:6px;color:#097969;">\u2713 Manual payment recorded — EMI waived for ${waivedLoans.length} loan${waivedLoans.length>1?'s':''}.</div>`:''}<div style="margin-top:16px;border-top:1px solid #ddd;padding-top:8px;"><strong>Net Amount</strong><div style="font-weight:bold;color:#0b6623;">₹${(basic-upad-loanInstallment).toFixed(2)}</div></div></div>`;

    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><h2>Salary Report - ${salaryData.employeeName}</h2><div style="color:#666;margin-bottom:12px;">${periodLabel}</div><div style="display:flex;gap:16px;"><div style="flex:1;">${leftTable}</div><div style="width:320px;">${rightHtml}</div></div></body></html>`;

    const filename = `${salaryData.employeeName.replace(/\s+/g, '_')}_${salaryData.month}_${salaryData.year}_salary.xls`;
    return { html, filename };
  };

  // Anchor click handler: create blob URL synchronously and assign to clicked anchor so browser performs download as a direct user-initiated navigation
  const handleAnchorExcelClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!salaryData) return;
    const info = buildExportHtmlAndFilename();
    if (!info) return;
    const blob = new Blob([info.html], { type: 'application/vnd.ms-excel' });
    const downloadUrl = URL.createObjectURL(blob);
    try {
      const a = e.currentTarget;
      a.href = downloadUrl;
      // Prevent overwrite issues by generating a unique filename if this name was already downloaded earlier
      const getUniqueFilename = (baseName: string) => {
        try {
          const key = 'ft_downloaded_names_v1';
          const raw = localStorage.getItem(key) || '[]';
          const used: string[] = JSON.parse(raw);
          if (!used.includes(baseName)) {
            used.push(baseName);
            localStorage.setItem(key, JSON.stringify(used));
            return baseName;
          }
          const dot = baseName.lastIndexOf('.');
          const name = dot >= 0 ? baseName.slice(0, dot) : baseName;
          const ext = dot >= 0 ? baseName.slice(dot) : '';
          let i = 1;
          let candidate = `${name} (${i})${ext}`;
          while (used.includes(candidate) && i < 1000) {
            i += 1;
            candidate = `${name} (${i})${ext}`;
          }
          used.push(candidate);
          localStorage.setItem(key, JSON.stringify(used));
          return candidate;
        } catch (err) {
          return baseName;
        }
      };

      const unique = getUniqueFilename(info.filename);
      a.download = unique;
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
              <div className="flex gap-2">
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

                  const rows = salaryData.dailyLogs.map((day) => {
                    const dateObj = new Date(day.date);
                    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

                    const qtyByJob: Record<string, number> = {};
                    day.logs.forEach((log) => {
                      const key = `${log.jobName}|${log.partType}`;
                      qtyByJob[key] = (qtyByJob[key] || 0) + log.okParts;
                    });

                    return {
                      date: formattedDate,
                      qtyByJob,
                      dayTotal: day.dayTotal
                    };
                  });

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

                  return (
                    <div key="salary-layout" className="border border-border rounded-lg p-4">
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
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((row, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="text-center">{row.date}</TableCell>
                                {jobColumns.map((key) => (
                                  <TableCell key={key} className="text-center">
                                    {row.qtyByJob[key] ? row.qtyByJob[key].toFixed(3) : ''}
                                  </TableCell>
                                ))}
                                <TableCell className="text-center font-semibold">
                                  ₹{row.dayTotal.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}

                            <TableRow className="bg-muted font-semibold">
                              <TableCell className="whitespace-nowrap text-center">Qty Work</TableCell>
                              {jobColumns.map((key) => (
                                <TableCell key={key} className="text-center">
                                  {qtyTotals[key] ? qtyTotals[key].toFixed(3) : ''}
                                </TableCell>
                              ))}
                              <TableCell />
                            </TableRow>

                            <TableRow className="font-semibold">
                              <TableCell className="whitespace-nowrap text-center">Rate</TableCell>
                              {jobColumns.map((key) => (
                                <TableCell key={key} className="text-center">
                                  {rateByJob[key] ? `₹${rateByJob[key].toFixed(2)}` : ''}
                                </TableCell>
                              ))}
                              <TableCell />
                            </TableRow>

                            <TableRow className="font-semibold">
                              <TableCell className="whitespace-nowrap text-center">Amount</TableCell>
                              {jobColumns.map((key) => (
                                <TableCell key={key} className="text-center">
                                  {amountByJob[key] ? `₹${amountByJob[key].toFixed(2)}` : ''}
                                </TableCell>
                              ))}
                              <TableCell className="text-center font-bold">
                                ₹{basic.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>

                      <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4 border-t border-border pt-4 text-sm">
                        <div className="md:col-span-2 space-y-1">
                          <div className="flex justify-between">
                            <span className="font-semibold">Basic</span>
                            <span className="font-bold">₹{basic.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold">Upad</span>
                            <span>₹{upad.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold">Pend. Loan</span>
                            <span>₹{pendingLoan.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold">Loan Installment</span>
                            <span>₹{loanInstallment.toFixed(2)}</span>
                          </div>
                          {waivedLoans.length > 0 && (
                            <div className="mt-2 text-sm text-emerald-700 flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" clipRule="evenodd" />
                              </svg>
                              <span>Manual payment recorded — EMI waived for {waivedLoans.length} loan{waivedLoans.length > 1 ? 's' : ''}.</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-border pt-2 mt-2">
                            <span className="font-semibold">Net Amount</span>
                            <span className="font-bold">₹{netAmount.toFixed(2)}</span>
                          </div>
                        </div>

                        
                      </div>
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
