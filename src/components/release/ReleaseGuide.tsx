import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Info,
  GitCompare,
  Rocket,
  Shield,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from 'lucide-react';

export function ReleaseGuide() {
  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Info className="h-5 w-5" />
          How Release Management Works
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step by Step */}
        <div className="space-y-3">
          {/* Step 1 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold">
                1
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <GitCompare className="h-4 w-4 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Compare Schemas</h4>
              </div>
              <p className="text-sm text-gray-700">
                Select source and target databases, then click <Badge variant="outline">Compare Schemas</Badge>.
                The system will show you all differences between the two databases.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white font-bold">
                2
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-green-600" />
                <h4 className="font-semibold text-green-900">Automatic Backup Created</h4>
              </div>
              <p className="text-sm text-gray-700">
                When you click <Badge variant="outline">Deploy to Target</Badge>, the system <strong>automatically creates a backup</strong> of your target database before making any changes.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white font-bold">
                3
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Rocket className="h-4 w-4 text-purple-600" />
                <h4 className="font-semibold text-purple-900">Deployment Runs</h4>
              </div>
              <p className="text-sm text-gray-700">
                The system applies all changes to your target database. You'll see real-time progress.
              </p>
            </div>
          </div>

          {/* Step 4 - Success */}
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white font-bold">
                4a
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h4 className="font-semibold text-emerald-900">If Successful</h4>
              </div>
              <p className="text-sm text-gray-700">
                Deployment completes and your target database now matches the source schema.
              </p>
            </div>
          </div>

          {/* Step 4 - Failure */}
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white font-bold">
                4b
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="h-4 w-4 text-red-600" />
                <h4 className="font-semibold text-red-900">If Deployment Fails</h4>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                The system <strong>automatically rolls back</strong> and restores your database from the backup created in Step 2.
              </p>
              <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded">
                <RotateCcw className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-xs text-red-800">
                  <strong>Automatic Rollback:</strong> Your database returns to its original state. No manual intervention needed!
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900">Important Notes</AlertTitle>
          <AlertDescription className="text-sm text-orange-800 space-y-1 mt-2">
            <div>• <strong>Backup is automatic</strong> - You don't need to create it manually</div>
            <div>• <strong>Rollback is automatic</strong> - If anything fails, database is restored automatically</div>
            <div>• <strong>Emergency Rollback button</strong> - Available during deployment for manual control</div>
            <div>• <strong>All errors are logged</strong> - You can see exactly what went wrong</div>
          </AlertDescription>
        </Alert>

        {/* Quick Summary */}
        <div className="p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg border border-blue-300">
          <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            In Simple Terms:
          </h4>
          <p className="text-sm text-blue-900">
            Compare → Deploy → System creates backup → Applies changes → If error happens → System automatically restores from backup.
            <strong className="block mt-2">Your data is always protected!</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
