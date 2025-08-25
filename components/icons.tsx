import React from 'react';
import { Settings, BarChart2, Bot, LayoutDashboard, Search, Bell, Pointer, Eye, TrendingUp, Target, Wrench, FileText, Shield } from 'lucide-react';

/**
 * A centralized repository for all SVG icons used in the application.
 * This makes them reusable and keeps component files cleaner.
 */
export const ICONS = {
  DASHBOARD: <LayoutDashboard />,
  REPORTS: <BarChart2 />,
  AI_COMPANION: <Bot />,
  SETTINGS: <Settings />,
  SEARCH: <Search />,
  BELL: <Bell />,
  CLICKS: <Pointer />,
  IMPRESSIONS: <Eye />,
  CTR: <TrendingUp />,
  POSITION: <Target />,
  HEALTH_TECHNICAL: <Wrench />,
  HEALTH_CONTENT: <FileText />,
  HEALTH_AUTHORITY: <Shield />,
};
