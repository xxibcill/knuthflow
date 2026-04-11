import { useState, useCallback } from 'react';

export interface Tab {
  id: string;
  name: string;
  sessionId: string | null;
  runId: string | null;
  workspaceId: string | null;
  crashed?: boolean;
  crashMessage?: string;
}

export function useSessionTabs() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  const addTab = useCallback((tab: Tab) => {
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  }, []);

  const removeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const remainingTabs = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId && remainingTabs.length > 0) {
        setActiveTabId(remainingTabs[0].id);
      } else if (remainingTabs.length === 0) {
        setActiveTabId(null);
      }
      return remainingTabs;
    });
  }, [activeTabId]);

  const updateTab = useCallback((tabId: string, updates: Partial<Tab>) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...updates } : t));
  }, []);

  const getActiveTab = useCallback(() => {
    return tabs.find(t => t.id === activeTabId) || null;
  }, [tabs, activeTabId]);

  return {
    tabs,
    activeTabId,
    setActiveTabId,
    addTab,
    removeTab,
    updateTab,
    getActiveTab,
  };
}
