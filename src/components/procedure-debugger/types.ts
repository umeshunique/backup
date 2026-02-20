export interface DebugCallFrame {
  id: string;
  procedureName: string;
  line: number;
  database?: string;
}

export interface DebugVariable {
  name: string;
  value: string;
  type?: string;
}

export interface DebugWatch {
  id: string;
  expression: string;
  value: string;
}

export type DebugStatus = 'idle' | 'running' | 'paused' | 'finished' | 'error';
