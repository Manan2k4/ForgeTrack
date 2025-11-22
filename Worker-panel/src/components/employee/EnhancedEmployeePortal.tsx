import { useState, useCallback, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
// Single Entry (EnhancedWorkForm) temporarily disabled – kept as backup.
// import { EnhancedWorkForm } from './EnhancedWorkForm';
import { MultiWorkBatchForm } from './MultiWorkBatchForm';
import { DatabaseSetupGuide } from './DatabaseSetupGuide';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { toast } from 'sonner';
import databaseService from '../../services/databaseService';
import { 
  LogOut, 
  
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronRight,
  
  Database,
  CloudOff,
  RotateCcw
} from 'lucide-react';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'employee';
  name: string;
  department?: string;
}

interface EnhancedEmployeePortalProps {
  user: User;
  onLogout: () => void;
  isOnline: boolean;
}

type JobType = 'rod' | 'sleeve' | 'pin' | null;
type ViewMode = 'jobs' | 'work-form';

export function EnhancedEmployeePortal({ user, onLogout, isOnline }: EnhancedEmployeePortalProps) {
  const [selectedJob, setSelectedJob] = useState<JobType>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('jobs');
  // Force batch mode only; single entry disabled.
  const [batchMode, setBatchMode] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState({ isOnline: true, isDatabaseConnected: false });
  const [syncQueueLength, setSyncQueueLength] = useState(0);

  const jobOptions = [
    {
      type: 'rod' as const,
      title: 'Inside Job Rod',
      description: 'Work on rod components',
    },
    {
      type: 'sleeve' as const,
      title: 'Inside Job Sleeve',
      description: 'Work on sleeve components',
    },
    {
      type: 'pin' as const,
      title: 'Inside Job Pin',
      description: 'Work on pin components',
    },
  ];

  // Calculate today's stats and update connection status
  const updateConnectionStatus = useCallback(async () => {
    const status = databaseService.getConnectionStatus();
    const queueLength = databaseService.getSyncQueueLength();
    setConnectionStatus(status);
    setSyncQueueLength(queueLength);
  }, []);

  // Pull to refresh functionality
  const handleRefresh = useCallback(async () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    
  await updateConnectionStatus();
    
    // Try to sync any pending data
    if (connectionStatus.isDatabaseConnected && syncQueueLength > 0) {
      try {
        await databaseService.forceSync();
        toast.success('Data refreshed and synced!', {
          icon: '🔄',
        });
      } catch (error) {
        toast.success('Data refreshed!', {
          icon: '🔄',
        });
      }
    } else {
      toast.success('Data refreshed!', {
        icon: '🔄',
      });
    }
    
    // Simulate network request delay for UX
    await new Promise(resolve => setTimeout(resolve, 800));
  }, [updateConnectionStatus, connectionStatus.isDatabaseConnected, syncQueueLength]);

  const { containerRef, isRefreshing, pullDistance, isPulling } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: !connectionStatus.isOnline,
  });

  // Initialize connection status and stats
  useEffect(() => {
  updateConnectionStatus();
    
    // Set up periodic updates
    const interval = setInterval(() => {
      updateConnectionStatus();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [updateConnectionStatus]);

  const handleJobSelect = (jobType: JobType) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
    setSelectedJob(jobType);
    setViewMode('work-form');
    // keep batch mode pinned
    setBatchMode(true);
  };

  const handleJobComplete = () => {
    setSelectedJob(null);
    setViewMode('jobs');
    setBatchMode(true);
    updateConnectionStatus();
    
    // Success haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }
  };

  const handleBackToJobs = () => {
    setSelectedJob(null);
    setViewMode('jobs');
    setBatchMode(true);
  };

  // Get formatted time for last entry
  // No worker-facing log stats displayed

  if (viewMode === 'work-form' && selectedJob) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBackToJobs}>
                ←
              </Button>
              <div>
                <h1 className="font-medium text-gray-900">
                  {jobOptions.find(job => job.type === selectedJob)?.title}
                </h1>
                <p className="text-sm text-gray-500">Welcome, {user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-orange-500" />
              )}
              <Button onClick={onLogout} variant="ghost" size="sm">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>
        
        <main className="p-4 space-y-3">
          {/* Batch mode only – Single Entry toggle removed */}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="default" disabled>Batch Mode (Active)</Button>
            {/* <Button size="sm" variant="outline" onClick={() => setBatchMode(false)}>Single Entry</Button> */}
          </div>
          {/* Always render batch form; single entry kept commented below as backup */}
          <MultiWorkBatchForm
            jobType={selectedJob as any}
            employeeId={user.id}
            onComplete={handleJobComplete}
            isOnline={connectionStatus.isOnline}
          />
          {/** Backup single entry form – re-enable by uncommenting import & block
          <EnhancedWorkForm
            jobType={selectedJob as any}
            employeeId={user.id}
            onComplete={handleJobComplete}
            isOnline={connectionStatus.isOnline}
          />
          */}
        </main>
      </div>
    );
  }

  // History view removed per requirement

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-background relative overflow-auto"
    >
      {/* Pull to refresh indicator */}
      {isPulling && (
        <div 
          className="absolute top-0 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-200"
          style={{ 
            transform: `translate(-50%, ${Math.min(pullDistance - 20, 60)}px)`,
            opacity: Math.min(pullDistance / 100, 1)
          }}
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg border">
            <RefreshCw 
              className={`w-5 h-5 text-blue-600 ${
                isRefreshing ? 'animate-spin' : ''
              }`} 
            />
          </div>
        </div>
      )}

      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <span className="text-primary font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="font-medium text-card-foreground">Employee Portal</h1>
              <p className="text-sm text-muted-foreground">Welcome, {user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Connection status badges commented out */}
            {/**
            {connectionStatus.isDatabaseConnected ? (
              <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">
                <Database className="w-3 h-3" />
                <span>Synced</span>
              </div>
            ) : connectionStatus.isOnline ? (
              <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-full text-xs">
                <CloudOff className="w-3 h-3" />
                <span>Local</span>
                {syncQueueLength > 0 && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    {syncQueueLength}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs">
                <WifiOff className="w-3 h-3" />
                <span>Offline</span>
              </div>
            )}
            */}
            <Button onClick={onLogout} variant="ghost" size="sm">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6">

        {/* Job Selection */}
        <div>
          <h2 className="text-lg font-medium mb-4 text-gray-900">Select Your Job Type</h2>
          <div className="space-y-3">
            {jobOptions.map((job) => {
              return (
                <Card
                  key={job.type}
                  className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] bg-white/60 backdrop-blur-sm border-white/20"
                  onClick={() => handleJobSelect(job.type)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-base">{job.title}</CardTitle>
                        <CardDescription>{job.description}</CardDescription>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Connectivity Status section commented out
        <div>
          <h2 className="text-lg font-medium mb-4 text-gray-900">Connection Status</h2>
          <div className="grid grid-cols-1 gap-3">
            {connectionStatus.isDatabaseConnected ? (
              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Database Connected</h3>
                      <p className="text-sm text-green-100">Real-time sync enabled</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-medium">Sync When Online</h3>
                      <p className="text-sm text-orange-100">
                        {syncQueueLength > 0 
                          ? `${syncQueueLength} items to sync`
                          : 'Data saved locally'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        */}

        {/* Database Setup Guide */}
        <DatabaseSetupGuide connectionStatus={connectionStatus} />

        {/* Pull to refresh hint */}
        <div className="text-center text-sm text-gray-500 py-4">
          <p>Pull down to refresh your data</p>
        </div>
      </main>
    </div>
  );
}