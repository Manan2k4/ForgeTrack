import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const jobTypes = [
        {
            name: 'Inside Job Sleeve',
            description: 'Work on sleeve products',
            color: 'bg-blue-500 hover:bg-blue-600',
            icon: '🔧'
        },
        {
            name: 'Inside Job Rod',
            description: 'Work on rod products',
            color: 'bg-green-500 hover:bg-green-600',
            icon: '⚡'
        },
        {
            name: 'Inside Job Pin',
            description: 'Work on pin products',
            color: 'bg-purple-500 hover:bg-purple-600',
            icon: '📌'
        }
    ];

    const handleJobSelect = (jobType) => {
        navigate(`/job/${encodeURIComponent(jobType)}`);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">ForgeTrack Worker Portal</h1>
                            <p className="text-gray-600">Welcome, {user?.displayName}!</p>
                        </div>
                        <button
                            onClick={logout}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            Select Your Job Type
                        </h2>
                        <p className="text-gray-600">
                            Choose the type of work you want to log today
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {jobTypes.map((job, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200"
                            >
                                <div className="p-6">
                                    <div className="text-center">
                                        <div className="text-4xl mb-4">{job.icon}</div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {job.name}
                                        </h3>
                                        <p className="text-gray-600 mb-4">
                                            {job.description}
                                        </p>
                                        <button
                                            onClick={() => handleJobSelect(job.name)}
                                            className={`w-full text-white font-bold py-3 px-4 rounded focus:outline-none focus:shadow-outline transition-colors duration-200 ${job.color}`}
                                        >
                                            Select
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* User Info */}
                    <div className="mt-12 bg-white rounded-lg shadow-md border border-gray-200 max-w-2xl mx-auto">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-gray-700">Name:</span>
                                    <span className="ml-2 text-gray-600">{user?.displayName}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Username:</span>
                                    <span className="ml-2 text-gray-600">{user?.username}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Department:</span>
                                    <span className="ml-2 text-gray-600">{user?.department || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="font-medium text-gray-700">Role:</span>
                                    <span className="ml-2 text-gray-600 capitalize">{user?.role}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;