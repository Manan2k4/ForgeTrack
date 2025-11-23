import React, { useState } from 'react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { AddEmployee } from './admin/AddEmployee';
import { ManageEmployees } from './admin/ManageEmployees';
import { AddProduct } from './admin/AddProduct';
import { AddParty } from './admin/AddParty';
import { AddJobType } from './admin/AddJobType';
import { ViewLogs } from './admin/ViewLogs';
import { TransporterLogs } from './admin/TransporterLogs';
import { LogOut, Users, UserPlus, Package, Activity, Menu, Truck, BarChart2 } from 'lucide-react';
import Analytics from './admin/Analytics';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'employee';
  name: string;
  department?: string;
}

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

type ActiveTab = 'add-employee' | 'manage-employees' | 'add-product' | 'add-party' | 'add-job-type' | 'view-logs' | 'transporter-logs' | 'analytics';

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  // Persist the last selected tab; force default to 'view-logs'
  const initialTab: ActiveTab = (() => {
    const saved = localStorage.getItem('adminActiveTab') as ActiveTab | null;
    if (saved === 'transporter-logs') {
      // override problematic selection to avoid blank state
      localStorage.setItem('adminActiveTab', 'view-logs');
      return 'view-logs';
    }
    return saved ?? 'view-logs';
  })();
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const sidebarItems = [
    { id: 'add-employee' as const, label: 'Add Employee', icon: UserPlus },
    { id: 'manage-employees' as const, label: 'Manage Employees', icon: Users },
    { id: 'add-product' as const, label: 'Add Product', icon: Package },
    { id: 'add-party' as const, label: 'Add Party', icon: Users },
    { id: 'add-job-type' as const, label: 'Add Job Type', icon: Activity },
    { id: 'view-logs' as const, label: 'View Logs', icon: Activity },
    { id: 'transporter-logs' as const, label: 'Transporter Logs', icon: Truck },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart2 },
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'add-employee':
        return <AddEmployee />;
      case 'manage-employees':
        return <ManageEmployees />;
      case 'add-product':
        return <AddProduct />;
      case 'add-party':
        return <AddParty />;
      case 'add-job-type':
        return <AddJobType />;
      case 'view-logs':
        return <ViewLogs />;
      case 'transporter-logs':
        return <TransporterLogs />;
      case 'analytics':
        return <Analytics />;
      default:
        return <ViewLogs />;
    }
  };

  const handleTabChange = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    // save selection so refresh stays on the same page
    localStorage.setItem('adminActiveTab', tabId);
    setIsMobileSidebarOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="p-4">
        <h2 className="font-medium text-sidebar-foreground">Admin Dashboard</h2>
        <p className="text-sm text-sidebar-foreground/70">Welcome, {user.name}</p>
      </div>
      <nav className="px-4 space-y-2 flex-1">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4">
        <Button 
          onClick={onLogout}
          variant="destructive"
          className="w-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-sidebar border-r border-sidebar-border flex-col">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar border-sidebar-border p-0 flex flex-col">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
            </Sheet>
            <h1 className="text-xl lg:text-2xl font-medium text-card-foreground truncate">
              {sidebarItems.find(item => item.id === activeTab)?.label}
            </h1>
          </div>
          <Button 
            onClick={onLogout}
            variant="destructive"
            size="sm"
            className="lg:hidden"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {renderActiveComponent()}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;