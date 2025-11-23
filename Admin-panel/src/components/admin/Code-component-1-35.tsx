import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
// Fixed incorrect import specifier; use package name only
import { toast } from 'sonner';
import { Package, Edit, Trash2, Plus } from 'lucide-react';

interface Product {
  id: string;
  type: 'sleeve' | 'rod' | 'pin';
  code?: string; // For sleeves
  partName?: string; // For rods and pins
  sizes: string[];
  createdAt: string;
}

export function AddProduct() {
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    type: '',
    code: '',
    partName: '',
    sizes: ''
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  // Raw text for editing sizes to allow user to type commas (including trailing) before parsing on save
  const [editingSizesRaw, setEditingSizesRaw] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    const savedProducts = JSON.parse(localStorage.getItem('products') || '[]');
    setProducts(savedProducts);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type) {
      toast.error('Please select a product type');
      return;
    }

    if (formData.type === 'sleeve' && !formData.code) {
      toast.error('Please enter a code for sleeve');
      return;
    }

    if ((formData.type === 'rod' || formData.type === 'pin') && !formData.partName) {
      toast.error('Please enter a part name');
      return;
    }

    if (!formData.sizes.trim()) {
      toast.error('Please enter sizes');
      return;
    }

    // Check for duplicates
    const existingProducts = JSON.parse(localStorage.getItem('products') || '[]');
    const isDuplicate = existingProducts.some((product: Product) => {
      if (formData.type === 'sleeve') {
        return product.type === 'sleeve' && product.code === formData.code;
      } else {
        return product.type === formData.type && product.partName === formData.partName;
      }
    });

    if (isDuplicate) {
      toast.error('Product already exists');
      return;
    }

    const sizesArray = formData.sizes.split(',').map(s => s.trim()).filter(s => s);
    
    const newProduct: Product = {
      id: Date.now().toString(),
      type: formData.type as 'sleeve' | 'rod' | 'pin',
      code: formData.type === 'sleeve' ? formData.code : undefined,
      partName: formData.type !== 'sleeve' ? formData.partName : undefined,
      sizes: sizesArray,
      createdAt: new Date().toISOString()
    };

    const updatedProducts = [...existingProducts, newProduct];
    localStorage.setItem('products', JSON.stringify(updatedProducts));
    
    // Reset form
    setFormData({ type: '', code: '', partName: '', sizes: '' });
    
    loadProducts();
    toast.success('Product added successfully');
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsEditDialogOpen(true);
    setEditingSizesRaw(product.sizes.join(', '));
  };

  const handleSaveEdit = () => {
    if (!editingProduct) return;

    // Parse raw sizes only on save to avoid stripping trailing comma while typing
    const parsedSizes = editingSizesRaw
      .split(',')
      .map(s => s.trim())
      .filter(s => s);
    const productToSave: Product = { ...editingProduct, sizes: parsedSizes };

    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const updatedProducts = products.map((p: Product) => 
      p.id === productToSave.id ? productToSave : p
    );
    localStorage.setItem('products', JSON.stringify(updatedProducts));
    
    setEditingProduct(null);
    setIsEditDialogOpen(false);
    loadProducts();
    toast.success('Product updated successfully');
  };

  const handleDelete = (productId: string) => {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const updatedProducts = products.filter((p: Product) => p.id !== productId);
    localStorage.setItem('products', JSON.stringify(updatedProducts));
    
    loadProducts();
    toast.success('Product deleted successfully');
  };

  const getProductsByType = (type: string) => {
    return products.filter(p => p.type === type);
  };

  const renderProductTable = (type: 'sleeve' | 'rod' | 'pin', title: string) => {
    const typeProducts = getProductsByType(type);
    
    if (typeProducts.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No {title.toLowerCase()} products added yet.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{type === 'sleeve' ? 'Code' : 'Part Name'}</TableHead>
                  <TableHead>Sizes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typeProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {type === 'sleeve' ? product.code : product.partName}
                    </TableCell>
                    <TableCell>{product.sizes.join(', ')}</TableCell>
                    <TableCell>
                      {new Date(product.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Product</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this product? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(product.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Add Product Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <div>
              <CardTitle>Add New Product</CardTitle>
              <CardDescription>
                Enter product details to add to inventory
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type">Product Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value, code: '', partName: ''})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select product type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sleeve">Sleeve</SelectItem>
                  <SelectItem value="rod">Rod</SelectItem>
                  <SelectItem value="pin">Pin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'sleeve' && (
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  placeholder="Enter code"
                  required
                />
              </div>
            )}

            {(formData.type === 'rod' || formData.type === 'pin') && (
              <div className="space-y-2">
                <Label htmlFor="partName">Part Name</Label>
                <Input
                  id="partName"
                  value={formData.partName}
                  onChange={(e) => setFormData({...formData, partName: e.target.value})}
                  placeholder="Enter part name"
                  required
                />
              </div>
            )}

            {formData.type && (
              <div className="space-y-2">
                <Label htmlFor="sizes">Sizes</Label>
                <Input
                  id="sizes"
                  value={formData.sizes}
                  onChange={(e) => setFormData({...formData, sizes: e.target.value})}
                  placeholder="Enter sizes separated by commas (e.g., S, M, L, XL)"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Enter multiple sizes separated by commas
                </p>
              </div>
            )}

            {formData.type && (
              <Button type="submit" className="w-full">
                Add Product
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Product Tables */}
      <div className="space-y-6">
        {renderProductTable('sleeve', 'Sleeve Products')}
        {renderProductTable('rod', 'Rod Products')}
        {renderProductTable('pin', 'Pin Products')}
      </div>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product information
            </DialogDescription>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sizes</Label>
                <Input
                  value={editingSizesRaw}
                  onChange={(e) => setEditingSizesRaw(e.target.value)}
                  placeholder="Enter sizes separated by commas"
                />
                <p className="text-xs text-muted-foreground">Add a comma then type next size; trailing comma now preserved while editing.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}