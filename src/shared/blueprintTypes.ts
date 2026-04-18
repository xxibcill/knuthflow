// ─────────────────────────────────────────────────────────────────────────────
// Blueprint Types (Phase 20)
// Shared between frontend components and backend
// ─────────────────────────────────────────────────────────────────────────────

export interface Blueprint {
  id: string;
  name: string;
  description: string | null;
  category: string;
  isPublished: boolean;
  parentBlueprintId: string | null;
  usageCount: number;
  successRate: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface BlueprintVersion {
  id: string;
  blueprintId: string;
  version: string;
  specContent: Record<string, unknown>;
  starterTemplate: string | null;
  acceptanceGates: string[];
  learnedRules: string[];
  usageCount: number;
  createdAt: number;
}

export interface BlueprintWithVersion extends Blueprint {
  latestVersion?: BlueprintVersion;
}

export interface BlueprintUsageStats {
  id: string;
  blueprintId: string;
  versionId: string | null;
  appId: string | null;
  outcome: 'success' | 'failure' | 'cancelled';
  buildTimeMs: number | null;
  iterationCount: number;
  createdAt: number;
}

export interface BlueprintSpec {
  version: string;
  name: string;
  description: string;
  category: string;
  starterTemplate: {
    files: Record<string, string>;
    packageJson?: Record<string, unknown>;
    tsConfig?: Record<string, unknown>;
  };
  specFileTemplates: Array<{
    id: string;
    title: string;
    description: string;
    content: string;
  }>;
  taskPatternDefaults: Array<{
    id: string;
    title: string;
    pattern: string;
    fixPlanTemplate: string;
  }>;
  acceptanceGateTemplates: Array<{
    id: string;
    name: string;
    description: string;
    gate: string;
  }>;
  learnedRules: string[];
}