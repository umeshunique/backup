import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ForeignKeyConstraint } from './TableEditor';

interface ForeignKeyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (fk: Omit<ForeignKeyConstraint, 'id'>) => void;
    editingFk?: ForeignKeyConstraint | null;
    tableName: string;
    columns: Array<{ name: string }>;
    tableNames: string[];
}

export function ForeignKeyDialog({
    open,
    onOpenChange,
    onSave,
    editingFk,
    tableName,
    columns,
    tableNames,
}: ForeignKeyDialogProps) {
    const [constraintName, setConstraintName] = useState(editingFk?.constraintName || '');
    const [sourceColumn, setSourceColumn] = useState(editingFk?.sourceColumn || '');
    const [referencedTable, setReferencedTable] = useState(editingFk?.referencedTable || '');
    const [referencedColumn, setReferencedColumn] = useState(editingFk?.referencedColumn || '');
    const [onDelete, setOnDelete] = useState<ForeignKeyConstraint['onDelete']>(editingFk?.onDelete);
    const [onUpdate, setOnUpdate] = useState<ForeignKeyConstraint['onUpdate']>(editingFk?.onUpdate);

    const handleSave = () => {
        if (!sourceColumn || !referencedTable || !referencedColumn) return;

        const autoConstraintName = `fk_${tableName}_${sourceColumn}`.replace(/[^a-zA-Z0-9_]/g, '_');

        onSave({
            constraintName: constraintName || autoConstraintName,
            sourceColumn,
            referencedTable,
            referencedColumn,
            onDelete,
            onUpdate,
        });

        // Reset form
        setConstraintName('');
        setSourceColumn('');
        setReferencedTable('');
        setReferencedColumn('');
        setOnDelete(undefined);
        setOnUpdate(undefined);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            // Reset form when closing
            setConstraintName(editingFk?.constraintName || '');
            setSourceColumn(editingFk?.sourceColumn || '');
            setReferencedTable(editingFk?.referencedTable || '');
            setReferencedColumn(editingFk?.referencedColumn || '');
            setOnDelete(editingFk?.onDelete);
            setOnUpdate(editingFk?.onUpdate);
        }
        onOpenChange(newOpen);
    };

    const canSave = sourceColumn && referencedTable && referencedColumn;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{editingFk ? 'Edit Foreign Key' : 'Add Foreign Key'}</DialogTitle>
                    <DialogDescription>
                        {editingFk
                            ? 'Modify the foreign key relationship between tables.'
                            : 'Create a new foreign key relationship between tables.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="constraint-name">Constraint Name (optional)</Label>
                        <Input
                            id="constraint-name"
                            placeholder="Auto-generated if empty"
                            value={constraintName}
                            onChange={(e) => setConstraintName(e.target.value)}
                            className="font-mono text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="source-table">Source Table</Label>
                            <Input
                                id="source-table"
                                value={tableName}
                                disabled
                                className="font-mono text-sm bg-muted"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="source-column">Source Column *</Label>
                            <Select value={sourceColumn} onValueChange={setSourceColumn}>
                                <SelectTrigger id="source-column" className="font-mono text-sm">
                                    <SelectValue placeholder="Select column" />
                                </SelectTrigger>
                                <SelectContent>
                                    {columns.filter(c => c.name).map((col) => (
                                        <SelectItem key={col.name} value={col.name} className="font-mono">
                                            {col.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="target-table">Target Table *</Label>
                            <Select value={referencedTable} onValueChange={setReferencedTable}>
                                <SelectTrigger id="target-table" className="font-mono text-sm">
                                    <SelectValue placeholder="Select table" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tableNames.filter((t) => t !== tableName).map((table) => (
                                        <SelectItem key={table} value={table} className="font-mono">
                                            {table}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="target-column">Target Column *</Label>
                            <Input
                                id="target-column"
                                placeholder="e.g., id"
                                value={referencedColumn}
                                onChange={(e) => setReferencedColumn(e.target.value)}
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="on-delete">ON DELETE</Label>
                            <Select value={onDelete || '__none__'} onValueChange={(v) => setOnDelete(v === '__none__' ? undefined : v as ForeignKeyConstraint['onDelete'])}>
                                <SelectTrigger id="on-delete" className="text-sm">
                                    <SelectValue placeholder="No action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">—</SelectItem>
                                    <SelectItem value="CASCADE">CASCADE</SelectItem>
                                    <SelectItem value="SET NULL">SET NULL</SelectItem>
                                    <SelectItem value="RESTRICT">RESTRICT</SelectItem>
                                    <SelectItem value="NO ACTION">NO ACTION</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="on-update">ON UPDATE</Label>
                            <Select value={onUpdate || '__none__'} onValueChange={(v) => setOnUpdate(v === '__none__' ? undefined : v as ForeignKeyConstraint['onUpdate'])}>
                                <SelectTrigger id="on-update" className="text-sm">
                                    <SelectValue placeholder="No action" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">—</SelectItem>
                                    <SelectItem value="CASCADE">CASCADE</SelectItem>
                                    <SelectItem value="SET NULL">SET NULL</SelectItem>
                                    <SelectItem value="RESTRICT">RESTRICT</SelectItem>
                                    <SelectItem value="NO ACTION">NO ACTION</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!canSave}>
                        {editingFk ? 'Update' : 'Add'} Foreign Key
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
