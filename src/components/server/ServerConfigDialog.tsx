import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ServerConfig, EnvironmentType, DatabaseType } from '@/types/backup.types';
import { useEffect } from 'react';
import { Loader2, Wifi } from 'lucide-react';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

const serverSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  environment: z.enum(['development', 'staging', 'uat', 'production', 'dr']),
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().min(1).max(65535, 'Port must be between 1 and 65535'),
  databaseType: z.enum(['mysql', 'mssql', 'postgresql']),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  saveCredentials: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

type ServerFormValues = z.infer<typeof serverSchema>;

interface ServerConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: ServerConfig | null;
  onSave: (data: Omit<ServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export function ServerConfigDialog({
  open,
  onOpenChange,
  server,
  onSave,
}: ServerConfigDialogProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ServerFormValues>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      name: '',
      environment: 'development',
      host: import.meta.env.VITE_DB_HOST || 'localhost',
      port: parseInt(import.meta.env.VITE_DB_PORT || '3306'),
      databaseType: 'mysql',
      username: import.meta.env.VITE_DB_USER || '',
      password: import.meta.env.VITE_DB_PASSWORD || '',
      saveCredentials: true,
      isActive: true,
    },
  });

  useEffect(() => {
    if (server) {
      form.reset({
        name: server.name,
        environment: server.environment,
        host: server.host,
        port: server.port,
        databaseType: server.databaseType,
        username: server.username,
        password: server.password,
        saveCredentials: true,
        isActive: server.isActive,
      });
    } else {
      form.reset({
        name: '',
        environment: 'development',
        host: import.meta.env.VITE_DB_HOST || 'localhost',
        port: parseInt(import.meta.env.VITE_DB_PORT || '3306'),
        databaseType: 'mysql',
        username: import.meta.env.VITE_DB_USER || '',
        password: import.meta.env.VITE_DB_PASSWORD || '',
        saveCredentials: true,
        isActive: true,
      });
    }
    setTestResult(null);
    setIsSubmitting(false);
  }, [server, form, open]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    // Simulate connection test
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const success = Math.random() > 0.2;
    setTestResult(success ? 'success' : 'failed');
    setIsTesting(false);
  };

  const onSubmit = async (data: ServerFormValues) => {
    setIsSubmitting(true);
    const serverData: Omit<ServerConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      name: data.name,
      environment: data.environment,
      host: data.host,
      port: data.port,
      databaseType: data.databaseType,
      username: data.username,
      password: data.password,
      isActive: data.isActive,
      connectionStatus: 'disconnected',
    };
    try {
      await onSave(serverData);
      form.reset();
    } catch (error) {
      // Error is already handled in onSave, just don't reset the form
      console.error('Failed to save server:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const databaseType = form.watch('databaseType');

  useEffect(() => {
    const ports: Record<DatabaseType, number> = {
      mysql: 3306,
      mssql: 1433,
      postgresql: 5432,
    };
    if (!server) {
      form.setValue('port', ports[databaseType]);
    }
  }, [databaseType, form, server]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{server ? 'Edit Server' : 'Add New Server'}</DialogTitle>
          <DialogDescription>
            Configure your database server connection settings.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Server Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Production DB" {...field} />
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
                    <FormLabel>Environment</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="staging">Staging</SelectItem>
                        <SelectItem value="uat">UAT</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="dr">DR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="databaseType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Database Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select database type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="mssql">Microsoft SQL Server</SelectItem>
                      <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Host / IP Address</FormLabel>
                    <FormControl>
                      <Input placeholder="192.168.1.100" {...field} />
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
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
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
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal cursor-pointer">
                      Save credentials with this server
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Store credentials so you can connect without re-entering them. Server will appear in your list below.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="gap-2"
              >
                {isTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wifi className="h-4 w-4" />
                )}
                Test Connection
              </Button>
              {testResult && (
                <span
                  className={`text-sm font-medium ${
                    testResult === 'success' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {testResult === 'success' ? '✓ Connected' : '✗ Failed'}
                </span>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {server ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  server ? 'Update Server' : 'Add Server'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
