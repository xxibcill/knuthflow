export interface RalphExecutionEvents {
  output: (data: string) => void;
  error: (error: string) => void;
  sessionExpired: () => void;
  completed: (response: string) => void;
}

export type RalphExecutionEvent = keyof RalphExecutionEvents;
