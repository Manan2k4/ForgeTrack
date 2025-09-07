import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const EmployeeManagementPage = () => {
    const [employees, setEmployees] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [employee, setEmployee] = useState({
        displayName: '',
        username: '',
        password: '',
        contact: '',
        address: '',
        department: '',
        role: 'worker'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const departments = ['Production', 'Quality Control', 'Maintenance', 'Assembly', 'Packaging', 'Other'];

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const response = await api.get('/employees');
            setEmployees(response.data);
        } catch (err) {
            console.error('Error fetching employees:', err);
            setError('Failed to fetch employees');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEmployee(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setEmployee({
            displayName: '',
            username: '',
            password: '',
            contact: '',
            address: '',
            department: '',
            role: 'worker'
        });
        setEditingEmployee(null);
        setShowAddForm(false);
        setError(null);
        setSuccess(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (editingEmployee) {
                // Update employee (excluding password and username)
                const { password, username, ...updateData } = employee;
                await api.put(`/employees/${editingEmployee._id}`, updateData);
                setSuccess('Employee updated successfully!');
            } else {
                // Add new employee
                await api.post('/employees/register', employee);
                setSuccess('Employee added successfully!');
            }
            await fetchEmployees();
            resetForm();
        } catch (err) {
            console.error('Error saving employee:', err);
            setError(err.response?.data?.message || 'Failed to save employee');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (emp) => {
        setEmployee({
            displayName: emp.displayName,
            username: emp.username,
            password: '', // Don't populate password
            contact: emp.contact || '',
            address: emp.address || '',
            department: emp.department || '',
            role: emp.role
        });
        setEditingEmployee(emp);
        setShowAddForm(true);
    };

    const handleDelete = async (empId) => {
        if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
            try {
                await api.delete(`/employees/${empId}`);
                setSuccess('Employee deleted successfully!');
                await fetchEmployees();
            } catch (err) {
                console.error('Error deleting employee:', err);
                setError(err.response?.data?.message || 'Failed to delete employee');
            }
        }
    };

    const handleToggleStatus = async (empId) => {
        try {
            await api.put(`/employees/${empId}/toggle-status`);
            setSuccess('Employee status updated successfully!');
            await fetchEmployees();
        } catch (err) {
            console.error('Error toggling employee status:', err);
            setError(err.response?.data?.message || 'Failed to update employee status');
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Employee Management</h1>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Add Employee
                </button>
            </div>

            {/* Success/Error Messages */}
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

            {/* Add/Edit Employee Form */}
            {showAddForm && (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                    </h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Employee Name*
                            </label>
                            <input
                                type="text"
                                name="displayName"
                                value={employee.displayName}
                                onChange={handleInputChange}
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                required
                            />
                        </div>
                        
                        {!editingEmployee && (
                            <>
                                <div>
                                    <label className="block text-gray-700 text-sm font-bold mb-2">
                                        Username*
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={employee.username}
                                        onChange={handleInputChange}
                                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-700 text-sm font-bold mb-2">
                                        Password*
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={employee.password}
                                        onChange={handleInputChange}
                                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Contact*
                            </label>
                            <input
                                type="text"
                                name="contact"
                                value={employee.contact}
                                onChange={handleInputChange}
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                required={employee.role !== 'admin'}
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Address*
                            </label>
                            <input
                                type="text"
                                name="address"
                                value={employee.address}
                                onChange={handleInputChange}
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                required={employee.role !== 'admin'}
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Department*
                            </label>
                            <select
                                name="department"
                                value={employee.department}
                                onChange={handleInputChange}
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                required={employee.role !== 'admin'}
                            >
                                <option value="">Select Department</option>
                                {departments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Role*
                            </label>
                            <select
                                name="role"
                                value={employee.role}
                                onChange={handleInputChange}
                                className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                required
                            >
                                <option value="worker">Worker</option>
                                <option value="transporter">Transporter</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <div className="md:col-span-2 flex gap-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-blue-400"
                            >
                                {loading ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Add Employee'}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Employees Table */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <div className="p-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Employees</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full table-auto">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {employees.map((emp) => (
                                    <tr key={emp._id}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {emp.displayName}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {emp.username}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                emp.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                emp.role === 'worker' ? 'bg-blue-100 text-blue-800' :
                                                'bg-green-100 text-green-800'
                                            }`}>
                                                {emp.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {emp.contact || 'N/A'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {emp.department || 'N/A'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                emp.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {emp.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex gap-2">
                                                {emp.role !== 'admin' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEdit(emp)}
                                                            className="text-indigo-600 hover:text-indigo-900"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleStatus(emp._id)}
                                                            className={`${emp.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                                                        >
                                                            {emp.isActive ? 'Deactivate' : 'Activate'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(emp._id)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            Delete
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeManagementPage;