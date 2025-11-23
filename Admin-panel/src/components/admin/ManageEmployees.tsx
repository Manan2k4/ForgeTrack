import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { toast } from 'sonner';
import { Trash2, Users, Pencil, Download, Eye, Clipboard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { apiService } from '../../services/api';

interface Employee {
  id: string;
  name: string;
  contact: string;
  address: string;
  username: string;
  password: string;
  department: string;
  role: 'employee';
  createdAt: string;
  isActive?: boolean;
}

export function ManageEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [editData, setEditData] = useState({
    name: '',
    username: '',
    password: '',
    contact: '',
    address: '',
    department: '',
  });
  const [viewingPasswordFor, setViewingPasswordFor] = useState<Employee | null>(null);
  const [passwordPlain, setPasswordPlain] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const departments = [
    'Sleeve Workshop',
    'Rod/Pin Workshop',
    'Packing',
    'Transporter',
  ];

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const resp = await apiService.getEmployees({ includeInactive: true });
      const rows = ((resp.data || []) as any[]).map((e) => ({
        id: e.id || e._id,
        name: e.name || '',
        username: e.username || '',
        password: '',
        contact: e.contact || '',
        address: e.address || '',
        department: e.department || '',
        role: 'employee' as const,
        createdAt: e.createdAt || e.created_at || new Date().toISOString(),
        isActive: e.isActive !== false,
      }));
      setEmployees(rows);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load employees');
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await apiService.deleteEmployee(employeeId);
      toast.success('Employee deactivated successfully');
      // Update status locally and refresh from server
      setEmployees((prev) => prev.map((e) => e.id === employeeId ? { ...e, isActive: false } : e));
      loadEmployees();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete employee');
    }
  };

  const handleActivateEmployee = async (employeeId: string) => {
    try {
      await apiService.activateEmployee(employeeId);
      toast.success('Employee reactivated successfully');
      setEmployees((prev) => prev.map((e) => e.id === employeeId ? { ...e, isActive: true } : e));
      loadEmployees();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to activate employee');
    }
  };

  const handlePermanentDeleteEmployee = async (employeeId: string) => {
    try {
      const response = await apiService.permanentDeleteEmployee(employeeId);
      toast.success(response?.data?.message || 'Employee and work logs permanently deleted');
      loadEmployees();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to permanently delete employee');
    }
  };

  const openEdit = (emp: Employee) => {
    setEditing(emp);
    setEditData({
      name: emp.name || '',
      username: emp.username || '',
      password: '',
      contact: emp.contact || '',
      address: emp.address || '',
      department: emp.department || '',
    });
  };

  const openViewPassword = async (emp: Employee) => {
    setViewingPasswordFor(emp);
    setPasswordPlain(null);
    setPasswordError(null);
    setPasswordLoading(true);
    try {
      const resp: any = await (apiService as any).viewEmployeePassword(emp.id);
      if (resp?.success && resp?.data?.password) {
        setPasswordPlain(resp.data.password);
      } else {
        setPasswordError(resp?.message || 'Password not available');
      }
    } catch (error: any) {
      setPasswordError(error?.message || 'Failed to fetch password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const closeViewPassword = () => {
    setViewingPasswordFor(null);
    setPasswordPlain(null);
    setPasswordError(null);
    setPasswordLoading(false);
  };

  const submitEdit = async () => {
    if (!editing) return;
    try {
      const payload: any = { ...editData };
      if (!payload.password) delete payload.password; // do not send empty password
      await apiService.updateEmployee(editing.id, payload);
      toast.success('Employee updated successfully');
      setEditing(null);
      await loadEmployees();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update employee');
    }
  };

  const handleBackfillDepartments = async () => {
    try {
      const resp = await apiService.backfillEmployeeDepartments();
      const count = (resp as any)?.data?.updated ?? 0;
      toast.success(`Departments normalized (${count} updated)`);
      await loadEmployees();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to normalize departments');
    }
  };

  const exportEmployeeList = () => {
    try {
      if (employees.length === 0) {
        toast.error('No employees to export');
        return;
      }

      const headers = ['Employee ID', 'Name', 'Username', 'Contact', 'Department', 'Address', 'Status', 'Created Date'];
      
      const rows = employees.map(emp => [
        emp.id,
        emp.name,
        emp.username,
        emp.contact,
        emp.department,
        emp.address,
        emp.isActive ? 'Active' : 'Inactive',
        new Date(emp.createdAt).toLocaleDateString()
      ].map(field => {
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      const filename = `employees_list_${new Date().toISOString().split('T')[0]}.csv`;

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(`Exported ${employees.length} employees to CSV`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to export employee list');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Users className="w-5 h-5" />
            <div className="flex-1">
              <CardTitle>Employee Management</CardTitle>
              <CardDescription>
                View and manage all registered employees
              </CardDescription>
            </div>
            <div className="ml-auto flex gap-2 w-full sm:w-auto justify-start sm:justify-end mt-2 sm:mt-0">
              <Button className="flex-1 sm:flex-initial" variant="outline" size="sm" onClick={handleBackfillDepartments}>
                Normalize Departments
              </Button>
              <Button className="flex-1 sm:flex-initial" variant="outline" size="sm" onClick={exportEmployeeList} disabled={employees.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No employees registered yet.</p>
              <p>Use the "Add Employee" section to register new employees.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>{employee.name}</TableCell>
                      <TableCell>{employee.username}</TableCell>
                      <TableCell>{employee.contact}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{employee.address}</TableCell>
                      <TableCell>
                        {employee.isActive ? (
                          <span className="inline-flex items-center gap-1 text-green-600">● Active</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600">● Inactive</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(employee.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Dialog open={!!editing && editing?.id === employee.id} onOpenChange={(open) => !open && setEditing(null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => openEdit(employee)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Dialog open={!!viewingPasswordFor && viewingPasswordFor.id === employee.id} onOpenChange={(open) => !open && closeViewPassword()}>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => openViewPassword(employee)} title="View Password">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Employee Password</DialogTitle>
                                </DialogHeader>
                                {passwordLoading && <p className="text-sm">Loading...</p>}
                                {!passwordLoading && passwordError && (
                                  <p className="text-sm text-red-600">{passwordError}</p>
                                )}
                                {!passwordLoading && passwordPlain && (
                                  <div className="space-y-2">
                                    <p className="font-mono break-all p-2 rounded bg-muted border">{passwordPlain}</p>
                                    <Button variant="outline" size="sm" onClick={() => passwordPlain && navigator.clipboard.writeText(passwordPlain)}>
                                      <Clipboard className="w-4 h-4 mr-2" />Copy
                                    </Button>
                                  </div>
                                )}
                                <div className="pt-2 text-xs text-muted-foreground space-y-1">
                                  <p>Handle with care. Revealed password is sensitive.</p>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Employee</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="username">Username</Label>
                                <Input id="username" value={editData.username} onChange={(e) => setEditData({ ...editData, username: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="password">Password (leave blank to keep)</Label>
                                <Input id="password" type="password" value={editData.password} onChange={(e) => setEditData({ ...editData, password: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="contact">Contact</Label>
                                <Input id="contact" value={editData.contact} onChange={(e) => setEditData({ ...editData, contact: e.target.value })} />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="department">Department</Label>
                                <Select value={editData.department} onValueChange={(value) => setEditData({ ...editData, department: value })}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select department" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {departments.map((dept) => (
                                      <SelectItem key={dept} value={dept}>
                                        {dept}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor="address">Address</Label>
                                <Input id="address" value={editData.address} onChange={(e) => setEditData({ ...editData, address: e.target.value })} />
                              </div>
                              <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                                <Button onClick={submitEdit}>Save</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        {employee.isActive ? (
                          <>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to deactivate {employee.name}? This will disable their login but retain all past work logs.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteEmployee(employee.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Deactivate
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" title="Permanent Delete">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-destructive">⚠️ Permanent Delete</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <p className="font-semibold mb-2">This action cannot be undone!</p>
                                    <p>Are you sure you want to permanently delete {employee.name}?</p>
                                    <p className="mt-2">This will:</p>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                      <li>Delete the employee account</li>
                                      <li>Delete ALL associated work logs</li>
                                      <li>Remove all historical data</li>
                                    </ul>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handlePermanentDeleteEmployee(employee.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Permanently Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleActivateEmployee(employee.id)}>
                              Activate
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" title="Permanent Delete">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-destructive">⚠️ Permanent Delete</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <p className="font-semibold mb-2">This action cannot be undone!</p>
                                    <p>Are you sure you want to permanently delete {employee.name}?</p>
                                    <p className="mt-2">This will:</p>
                                    <ul className="list-disc list-inside mt-1 space-y-1">
                                      <li>Delete the employee account</li>
                                      <li>Delete ALL associated work logs</li>
                                      <li>Remove all historical data</li>
                                    </ul>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handlePermanentDeleteEmployee(employee.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Permanently Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
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