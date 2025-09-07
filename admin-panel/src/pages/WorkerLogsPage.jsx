import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const WorkerLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedWorker, setSelectedWorker] = useState('');
    const [workers, setWorkers] = useState([]);

    useEffect(() => {
        fetchLogs();
        fetchWorkers();
    }, []);

    useEffect(() => {
        filterLogs();
    }, [logs, selectedDate, selectedWorker]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await api.get('/worker-logs');
            setLogs(response.data);
        } catch (err) {
            console.error('Error fetching worker logs:', err);
            setError('Failed to fetch worker logs');
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkers = async () => {
        try {
            const response = await api.get('/employees');
            const workersList = response.data.filter(emp => emp.role === 'worker');
            setWorkers(workersList);
        } catch (err) {
            console.error('Error fetching workers:', err);
        }
    };

    const filterLogs = () => {
        let filtered = logs;

        if (selectedDate) {
            filtered = filtered.filter(log => {
                const logDate = new Date(log.workDate).toDateString();
                const filterDate = new Date(selectedDate).toDateString();
                return logDate === filterDate;
            });
        }

        if (selectedWorker) {
            filtered = filtered.filter(log => log.worker._id === selectedWorker);
        }

        setFilteredLogs(filtered);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getProductDisplay = (log) => {
        if (log.jobType === 'Inside Job Sleeve') {
            return `${log.productDetails.code} - ${log.productDetails.size}`;
        } else {
            return `${log.productDetails.partName} - ${log.productDetails.size}`;
        }
    };

    // Group logs by date
    const groupedLogs = filteredLogs.reduce((groups, log) => {
        const date = formatDate(log.workDate);
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(log);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedLogs).sort((a, b) => new Date(b) - new Date(a));

    if (loading) {
        return (
            <div className="p-6 bg-gray-50 min-h-screen">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-600">Loading worker logs...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Worker Logs</h1>

            {error && (
                <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Filter by Date:
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Filter by Worker:
                        </label>
                        <select
                            value={selectedWorker}
                            onChange={(e) => setSelectedWorker(e.target.value)}
                            className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        >
                            <option value="">All Workers</option>
                            {workers.map(worker => (
                                <option key={worker._id} value={worker._id}>
                                    {worker.displayName} ({worker.username})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="mt-4">
                    <button
                        onClick={() => {
                            setSelectedDate('');
                            setSelectedWorker('');
                        }}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Logs grouped by date */}
            {sortedDates.length === 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                    <p className="text-gray-600 text-center">No worker logs found.</p>
                </div>
            ) : (
                sortedDates.map(date => (
                    <div key={date} className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
                        <div className="p-4 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-800">{date}</h2>
                            <p className="text-sm text-gray-600">
                                {groupedLogs[date].length} log{groupedLogs[date].length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full table-auto">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worker</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {groupedLogs[date].map((log) => (
                                        <tr key={log._id}>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatTime(log.timestamp)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div>
                                                    <div className="font-medium">{log.worker.displayName}</div>
                                                    <div className="text-gray-500 text-xs">@{log.worker.username}</div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    log.jobType === 'Inside Job Sleeve' ? 'bg-blue-100 text-blue-800' :
                                                    log.jobType === 'Inside Job Rod' ? 'bg-green-100 text-green-800' :
                                                    'bg-purple-100 text-purple-800'
                                                }`}>
                                                    {log.jobType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {getProductDisplay(log)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <span className="font-semibold">{log.quantity}</span> parts
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default WorkerLogsPage;