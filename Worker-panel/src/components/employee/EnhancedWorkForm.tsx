import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { useAutoSave } from '../../hooks/useAutoSave';
import { toast } from 'sonner';
import databaseService from '../../services/databaseService';
import { 
  CheckCircle, 
  Package, 
  Save, 
  AlertCircle, 
  Zap,
  Clock,
  CheckCircle2,
  Wifi,
  WifiOff,
  Database,
  CloudOff
} from 'lucide-react';

interface Product {
  id: string;
  type: 'sleeve' | 'rod' | 'pin';
  code?: string;
  partName?: string;
  sizes: string[];
}

interface EnhancedWorkFormProps {
  jobType: 'rod' | 'sleeve' | 'pin';
  employeeId: string;
  onComplete: () => void;
  isOnline: boolean;
}

export function EnhancedWorkForm({ jobType, employeeId, onComplete, isOnline }: EnhancedWorkFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    selectedItem: '',
    partSize: '',
    totalParts: '',
    rejection: '',
    operation: '',
  });
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formProgress, setFormProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [hasDraft, setHasDraft] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ isOnline: true, isDatabaseConnected: false });

  // Auto-save functionality
  const { clearSavedData } = useAutoSave({
    key: `workDraft_${jobType}_${employeeId}`,
    data: formData,
    delay: 1500,
  shouldSave: (d) => Boolean(d?.selectedItem || d?.partSize || (d?.totalParts && String(d.totalParts).trim() !== '') || (d?.rejection && String(d.rejection).trim() !== '')),
    onSave: () => {
      // Only show save notification if form has meaningful data
      if (formData.selectedItem || formData.partSize || formData.totalParts || formData.rejection) {
        setHasDraft(true);
      }
    },
    onRestore: (savedData) => {
      if (savedData) {
        const migrated = {
          ...savedData,
          totalParts: savedData.totalParts || savedData.quantity || '',
        };
        if (migrated && (migrated.selectedItem || migrated.partSize || migrated.totalParts || migrated.rejection)) {
          setFormData(migrated);
        }
        setHasDraft(true);
        toast.info('Draft restored', {
          icon: '📝',
          duration: 2000,
        });
      }
    }
  });

  useEffect(() => {
    loadProducts();
    
    // Monitor connection status
    const checkConnection = () => {
      const status = databaseService.getConnectionStatus();
      setConnectionStatus(status);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);

    return () => clearInterval(interval);
  }, [jobType]);

  useEffect(() => {
    // Update available sizes when selected item changes
    if (formData.selectedItem) {
      const selectedProduct = products.find(p => 
        jobType === 'sleeve' 
          ? p.code === formData.selectedItem
          : p.partName === formData.selectedItem
      );
      setAvailableSizes(selectedProduct?.sizes || []);
      setFormData(prev => ({ ...prev, partSize: '' }));
    } else {
      setAvailableSizes([]);
    }
  }, [formData.selectedItem, products, jobType]);

  useEffect(() => {
    // Calculate form completion progress
    let progress = 0;
    if (formData.selectedItem) progress += 33;
    if (formData.partSize) progress += 33;
    if (formData.totalParts && parseInt(formData.totalParts) > 0) progress += 34;
    setFormProgress(progress);
  }, [formData]);

  const loadProducts = async () => {
    try {
      const allProducts = await databaseService.getProducts();
      const filteredProducts = allProducts.filter(product => product.type === jobType);
      setProducts(filteredProducts);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    }
    
    // Reset form when job type changes
    setFormData({ selectedItem: '', partSize: '', totalParts: '', rejection: '', operation: '' });
    setValidationErrors({});
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.selectedItem) {
      errors.selectedItem = `Please select a ${getItemLabel().toLowerCase()}`;
    }
    
    if (!formData.partSize) {
      errors.partSize = 'Please select a part size';
    }
    
    if (!formData.totalParts) {
      errors.totalParts = 'Please enter total parts';
    } else {
      const totalParts = parseInt(formData.totalParts);
      if (totalParts <= 0 || isNaN(totalParts)) {
        errors.totalParts = 'Please enter a valid total parts';
      } else if (totalParts > 10000) {
        errors.totalParts = 'Total parts cannot exceed 10000';
      }
    }

    if (formData.rejection) {
      const rejection = parseInt(formData.rejection);
      const totalParts = parseInt(formData.totalParts || '0');
      if (rejection < 0 || isNaN(rejection)) {
        errors.rejection = 'Rejection cannot be negative';
      } else if (!isNaN(totalParts) && rejection > totalParts) {
        errors.rejection = 'Rejection cannot exceed total parts';
      }
    }

    // Operation required only when current jobType has operation options
    const hasOperationOptions = getOperationOptions().length > 0;
    if (hasOperationOptions && !formData.operation) {
      errors.operation = 'Please select job type';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly');
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
      return;
    }

    setIsSubmitting(true);

    // Haptic feedback for submit
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    try {
      // Simulate processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 1200));

  const totalParts = parseInt(formData.totalParts);
  const rejection = formData.rejection ? parseInt(formData.rejection) : 0;
      
      // Get employee name from localStorage for now
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const employee = users.find((user: any) => user.id === employeeId);
      
      if (!employee) {
        toast.error('Employee not found');
        return;
      }

      // Create work log entry
      const workLogData = {
        employeeId: employeeId,
        employeeName: employee.name,
        jobType: jobType,
        code: jobType === 'sleeve' ? formData.selectedItem : undefined,
        partName: jobType !== 'sleeve' ? formData.selectedItem : undefined,
        partSize: formData.partSize,
        operation: formData.operation || undefined,
        totalParts: totalParts,
        rejection: rejection,
        date: new Date().toISOString().split('T')[0],
      };

      // Save using database service (handles online/offline automatically)
      await databaseService.saveWorkLog(workLogData);

      // Clear auto-saved draft
      clearSavedData();
      setHasDraft(false);

      // Success feedback with connection status
      const syncStatus = connectionStatus.isDatabaseConnected ? 'synced' : 'saved locally';
      toast.success('Work logged successfully!', {
        icon: '✅',
        description: `${totalParts} parts (${rejection} rejected) recorded for ${formData.selectedItem} (${syncStatus})`,
        duration: 3000,
      });

      // Success haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
      
    // Reset form and go back
  setFormData({ selectedItem: '', partSize: '', totalParts: '', rejection: '', operation: '' });
      onComplete();
      
    } catch (error) {
      console.error('Failed to save work log:', error);
      toast.error('Failed to save work log. Please try again.');
      
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 100]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearDraft = () => {
    clearSavedData();
    setFormData({ selectedItem: '', partSize: '', totalParts: '', rejection: '', operation: '' });
    setHasDraft(false);
    toast.success('Draft cleared');
  };

  // Centralized operation options by job type; pin can be filled later
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

  const getOperationOptions = () => OPERATION_OPTIONS[jobType] || [];

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

  const getJobColor = () => {
    switch (jobType) {
      case 'rod': return 'text-blue-600';
      case 'sleeve': return 'text-green-600';
      case 'pin': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  const getJobIcon = () => {
    switch (jobType) {
      case 'rod': return <Package className="w-5 h-5" />;
      case 'sleeve': return <Zap className="w-5 h-5" />;
      case 'pin': return <CheckCircle className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  if (products.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto bg-white/80 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-1">
              {connectionStatus.isDatabaseConnected ? (
                <>
                  <Database className="w-4 h-4 text-green-500" />
                  Database
                </>
              ) : connectionStatus.isOnline ? (
                <>
                  <CloudOff className="w-4 h-4 text-orange-500" />
                  Local Mode
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-500" />
                  Offline
                </>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {connectionStatus.isDatabaseConnected 
                ? 'Real-time sync' 
                : connectionStatus.isOnline
                ? 'Will sync later'
                : 'Local storage'
              }
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-1">
              <Save className="w-4 h-4 text-blue-500" />
              Auto-save
            </div>
            <p className="text-xs text-gray-500">
              {hasDraft ? 'Saved draft available' : 'Ready'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Form */}
      <Card className="bg-white/80 backdrop-blur-sm shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center ${getJobColor()}`}>
                {getJobIcon()}
              </div>
              <div>
                <CardTitle className="text-xl">Work Entry Form</CardTitle>
                <CardDescription>
                  Enter your work details for {jobType} components
                </CardDescription>
              </div>
            </div>
            {hasDraft && (
              <Badge variant="outline" className="text-orange-600 border-orange-200">
                <Clock className="w-3 h-3 mr-1" />
                Draft
              </Badge>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Form Progress</span>
              <span>{formProgress}%</span>
            </div>
            <Progress value={formProgress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent>
          {hasDraft && (
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-700">
                You have a saved draft. Continue editing or{' '}
                <button 
                  onClick={handleClearDraft}
                  className="underline hover:no-underline font-medium"
                >
                  clear it
                </button>
                {' '}to start fresh.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {getOperationOptions().length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="operation" className="text-base font-medium">
                  Job Type *
                </Label>
                <Select 
                  value={formData.operation} 
                  onValueChange={(value) => {
                    setFormData({...formData, operation: value});
                    setValidationErrors(prev => ({...prev, operation: ''}));
                  }}
                >
                  <SelectTrigger className={`h-12 ${validationErrors.operation ? 'border-red-300' : ''}`}>
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    {getOperationOptions().map(op => (
                      <SelectItem key={op} value={op}>{op}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.operation && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.operation}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="selectedItem" className="text-base font-medium">
                {getItemLabel()} *
              </Label>
              <Select 
                value={formData.selectedItem} 
                onValueChange={(value) => {
                  setFormData({...formData, selectedItem: value});
                  setValidationErrors(prev => ({...prev, selectedItem: ''}));
                }}
              >
                <SelectTrigger className={`h-12 ${validationErrors.selectedItem ? 'border-red-300' : ''}`}>
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
              {validationErrors.selectedItem && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.selectedItem}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="partSize" className="text-base font-medium">
                Part Size *
              </Label>
              <Select 
                value={formData.partSize} 
                onValueChange={(value) => {
                  setFormData({...formData, partSize: value});
                  setValidationErrors(prev => ({...prev, partSize: ''}));
                }}
                disabled={!formData.selectedItem}
              >
                <SelectTrigger className={`h-12 ${validationErrors.partSize ? 'border-red-300' : ''}`}>
                  <SelectValue 
                    placeholder={
                      formData.selectedItem 
                        ? "Select size" 
                        : "Select item first"
                    } 
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableSizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.partSize && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.partSize}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalParts" className="text-base font-medium">
                Total Parts *
              </Label>
              <Input
                id="totalParts"
                type="number"
                min="1"
                max="10000"
                value={formData.totalParts}
                onChange={(e) => {
                  setFormData({...formData, totalParts: e.target.value});
                  setValidationErrors(prev => ({...prev, totalParts: ''}));
                }}
                placeholder="Enter total parts"
                className={`h-12 text-base ${validationErrors.totalParts ? 'border-red-300' : ''}`}
              />
              {validationErrors.totalParts && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.totalParts}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="rejection" className="text-base font-medium">
                Rejection
              </Label>
              <Input
                id="rejection"
                type="number"
                min="0"
                max="10000"
                value={formData.rejection}
                onChange={(e) => {
                  setFormData({...formData, rejection: e.target.value});
                  setValidationErrors(prev => ({...prev, rejection: ''}));
                }}
                placeholder="Enter rejected parts (optional)"
                className={`h-12 text-base ${validationErrors.rejection ? 'border-red-300' : ''}`}
              />
              {validationErrors.rejection && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {validationErrors.rejection}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1 h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Work Entry</span>
                  </div>
                )}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                onClick={onComplete}
                className="h-12"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}