import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { WorkForm } from './employee/WorkForm';
import { LogOut, Wrench, Zap, Pin } from 'lucide-react';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'employee';
  name: string;
  department?: string;
}

interface EmployeePortalProps {
  user: User;
  onLogout: () => void;
}

type JobType = 'rod' | 'sleeve' | 'pin' | null;

export function EmployeePortal({ user, onLogout }: EmployeePortalProps) {
  const [selectedJob, setSelectedJob] = useState<JobType>(null);

  const jobOptions = [
    {
      type: 'rod' as const,
      title: 'Inside Job Rod',
      description: 'Work on rod components',
      icon: Wrench,
    },
    {
      type: 'sleeve' as const,
      title: 'Inside Job Sleeve',
      description: 'Work on sleeve components',
      icon: Zap,
    },
    {
      type: 'pin' as const,
      title: 'Inside Job Pin',
      description: 'Work on pin components',
      icon: Pin,
    },
  ];

  const handleJobComplete = () => {
    setSelectedJob(null);
  };

  if (selectedJob) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border p-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-medium text-card-foreground">
              {jobOptions.find(job => job.type === selectedJob)?.title}
            </h1>
            <p className="text-muted-foreground">Welcome, {user.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedJob(null)}>
              Back to Jobs
            </Button>
            <Button onClick={onLogout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>
        <main className="p-6">
          <WorkForm
            jobType={selectedJob}
            employeeId={user.id}
            onComplete={handleJobComplete}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-medium text-card-foreground">Employee Portal</h1>
          <p className="text-muted-foreground">Welcome, {user.name}</p>
        </div>
        <Button onClick={onLogout} variant="outline">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </header>
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-medium mb-6">Select Your Job Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {jobOptions.map((job) => {
              const Icon = job.icon;
              return (
                <Card
                  key={job.type}
                  className="cursor-pointer transition-all hover:shadow-md hover:scale-105"
                  onClick={() => setSelectedJob(job.type)}
                >
                  <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle>{job.title}</CardTitle>
                    <CardDescription>{job.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">Start Work</Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}