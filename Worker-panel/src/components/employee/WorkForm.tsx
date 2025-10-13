import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';
import { CheckCircle, Package } from 'lucide-react';

interface Product {
  id: string;
  type: 'sleeve' | 'rod' | 'pin';
  code?: string;
  partName?: string;
  sizes: string[];
}

interface WorkFormProps {
  jobType: 'rod' | 'sleeve' | 'pin';
  employeeId: string;
  onComplete: () => void;
}

export function WorkForm({ jobType, employeeId, onComplete }: WorkFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    selectedItem: '',
    partSize: '',
    totalParts: '',
    rejection: ''
  });
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);

  useEffect(() => {
    loadProducts();
  }, [jobType]);

  useEffect(() => {
    // When selected item changes, update available sizes
    if (formData.selectedItem) {
      const selectedProduct = products.find(p => 
        jobType === 'sleeve' 
          ? p.code === formData.selectedItem
          : p.partName === formData.selectedItem
      );
      setAvailableSizes(selectedProduct?.sizes || []);
      setFormData(prev => ({ ...prev, partSize: '' })); // Reset size selection
    } else {
      setAvailableSizes([]);
    }
  }, [formData.selectedItem, products, jobType]);

  const loadProducts = () => {
    const allProducts: Product[] = JSON.parse(localStorage.getItem('products') || '[]');
    const filteredProducts = allProducts.filter(product => product.type === jobType);
    setProducts(filteredProducts);
    
    // Reset form when job type changes
    setFormData({ selectedItem: '', partSize: '', totalParts: '', rejection: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.selectedItem || !formData.partSize || !formData.totalParts) {
      toast.error('Please fill in all fields');
      return;
    }
    const totalParts = parseInt(formData.totalParts);
    if (totalParts <= 0 || isNaN(totalParts)) {
      toast.error('Please enter a valid total parts');
      return;
    }
    const rejection = formData.rejection ? parseInt(formData.rejection) : 0;
    if (rejection < 0 || isNaN(rejection)) {
      toast.error('Rejection cannot be negative');
      return;
    }
    if (rejection > totalParts) {
      toast.error('Rejection cannot exceed total parts');
      return;
    }

    // Get employee name
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const employee = users.find((user: any) => user.id === employeeId);
    
    if (!employee) {
      toast.error('Employee not found');
      return;
    }

    // Create work log entry
    const workLog = {
      id: Date.now().toString(),
      employeeId: employeeId,
      employeeName: employee.name,
      jobType: jobType,
      code: jobType === 'sleeve' ? formData.selectedItem : undefined,
      partName: jobType !== 'sleeve' ? formData.selectedItem : undefined,
      partSize: formData.partSize,
      totalParts: totalParts,
      rejection: rejection,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      timestamp: new Date().toISOString()
    };

    // Save work log
    const existingLogs = JSON.parse(localStorage.getItem('workLogs') || '[]');
    const updatedLogs = [...existingLogs, workLog];
    localStorage.setItem('workLogs', JSON.stringify(updatedLogs));

    toast.success('Work logged successfully!');
    
    // Reset form and go back to job selection
    setFormData({ selectedItem: '', partSize: '', totalParts: '', rejection: '' });
    onComplete();
  };

  const getItemLabel = () => {
    switch (jobType) {
      case 'sleeve': return 'Code';
      case 'rod': return 'Part Name';
      case 'pin': return 'Part Name';
      default: return 'Item';
    }
  };

  const getItems = () => {
    return products.map(product => ({
      value: jobType === 'sleeve' ? product.code! : product.partName!,
      label: jobType === 'sleeve' ? product.code! : product.partName!
    }));
  };

  if (products.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            <div>
              <CardTitle>No Products Available</CardTitle>
              <CardDescription>
                No {jobType} products have been added yet. Please contact your administrator.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={onComplete} variant="outline" className="w-full">
            Back to Job Selection
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <div>
              <CardTitle>Work Entry Form</CardTitle>
              <CardDescription>
                Enter your work details for {jobType} components
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="selectedItem">{getItemLabel()}</Label>
              <Select value={formData.selectedItem} onValueChange={(value) => setFormData({...formData, selectedItem: value})}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${getItemLabel().toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {getItems().map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partSize">Part Size</Label>
              <Select 
                value={formData.partSize} 
                onValueChange={(value) => setFormData({...formData, partSize: value})}
                disabled={!formData.selectedItem}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.selectedItem ? "Select size" : "Select item first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableSizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalParts">Total Parts</Label>
              <Input
                id="totalParts"
                type="number"
                min="1"
                value={formData.totalParts}
                onChange={(e) => setFormData({...formData, totalParts: e.target.value})}
                placeholder="Enter total parts"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rejection">Rejection</Label>
              <Input
                id="rejection"
                type="number"
                min="0"
                value={formData.rejection}
                onChange={(e) => setFormData({...formData, rejection: e.target.value})}
                placeholder="Enter rejected parts (optional)"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                Submit Work Entry
              </Button>
              <Button type="button" variant="outline" onClick={onComplete}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}