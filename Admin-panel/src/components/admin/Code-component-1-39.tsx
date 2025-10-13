import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Activity, Calendar, User } from 'lucide-react';

interface WorkLog {
  id: string;
  employeeId: string;
  employeeName: string;
  jobType: 'rod' | 'sleeve' | 'pin';
  code?: string;
  partName?: string;
  partSize: string;
  totalParts: number;
  rejection?: number;
  date: string;
  timestamp: string;
}

export function ViewLogs() {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<WorkLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedJobType, setSelectedJobType] = useState<string>('all');

  useEffect(() => {
    loadWorkLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [workLogs, selectedDate, selectedEmployee, selectedJobType]);

  const loadWorkLogs = () => {
    const logs = JSON.parse(localStorage.getItem('workLogs') || '[]');
    // Sort by timestamp, newest first
    logs.sort((a: WorkLog, b: WorkLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setWorkLogs(logs);
  };

  const applyFilters = () => {
    let filtered = [...workLogs];

    if (selectedDate !== 'all') {
      filtered = filtered.filter(log => log.date === selectedDate);
    }

    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(log => log.employeeId === selectedEmployee);
    }

    if (selectedJobType !== 'all') {
      filtered = filtered.filter(log => log.jobType === selectedJobType);
    }

    setFilteredLogs(filtered);
  };

  // Get unique dates for filter
  const uniqueDates = [...new Set(workLogs.map(log => log.date))].sort((a, b) => b.localeCompare(a));
  
  // Get unique employees for filter
  const uniqueEmployees = [...new Set(workLogs.map(log => ({ id: log.employeeId, name: log.employeeName })))];

  const getStatistics = () => {
    const totalLogs = filteredLogs.length;
    const totalParts = filteredLogs.reduce((sum, log) => sum + (log.totalParts || 0), 0);
    const totalRejection = filteredLogs.reduce((sum, log) => sum + (log.rejection || 0), 0);
    const uniqueEmployeesCount = new Set(filteredLogs.map(log => log.employeeId)).size;
    return { totalLogs, totalParts, totalRejection, uniqueEmployeesCount };
  };

  const stats = getStatistics();

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Work Entries</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLogs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parts Worked</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rejections</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRejection}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.uniqueEmployeesCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter work logs by date, employee, or job type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  {uniqueDates.map(date => (
                    <SelectItem key={date} value={date}>
                      {new Date(date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Employee</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {uniqueEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Job Type</label>
              <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select job type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="rod">Rod</SelectItem>
                  <SelectItem value="sleeve">Sleeve</SelectItem>
                  <SelectItem value="pin">Pin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Work Logs</CardTitle>
          <CardDescription>
            {filteredLogs.length > 0 
              ? `Showing ${filteredLogs.length} work log${filteredLogs.length === 1 ? '' : 's'}`
              : 'No work logs found'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No work logs found.</p>
              <p>Employees will see their work logs here after submitting work forms.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Job Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Total Parts</TableHead>
                    <TableHead>Rejection</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{log.employeeName}</TableCell>
                      <TableCell className="capitalize">{log.jobType}</TableCell>
                      <TableCell>
                        {log.jobType === 'sleeve' ? log.code : log.partName}
                      </TableCell>
                      <TableCell>{log.partSize}</TableCell>
                      <TableCell>{log.totalParts}</TableCell>
                      <TableCell>{log.rejection ?? 0}</TableCell>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}