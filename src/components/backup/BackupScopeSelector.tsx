import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { BackupWizardState } from './BackupWizard';
import { cn } from '@/lib/utils';
import {
  Table2,
  Code,
  Eye,
  FunctionSquare,
  Zap,
  Calendar,
  Search,
  CheckSquare,
  Square,
  Database,
  Layers,
  FileCode,
} from 'lucide-react';
import { format } from 'date-fns';

interface BackupScopeSelectorProps {
  state: BackupWizardState;
  onUpdate: (updates: Partial<BackupWizardState>) => void;
}

export function BackupScopeSelector({ state, onUpdate }: BackupScopeSelectorProps) {
  const [tableSearch, setTableSearch] = useState('');
  const [procSearch, setProcSearch] = useState('');

  if (!state.database) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Please select a database first</p>
      </div>
    );
  }

  const { tables, procedures, views, functions, triggers, events } = state.database;

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(tableSearch.toLowerCase())
  );
  const filteredProcedures = procedures.filter((p) =>
    p.name.toLowerCase().includes(procSearch.toLowerCase())
  );

  const toggleAll = (
    items: { name: string }[],
    selected: string[],
    key: keyof Pick<
      BackupWizardState,
      | 'selectedTables'
      | 'selectedProcedures'
      | 'selectedViews'
      | 'selectedFunctions'
      | 'selectedTriggers'
      | 'selectedEvents'
    >
  ) => {
    const allNames = items.map((i) => i.name);
    const allSelected = allNames.every((name) => selected.includes(name));
    onUpdate({ [key]: allSelected ? [] : allNames });
  };

  const toggleItem = (
    name: string,
    selected: string[],
    key: keyof Pick<
      BackupWizardState,
      | 'selectedTables'
      | 'selectedProcedures'
      | 'selectedViews'
      | 'selectedFunctions'
      | 'selectedTriggers'
      | 'selectedEvents'
    >
  ) => {
    const newSelected = selected.includes(name)
      ? selected.filter((n) => n !== name)
      : [...selected, name];
    onUpdate({ [key]: newSelected });
  };

  const selectAllObjects = () => {
    onUpdate({
      selectedTables: tables.map((t) => t.name),
      selectedProcedures: procedures.map((p) => p.name),
      selectedViews: views.map((v) => v.name),
      selectedFunctions: functions.map((f) => f.name),
      selectedTriggers: triggers.map((t) => t.name),
      selectedEvents: events.map((e) => e.name),
    });
  };

  const clearAllObjects = () => {
    onUpdate({
      selectedTables: [],
      selectedProcedures: [],
      selectedViews: [],
      selectedFunctions: [],
      selectedTriggers: [],
      selectedEvents: [],
    });
  };

  const totalSelected =
    state.selectedTables.length +
    state.selectedProcedures.length +
    state.selectedViews.length +
    state.selectedFunctions.length +
    state.selectedTriggers.length +
    state.selectedEvents.length;

  return (
    <div className="space-y-6">
      {/* Quick Selection Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground mr-2">Quick Select:</span>
        <Button variant="outline" size="sm" onClick={selectAllObjects}>
          <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
          Full Backup
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onUpdate({
              selectedTables: tables.map((t) => t.name),
              selectedProcedures: procedures.map((p) => p.name),
              selectedViews: views.map((v) => v.name),
              selectedFunctions: functions.map((f) => f.name),
              selectedTriggers: triggers.map((t) => t.name),
              selectedEvents: events.map((e) => e.name),
              backupMode: 'structure',
            });
          }}
        >
          <Layers className="h-3.5 w-3.5 mr-1.5" />
          Schema Only
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onUpdate({
              selectedTables: tables.map((t) => t.name),
              backupMode: 'data',
              selectedProcedures: [],
              selectedViews: [],
              selectedFunctions: [],
              selectedTriggers: [],
              selectedEvents: [],
            });
          }}
        >
          <FileCode className="h-3.5 w-3.5 mr-1.5" />
          Data Only
        </Button>
        <Button variant="ghost" size="sm" onClick={clearAllObjects}>
          <Square className="h-3.5 w-3.5 mr-1.5" />
          Clear All
        </Button>
        <Badge variant="secondary" className="ml-auto">
          {totalSelected} objects selected
        </Badge>
      </div>

      {/* Backup Mode */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Backup Mode</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <RadioGroup
            value={state.backupMode}
            onValueChange={(value: 'structure' | 'data' | 'both') =>
              onUpdate({ backupMode: value })
            }
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="structure" id="structure" />
              <Label htmlFor="structure" className="cursor-pointer">
                Structure Only (DDL)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="data" id="data" />
              <Label htmlFor="data" className="cursor-pointer">
                Data Only (INSERT)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="both" id="both" />
              <Label htmlFor="both" className="cursor-pointer">
                Structure + Data
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Object Selection Accordion */}
      <Accordion type="multiple" defaultValue={['tables']} className="space-y-2">
        {/* Tables */}
        <AccordionItem value="tables" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Table2 className="h-4 w-4 text-primary" />
              <span className="font-medium">Tables</span>
              <Badge variant="secondary" className="ml-2">
                {state.selectedTables.length} / {tables.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-3">
              {/* Table Options */}
              <div className="flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg text-sm">
                {Object.entries(state.tableOptions).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={value}
                      onCheckedChange={(checked) =>
                        onUpdate({
                          tableOptions: { ...state.tableOptions, [key]: checked },
                        })
                      }
                    />
                    <span className="text-muted-foreground">
                      {key.replace(/([A-Z])/g, ' $1').replace('include', 'Include')}
                    </span>
                  </label>
                ))}
              </div>

              {/* Search & Select All */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tables..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAll(tables, state.selectedTables, 'selectedTables')}
                >
                  {state.selectedTables.length === tables.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {/* Table List */}
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {filteredTables.map((table) => (
                    <label
                      key={table.name}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        state.selectedTables.includes(table.name)
                          ? 'bg-primary/10'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <Checkbox
                        checked={state.selectedTables.includes(table.name)}
                        onCheckedChange={() =>
                          toggleItem(table.name, state.selectedTables, 'selectedTables')
                        }
                      />
                      <span className="font-mono text-sm flex-1">{table.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {table.rowCount.toLocaleString()} rows
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {table.sizeInMB.toFixed(1)} MB
                      </span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Stored Procedures */}
        <AccordionItem value="procedures" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Code className="h-4 w-4 text-purple-400" />
              <span className="font-medium">Stored Procedures</span>
              <Badge variant="secondary" className="ml-2">
                {state.selectedProcedures.length} / {procedures.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search procedures..."
                    value={procSearch}
                    onChange={(e) => setProcSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toggleAll(procedures, state.selectedProcedures, 'selectedProcedures')
                  }
                >
                  {state.selectedProcedures.length === procedures.length
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              </div>
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {filteredProcedures.map((proc) => (
                    <label
                      key={proc.name}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        state.selectedProcedures.includes(proc.name)
                          ? 'bg-purple-500/10'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <Checkbox
                        checked={state.selectedProcedures.includes(proc.name)}
                        onCheckedChange={() =>
                          toggleItem(proc.name, state.selectedProcedures, 'selectedProcedures')
                        }
                      />
                      <span className="font-mono text-sm flex-1">{proc.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {proc.parameterCount} params
                      </Badge>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Views */}
        <AccordionItem value="views" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Eye className="h-4 w-4 text-blue-400" />
              <span className="font-medium">Views</span>
              <Badge variant="secondary" className="ml-2">
                {state.selectedViews.length} / {views.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAll(views, state.selectedViews, 'selectedViews')}
              >
                {state.selectedViews.length === views.length ? 'Deselect All' : 'Select All'}
              </Button>
              <ScrollArea className="h-[150px]">
                <div className="space-y-1">
                  {views.map((view) => (
                    <label
                      key={view.name}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        state.selectedViews.includes(view.name)
                          ? 'bg-blue-500/10'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <Checkbox
                        checked={state.selectedViews.includes(view.name)}
                        onCheckedChange={() =>
                          toggleItem(view.name, state.selectedViews, 'selectedViews')
                        }
                      />
                      <span className="font-mono text-sm flex-1">{view.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {view.dependencies.length} deps
                      </span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Functions */}
        <AccordionItem value="functions" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <FunctionSquare className="h-4 w-4 text-green-400" />
              <span className="font-medium">Functions</span>
              <Badge variant="secondary" className="ml-2">
                {state.selectedFunctions.length} / {functions.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAll(functions, state.selectedFunctions, 'selectedFunctions')}
              >
                {state.selectedFunctions.length === functions.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
              <ScrollArea className="h-[150px]">
                <div className="space-y-1">
                  {functions.map((func) => (
                    <label
                      key={func.name}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        state.selectedFunctions.includes(func.name)
                          ? 'bg-green-500/10'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <Checkbox
                        checked={state.selectedFunctions.includes(func.name)}
                        onCheckedChange={() =>
                          toggleItem(func.name, state.selectedFunctions, 'selectedFunctions')
                        }
                      />
                      <span className="font-mono text-sm flex-1">{func.name}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {func.type}
                      </Badge>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Triggers */}
        <AccordionItem value="triggers" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="font-medium">Triggers</span>
              <Badge variant="secondary" className="ml-2">
                {state.selectedTriggers.length} / {triggers.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAll(triggers, state.selectedTriggers, 'selectedTriggers')}
              >
                {state.selectedTriggers.length === triggers.length
                  ? 'Deselect All'
                  : 'Select All'}
              </Button>
              <ScrollArea className="h-[150px]">
                <div className="space-y-1">
                  {triggers.map((trigger) => (
                    <label
                      key={trigger.name}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        state.selectedTriggers.includes(trigger.name)
                          ? 'bg-amber-500/10'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <Checkbox
                        checked={state.selectedTriggers.includes(trigger.name)}
                        onCheckedChange={() =>
                          toggleItem(trigger.name, state.selectedTriggers, 'selectedTriggers')
                        }
                      />
                      <span className="font-mono text-sm flex-1">{trigger.name}</span>
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {trigger.type}
                      </Badge>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Events */}
        <AccordionItem value="events" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-cyan-400" />
              <span className="font-medium">Events / Jobs</span>
              <Badge variant="secondary" className="ml-2">
                {state.selectedEvents.length} / {events.length}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleAll(events, state.selectedEvents, 'selectedEvents')}
              >
                {state.selectedEvents.length === events.length ? 'Deselect All' : 'Select All'}
              </Button>
              <ScrollArea className="h-[150px]">
                <div className="space-y-1">
                  {events.map((event) => (
                    <label
                      key={event.name}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        state.selectedEvents.includes(event.name)
                          ? 'bg-cyan-500/10'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <Checkbox
                        checked={state.selectedEvents.includes(event.name)}
                        onCheckedChange={() =>
                          toggleItem(event.name, state.selectedEvents, 'selectedEvents')
                        }
                      />
                      <span className="font-mono text-sm flex-1">{event.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {event.schedule}
                      </span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
