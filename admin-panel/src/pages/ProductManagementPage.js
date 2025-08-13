// ForgeTrack/admin-panel/src/pages/ProductManagementPage.jsx
import React, { useState } from 'react';
import api from '../utils/api';

const ProductManagementPage = () => {
    const [product, setProduct] = useState({
        type: 'Sleeve', // Default product type
        identifier: '', // Code or name
        sizes: [''], // Array of sizes, starting with one empty string
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

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
            await api.post('/products', {
                type: product.type,
                identifier: product.identifier,
                sizes: product.sizes
            });
            setSuccess("Product added successfully!");
            // Reset form after successful submission
            setProduct({ type: 'Sleeve', identifier: '', sizes: [''] });
        } catch (err) {
            console.error('Error adding product:', err);
            setError(err.response?.data?.message || 'Failed to add product.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen flex-1">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Add New Product</h1>

            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 max-w-2xl mx-auto">
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
                            {product.type === 'Sleeve' ? 'Product Code (e.g., A6, A2):' : 'Brand Name (e.g., Honda, Bajaj):'}
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:bg-blue-400"
                    >
                        {loading ? 'Adding Product...' : 'Add Product'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProductManagementPage;
