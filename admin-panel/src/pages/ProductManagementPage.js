// ForgeTrack/admin-panel/src/pages/ProductManagementPage.jsx
import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const ProductManagementPage = () => {
    const [product, setProduct] = useState({
        type: 'Sleeve', // Default product type
        identifier: '', // Code or name
        sizes: [''], // Array of sizes, starting with one empty string
    });
    const [products, setProducts] = useState([]);
    const [editingProduct, setEditingProduct] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await api.get('/products');
            setProducts(response.data);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Failed to fetch products');
        }
    };

    const handleProductChange = (e) => {
        const { name, value } = e.target;
        setProduct(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSizeChange = (index, e) => {
        const newSizes = [...product.sizes];
        newSizes[index] = e.target.value;
        setProduct(prevState => ({ ...prevState, sizes: newSizes }));
    };

    const handleAddSize = () => {
        setProduct(prevState => ({ ...prevState, sizes: [...prevState.sizes, ''] }));
    };

    const handleRemoveSize = (index) => {
        const newSizes = product.sizes.filter((_, i) => i !== index);
        setProduct(prevState => ({ ...prevState, sizes: newSizes }));
    };

    const resetForm = () => {
        setProduct({ type: 'Sleeve', identifier: '', sizes: [''] });
        setEditingProduct(null);
        setError(null);
        setSuccess(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        // Basic validation: ensure identifier is not empty and at least one size is provided
        if (!product.identifier || product.sizes.some(size => !size)) {
            setError("Product identifier and all size fields must be filled.");
            setLoading(false);
            return;
        }

        try {
            if (editingProduct) {
                await api.put(`/products/${editingProduct._id}`, {
                    type: product.type,
                    identifier: product.identifier,
                    sizes: product.sizes
                });
                setSuccess("Product updated successfully!");
            } else {
                await api.post('/products', {
                    type: product.type,
                    identifier: product.identifier,
                    sizes: product.sizes
                });
                setSuccess("Product added successfully!");
            }
            // Reset form after successful submission
            resetForm();
            await fetchProducts();
        } catch (err) {
            console.error('Error saving product:', err);
            setError(err.response?.data?.message || 'Failed to save product.');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (prod) => {
        setProduct({
            type: prod.type,
            identifier: prod.identifier,
            sizes: prod.sizes.map(s => s.size)
        });
        setEditingProduct(prod);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (productId) => {
        if (window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
            try {
                await api.delete(`/products/${productId}`);
                setSuccess('Product deleted successfully!');
                await fetchProducts();
            } catch (err) {
                console.error('Error deleting product:', err);
                setError(err.response?.data?.message || 'Failed to delete product');
            }
        }
    };

    // Group products by type
    const groupedProducts = products.reduce((groups, product) => {
        if (!groups[product.type]) {
            groups[product.type] = [];
        }
        groups[product.type].push(product);
        return groups;
    }, {});

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex-1">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Product Management</h1>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 max-w-2xl mx-auto mb-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                
                {success && <div className="p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50" role="alert">{success}</div>}
                {error && <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">{error}</div>}

                <form onSubmit={handleSubmit}>
                    {/* Product Type Selection */}
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">Product Type:</label>
                        <select
                            name="type"
                            value={product.type}
                            onChange={handleProductChange}
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required
                        >
                            <option value="Sleeve">Sleeve</option>
                            <option value="Rod">Rod</option>
                            <option value="Pin">Pin</option>
                        </select>
                    </div>

                    {/* Identifier Input (dynamic label) */}
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            {product.type === 'Sleeve' ? 'Product Code (e.g., A6, A2):' : 'Part Name (e.g., Honda, Bajaj):'}
                        </label>
                        <input
                            type="text"
                            name="identifier"
                            value={product.identifier}
                            onChange={handleProductChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            required
                        />
                    </div>

                    {/* Sizes Input (dynamic) */}
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Add Sizes ({product.type === 'Sleeve' ? 'e.g., 2-125' : 'e.g., STD, 1'}):
                        </label>
                        {product.sizes.map((size, index) => (
                            <div key={index} className="flex items-center mb-2">
                                <input
                                    type="text"
                                    value={size}
                                    onChange={(e) => handleSizeChange(index, e)}
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                                {product.sizes.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSize(index)}
                                        className="ml-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={handleAddSize}
                            className="mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                            + Add Another Size
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-blue-400"
                        >
                            {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                        </button>
                        {editingProduct && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            {/* Product Tables by Type */}
            <div className="space-y-8">
                {Object.entries(groupedProducts).map(([type, typeProducts]) => (
                    <div key={type} className="bg-white rounded-lg shadow-md border border-gray-200">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">{type} Products</h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full table-auto">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {type === 'Sleeve' ? 'Code' : 'Part Name'}
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sizes</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {typeProducts.map((prod) => (
                                            <tr key={prod._id}>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {prod.identifier}
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-900">
                                                    <div className="flex flex-wrap gap-1">
                                                        {prod.sizes.map((size, index) => (
                                                            <span
                                                                key={index}
                                                                className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded"
                                                            >
                                                                {size.size}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {new Date(prod.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleEdit(prod)}
                                                            className="text-indigo-600 hover:text-indigo-900"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(prod._id)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {typeProducts.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                        No {type.toLowerCase()} products found.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                
                {Object.keys(groupedProducts).length === 0 && (
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                        <p className="text-gray-600 text-center">No products found. Add your first product above!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductManagementPage;
