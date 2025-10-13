import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { apiService } from '../../services/api';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltipContent } from '../ui/chart';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Download, FileSpreadsheet, FileJson } from 'lucide-react';
import { toast } from 'sonner';

type Stats = {
  totalLogs: number;
  totalParts: number;
  totalRejection: number;
  uniqueEmployeesCount: number;
};

export function Analytics() {
  const [date, setDate] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [workStats, setWorkStats] = useState<Stats | null>(null);
  const [transportStats, setTransportStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dailyData, setDailyData] = useState<Array<{ date: string; totalParts: number; totalRejection: number; okParts: number; count: number }>>([]);
  const [employeeData, setEmployeeData] = useState<Array<{ employeeId: string; employeeName: string; totalParts: number; totalRejection: number; okParts: number; count: number }>>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const hasRange = useMemo(() => Boolean(from || to), [from, to]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const filters: any = {};
      if (date) filters.date = date;
      if (!date && from) filters.from = from;
      if (!date && to) filters.to = to;

      const [wRaw, tRaw, dailyRaw, byEmpRaw] = await Promise.all([
        apiService.getWorkLogStats(filters),
        apiService.getTransporterStats(filters),
        apiService.getWorkLogsDaily(filters),
        apiService.getWorkLogsByEmployee(filters),
      ]);

      const w: any = (wRaw as any)?.data ?? wRaw;
      const t: any = (tRaw as any)?.data ?? tRaw;

      const mapStats = (s: any): Stats => ({
        totalLogs: Number(s?.totalLogs || 0),
        totalParts: Number(s?.totalParts || 0),
        totalRejection: Number(s?.totalRejection || 0),
        uniqueEmployeesCount: Number(s?.uniqueEmployeesCount || 0),
      });

  setWorkStats(mapStats(w));
  setTransportStats(mapStats(t));

  const daily = (dailyRaw as any)?.data ?? dailyRaw ?? [];
  const byEmp = (byEmpRaw as any)?.data ?? byEmpRaw ?? [];
  setDailyData(Array.isArray(daily) ? daily : []);
  setEmployeeData(Array.isArray(byEmp) ? byEmp : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportMenu) {
        setShowExportMenu(false);
      }
    };
    
    if (showExportMenu) {
      document.addEventListener('click', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showExportMenu]);

  const exportToCSV = () => {
    try {
      console.log('Export CSV clicked');
      setShowExportMenu(false);
      if (employeeData.length === 0) {
        toast.error('No employee data to export');
        return;
      }

      console.log('Generating CSV for', employeeData.length, 'employees');
      // Create CSV header
      const headers = ['Employee ID', 'Employee Name', 'Total Parts', 'Total Rejection', 'OK Parts', 'Rejection Rate %', 'Work Logs Count', 'Average Parts/Log'];
      
      // Create CSV rows
      const rows = employeeData.map(emp => {
        const rejectionRate = emp.totalParts > 0 ? ((emp.totalRejection / emp.totalParts) * 100).toFixed(2) : '0.00';
        const avgPartsPerLog = emp.count > 0 ? (emp.totalParts / emp.count).toFixed(2) : '0.00';
        
        return [
          emp.employeeId || 'N/A',
          emp.employeeName || 'Unknown',
          emp.totalParts,
          emp.totalRejection,
          emp.okParts,
          rejectionRate,
          emp.count,
          avgPartsPerLog
        ].map(field => {
          // Escape fields that contain commas or quotes
          const str = String(field);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',');
      });

      // Combine header and rows
      const csv = [headers.join(','), ...rows].join('\n');

      // Create filename with date range
      const dateInfo = date ? `_${date}` : (from || to) ? `_${from || 'start'}_to_${to || 'end'}` : '_all';
      const filename = `employee_progress${dateInfo}.csv`;

      // Download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(`Exported ${employeeData.length} employee records to CSV`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to export CSV');
    }
  };

  const exportToJSON = () => {
    try {
      setShowExportMenu(false);
      if (employeeData.length === 0) {
        toast.error('No employee data to export');
        return;
      }

      // Create enhanced JSON with calculated fields
      const enhancedData = employeeData.map(emp => ({
        employeeId: emp.employeeId || 'N/A',
        employeeName: emp.employeeName || 'Unknown',
        totalParts: emp.totalParts,
        totalRejection: emp.totalRejection,
        okParts: emp.okParts,
        rejectionRate: emp.totalParts > 0 ? parseFloat(((emp.totalRejection / emp.totalParts) * 100).toFixed(2)) : 0,
        workLogsCount: emp.count,
        averagePartsPerLog: emp.count > 0 ? parseFloat((emp.totalParts / emp.count).toFixed(2)) : 0,
        efficiency: emp.totalParts > 0 ? parseFloat(((emp.okParts / emp.totalParts) * 100).toFixed(2)) : 0
      }));

      // Create export object with metadata
      const exportData = {
        exportDate: new Date().toISOString(),
        filterApplied: {
          date: date || null,
          from: from || null,
          to: to || null
        },
        totalEmployees: employeeData.length,
        summary: {
          totalParts: employeeData.reduce((sum, emp) => sum + emp.totalParts, 0),
          totalRejection: employeeData.reduce((sum, emp) => sum + emp.totalRejection, 0),
          totalOkParts: employeeData.reduce((sum, emp) => sum + emp.okParts, 0),
          totalWorkLogs: employeeData.reduce((sum, emp) => sum + emp.count, 0)
        },
        employees: enhancedData
      };

      // Create filename with date range
      const dateInfo = date ? `_${date}` : (from || to) ? `_${from || 'start'}_to_${to || 'end'}` : '_all';
      const filename = `employee_progress${dateInfo}.json`;

      // Download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(`Exported ${employeeData.length} employee records to JSON`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to export JSON');
    }
  };

  const exportDetailedReport = () => {
    try {
      setShowExportMenu(false);
      if (employeeData.length === 0) {
        toast.error('No employee data to export');
        return;
      }

      // Create detailed CSV with rankings
      const sorted = [...employeeData].sort((a, b) => b.totalParts - a.totalParts);
      
      const headers = [
        'Rank',
        'Employee ID',
        'Employee Name',
        'Total Parts',
        'Total Rejection',
        'OK Parts',
        'Rejection Rate %',
        'Efficiency %',
        'Work Logs',
        'Avg Parts/Log',
        'Performance Grade'
      ];
      
      const rows = sorted.map((emp, index) => {
        const rejectionRate = emp.totalParts > 0 ? ((emp.totalRejection / emp.totalParts) * 100) : 0;
        const efficiency = emp.totalParts > 0 ? ((emp.okParts / emp.totalParts) * 100) : 0;
        const avgPartsPerLog = emp.count > 0 ? (emp.totalParts / emp.count) : 0;
        
        // Grade based on efficiency
        let grade = 'F';
        if (efficiency >= 95) grade = 'A+';
        else if (efficiency >= 90) grade = 'A';
        else if (efficiency >= 85) grade = 'B+';
        else if (efficiency >= 80) grade = 'B';
        else if (efficiency >= 75) grade = 'C';
        else if (efficiency >= 70) grade = 'D';
        
        return [
          index + 1,
          emp.employeeId || 'N/A',
          emp.employeeName || 'Unknown',
          emp.totalParts,
          emp.totalRejection,
          emp.okParts,
          rejectionRate.toFixed(2),
          efficiency.toFixed(2),
          emp.count,
          avgPartsPerLog.toFixed(2),
          grade
        ].map(field => {
          const str = String(field);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');

      const dateInfo = date ? `_${date}` : (from || to) ? `_${from || 'start'}_to_${to || 'end'}` : '_all';
      const filename = `employee_detailed_report${dateInfo}.csv`;

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(`Exported detailed report with ${employeeData.length} employees`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to export detailed report');
    }
  };

  const KPI = ({ label, value }: { label: string; value: number | string }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );

  const totalLogs = (workStats?.totalLogs || 0) + (transportStats?.totalLogs || 0);
  const totalParts = (workStats?.totalParts || 0) + (transportStats?.totalParts || 0);
  const totalRejection = (workStats?.totalRejection || 0) + (transportStats?.totalRejection || 0);
  const uniqEmployees = (workStats?.uniqueEmployeesCount || 0) + (transportStats?.uniqueEmployeesCount || 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                disabled={!!date}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={!!date}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={load} disabled={loading} className="flex-1 sm:flex-none">
              {loading ? 'Loading...' : 'Apply Filters'}
            </Button>
            <div className="relative flex-1 sm:flex-none">
              <Button 
                variant="outline" 
                disabled={employeeData.length === 0} 
                className="w-full"
                onClick={(e) => {
                  console.log('Export button clicked, current menu state:', showExportMenu);
                  e.stopPropagation();
                  setShowExportMenu(!showExportMenu);
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {showExportMenu && employeeData.length > 0 && (
                <div 
                  className="absolute right-0 mt-2 w-56 bg-popover border rounded-md shadow-lg z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2">
                    <div className="px-2 py-1.5 text-sm font-semibold">Export Employee Progress</div>
                    <div className="h-px bg-border my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportToCSV();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-pointer text-left"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export as CSV
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportToJSON();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-pointer text-left"
                    >
                      <FileJson className="w-4 h-4" />
                      Export as JSON
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportDetailedReport();
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-pointer text-left"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Detailed Report (CSV)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {/* All totals - 2x2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
        <div className="h-10 rounded-md border bg-muted px-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Logs</span>
          <span className="text-xl font-semibold leading-none">{totalLogs}</span>
        </div>
        <div className="h-10 rounded-md border bg-muted px-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Parts</span>
          <span className="text-xl font-semibold leading-none">{totalParts}</span>
        </div>
        <div className="h-10 rounded-md border bg-muted px-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Rejection</span>
          <span className="text-xl font-semibold leading-none">{totalRejection}</span>
        </div>
        <div className="h-10 rounded-md border bg-muted px-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Employees</span>
          <span className="text-xl font-semibold leading-none">{uniqEmployees}</span>
        </div>
      </div>

      {/* Per-source stats - responsive layout */}
      <div className="space-y-2">
        {/* Production */}
        <div>
          <div className="text-sm font-medium mb-1.5">Production</div>
          <div className="grid gap-1.5" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="h-10 rounded-md border bg-muted/50 px-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Logs</span>
              <span className="text-lg font-semibold leading-none">{workStats?.totalLogs || 0}</span>
            </div>
            <div className="h-10 rounded-md border bg-muted/50 px-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Parts</span>
              <span className="text-lg font-semibold leading-none">{workStats?.totalParts || 0}</span>
            </div>
            <div className="h-10 rounded-md border bg-muted/50 px-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rejection</span>
              <span className="text-lg font-semibold leading-none">{workStats?.totalRejection || 0}</span>
            </div>
            <div className="h-10 rounded-md border bg-muted/50 px-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Employees</span>
              <span className="text-lg font-semibold leading-none">{workStats?.uniqueEmployeesCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Transporter */}
        <div>
          <div className="text-sm font-medium mb-1.5">Transporter</div>
          <div className="grid gap-1.5" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div className="h-10 rounded-md border bg-muted/50 px-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Logs</span>
              <span className="text-lg font-semibold leading-none">{transportStats?.totalLogs || 0}</span>
            </div>
            <div className="h-10 rounded-md border bg-muted/50 px-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Parts</span>
              <span className="text-lg font-semibold leading-none">{transportStats?.totalParts || 0}</span>
            </div>
            <div className="h-10 rounded-md border bg-muted/50 px-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rejection</span>
              <span className="text-lg font-semibold leading-none">{transportStats?.totalRejection || 0}</span>
            </div>
            <div className="h-10 rounded-md border bg-muted/50 px-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Employees</span>
              <span className="text-lg font-semibold leading-none">{transportStats?.uniqueEmployeesCount || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Totals Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Totals</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyData.length === 0 ? (
            <div className="text-sm text-muted-foreground">No data for selected period.</div>
          ) : (
            <ChartContainer
              config={{
                ok: { label: 'Ok Parts', color: '#16a34a' },
                reject: { label: 'Rejection', color: '#ef4444' },
              }}
              className="w-full h-56 sm:h-64"
            >
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend content={<ChartLegendContent />} />
                <Bar dataKey="okParts" name="Ok Parts" fill="var(--color-ok)" stackId="a" />
                <Bar dataKey="totalRejection" name="Rejection" fill="var(--color-reject)" stackId="a" />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Per-Employee Productivity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Per-Employee Productivity</CardTitle>
        </CardHeader>
        <CardContent>
          {employeeData.length === 0 ? (
            <div className="text-sm text-muted-foreground">No data for selected period.</div>
          ) : (
            <ChartContainer
              config={{
                ok: { label: 'Ok Parts', color: '#3b82f6' },
              }}
              className="w-full h-56 sm:h-64"
            >
              <BarChart data={employeeData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="employeeName" tick={{ fontSize: 12 }} interval={0} angle={-20} height={60} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend content={<ChartLegendContent />} />
                <Bar dataKey="okParts" name="Ok Parts" fill="var(--color-ok)" />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Analytics;