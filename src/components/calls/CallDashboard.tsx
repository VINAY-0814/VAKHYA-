/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { MessageSquare, Video, Hand, BookOpen, User } from "lucide-react";

export type TabId = "chats" | "calls" | "translate" | "learn" | "profile";

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface CallDashboardProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onSignTabReset?: () => void;
}

const NAV_ITEMS: TabItem[] = [
  { id: "chats", label: "Chats", icon: MessageSquare },
  { id: "calls", label: "Calls", icon: Video },
  { id: "translate", label: "Sign", icon: Hand },
  { id: "learn", label: "Learn", icon: BookOpen },
  { id: "profile", label: "Profile", icon: User }
];

export default function CallDashboard({
  activeTab,
  onTabChange,
  onSignTabReset
}: CallDashboardProps) {
  
  const handleTabClick = (tabId: TabId) => {
    onTabChange(tabId);
    if (tabId === "translate" && onSignTabReset) {
      onSignTabReset();
    }
  };

  return (
    <div 
      id="call-dashboard-nav-wrapper" 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-xl md:max-w-2xl h-16 bg-[var(--glass-light-bg)] backdrop-blur-3xl border border-[var(--border-subtle)] rounded-full flex justify-around items-center z-40 px-3 md:px-6 shadow-[var(--shadow-elevation)] transition-all duration-300"
    >
      {/* Outer ambient glow */}
      <div className="absolute inset-0 rounded-full bg-purple-500/5 -z-20 pointer-events-none blur-xl animate-pulse" />

      {NAV_ITEMS.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.icon;

        return (
          <button
            key={tab.id}
            id={`call-dashboard-tab-${tab.id}`}
            onClick={() => handleTabClick(tab.id)}
            className="flex items-center justify-center gap-2 relative px-3 py-2 md:px-5 md:py-2.5 rounded-full focus:outline-none transition-all duration-300 group cursor-pointer text-[var(--text-primary)]"
          >
            {/* Sliding high-contrast gradient active indicator */}
            {isActive && (
              <motion.div
                id="call-dashboard-active-indicator"
                layoutId="bottom-nav-active-pill"
                className="absolute inset-0 bg-gradient-to-r from-[#8A5CF6] via-[#B164FA] to-[#D96FF2] rounded-full -z-10 shadow-[0_4px_14px_rgba(138,92,246,0.35)] border border-purple-300/50"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}

            {/* Micro active dot indicator */}
            {isActive && (
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-cyan-500 dark:bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse" />
            )}

            {/* Icon representation */}
            <div 
              className={`transition-all duration-200 transform group-hover:scale-110 ${
                isActive 
                  ? "text-white scale-110" 
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <IconComponent className="w-5 h-5" />
            </div>

            {/* Tab Label (Hidden on small mobile viewports unless active for responsive space preservation) */}
            <span 
              className={`text-[11px] font-black tracking-wider transition-colors duration-200 font-sans ${
                isActive ? "text-white" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
              } ${isActive ? "block" : "hidden md:block"}`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
