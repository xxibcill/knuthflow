// ─────────────────────────────────────────────────────────────────────────────
// Delivery Types - Phase 15 (Shared between main and preload)
// ─────────────────────────────────────────────────────────────────────────────

export type DeliveryStatus = 'idle' | 'inspecting' | 'packaging' | 'releasing' | 'complete' | 'blocked' | 'failed';

export interface DeliveryArtifact {
  id: string;
  name: string;
  type: 'package' | 'runbook' | 'checklist' | 'release_notes' | 'manifest';
  path: string;
  size?: string;
  validated: boolean;
  validatedAt?: number;
  gate?: string;
}

export interface ReleaseGate {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  evidence?: string;
  passedAt?: number;
}

export interface HandoffBundle {
  appName: string;
  deliveryFormat: string;
  artifacts: DeliveryArtifact[];
  gates: ReleaseGate[];
  completedAt?: number;
  summary: string;
}

export interface DeliveryResult {
  success: boolean;
  bundle?: HandoffBundle;
  artifacts?: string[];
  error?: string;
  code?: string;
}