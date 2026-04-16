import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { getDatabase } from '../database';

export function registerPortfolioHandlers(): void {
  // Portfolio CRUD
  ipcMain.handle('portfolio:create', async (_event: IpcMainInvokeEvent, name: string, description?: string) => {
    const db = getDatabase();
    return db.createPortfolio(name, description);
  });

  ipcMain.handle('portfolio:get', async (_event: IpcMainInvokeEvent, id: string) => {
    const db = getDatabase();
    return db.getPortfolio(id);
  });

  ipcMain.handle('portfolio:list', async (_event: IpcMainInvokeEvent) => {
    const db = getDatabase();
    return db.listPortfolios();
  });

  ipcMain.handle('portfolio:update', async (_event: IpcMainInvokeEvent, id: string, updates: { name?: string; description?: string }) => {
    const db = getDatabase();
    return db.updatePortfolio(id, updates);
  });

  ipcMain.handle('portfolio:delete', async (_event: IpcMainInvokeEvent, id: string) => {
    const db = getDatabase();
    db.deletePortfolio(id);
  });

  // Portfolio Project operations
  ipcMain.handle('portfolio:addProject', async (_event: IpcMainInvokeEvent, portfolioId: string, projectId: string, priority?: number) => {
    const db = getDatabase();
    return db.addProjectToPortfolio(portfolioId, projectId, priority);
  });

  ipcMain.handle('portfolio:getProject', async (_event: IpcMainInvokeEvent, id: string) => {
    const db = getDatabase();
    return db.getPortfolioProject(id);
  });

  ipcMain.handle('portfolio:listProjects', async (_event: IpcMainInvokeEvent, portfolioId: string) => {
    const db = getDatabase();
    return db.listPortfolioProjects(portfolioId);
  });

  ipcMain.handle('portfolio:updateProject', async (_event: IpcMainInvokeEvent, id: string, updates: {
    priority?: number;
    status?: 'active' | 'paused' | 'completed' | 'archived';
    dependencyGraph?: Record<string, string[]>;
  }) => {
    const db = getDatabase();
    return db.updatePortfolioProject(id, updates);
  });

  ipcMain.handle('portfolio:removeProject', async (_event: IpcMainInvokeEvent, id: string) => {
    const db = getDatabase();
    db.removeProjectFromPortfolio(id);
  });

  ipcMain.handle('portfolio:getProjectByProjectId', async (_event: IpcMainInvokeEvent, portfolioId: string, projectId: string) => {
    const db = getDatabase();
    return db.getPortfolioProjectByProjectId(portfolioId, projectId);
  });

  ipcMain.handle('portfolio:listPortfoliosByProject', async (_event: IpcMainInvokeEvent, projectId: string) => {
    const db = getDatabase();
    return db.listPortfoliosByProject(projectId);
  });
}
