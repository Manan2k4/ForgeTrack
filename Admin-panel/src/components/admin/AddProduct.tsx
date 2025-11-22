import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { toast } from 'sonner';
import { Package, Edit, Trash2, Plus } from 'lucide-react';
import { apiService } from '../../services/api';
import { toDMY } from '../../utils/date';

interface Product {
  id: string;
  type: 'sleeve' | 'rod' | 'pin';
  code?: string;
  partName?: string;
  sizes: string[];
  createdAt: string;
}

export function AddProduct() {
  const [products, setProducts] = useState<Product[]>([]);
  const partNameSuggestions = Array.from(new Set(products.filter(p => !!p.partName).map(p => p.partName!)));
  const sizeSuggestions = Array.from(new Set(products.flatMap(p => p.sizes || [])));
  // Collect historical size sets (joined string) for datalist suggestions
  const sizeSetSuggestions = Array.from(new Set(products.map(p => (p.sizes || []).join(', ')).filter(s => s))).slice(0, 15);
  const [formData, setFormData] = useState({
    type: '',
    code: '',
    partName: '',
    sizes: ''
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const resp = await apiService.getProducts();
      const list = (resp.data || []).map((p: any) => ({
        id: p._id || p.id,
        type: p.type,
        code: p.code,
        partName: p.partName,
        sizes: p.sizes || [],
        createdAt: p.createdAt,
      })) as Product[];
      setProducts(list);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load products');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      const sizesArray = formData.sizes.split(',').map(s => s.trim()).filter(s => s);
      await apiService.createProduct({
        type: formData.type,
        code: formData.type === 'sleeve' ? formData.code : undefined,
        partName: formData.type !== 'sleeve' ? formData.partName : undefined,
        sizes: sizesArray,
      });

      setFormData({ type: '', code: '', partName: '', sizes: '' });
      await loadProducts();
      toast.success('Product added successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add product');
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    try {
      await apiService.updateProduct(editingProduct.id, {
        sizes: editingProduct.sizes,
        ...(editingProduct.type === 'sleeve' ? { code: editingProduct.code } : { partName: editingProduct.partName })
      });
      setEditingProduct(null);
      setIsEditDialogOpen(false);
      await loadProducts();
      toast.success('Product updated successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update product');
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      await apiService.deleteProduct(productId);
      await loadProducts();
      toast.success('Product deleted successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete product');
    }
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
                    <TableCell>{toDMY(product.createdAt)}</TableCell>
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
                  list="partName-suggestions"
                  value={formData.partName}
                  onChange={(e) => setFormData({...formData, partName: e.target.value})}
                  placeholder="Enter part name"
                  required
                />
                <datalist id="partName-suggestions">
                  {partNameSuggestions.map(name => (
                    <option key={name} value={name!} />
                  ))}
                </datalist>
              </div>
            )}

            {formData.type && (
              <div className="space-y-2">
                <Label htmlFor="sizes">Sizes</Label>
                <Input
                  id="sizes"
                  list="size-set-suggestions"
                  value={formData.sizes}
                  onChange={(e) => setFormData({...formData, sizes: e.target.value})}
                  placeholder="Enter sizes separated by commas (e.g., std, 1, 2, 3)"
                  required
                  autoComplete="off"
                />
                <datalist id="size-set-suggestions">
                  {sizeSetSuggestions.map(set => (
                    <option key={set} value={set} />
                  ))}
                </datalist>
                <p className="text-sm text-muted-foreground">Enter multiple sizes separated by commas</p>
                {sizeSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {sizeSuggestions.slice(0, 12).map(sz => (
                      <button
                        type="button"
                        key={sz}
                        className="text-xs px-2 py-1 border rounded hover:bg-muted"
                        onClick={() => {
                          const parts = formData.sizes.split(',').map(s => s.trim()).filter(Boolean);
                          if (!parts.includes(sz)) parts.push(sz);
                          setFormData({ ...formData, sizes: parts.join(', ') });
                        }}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                )}
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
              {editingProduct.type === 'sleeve' ? (
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input
                    value={editingProduct.code || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, code: e.target.value })}
                    placeholder="Update code"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Part Name</Label>
                  <Input
                    value={editingProduct.partName || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, partName: e.target.value })}
                    placeholder="Update part name"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Sizes</Label>
                <Input
                  value={editingProduct.sizes.join(', ')}
                  onChange={(e) => {
                    const sizes = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                    setEditingProduct({ ...editingProduct, sizes });
                  }}
                  placeholder="Enter sizes separated by commas"
                />
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