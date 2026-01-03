import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';

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

const departments = [
  'Production',
  'Quality Control',
  'Maintenance',
  'Assembly',
  'Packaging',
  'Inventory',
  'Transporter',
  'General'
];

export function AddEmployee() {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    address: '',
    username: '',
    password: '',
    department: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.contact || !formData.address || 
        !formData.username || !formData.password || !formData.department) {
      toast.error('Please fill in all fields');
      return;
    }

    // Check if username already exists
    const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
    if (existingUsers.some((user: any) => user.username === formData.username)) {
      toast.error('Username already exists');
      return;
    }

    // Create new employee
    const newEmployee: Employee = {
      id: Date.now().toString(),
      ...formData,
      role: 'employee',
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const updatedUsers = [...existingUsers, newEmployee];
    localStorage.setItem('users', JSON.stringify(updatedUsers));

    // Reset form
    setFormData({
      name: '',
      contact: '',
      address: '',
      username: '',
      password: '',
      department: ''
    });

    toast.success('Employee added successfully');
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Add New Employee</CardTitle>
          <CardDescription>
            Enter the employee details to create a new account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Employee Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Employee Contact</Label>
                <Input
                  id="contact"
                  value={formData.contact}
                  onChange={(e) => handleInputChange('contact', e.target.value)}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Employee Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter address"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Employee Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Employee Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Employee Department</Label>
              <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
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

            <Button type="submit" className="w-full">
              Add Employee
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}