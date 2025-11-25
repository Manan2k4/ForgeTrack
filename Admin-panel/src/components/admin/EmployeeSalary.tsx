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
      }
    } catch (error: any) {
      console.error('Salary fetch error:', error);
      toast.error(error.message || 'Failed to fetch salary data');
      setSalaryData(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!salaryData) return;

    const csvRows: string[] = [];
    
    // Header
    csvRows.push(`Employee Salary Report`);
    csvRows.push(`Employee: ${salaryData.employeeName}`);
    csvRows.push(`Period: ${getMonthName(salaryData.month)} ${salaryData.year}`);
    csvRows.push('');
    csvRows.push('Date,Job Name,Part Type,Code,Part Name,Total Parts,Rejection,OK Parts,Rate (Rs),Amount (Rs)');

    // Data rows
    salaryData.dailyLogs.forEach(day => {
      const dateObj = new Date(day.date);
      const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
      
      day.logs.forEach(log => {
        csvRows.push(
          `${formattedDate},${log.jobName},${log.partType},${log.code || ''},${log.partName || ''},${log.totalParts},${log.rejection},${log.okParts},${log.rate.toFixed(2)},${log.amount.toFixed(2)}`
        );
      });
      csvRows.push(`${formattedDate} Total,,,,,,,,${day.dayTotal.toFixed(2)}`);
      csvRows.push('');
    });

    csvRows.push(`Month Total,,,,,,,,${salaryData.monthTotal.toFixed(2)}`);

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${salaryData.employeeName.replace(/\s+/g, '_')}_${salaryData.month}_${salaryData.year}_salary.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV downloaded successfully');
  };

  const downloadExcel = () => {
    if (!salaryData) return;

    // Create a simple HTML table that Excel can open
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid black; padding: 8px; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .text-right { text-align: right; }
        </style>
      </head>
      <body>
        <h2>Employee Salary Report</h2>
        <p><strong>Employee:</strong> ${salaryData.employeeName}</p>
        <p><strong>Period:</strong> ${getMonthName(salaryData.month)} ${salaryData.year}</p>
        <br/>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Job Name</th>
              <th>Part Type</th>
              <th>Code</th>
              <th>Part Name</th>
              <th class="text-right">Total Parts</th>
              <th class="text-right">Rejection</th>
              <th class="text-right">OK Parts</th>
              <th class="text-right">Rate (Rs)</th>
              <th class="text-right">Amount (Rs)</th>
            </tr>
          </thead>
          <tbody>
    `;

    salaryData.dailyLogs.forEach(day => {
      const dateObj = new Date(day.date);
      const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
      
      day.logs.forEach(log => {
        html += `
          <tr>
            <td>${formattedDate}</td>
            <td>${log.jobName}</td>
            <td>${log.partType}</td>
            <td>${log.code || ''}</td>
            <td>${log.partName || ''}</td>
            <td style="text-align: right;">${log.totalParts}</td>
            <td style="text-align: right;">${log.rejection}</td>
            <td style="text-align: right;">${log.okParts}</td>
            <td style="text-align: right;">${log.rate.toFixed(2)}</td>
            <td style="text-align: right;">${log.amount.toFixed(2)}</td>
          </tr>
        `;
      });
      html += `
        <tr style="background-color: #f0f0f0; font-weight: bold;">
          <td>${formattedDate} Total</td>
          <td colspan="8"></td>
          <td style="text-align: right;">${day.dayTotal.toFixed(2)}</td>
        </tr>
      `;
    });

    html += `
          <tr style="background-color: #d0d0d0; font-weight: bold;">
            <td colspan="9">Month Total</td>
            <td>${salaryData.monthTotal.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${salaryData.employeeName.replace(/\s+/g, '_')}_${salaryData.month}_${salaryData.year}_salary.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Excel file downloaded successfully');
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
                <Button variant="outline" onClick={downloadCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" onClick={downloadExcel}>
                  <Download className="w-4 h-4 mr-2" />
                  Excel
                </Button>
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
                {salaryData.dailyLogs.map((day, dayIdx) => {
                  const dateObj = new Date(day.date);
                  const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                  
                  return (
                    <div key={dayIdx} className="border border-border rounded-lg p-4">
                      <h3 className="font-semibold text-foreground mb-3">
                        {dayName}, {formattedDate}
                      </h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Job</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Code</TableHead>
                              <TableHead>Part</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Rej.</TableHead>
                              <TableHead>OK</TableHead>
                              <TableHead>Rate</TableHead>
                              <TableHead>Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {day.logs.map((log, logIdx) => (
                              <TableRow key={logIdx}>
                                <TableCell>{log.jobName}</TableCell>
                                <TableCell>{log.partType}</TableCell>
                                <TableCell>{log.code || '-'}</TableCell>
                                <TableCell>{log.partName || '-'}</TableCell>
                                <TableCell>{log.totalParts}</TableCell>
                                <TableCell>{log.rejection}</TableCell>
                                <TableCell>{log.okParts}</TableCell>
                                <TableCell>Rs. {log.rate.toFixed(2)}</TableCell>
                                <TableCell className="font-semibold">Rs. {log.amount.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border flex justify-end">
                      <span className="text-sm font-semibold text-foreground">
                        Day Total: ₹{day.dayTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  );
                })}

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-foreground">Month Total</span>
                    <span className="text-2xl font-bold text-primary">
                      Rs. {salaryData.monthTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
