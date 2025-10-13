import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { toast } from 'sonner@2.0.3';
import { Trash2, Users } from 'lucide-react';

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
}

export function ManageEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = () => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const employeeUsers = users.filter((user: any) => user.role === 'employee');
    setEmployees(employeeUsers);
  };

  const handleDeleteEmployee = (employeeId: string) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const updatedUsers = users.filter((user: any) => user.id !== employeeId);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    
    // Also remove any work logs associated with this employee
    const workLogs = JSON.parse(localStorage.getItem('workLogs') || '[]');
    const updatedLogs = workLogs.filter((log: any) => log.employeeId !== employeeId);
    localStorage.setItem('workLogs', JSON.stringify(updatedLogs));
    
    loadEmployees();
    toast.success('Employee deleted successfully');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <div>
              <CardTitle>Employee Management</CardTitle>
              <CardDescription>
                View and manage all registered employees
              </CardDescription>
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
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
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
                        {new Date(employee.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {employee.name}? This action cannot be undone.
                                All work logs associated with this employee will also be deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteEmployee(employee.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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