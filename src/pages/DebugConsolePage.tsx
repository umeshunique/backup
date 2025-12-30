import { DebugConsole } from '@/components/compare/DebugConsole';

export function DebugConsolePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Debug Console</h1>
        <p className="text-muted-foreground mt-2">
          Monitor application logs and debug information in real-time
        </p>
      </div>

      <div className="relative">
        <DebugConsole onClose={() => {}} />
      </div>
    </div>
  );
}
