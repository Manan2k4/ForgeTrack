import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import databaseService from '../../services/databaseService';
import { 
  Calendar, 
  Package, 
  TrendingUp, 
  Filter,
  Clock,
  CheckCircle2,
  Wrench,
  Zap,
  Pin,
  RefreshCw,
  CloudOff,
  Database
} from 'lucide-react';

interface WorkLog {
  id: string;
  employeeId: string;
  employeeName: string;
  jobType: 'rod' | 'sleeve' | 'pin';
  code?: string;
  partName?: string;
  partSize: string;
  quantity: number;
  date: string;
  timestamp: string;
  offline?: boolean;
}

interface WorkHistoryProps {
  employeeId: string;
}

export function WorkHistory({ employeeId }: WorkHistoryProps) {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<WorkLog[]>([]);
  const [selectedJobType, setSelectedJobType] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('week');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({ isOnline: true, isDatabaseConnected: false });
  const [stats, setStats] = useState({
    totalParts: 0,
    totalEntries: 0,
    averagePerDay: 0,
    topJobType: ''
  });

  useEffect(() => {
    loadWorkLogs();
    
    // Monitor connection status
    const checkConnection = () => {
      const status = databaseService.getConnectionStatus();
      setConnectionStatus(status);
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);

    return () => clearInterval(interval);
  }, [employeeId]);

  useEffect(() => {
    filterLogs();
    calculateStats();
  }, [workLogs, selectedJobType, selectedPeriod]);

  const loadWorkLogs = async () => {
    setIsLoading(true);
    try {
      const employeeLogs = await databaseService.getWorkLogs(employeeId);
      const sortedLogs = employeeLogs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setWorkLogs(sortedLogs);
    } catch (error) {
      console.error('Failed to load work logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadWorkLogs();
  };

  const filterLogs = () => {
    let filtered = [...workLogs];

    // Filter by job type
    if (selectedJobType !== 'all') {
      filtered = filtered.filter(log => log.jobType === selectedJobType);
    }

    // Filter by time period
    const now = new Date();
    const startDate = new Date();
    
    switch (selectedPeriod) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'all':
      default:
        startDate.setFullYear(2000); // Show all
        break;
    }

    filtered = filtered.filter(log => 
      new Date(log.timestamp) >= startDate
    );

    setFilteredLogs(filtered);
  };

  const calculateStats = () => {
    if (filteredLogs.length === 0) {
      setStats({
        totalParts: 0,
        totalEntries: 0,
        averagePerDay: 0,
        topJobType: ''
      });
      return;
    }

    const totalParts = filteredLogs.reduce((sum, log) => sum + log.quantity, 0);
    const totalEntries = filteredLogs.length;

    // Calculate unique days with entries
    const uniqueDays = new Set(filteredLogs.map(log => log.date)).size;
    const averagePerDay = uniqueDays > 0 ? Math.round(totalParts / uniqueDays) : 0;

    // Find most common job type
    const jobTypeCounts = filteredLogs.reduce((acc, log) => {
      acc[log.jobType] = (acc[log.jobType] || 0) + log.quantity;
      return acc;
    }, {} as Record<string, number>);

    const topJobType = Object.entries(jobTypeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

    setStats({
      totalParts,
      totalEntries,
      averagePerDay,
      topJobType
    });
  };

  const getJobIcon = (jobType: string) => {
    switch (jobType) {
      case 'rod':
        return <Wrench className="w-4 h-4 text-blue-600" />;
      case 'sleeve':
        return <Zap className="w-4 h-4 text-green-600" />;
      case 'pin':
        return <Pin className="w-4 h-4 text-purple-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getJobColor = (jobType: string) => {
    switch (jobType) {
      case 'rod':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'sleeve':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pin':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: string) => {
    return new Date(date + 'T00:00:00').toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const groupLogsByDate = () => {
    return filteredLogs.reduce((groups, log) => {
      const date = log.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
      return groups;
    }, {} as Record<string, WorkLog[]>);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">{stats.totalParts}</div>
            <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
              <Package className="w-3 h-3" />
              Total Parts
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">{stats.totalEntries}</div>
            <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Entries
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">{stats.averagePerDay}</div>
            <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Per Day
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-sm font-medium text-gray-900 mb-1 capitalize">
              {stats.topJobType || 'None'}
            </div>
            <div className="text-sm text-gray-600">Top Job Type</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
            <div className="flex items-center gap-2">
              {connectionStatus.isDatabaseConnected ? (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  <Database className="w-3 h-3 mr-1" />
                  Synced
                </Badge>
              ) : (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  <CloudOff className="w-3 h-3 mr-1" />
                  Local
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Job Type</label>
              <Select value={selectedJobType} onValueChange={setSelectedJobType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Job Types</SelectItem>
                  <SelectItem value="rod">Rod</SelectItem>
                  <SelectItem value="sleeve">Sleeve</SelectItem>
                  <SelectItem value="pin">Pin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Period</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Log Entries */}
      <Card className="bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Work History
            <Badge variant="outline" className="ml-auto">
              {filteredLogs.length} entries
            </Badge>
          </CardTitle>
          <CardDescription>
            Your work entries {selectedPeriod !== 'all' ? `from the ${selectedPeriod}` : 'from all time'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No work entries found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupLogsByDate()).map(([date, logs]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="font-medium text-gray-900">{formatDate(date)}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {logs.reduce((sum, log) => sum + log.quantity, 0)} parts
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div
                        key={log.id}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                              {getJobIcon(log.jobType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`text-xs ${getJobColor(log.jobType)}`}>
                                  {log.jobType.toUpperCase()}
                                </Badge>
                                {log.offline && (
                                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                                    Offline
                                  </Badge>
                                )}
                              </div>
                              <p className="font-medium text-gray-900">
                                {log.code || log.partName}
                              </p>
                              <p className="text-sm text-gray-600">
                                Size: {log.partSize} • Quantity: {log.quantity}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(log.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {date !== Object.keys(groupLogsByDate()).slice(-1)[0] && (
                    <Separator className="mt-6" />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}