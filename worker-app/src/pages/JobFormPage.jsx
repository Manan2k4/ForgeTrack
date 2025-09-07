import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const JobFormPage = () => {
    const { jobType } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [products, setProducts] = useState({ sleeves: [], rods: [], pins: [] });
    const [formData, setFormData] = useState({
        code: '',
        partName: '',
        size: '',
        quantity: 1
    });
    const [availableSizes, setAvailableSizes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        // Reset form when job type changes
        setFormData({
            code: '',
            partName: '',
            size: '',
            quantity: 1
        });
        setAvailableSizes([]);
        setError('');
        setSuccess('');
    }, [jobType]);

    const fetchProducts = async () => {
        try {
            const response = await api.get('/products/for-workers');
            setProducts(response.data);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Failed to fetch product data');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Update available sizes when code or part name changes
        if (name === 'code' && jobType === 'Inside Job Sleeve') {
            const selectedSleeve = products.sleeves.find(s => s.code === value);
            setAvailableSizes(selectedSleeve ? selectedSleeve.sizes : []);
            setFormData(prev => ({ ...prev, size: '' }));
        } else if (name === 'partName' && (jobType === 'Inside Job Rod' || jobType === 'Inside Job Pin')) {
            const productArray = jobType === 'Inside Job Rod' ? products.rods : products.pins;
            const selectedProduct = productArray.find(p => p.partName === value);
            setAvailableSizes(selectedProduct ? selectedProduct.sizes : []);
            setFormData(prev => ({ ...prev, size: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const logData = {
                jobType,
                productDetails: {},
                quantity: parseInt(formData.quantity),
                workDate: new Date()
            };

            if (jobType === 'Inside Job Sleeve') {
                logData.productDetails = {
                    code: formData.code,
                    size: formData.size
                };
            } else {
                logData.productDetails = {
                    partName: formData.partName,
                    size: formData.size
                };
            }

            await api.post('/worker-logs', logData);
            setSuccess('Work logged successfully!');
            
            // Reset form
            setFormData({
                code: '',
                partName: '',
                size: '',
                quantity: 1
            });
            setAvailableSizes([]);
            
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        } catch (err) {
            console.error('Error logging work:', err);
            setError(err.response?.data?.message || 'Failed to log work');
        } finally {
            setLoading(false);
        }
    };

    const getJobIcon = () => {
        switch (jobType) {
            case 'Inside Job Sleeve': return '🔧';
            case 'Inside Job Rod': return '⚡';
            case 'Inside Job Pin': return '📌';
            default: return '🏭';
        }
    };

    const getJobColor = () => {
        switch (jobType) {
            case 'Inside Job Sleeve': return 'bg-blue-500';
            case 'Inside Job Rod': return 'bg-green-500';
            case 'Inside Job Pin': return 'bg-purple-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="mr-4 text-gray-600 hover:text-gray-900"
                            >
                                ← Back
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                                    <span className="mr-2">{getJobIcon()}</span>
                                    {jobType}
                                </h1>
                                <p className="text-gray-600">Worker: {user?.displayName}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="bg-white rounded-lg shadow-md border border-gray-200">
                        <div className={`${getJobColor()} text-white p-4 rounded-t-lg`}>
                            <h2 className="text-xl font-bold">Log Your Work</h2>
                            <p className="text-gray-100">Fill in the details of the work completed</p>
                        </div>
                        
                        <div className="p-6">
                            {success && (
                                <div className="p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50" role="alert">
                                    {success}
                                </div>
                            )}
                            {error && (
                                <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {jobType === 'Inside Job Sleeve' ? (
                                    <div>
                                        <label className="block text-gray-700 text-sm font-bold mb-2">
                                            Code*
                                        </label>
                                        <select
                                            name="code"
                                            value={formData.code}
                                            onChange={handleInputChange}
                                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            required
                                        >
                                            <option value="">Select Code</option>
                                            {products.sleeves.map((sleeve, index) => (
                                                <option key={index} value={sleeve.code}>
                                                    {sleeve.code}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-gray-700 text-sm font-bold mb-2">
                                            Part Name*
                                        </label>
                                        <select
                                            name="partName"
                                            value={formData.partName}
                                            onChange={handleInputChange}
                                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            required
                                        >
                                            <option value="">Select Part Name</option>
                                            {(jobType === 'Inside Job Rod' ? products.rods : products.pins).map((product, index) => (
                                                <option key={index} value={product.partName}>
                                                    {product.partName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-gray-700 text-sm font-bold mb-2">
                                        Part Size*
                                    </label>
                                    <select
                                        name="size"
                                        value={formData.size}
                                        onChange={handleInputChange}
                                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        required
                                        disabled={availableSizes.length === 0}
                                    >
                                        <option value="">
                                            {availableSizes.length === 0 ? 'Select code/part name first' : 'Select Size'}
                                        </option>
                                        {availableSizes.map((size, index) => (
                                            <option key={index} value={size}>
                                                {size}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-gray-700 text-sm font-bold mb-2">
                                        Number of Parts Worked*
                                    </label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        value={formData.quantity}
                                        onChange={handleInputChange}
                                        min="1"
                                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        required
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className={`flex-1 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 ${getJobColor()} hover:opacity-90`}
                                    >
                                        {loading ? 'Submitting...' : 'SUBMIT'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/dashboard')}
                                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default JobFormPage;