import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Activity, Calendar, User, Download } from 'lucide-react';
import { apiService } from '../../services/api';
import { toast } from 'sonner';

interface WorkLog {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeDepartment?: string;
  jobType: 'rod' | 'sleeve' | 'pin';
  code?: string;
  partName?: string;
  partSize: string;
  specialSize?: string | null;
  totalParts: number;
  rejection?: number;
  date: string;
  timestamp: string;
}

export function ViewLogs() {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<WorkLog[]>([]);
  const [editing, setEditing] = useState<{ open: boolean; log?: any; saving: boolean }>({ open: false, log: undefined, saving: false });
  const [deleting, setDeleting] = useState<{ id?: string; confirming: boolean }>({ id: undefined, confirming: false });
  // Date range filters (YYYY-MM-DD)
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedJobType, setSelectedJobType] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  useEffect(() => {
    loadWorkLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [workLogs, fromDate, toDate, selectedEmployee, selectedJobType, selectedDepartment]);

  const loadWorkLogs = async () => {
    try {
      const resp = await apiService.getWorkLogs();
      const logs = (resp.data || []) as any[];
      // Sort by timestamp, newest first
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setWorkLogs(logs as any);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load work logs');
    }
  };

  const applyFilters = () => {
    let filtered = [...workLogs];

    // Apply date range: includes bounds; if only from or to is set, use open-ended range
    if (fromDate || toDate) {
      filtered = filtered.filter(log => {
        const d = log.date; // already YYYY-MM-DD string
        const gte = fromDate ? d >= fromDate : true;
        const lte = toDate ? d <= toDate : true;
        return gte && lte;
      });
    }

    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(log => log.employeeId === selectedEmployee);
    }

    if (selectedJobType !== 'all') {
      filtered = filtered.filter(log => log.jobType === selectedJobType);
    }

    if (selectedDepartment !== 'all') {
      filtered = filtered.filter(log => (log.employeeDepartment || 'unknown') === selectedDepartment);
    }

    setFilteredLogs(filtered);
  };

  // Establish min/max date to help set input constraints
  const uniqueDatesSet = new Set<string>(workLogs.map((log: WorkLog) => log.date));
  const uniqueDates: string[] = Array.from(uniqueDatesSet).sort((a: string, b: string) => a.localeCompare(b));
  const minDate = uniqueDates[0] || '';
  const maxDate = uniqueDates[uniqueDates.length - 1] || '';
  
  // Get unique employees for filter
  const employeeMap: Map<string, { id: string; name: string }> = new Map(
    workLogs.map((log: WorkLog) => [log.employeeId, { id: log.employeeId, name: log.employeeName }])
  );
  const uniqueEmployees: { id: string; name: string }[] = Array.from(employeeMap.values());
  const departmentSet = new Set<string>(workLogs.map(l => l.employeeDepartment || 'unknown').filter(Boolean));
  const uniqueDepartments = Array.from(departmentSet.values()).filter(d => d !== 'unknown');

  const getStatistics = () => {
    const totalLogs = filteredLogs.length;
    const totalParts = filteredLogs.reduce((sum, log) => sum + (log.totalParts || 0), 0);
    const totalRejection = filteredLogs.reduce((sum, log) => sum + (log.rejection || 0), 0);
    const uniqueEmployeesCount = new Set(filteredLogs.map(log => log.employeeId)).size;
    return { totalLogs, totalParts, totalRejection, uniqueEmployeesCount };
  };

  const stats = getStatistics();
  const groupedByDate = filteredLogs.reduce((acc: Record<string, WorkLog[]>, log: WorkLog) => {
    if (!acc[log.date]) acc[log.date] = [];
    acc[log.date].push(log);
    return acc;
  }, {});
  const sortedDates: string[] = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  // Centralized operation options per part type; pin can be populated later
  const OPERATION_OPTIONS: Record<string, string[]> = {
    sleeve: ['CASTING', 'BORE', 'LENGTH', 'RUF OD', 'FINAL OD', 'OD GRINDING', 'SLEEVE PORT', 'PACKING'],
    rod: ['SMALL BORE GRINDING', 'BIG BORE GRINDING', 'SMALL BORE HORING', 'BIG BORE HORING', 'ASSEMBLY', 'PACKING'],
    pin: [
      'Pin raw material',
      'Pin machining',
      'Pin hole',
      'Pin hardening',
      'Pin gray',
      'Pin grinding'
    ],
  };

  const exportWorkLogs = () => {
    try {
      if (filteredLogs.length === 0) {
        toast.error('No work logs to export');
        return;
      }

      const headers = [
        'Date',
        'Time',
        'Employee ID',
        'Employee Name',
        'Job Type',
        'Product Code',
        'Part Name',
        'Part Size',
        'Operation',
        'Total Parts',
        'Rejection',
        'OK Parts',
        'Rejection Rate %'
      ];
      
      const rows = filteredLogs.map(log => {
        const okParts = (log.totalParts || 0) - (log.rejection || 0);
        const rejectionRate = log.totalParts > 0 ? ((log.rejection || 0) / log.totalParts * 100).toFixed(2) : '0.00';
        
        return [
          log.date,
          new Date(log.timestamp).toLocaleTimeString(),
          log.employeeId,
          log.employeeName,
          log.jobType,
          log.code || 'N/A',
          log.partName || 'N/A',
          log.partSize,
          (log as any).operation || 'N/A',
          log.totalParts,
          log.rejection || 0,
          okParts,
          rejectionRate
        ].map(field => {
          const str = String(field);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');
      
      // Create filename with filters
      let filename = 'work_logs';
      if (fromDate || toDate) {
        filename += `_${fromDate || 'start'}_to_${toDate || 'end'}`;
      }
      if (selectedEmployee !== 'all') {
        const emp = uniqueEmployees.find(e => e.id === selectedEmployee);
        filename += `_${emp?.name.replace(/\s+/g, '_') || 'employee'}`;
      }
      if (selectedJobType !== 'all') {
        filename += `_${selectedJobType}`;
      }
      filename += '.csv';

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(`Exported ${filteredLogs.length} work logs to CSV`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to export work logs');
    }
  };

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter work logs by date, employee, job type, or department</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportWorkLogs} disabled={filteredLogs.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">From</label>
              <input
                type="date"
                className="border rounded-md h-10 px-3 w-full"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                min={minDate || undefined}
                max={toDate || maxDate || undefined}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <input
                type="date"
                className="border rounded-md h-10 px-3 w-full"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate || minDate || undefined}
                max={maxDate || undefined}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Employee</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="h-10">
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
                <SelectTrigger className="h-10">
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Department</label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {uniqueDepartments.map(dep => (
                    <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Logs Tables by Date */}
      {filteredLogs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Work Logs</CardTitle>
            <CardDescription>No work logs found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No work logs found.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        sortedDates.map(date => (
          <Card key={date}>
            <CardHeader>
              <CardTitle>{new Date(date).toLocaleDateString()}</CardTitle>
              <CardDescription>
                {groupedByDate[date].length} entr{groupedByDate[date].length === 1 ? 'y' : 'ies'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Part</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Sp. Size</TableHead>
                      <TableHead>Job Type</TableHead>
                      <TableHead>Total Parts</TableHead>
                      <TableHead>Rejection</TableHead>
                      <TableHead>Ok Parts</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedByDate[date].map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.employeeName}</TableCell>
                        <TableCell className="capitalize">{log.jobType}</TableCell>
                        <TableCell>{log.jobType === 'sleeve' ? log.code : log.partName}</TableCell>
                        <TableCell>{log.partSize || '—'}</TableCell>
                        <TableCell>{log.specialSize || '—'}</TableCell>
                        <TableCell>{(log as any).operation || '—'}</TableCell>
                        <TableCell>{log.totalParts}</TableCell>
                        <TableCell>{log.rejection ?? 0}</TableCell>
                        <TableCell>{Math.max(0, (log.totalParts || 0) - (log.rejection || 0))}</TableCell>
                        <TableCell>{new Date(log.timestamp).toLocaleTimeString()}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" variant="outline" onClick={() => setEditing({ open: true, log, saving: false })}>Edit</Button>&nbsp;
                          <Button size="sm" variant="destructive" onClick={() => setDeleting({ id: log.id, confirming: true })}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Edit Modal */}
      <Dialog open={editing.open} onOpenChange={(open) => setEditing(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Work Log</DialogTitle>
          </DialogHeader>
          {editing.log && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Total Parts</label>
                <input
                  type="number"
                  className="border rounded-md h-10 px-3 w-full"
                  defaultValue={editing.log.totalParts}
                  onChange={(e) => setEditing(prev => ({ ...prev, log: { ...prev.log, totalParts: Number(e.target.value) } }))}
                  min={1}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Rejection</label>
                <input
                  type="number"
                  className="border rounded-md h-10 px-3 w-full"
                  defaultValue={editing.log.rejection || 0}
                  onChange={(e) => setEditing(prev => ({ ...prev, log: { ...prev.log, rejection: Number(e.target.value) } }))}
                  min={0}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Size</label>
                <input
                  type="text"
                  className="border rounded-md h-10 px-3 w-full"
                  defaultValue={editing.log.partSize}
                  onChange={(e) => setEditing(prev => ({ ...prev, log: { ...prev.log, partSize: e.target.value } }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Job Type (operation)</label>
                {(() => {
                  const partType = editing.log.jobType as string;
                  const options = OPERATION_OPTIONS[partType] || [];
                  if (options.length > 0) {
                    return (
                      <Select
                        value={editing.log.operation ?? ''}
                        onValueChange={(v) => setEditing(prev => ({ ...prev, log: { ...prev.log, operation: v } }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select job type" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((op) => (
                            <SelectItem key={op} value={op}>{op}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  }
                  // Fallback input while waiting for pin options
                  return (
                    <input
                      type="text"
                      className="border rounded-md h-10 px-3 w-full"
                      placeholder="Enter job type (pin options coming soon)"
                      defaultValue={editing.log.operation || ''}
                      onChange={(e) => setEditing(prev => ({ ...prev, log: { ...prev.log, operation: e.target.value } }))}
                    />
                  );
                })()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing({ open: false, log: undefined, saving: false })}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!editing.log) return;
                try {
                  setEditing(prev => ({ ...prev, saving: true }));
                  await apiService.updateWorkLog(editing.log.id, {
                    totalParts: editing.log.totalParts,
                    rejection: editing.log.rejection ?? 0,
                    partSize: editing.log.partSize,
                    operation: editing.log.operation ?? null,
                  });
                  toast.success('Work log updated');
                  setEditing({ open: false, log: undefined, saving: false });
                  await loadWorkLogs();
                } catch (err: any) {
                  toast.error(err?.message || 'Failed to update');
                  setEditing(prev => ({ ...prev, saving: false }));
                }
              }}
              disabled={editing.saving}
            >
              {editing.saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleting.confirming} onOpenChange={(open) => setDeleting(prev => ({ ...prev, confirming: open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Work Log</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete this work log? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting({ id: undefined, confirming: false })}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleting.id) return;
                try {
                  await apiService.deleteWorkLog(deleting.id);
                  toast.success('Work log deleted');
                  setDeleting({ id: undefined, confirming: false });
                  await loadWorkLogs();
                } catch (err: any) {
                  toast.error(err?.message || 'Failed to delete');
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}