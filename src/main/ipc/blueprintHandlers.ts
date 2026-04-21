import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { getDatabase } from '../database';
import type { BlueprintSpec, BlueprintVersion } from '../database';

export interface CreateBlueprintParams {
  name: string;
  description?: string | null;
  category?: string;
  isPublished?: boolean;
  parentBlueprintId?: string | null;
}

export interface CreateBlueprintVersionParams {
  blueprintId: string;
  version: string;
  specContent?: Record<string, unknown>;
  starterTemplate?: string | null;
  acceptanceGates?: string[];
  learnedRules?: string[];
}

export interface UpdateBlueprintParams {
  name?: string;
  description?: string | null;
  category?: string;
  isPublished?: boolean;
}

export interface UpdateBlueprintVersionParams {
  specContent?: Record<string, unknown>;
  starterTemplate?: string | null;
  acceptanceGates?: string[];
  learnedRules?: string[];
}

export interface ImportBlueprintParams {
  spec: BlueprintSpec;
  isPublished?: boolean;
  parentBlueprintId?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Blueprint CRUD Handlers
// ─────────────────────────────────────────────────────────────────────────────

export function registerBlueprintHandlers(): void {
  // Create blueprint
  ipcMain.handle('blueprint:create', async (_event: IpcMainInvokeEvent, params: CreateBlueprintParams) => {
    const db = getDatabase();
    const id = `bp-${crypto.randomUUID()}`;
    const blueprint = db.createBlueprint({ id, ...params });
    return blueprint;
  });

  // Get blueprint by ID
  ipcMain.handle('blueprint:get', async (_event: IpcMainInvokeEvent, id: string) => {
    const db = getDatabase();
    return db.getBlueprint(id);
  });

  // Get blueprint by name
  ipcMain.handle('blueprint:getByName', async (_event: IpcMainInvokeEvent, name: string) => {
    const db = getDatabase();
    return db.getBlueprintByName(name);
  });

  // List blueprints
  ipcMain.handle('blueprint:list', async (_event: IpcMainInvokeEvent, options?: {
    category?: string;
    isPublished?: boolean;
    limit?: number;
  }) => {
    const db = getDatabase();
    return db.listBlueprints(options);
  });

  // List blueprint categories
  ipcMain.handle('blueprint:listCategories', async () => {
    const db = getDatabase();
    return db.listBlueprintCategories();
  });

  // Update blueprint
  ipcMain.handle('blueprint:update', async (_event: IpcMainInvokeEvent, id: string, updates: UpdateBlueprintParams) => {
    const db = getDatabase();
    return db.updateBlueprint(id, updates);
  });

  // Delete blueprint
  ipcMain.handle('blueprint:delete', async (_event: IpcMainInvokeEvent, id: string) => {
    const db = getDatabase();
    return db.deleteBlueprint(id);
  });

  // Increment usage count
  ipcMain.handle('blueprint:incrementUsage', async (_event: IpcMainInvokeEvent, id: string) => {
    const db = getDatabase();
    db.incrementBlueprintUsageCount(id);
    return { success: true };
  });

  // Get usage stats
  ipcMain.handle('blueprint:getUsageStats', async (_event: IpcMainInvokeEvent, blueprintId: string, limit?: number) => {
    const db = getDatabase();
    return db.getBlueprintUsageStats(blueprintId, limit);
  });

  // Calculate success rate
  ipcMain.handle('blueprint:calculateSuccessRate', async (_event: IpcMainInvokeEvent, blueprintId: string) => {
    const db = getDatabase();
    return db.calculateBlueprintSuccessRate(blueprintId);
  });

  // Record usage
  ipcMain.handle('blueprint:recordUsage', async (_event: IpcMainInvokeEvent, params: {
    blueprintId: string;
    versionId?: string | null;
    appId?: string | null;
    outcome: 'success' | 'failure' | 'cancelled';
    buildTimeMs?: number | null;
    iterationCount?: number;
  }) => {
    const db = getDatabase();
    return db.recordBlueprintUsage(params);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Blueprint Version Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  // Create blueprint version
  ipcMain.handle('blueprint:createVersion', async (_event: IpcMainInvokeEvent, params: CreateBlueprintVersionParams) => {
    const db = getDatabase();
    const id = `bpv-${crypto.randomUUID()}`;
    const version = db.createBlueprintVersion({ id, ...params });
    return version;
  });

  // Get blueprint version by ID
  ipcMain.handle('blueprint:getVersion', async (_event: IpcMainInvokeEvent, id: string) => {
    const db = getDatabase();
    return db.getBlueprintVersion(id);
  });

  // Get blueprint version by version string
  ipcMain.handle('blueprint:getVersionByVersion', async (_event: IpcMainInvokeEvent, blueprintId: string, version: string) => {
    const db = getDatabase();
    return db.getBlueprintVersionByVersion(blueprintId, version);
  });

  // Get latest version of a blueprint
  ipcMain.handle('blueprint:getLatestVersion', async (_event: IpcMainInvokeEvent, blueprintId: string) => {
    const db = getDatabase();
    return db.getLatestBlueprintVersion(blueprintId);
  });

  // List all versions of a blueprint
  ipcMain.handle('blueprint:listVersions', async (_event: IpcMainInvokeEvent, blueprintId: string) => {
    const db = getDatabase();
    return db.listBlueprintVersions(blueprintId);
  });

  // List all versions with blueprint info
  ipcMain.handle('blueprint:listAllVersions', async () => {
    const db = getDatabase();
    return db.listAllBlueprintVersionsWithBlueprints();
  });

  // Update blueprint version
  ipcMain.handle('blueprint:updateVersion', async (_event: IpcMainInvokeEvent, id: string, updates: UpdateBlueprintVersionParams) => {
    const db = getDatabase();
    return db.updateBlueprintVersion(id, updates);
  });

  // Delete blueprint version
  ipcMain.handle('blueprint:deleteVersion', async (_event: IpcMainInvokeEvent, id: string) => {
    const db = getDatabase();
    return db.deleteBlueprintVersion(id);
  });

  // Increment version usage count
  ipcMain.handle('blueprint:incrementVersionUsage', async (_event: IpcMainInvokeEvent, id: string) => {
    const db = getDatabase();
    db.incrementBlueprintVersionUsageCount(id);
    return { success: true };
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Import/Export Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  // Validate BlueprintSpec format
  ipcMain.handle('blueprint:validateSpec', async (_event: IpcMainInvokeEvent, spec: unknown) => {
    const errors: string[] = [];

    if (!spec || typeof spec !== 'object') {
      return { valid: false, errors: ['Spec must be an object'] };
    }

    const s = spec as Record<string, unknown>;

    if (typeof s.name !== 'string' || !s.name.trim()) {
      errors.push('name is required and must be a non-empty string');
    }
    if (typeof s.version !== 'string' || !s.version.trim()) {
      errors.push('version is required and must be a non-empty string');
    }
    if (!s.starterTemplate || typeof s.starterTemplate !== 'object') {
      errors.push('starterTemplate is required and must be an object');
    }
    if (!Array.isArray(s.specFileTemplates)) {
      errors.push('specFileTemplates must be an array');
    }
    if (!Array.isArray(s.taskPatternDefaults)) {
      errors.push('taskPatternDefaults must be an array');
    }
    if (!Array.isArray(s.acceptanceGateTemplates)) {
      errors.push('acceptanceGateTemplates must be an array');
    }

    return { valid: errors.length === 0, errors };
  });

  // Import blueprint from spec
  ipcMain.handle('blueprint:import', async (_event: IpcMainInvokeEvent, params: ImportBlueprintParams) => {
    const db = getDatabase();
    const { spec, isPublished = false, parentBlueprintId = null } = params;

    // Check if blueprint with same name exists
    const existing = db.getBlueprintByName(spec.name);
    if (existing) {
      return {
        success: false,
        error: `Blueprint with name "${spec.name}" already exists. Use rename or overwrite.`,
        existingBlueprintId: existing.id,
      };
    }

    // Create blueprint
    const blueprintId = `bp-${crypto.randomUUID()}`;
    const blueprint = db.createBlueprint({
      id: blueprintId,
      name: spec.name,
      description: spec.description,
      category: spec.category || 'general',
      isPublished,
      parentBlueprintId,
    });

    // Create initial version
    const versionId = `bpv-${crypto.randomUUID()}`;
    const version = db.createBlueprintVersion({
      id: versionId,
      blueprintId: blueprint.id,
      version: spec.version,
      specContent: {
        name: spec.name,
        description: spec.description,
        category: spec.category,
        specFileTemplates: spec.specFileTemplates,
        taskPatternDefaults: spec.taskPatternDefaults,
        acceptanceGateTemplates: spec.acceptanceGateTemplates,
      },
      starterTemplate: spec.starterTemplate ? JSON.stringify(spec.starterTemplate) : null,
      acceptanceGates: spec.acceptanceGateTemplates.map(g => g.id),
      learnedRules: spec.learnedRules || [],
    });

    return { success: true, blueprint, version };
  });

  // Export blueprint to spec
  ipcMain.handle('blueprint:export', async (_event: IpcMainInvokeEvent, blueprintId: string, versionId?: string) => {
    const db = getDatabase();
    const blueprint = db.getBlueprint(blueprintId);
    if (!blueprint) {
      return { success: false, error: 'Blueprint not found' };
    }

    let version: BlueprintVersion | null;
    if (versionId) {
      version = db.getBlueprintVersion(versionId);
    } else {
      version = db.getLatestBlueprintVersion(blueprintId);
    }

    if (!version) {
      return { success: false, error: 'No version found' };
    }

    const spec: BlueprintSpec = {
      version: version.version,
      name: blueprint.name,
      description: blueprint.description || '',
      category: blueprint.category,
      starterTemplate: version.starterTemplate ? JSON.parse(version.starterTemplate) : { files: {} },
      specFileTemplates: (version.specContent.specFileTemplates || []) as BlueprintSpec['specFileTemplates'],
      taskPatternDefaults: (version.specContent.taskPatternDefaults || []) as BlueprintSpec['taskPatternDefaults'],
      acceptanceGateTemplates: (version.specContent.acceptanceGateTemplates || []) as BlueprintSpec['acceptanceGateTemplates'],
      learnedRules: version.learnedRules,
    };

    return { success: true, spec };
  });

  // Import blueprint with conflict resolution (rename)
  ipcMain.handle('blueprint:importAs', async (_event: IpcMainInvokeEvent, params: ImportBlueprintParams, newName: string) => {
    const db = getDatabase();
    const { spec, isPublished = false, parentBlueprintId = null } = params;

    // Create blueprint with new name
    const blueprintId = `bp-${crypto.randomUUID()}`;
    const blueprint = db.createBlueprint({
      id: blueprintId,
      name: newName,
      description: spec.description,
      category: spec.category || 'general',
      isPublished,
      parentBlueprintId,
    });

    // Create initial version
    const versionId = `bpv-${crypto.randomUUID()}`;
    const version = db.createBlueprintVersion({
      id: versionId,
      blueprintId: blueprint.id,
      version: spec.version,
      specContent: {
        name: newName,
        description: spec.description,
        category: spec.category,
        specFileTemplates: spec.specFileTemplates,
        taskPatternDefaults: spec.taskPatternDefaults,
        acceptanceGateTemplates: spec.acceptanceGateTemplates,
      },
      starterTemplate: spec.starterTemplate ? JSON.stringify(spec.starterTemplate) : null,
      acceptanceGates: spec.acceptanceGateTemplates.map(g => g.id),
      learnedRules: spec.learnedRules || [],
    });

    return { success: true, blueprint, version };
  });

  // Create new version for existing blueprint
  ipcMain.handle('blueprint:createNewVersion', async (_event: IpcMainInvokeEvent, blueprintId: string, newVersion: string, specContent?: Record<string, unknown>) => {
    const db = getDatabase();
    const blueprint = db.getBlueprint(blueprintId);
    if (!blueprint) {
      return { success: false, error: 'Blueprint not found' };
    }

    // Check if version already exists
    const existing = db.getBlueprintVersionByVersion(blueprintId, newVersion);
    if (existing) {
      return { success: false, error: `Version ${newVersion} already exists` };
    }

    const versionId = `bpv-${crypto.randomUUID()}`;
    const latestVersion = db.getLatestBlueprintVersion(blueprintId);

    const version = db.createBlueprintVersion({
      id: versionId,
      blueprintId,
      version: newVersion,
      specContent: specContent || (latestVersion?.specContent || {}),
      starterTemplate: latestVersion?.starterTemplate || null,
      acceptanceGates: latestVersion?.acceptanceGates || [],
      learnedRules: latestVersion?.learnedRules || [],
    });

    return { success: true, version };
  });

  // Compare two versions
  ipcMain.handle('blueprint:compareVersions', async (_event: IpcMainInvokeEvent, versionId1: string, versionId2: string) => {
    const db = getDatabase();
    const v1 = db.getBlueprintVersion(versionId1);
    const v2 = db.getBlueprintVersion(versionId2);

    if (!v1 || !v2) {
      return { success: false, error: 'One or both versions not found' };
    }

    return {
      success: true,
      comparison: {
        version1: v1.version,
        version2: v2.version,
        differences: {
          specContent: JSON.stringify(v1.specContent) !== JSON.stringify(v2.specContent),
          starterTemplate: v1.starterTemplate !== v2.starterTemplate,
          acceptanceGates: JSON.stringify(v1.acceptanceGates) !== JSON.stringify(v2.acceptanceGates),
          learnedRules: JSON.stringify(v1.learnedRules) !== JSON.stringify(v2.learnedRules),
        },
        version1Spec: v1.specContent,
        version2Spec: v2.specContent,
      },
    };
  });

  // Get inheritance chain for a blueprint
  ipcMain.handle('blueprint:getInheritanceChain', async (_event: IpcMainInvokeEvent, blueprintId: string) => {
    const db = getDatabase();
    const chain: Array<{ id: string; name: string; version: string }> = [];
    let currentId: string | null = blueprintId;

    while (currentId) {
      const blueprint = db.getBlueprint(currentId);
      if (!blueprint) break;

      const latestVersion = db.getLatestBlueprintVersion(currentId);
      chain.unshift({
        id: blueprint.id,
        name: blueprint.name,
        version: latestVersion?.version || 'unknown',
      });

      currentId = blueprint.parentBlueprintId;
    }

    return { success: true, chain };
  });

  // Extend blueprint with overrides
  ipcMain.handle('blueprint:extend', async (
    _event: IpcMainInvokeEvent,
    parentBlueprintId: string,
    name: string,
    description: string | null,
    overrides: {
      specContent?: Record<string, unknown>;
      starterTemplate?: string | null;
      acceptanceGates?: string[];
      learnedRules?: string[];
    }
  ) => {
    const db = getDatabase();
    const parent = db.getBlueprint(parentBlueprintId);
    if (!parent) {
      return { success: false, error: 'Parent blueprint not found' };
    }

    // Get parent latest version for inheriting non-overridden values
    const parentVersion = db.getLatestBlueprintVersion(parentBlueprintId);
    if (!parentVersion) {
      return { success: false, error: 'Parent blueprint has no versions' };
    }

    // Create new blueprint with parent reference
    const blueprintId = `bp-${crypto.randomUUID()}`;
    const blueprint = db.createBlueprint({
      id: blueprintId,
      name,
      description: description || parent.description,
      category: parent.category,
      isPublished: false,
      parentBlueprintId,
    });

    // Create initial version with inherited values and overrides
    const versionId = `bpv-${crypto.randomUUID()}`;
    const version = db.createBlueprintVersion({
      id: versionId,
      blueprintId: blueprint.id,
      version: '1.0.0',
      specContent: overrides.specContent || parentVersion.specContent,
      starterTemplate: overrides.starterTemplate !== undefined ? overrides.starterTemplate : parentVersion.starterTemplate,
      acceptanceGates: overrides.acceptanceGates || parentVersion.acceptanceGates,
      learnedRules: overrides.learnedRules || parentVersion.learnedRules,
    });

    return { success: true, blueprint, version, parentBlueprintId };
  });
}
