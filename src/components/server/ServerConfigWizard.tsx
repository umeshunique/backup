import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ServerConfig, EnvironmentType, DatabaseType } from '@/types/backup.types';
import { apiClient } from '@/services/apiClient';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  Loader2,
  Wifi,
  WifiOff,
  Server,
  Database,
  Shield,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Lock,
  Key,
  Globe,
  Zap,
  Clock,
  RefreshCw,
  Terminal,
  HardDrive,
  Network,
  Gauge,
  Info,
} from 'lucide-react';

// Form schema with advanced options
const serverSchema = z.object({
  // Basic Info
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().optional(),
  environment: z.enum(['development', 'staging', 'uat', 'production', 'dr']),
  tags: z.string().optional(),

  // Connection
  databaseType: z.enum(['mysql', 'mssql', 'postgresql']),
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().min(1).max(65535, 'Port must be between 1 and 65535'),

  // Authentication
  authMethod: z.enum(['password', 'integrated', 'certificate']),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  saveCredentials: z.boolean().default(true),

  // SSL/TLS
  sslEnabled: z.boolean().default(false),
  sslMode: z.enum(['disable', 'prefer', 'require', 'verify-ca', 'verify-full']).default('disable'),
  sslCertPath: z.string().optional(),
  sslKeyPath: z.string().optional(),
  sslCaPath: z.string().optional(),

  // SSH Tunnel
  sshEnabled: z.boolean().default(false),
  sshHost: z.string().optional(),
  sshPort: z.coerce.number().optional(),
  sshUsername: z.string().optional(),
  sshAuthMethod: z.enum(['password', 'key']).default('password'),
  sshPassword: z.string().optional(),
  sshKeyPath: z.string().optional(),

  // Connection Pool
  poolEnabled: z.boolean().default(true),
  poolMin: z.coerce.number().min(0).max(100).default(2),
  poolMax: z.coerce.number().min(1).max(100).default(10),
  poolIdleTimeout: z.coerce.number().min(1000).default(30000),

  // Timeouts
  connectionTimeout: z.coerce.number().min(1000).default(15000),
  requestTimeout: z.coerce.number().min(1000).default(30000),

  // Status
  isActive: z.boolean().default(true),
});

type ServerFormValues = z.infer<typeof serverSchema>;

// Wizard Steps
const steps = [
  { id: 'basic', label: 'Basic Info', icon: Server, description: 'Name and environment' },
  { id: 'connection', label: 'Connection', icon: Database, description: 'Database connection details' },
  { id: 'security', label: 'Security', icon: Shield, description: 'SSL/TLS and authentication' },
  { id: 'advanced', label: 'Advanced', icon: Settings, description: 'Pool and timeout settings' },
  { id: 'test', label: 'Test & Save', icon: CheckCircle2, description: 'Verify and complete' },
];

interface ServerConfigWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: ServerConfig | null;
  onSave: (data: Omit<ServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

// Environment configuration
const environmentConfig: Record<EnvironmentType, { color: string; bgColor: string; icon: string }> = {
  development: { color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20', icon: '🛠️' },
  staging: { color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20', icon: '🧪' },
  uat: { color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20', icon: '🔬' },
  production: { color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/20', icon: '🚀' },
  dr: { color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20', icon: '🔄' },
};

// Database type configuration
const databaseConfig: Record<DatabaseType, { name: string; icon: string; defaultPort: number; color: string }> = {
  mysql: { name: 'MySQL', icon: '🐬', defaultPort: 3306, color: 'text-orange-400' },
  mssql: { name: 'SQL Server', icon: '🔷', defaultPort: 1433, color: 'text-blue-400' },
  postgresql: { name: 'PostgreSQL', icon: '🐘', defaultPort: 5432, color: 'text-sky-400' },
};

export function ServerConfigWizard({
  open,
  onOpenChange,
  server,
  onSave,
}: ServerConfigWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectionTest, setConnectionTest] = useState<{
    status: 'idle' | 'testing' | 'success' | 'failed';
    message: string;
    details?: {
      latency?: number;
      version?: string;
      databases?: string[];
    };
  }>({ status: 'idle', message: '' });

  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      name: '',
      description: '',
      environment: 'development',
      tags: '',
      databaseType: 'mysql',
      host: 'localhost',
      port: 3306,
      authMethod: 'password',
      username: '',
      password: '',
      saveCredentials: true,
      sslEnabled: false,
      sslMode: 'disable',
      sslCertPath: '',
      sslKeyPath: '',
      sslCaPath: '',
      sshEnabled: false,
      sshHost: '',
      sshPort: 22,
      sshUsername: '',
      sshAuthMethod: 'password',
      sshPassword: '',
      sshKeyPath: '',
      poolEnabled: true,
      poolMin: 2,
      poolMax: 10,
      poolIdleTimeout: 30000,
      connectionTimeout: 15000,
      requestTimeout: 30000,
      isActive: true,
    },
  });

  // Reset form when dialog opens/closes or server changes
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setConnectionTest({ status: 'idle', message: '' });
      
      if (server) {
        form.reset({
          name: server.name,
          description: '',
          environment: server.environment,
          tags: '',
          databaseType: server.databaseType,
          host: server.host,
          port: server.port,
          authMethod: 'password',
          username: server.username,
          password: server.password && String(server.password).trim() ? String(server.password) : '********',
          saveCredentials: true,
          sslEnabled: false,
          sslMode: 'disable',
          poolEnabled: true,
          poolMin: 2,
          poolMax: 10,
          poolIdleTimeout: 30000,
          connectionTimeout: 15000,
          requestTimeout: 30000,
          isActive: server.isActive ?? true,
        });
      } else {
        form.reset();
      }
    }
  }, [open, server, form]);

  // Watch database type to update port
  const databaseType = form.watch('databaseType');
  useEffect(() => {
    if (!server) {
      form.setValue('port', databaseConfig[databaseType].defaultPort);
    }
  }, [databaseType, form, server]);

  // Test connection
  const handleTestConnection = async () => {
    setConnectionTest({ status: 'testing', message: 'Connecting...' });
    const startTime = Date.now();

    try {
      const values = form.getValues();
      const result = await apiClient.testConnection({
        host: values.host,
        port: values.port,
        user: values.username,
        password: values.password,
        type: values.databaseType,
      });

      const latency = Date.now() - startTime;

      if (result.success) {
        // Try to get databases list
        let databases: string[] = [];
        try {
          const dbResult = await apiClient.getDatabases({
            host: values.host,
            port: values.port,
            user: values.username,
            password: values.password,
            type: values.databaseType,
          });
          if (dbResult.success) {
            databases = dbResult.databases;
          }
        } catch (e) {
          // Ignore
        }

        setConnectionTest({
          status: 'success',
          message: 'Connection successful!',
          details: {
            latency,
            databases,
          },
        });
      } else {
        setConnectionTest({
          status: 'failed',
          message: result.message || 'Connection failed',
        });
      }
    } catch (error: any) {
      setConnectionTest({
        status: 'failed',
        message: error.message || 'Failed to connect to database',
      });
    }
  };

  // Map form fields to wizard steps so we can jump to the step with the first validation error
  const getStepForField = (field: string): number => {
    const step0 = ['name', 'description', 'environment', 'tags'];
    const step1 = ['host', 'port', 'databaseType'];
    const step2 = ['username', 'password', 'authMethod', 'sslEnabled', 'sslMode', 'sslCertPath', 'sslKeyPath', 'sslCaPath', 'sshEnabled', 'sshHost', 'sshPort', 'sshUsername', 'sshAuthMethod', 'sshPassword', 'sshKeyPath'];
    const step3 = ['poolEnabled', 'poolMin', 'poolMax', 'poolIdleTimeout', 'connectionTimeout', 'requestTimeout', 'isActive'];
    if (step0.includes(field)) return 0;
    if (step1.includes(field)) return 1;
    if (step2.includes(field)) return 2;
    if (step3.includes(field)) return 3;
    return 0;
  };

  const onValidationError = (errors: Record<string, { message?: string }>) => {
    const firstField = Object.keys(errors)[0];
    const message = firstField && errors[firstField]?.message
      ? `${errors[firstField].message} (${firstField})`
      : 'Please fix the form errors before saving.';
    toast({
      title: 'Cannot save',
      description: message,
      variant: 'destructive',
    });
    if (firstField) {
      setCurrentStep(getStepForField(firstField));
    }
  };

  // Submit form
  const onSubmit = async (data: ServerFormValues) => {
    setIsSubmitting(true);
    try {
      const isEdit = !!server;
      const passwordUnchanged = data.password === '' || data.password === '********';
      const serverData: Omit<ServerConfig, 'id' | 'createdAt' | 'updatedAt'> = {
        name: data.name,
        environment: data.environment,
        host: data.host,
        port: data.port,
        databaseType: data.databaseType,
        username: data.username,
        password: (isEdit && passwordUnchanged) ? (server!.password || '') : data.password,
        isActive: data.isActive,
        connectionStatus: connectionTest.status === 'success' ? 'connected' : 'disconnected',
      };

      await onSave(serverData);
      form.reset();
      setCurrentStep(0);
    } catch (error) {
      console.error('Failed to save server:', error);
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to save server. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigation
  const canGoNext = () => {
    switch (currentStep) {
      case 0: // Basic
        return form.watch('name') && form.watch('environment');
      case 1: // Connection
        return form.watch('host') && form.watch('port') && form.watch('databaseType');
      case 2: // Security
        return form.watch('username') && form.watch('password');
      case 3: // Advanced
        return true;
      case 4: // Test — allow saving with or without successful connection (flexible add)
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only">{server ? 'Edit Server' : 'Add Server'}</DialogTitle>
        <DialogDescription className="sr-only">
          {server ? 'Edit database server connection settings.' : 'Add a new database server connection.'}
        </DialogDescription>
        <div className="flex h-full">
          {/* Sidebar - Steps */}
          <div className="w-64 bg-muted/30 border-r p-4 hidden md:block">
            <div className="space-y-1 mb-6">
              <h3 className="font-semibold text-lg">
                {server ? 'Edit Server' : 'Add Server'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Configure database connection
              </p>
            </div>

            <div className="space-y-1">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;

                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(index)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
                      isActive && 'bg-primary/10 text-primary border border-primary/20',
                      !isActive && isCompleted && 'text-muted-foreground hover:bg-muted',
                      !isActive && !isCompleted && 'text-muted-foreground/50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        isActive && 'bg-primary text-primary-foreground',
                        isCompleted && 'bg-green-500/20 text-green-500',
                        !isActive && !isCompleted && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{step.label}</div>
                      <div className="text-xs text-muted-foreground">{step.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Mobile Steps Indicator */}
            <div className="md:hidden p-4 border-b">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Step {currentStep + 1} of {steps.length}
                </span>
                <Badge variant="outline">{steps[currentStep].label}</Badge>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Form Content */}
            <ScrollArea className="flex-1">
              <Form {...form}>
                <form className="p-6 space-y-6">
                  {/* Step 0: Basic Info */}
                  {currentStep === 0 && (
                    <div className="space-y-6 animate-fade-in">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">Basic Information</h2>
                        <p className="text-muted-foreground text-sm">
                          Give your server a name and select its environment.
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Server Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., Production MySQL, Dev Database" 
                                className="h-11"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              A friendly name to identify this server
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Brief description of this server" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="environment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Environment *</FormLabel>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                              {(Object.keys(environmentConfig) as EnvironmentType[]).map((env) => {
                                const config = environmentConfig[env];
                                const isSelected = field.value === env;
                                return (
                                  <Card
                                    key={env}
                                    className={cn(
                                      'cursor-pointer transition-all hover:border-primary/50',
                                      isSelected && 'border-primary bg-primary/5',
                                      !isSelected && config.bgColor
                                    )}
                                    onClick={() => field.onChange(env)}
                                  >
                                    <CardContent className="p-4 flex items-center gap-3">
                                      <span className="text-2xl">{config.icon}</span>
                                      <div>
                                        <div className={cn('font-medium capitalize', config.color)}>
                                          {env}
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                                      )}
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tags (Optional)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., critical, backup-daily, team-backend" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Comma-separated tags for organization
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Step 1: Connection Details */}
                  {currentStep === 1 && (
                    <div className="space-y-6 animate-fade-in">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">Connection Details</h2>
                        <p className="text-muted-foreground text-sm">
                          Configure the database type and connection settings.
                        </p>
                      </div>

                      <FormField
                        control={form.control}
                        name="databaseType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Database Type *</FormLabel>
                            <div className="grid grid-cols-3 gap-3 pt-2">
                              {(Object.keys(databaseConfig) as DatabaseType[]).map((dbType) => {
                                const config = databaseConfig[dbType];
                                const isSelected = field.value === dbType;
                                return (
                                  <Card
                                    key={dbType}
                                    className={cn(
                                      'cursor-pointer transition-all hover:border-primary/50',
                                      isSelected && 'border-primary bg-primary/5'
                                    )}
                                    onClick={() => field.onChange(dbType)}
                                  >
                                    <CardContent className="p-4 text-center">
                                      <span className="text-3xl block mb-2">{config.icon}</span>
                                      <div className={cn('font-medium', config.color)}>
                                        {config.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Port: {config.defaultPort}
                                      </div>
                                      {isSelected && (
                                        <CheckCircle2 className="h-4 w-4 text-primary mx-auto mt-2" />
                                      )}
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="host"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Host / IP Address *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    placeholder="localhost or 192.168.1.100" 
                                    className="pl-10 h-11"
                                    {...field} 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="port"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Port *</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Network className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input 
                                    type="number" 
                                    className="pl-10 h-11"
                                    {...field} 
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Connection Preview */}
                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <span className="text-xl">
                                {databaseConfig[form.watch('databaseType')].icon}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-medium">Connection String Preview</div>
                              <code className="text-xs text-muted-foreground font-mono">
                                {form.watch('databaseType')}://{form.watch('host')}:{form.watch('port')}
                              </code>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Step 2: Security */}
                  {currentStep === 2 && (
                    <div className="space-y-6 animate-fade-in">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">Security & Authentication</h2>
                        <p className="text-muted-foreground text-sm">
                          Configure authentication and security settings.
                        </p>
                      </div>

                      <Tabs defaultValue="auth" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="auth">Authentication</TabsTrigger>
                          <TabsTrigger value="ssl">SSL/TLS</TabsTrigger>
                          <TabsTrigger value="ssh">SSH Tunnel</TabsTrigger>
                        </TabsList>

                        <TabsContent value="auth" className="space-y-4 pt-4">
                          <FormField
                            control={form.control}
                            name="authMethod"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Authentication Method</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger className="h-11">
                                      <SelectValue placeholder="Select authentication method" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="password">
                                      <div className="flex items-center gap-2">
                                        <Key className="h-4 w-4" />
                                        Username & Password
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="integrated">
                                      <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        Windows Integrated (MSSQL)
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="certificate">
                                      <div className="flex items-center gap-2">
                                        <Lock className="h-4 w-4" />
                                        Certificate
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Username *</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input 
                                        placeholder="root" 
                                        className="pl-10 h-11"
                                        autoComplete="username"
                                        {...field} 
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Password *</FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input 
                                        type="password" 
                                        placeholder="••••••••" 
                                        className="pl-10 h-11"
                                        autoComplete={server ? 'current-password' : 'new-password'}
                                        {...field} 
                                      />
                                    </div>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="saveCredentials"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base">Save Credentials</FormLabel>
                                  <FormDescription>
                                    Store credentials securely for automatic connections
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </TabsContent>

                        <TabsContent value="ssl" className="space-y-4 pt-4">
                          <FormField
                            control={form.control}
                            name="sslEnabled"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-green-500" />
                                    Enable SSL/TLS
                                  </FormLabel>
                                  <FormDescription>
                                    Encrypt connection to the database server
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {form.watch('sslEnabled') && (
                            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                              <FormField
                                control={form.control}
                                name="sslMode"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>SSL Mode</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select SSL mode" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="prefer">Prefer (recommended)</SelectItem>
                                        <SelectItem value="require">Require</SelectItem>
                                        <SelectItem value="verify-ca">Verify CA</SelectItem>
                                        <SelectItem value="verify-full">Verify Full</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="grid grid-cols-1 gap-4">
                                <FormField
                                  control={form.control}
                                  name="sslCaPath"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>CA Certificate Path (Optional)</FormLabel>
                                      <FormControl>
                                        <Input placeholder="/path/to/ca.pem" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="ssh" className="space-y-4 pt-4">
                          <FormField
                            control={form.control}
                            name="sshEnabled"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-base flex items-center gap-2">
                                    <Terminal className="h-4 w-4 text-amber-500" />
                                    Enable SSH Tunnel
                                  </FormLabel>
                                  <FormDescription>
                                    Connect through an SSH tunnel for remote databases
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {form.watch('sshEnabled') && (
                            <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name="sshHost"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>SSH Host</FormLabel>
                                      <FormControl>
                                        <Input placeholder="ssh.example.com" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="sshPort"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>SSH Port</FormLabel>
                                      <FormControl>
                                        <Input type="number" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name="sshUsername"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>SSH Username</FormLabel>
                                    <FormControl>
                                      <Input placeholder="ubuntu" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}

                  {/* Step 3: Advanced */}
                  {currentStep === 3 && (
                    <div className="space-y-6 animate-fade-in">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">Advanced Settings</h2>
                        <p className="text-muted-foreground text-sm">
                          Configure connection pool and timeout settings.
                        </p>
                      </div>

                      {/* Connection Pool */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Zap className="h-4 w-4 text-amber-500" />
                            Connection Pool
                          </CardTitle>
                          <CardDescription>
                            Manage connection pooling for better performance
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="poolEnabled"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Enable Connection Pooling</FormLabel>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          {form.watch('poolEnabled') && (
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="poolMin"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Min Connections</FormLabel>
                                    <FormControl>
                                      <div className="space-y-2">
                                        <Slider
                                          min={0}
                                          max={20}
                                          step={1}
                                          value={[field.value]}
                                          onValueChange={(value) => field.onChange(value[0])}
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                          <span>0</span>
                                          <span className="font-medium text-foreground">{field.value}</span>
                                          <span>20</span>
                                        </div>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="poolMax"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Max Connections</FormLabel>
                                    <FormControl>
                                      <div className="space-y-2">
                                        <Slider
                                          min={1}
                                          max={100}
                                          step={1}
                                          value={[field.value]}
                                          onValueChange={(value) => field.onChange(value[0])}
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                          <span>1</span>
                                          <span className="font-medium text-foreground">{field.value}</span>
                                          <span>100</span>
                                        </div>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Timeouts */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Clock className="h-4 w-4 text-blue-500" />
                            Timeouts
                          </CardTitle>
                          <CardDescription>
                            Configure connection and request timeouts
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="connectionTimeout"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Connection Timeout (ms)</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    {(field.value / 1000).toFixed(1)}s
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="requestTimeout"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Request Timeout (ms)</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    {(field.value / 1000).toFixed(1)}s
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Server Status */}
                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Server Active</FormLabel>
                              <FormDescription>
                                Inactive servers won't be available for backups
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Step 4: Test & Save */}
                  {currentStep === 4 && (
                    <div className="space-y-6 animate-fade-in">
                      <div>
                        <h2 className="text-xl font-semibold mb-1">Test Connection & Save</h2>
                        <p className="text-muted-foreground text-sm">
                          Verify your connection settings before saving.
                        </p>
                      </div>

                      {/* Configuration Summary */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Configuration Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Server Name:</span>
                              <p className="font-medium">{form.watch('name')}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Environment:</span>
                              <p className="font-medium capitalize">
                                {environmentConfig[form.watch('environment')].icon}{' '}
                                {form.watch('environment')}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Database Type:</span>
                              <p className="font-medium">
                                {databaseConfig[form.watch('databaseType')].icon}{' '}
                                {databaseConfig[form.watch('databaseType')].name}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Connection:</span>
                              <p className="font-medium font-mono text-xs">
                                {form.watch('host')}:{form.watch('port')}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Username:</span>
                              <p className="font-medium">{form.watch('username')}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">SSL Enabled:</span>
                              <p className="font-medium">{form.watch('sslEnabled') ? 'Yes' : 'No'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Test Connection */}
                      <Card>
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              {connectionTest.status === 'idle' && (
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                  <Wifi className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                              {connectionTest.status === 'testing' && (
                                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                                  <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
                                </div>
                              )}
                              {connectionTest.status === 'success' && (
                                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                                </div>
                              )}
                              {connectionTest.status === 'failed' && (
                                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                                  <XCircle className="h-6 w-6 text-red-500" />
                                </div>
                              )}

                              <div>
                                <p className="font-medium">
                                  {connectionTest.status === 'idle' && 'Ready to Test'}
                                  {connectionTest.status === 'testing' && 'Testing Connection...'}
                                  {connectionTest.status === 'success' && 'Connection Successful!'}
                                  {connectionTest.status === 'failed' && 'Connection Failed'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {connectionTest.message || 'Click the button to test your connection'}
                                </p>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant={connectionTest.status === 'success' ? 'outline' : 'default'}
                              onClick={handleTestConnection}
                              disabled={connectionTest.status === 'testing'}
                            >
                              {connectionTest.status === 'testing' ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Testing...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  {connectionTest.status === 'success' ? 'Test Again' : 'Test Connection'}
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Connection Details */}
                          {connectionTest.status === 'success' && connectionTest.details && (
                            <div className="mt-4 pt-4 border-t space-y-3">
                              {connectionTest.details.latency && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Gauge className="h-4 w-4 text-green-500" />
                                  <span className="text-muted-foreground">Latency:</span>
                                  <span className="font-medium">{connectionTest.details.latency}ms</span>
                                </div>
                              )}
                              {connectionTest.details.databases && connectionTest.details.databases.length > 0 && (
                                <div className="text-sm">
                                  <div className="flex items-center gap-2 mb-2">
                                    <HardDrive className="h-4 w-4 text-blue-500" />
                                    <span className="text-muted-foreground">
                                      Available Databases ({connectionTest.details.databases.length}):
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-2 pl-6">
                                    {connectionTest.details.databases.slice(0, 8).map((db) => (
                                      <Badge key={db} variant="secondary" className="text-xs">
                                        {db}
                                      </Badge>
                                    ))}
                                    {connectionTest.details.databases.length > 8 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{connectionTest.details.databases.length - 8} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {connectionTest.status === 'failed' && (
                            <div className="mt-4 pt-4 border-t">
                              <div className="flex items-start gap-2 text-sm text-red-400">
                                <AlertTriangle className="h-4 w-4 mt-0.5" />
                                <div>
                                  <p className="font-medium">Troubleshooting tips:</p>
                                  <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                                    <li>Verify the host and port are correct</li>
                                    <li>Check if the database server is running</li>
                                    <li>Ensure the username and password are correct</li>
                                    <li>Check firewall settings</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {connectionTest.status !== 'success' && (
                        <div className="space-y-3">
                          <div className="flex items-start gap-2 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 text-sm">
                            <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="font-medium text-amber-200 mb-1">Connection test optional</p>
                              <p className="text-muted-foreground">
                                You can add this server now and test the connection later. Use <strong>Add Server</strong> below to save even when the server is not reachable yet (e.g. offline, wrong host, or not configured). You can edit and retest from the Servers page anytime.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </Form>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t p-4 flex items-center justify-between bg-background">
              <Button
                type="button"
                variant="outline"
                onClick={goPrev}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                {currentStep < steps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={goNext}
                    disabled={!canGoNext()}
                  >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={form.handleSubmit(onSubmit, onValidationError)}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {server ? 'Update Server' : 'Add Server'}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
