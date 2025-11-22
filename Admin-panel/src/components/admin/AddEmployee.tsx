import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';
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
}

const departments = [
  'Sleeve Workshop',
  'Rod/Pin Workshop',
  'Packing',
  'Transporter',
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
  const [errors, setErrors] = useState<Record<string,string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = async () => {
    const newErrors: Record<string,string> = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) newErrors.name = 'Name must be at least 2 characters';
    if (!formData.contact.trim() || !/^[-+0-9()\s]{7,}$/.test(formData.contact)) newErrors.contact = 'Enter valid contact number';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.username.trim() || !/^[a-zA-Z0-9_.-]{4,}$/.test(formData.username)) newErrors.username = 'Username must be 4+ chars (letters, numbers, _ . -)';
    if (!formData.password.trim() || formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (!formData.department) newErrors.department = 'Select department';
    // Unique username check
    try {
      const resp = await apiService.getEmployees({ includeInactive: true });
      const exists = (resp.data || []).some((u: any) => u.username === formData.username);
      if (exists) newErrors.username = 'Username already taken';
    } catch {}
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const ok = await validate();
    if (!ok) {
      toast.error('Please fix validation errors');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiService.createEmployee({
        name: formData.name,
        username: formData.username,
        password: formData.password,
        contact: formData.contact,
        address: formData.address,
        department: formData.department,
      });

      setFormData({
        name: '',
        contact: '',
        address: '',
        username: '',
        password: '',
        department: ''
      });

      toast.success('Employee created', { description: `${formData.name} (${formData.department}) added successfully.` });
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add employee');
    }
    finally { setIsSubmitting(false); }
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
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {/* Dummy hidden fields to defeat browser autofill of saved admin creds */}
            <input type="text" name="fake-username" className="hidden" autoComplete="username" />
            <input type="password" name="fake-password" className="hidden" autoComplete="new-password" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Employee Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter full name"
                  required
                  autoComplete="off"
                />
                {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Employee Contact</Label>
                <Input
                  id="contact"
                  value={formData.contact}
                  onChange={(e) => handleInputChange('contact', e.target.value)}
                  placeholder="Enter phone number"
                  required
                  autoComplete="off"
                />
                {errors.contact && <p className="text-xs text-red-600">{errors.contact}</p>}
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
                autoComplete="off"
              />
              {errors.address && <p className="text-xs text-red-600">{errors.address}</p>}
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
                  autoComplete="off"
                />
                {errors.username && <p className="text-xs text-red-600">{errors.username}</p>}
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
                  autoComplete="new-password"
                />
                {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Employee Department</Label>
              <Select value={formData.department} onValueChange={(value) => { handleInputChange('department', value); setErrors(prev => ({...prev, department: ''})); }}>
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
              {errors.department && <p className="text-xs text-red-600">{errors.department}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Employee'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}