// ─────────────────────────────────────────────────────────────────────────────
// Delivery Types - Phase 15 (Shared between main and preload)
// ─────────────────────────────────────────────────────────────────────────────

export type DeliveryStatus = 'idle' | 'inspecting' | 'packaging' | 'releasing' | 'complete' | 'blocked' | 'failed';

export type PlatformTarget = 'ios' | 'android' | 'pwa' | 'macos' | 'windows' | 'linux';
export type PlatformCategory = 'mobile' | 'web' | 'desktop';

export interface PlatformTargetConfig {
  categories: PlatformCategory[];
  targets: PlatformTarget[];
}

export interface DeliveryArtifact {
  id: string;
  name: string;
  type: 'package' | 'runbook' | 'checklist' | 'release_notes' | 'manifest';
  path: string;
  size?: string;
  validated: boolean;
  validatedAt?: number;
  gate?: string;
  platformTarget?: PlatformTarget;
}

export interface ReleaseGate {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  evidence?: string;
  passedAt?: number;
  platformTarget?: PlatformTarget;
}

export interface PlatformHandoff {
  platformTarget: PlatformTarget;
  artifacts: DeliveryArtifact[];
  gates: ReleaseGate[];
  status: 'pending' | 'passed' | 'failed' | 'skipped';
}

export interface HandoffBundle {
  appName: string;
  deliveryFormat: string;
  platformTargets: PlatformTarget[];
  artifacts: DeliveryArtifact[];
  gates: ReleaseGate[];
  platformHandoffs: PlatformHandoff[];
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