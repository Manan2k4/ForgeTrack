import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { 
  Database, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';

interface DatabaseSetupGuideProps {
  connectionStatus: {
    isOnline: boolean;
    isDatabaseConnected: boolean;
  };
}

export function DatabaseSetupGuide({ connectionStatus }: DatabaseSetupGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const mongoConnectionString = `MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.abcde.mongodb.net/employee_management?retryWrites=true&w=majority`;
  
  const jwtSecret = `JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random-${Date.now()}`;

  const envFileContent = `# MongoDB Atlas Connection String
# Replace the placeholders with your actual values
${mongoConnectionString}

# JWT Secret Key (generate a random secret)
${jwtSecret}

# Server Configuration
PORT=5000
FRONTEND_URL=http://localhost:3000`;

  if (connectionStatus.isDatabaseConnected) {
    return (
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-green-900">Database Connected</h3>
              <p className="text-sm text-green-700">MongoDB Atlas is connected and working perfectly!</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-blue-50/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-blue-900">
                    Connect to MongoDB Atlas
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    Enable real-time sync and persistent storage
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  Local Mode
                </Badge>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-blue-600" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-blue-600" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                The app works perfectly without a database connection! Your data is saved locally and will sync automatically when you connect to MongoDB Atlas.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h4 className="font-medium text-blue-900">Quick Setup Guide:</h4>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Create MongoDB Atlas Account</p>
                    <p className="text-gray-600">Sign up for free at mongodb.com/atlas</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Create Database User & Allow Network Access</p>
                    <p className="text-gray-600">Set up authentication and whitelist your IP</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Create backend/.env file</p>
                    <div className="mt-2 space-y-2">
                      <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs">
                        <pre className="whitespace-pre-wrap break-all">{envFileContent}</pre>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(envFileContent, 'env-file')}
                        className="text-xs"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        {copiedText === 'env-file' ? 'Copied!' : 'Copy .env content'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600 mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Start Backend Server</p>
                    <div className="bg-gray-50 rounded p-2 font-mono text-xs mt-1">
                      <code>cd backend && npm install && npm start</code>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('/MONGODB_ATLAS_SETUP.md', '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Detailed Guide
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('https://www.mongodb.com/atlas', '_blank')}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  MongoDB Atlas
                </Button>
              </div>

              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Already have a backend running?</strong> The app will automatically detect and connect to your MongoDB Atlas database when available.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}