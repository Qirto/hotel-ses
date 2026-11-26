'use client';

import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { motionTransitions } from '../../lib/motion-tokens';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content?: React.ReactNode;
  badge?: string | number;
}

export interface AnimatedTabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
  tabsContainerClassName?: string;
  renderContent?: boolean;
  layoutId?: string;
  variant?: 'default' | 'glass' | 'pill';
}

export const AnimatedTabs: React.FC<AnimatedTabsProps> = ({
  tabs,
  defaultTab,
  activeTab: controlledActiveTab,
  onChange,
  className,
  tabsContainerClassName,
  renderContent = true,
  layoutId: customLayoutId,
  variant = 'default',
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<string>(defaultTab || tabs[0]?.id || '');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;
  // Hotel SES: one indicator per tab row, placed from the active tab's offsetLeft/Width.
  // Those ignore ancestor transforms and scrolling, so the pill slides correctly inside a
  // modal that scales in and in rows that scroll sideways (layoutId measured on-screen
  // boxes and slid from the wrong place there). `layoutId` is kept for API compatibility.
  void customLayoutId;
  const reduceMotion = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const [indicator, setIndicator] = useState<{ x: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = tabRefs.current.get(activeTab);
      if (el) setIndicator({ x: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    // labels change width (badges, fonts loading, viewport): follow them
    const ro = new ResizeObserver(measure);
    if (listRef.current) ro.observe(listRef.current);
    tabRefs.current.forEach((el) => ro.observe(el));
    return () => ro.disconnect();
  }, [activeTab, tabs]);

  React.useEffect(() => {
    if (defaultTab && controlledActiveTab === undefined) {
      setInternalActiveTab(defaultTab);
    }
  }, [defaultTab, controlledActiveTab]);

  const handleTabClick = (tabId: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(tabId);
    }
    onChange?.(tabId);
    // keep the chosen tab visible in a row that scrolls sideways
    tabRefs.current.get(tabId)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  // WAI-ARIA tabs: arrows / Home / End move between tabs (only the active one is a Tab stop)
  const onListKeyDown = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === activeTab);
    const next =
      e.key === 'ArrowRight' ? (i + 1) % tabs.length
      : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length
      : e.key === 'Home' ? 0
      : e.key === 'End' ? tabs.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    const id = tabs[next].id;
    handleTabClick(id);
    tabRefs.current.get(id)?.focus();
  };

  const currentTabObj = tabs.find((t) => t.id === activeTab);
  const isGlass = variant === 'glass' || variant === 'pill';

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div
        ref={listRef}
        role="tablist"
        onKeyDown={onListKeyDown}
        className={cn(
          'relative flex items-center gap-1 self-start select-none',
          isGlass
            ? 'p-1 rounded-full bg-surface-raised backdrop-blur-xl border border-border'
            : 'p-1 rounded-lg bg-surface-raised border border-border',
          tabsContainerClassName
        )}
      >
        {indicator && (
          <motion.span
            aria-hidden
            initial={false}
            animate={{ x: indicator.x, width: indicator.width }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42, mass: 0.8 }}
            className={cn(
              'pointer-events-none absolute inset-y-1 left-0 shadow-xs',
              isGlass ? 'rounded-full bg-surface border border-border-hover' : 'rounded-md bg-surface border border-border-hover'
            )}
          />
        )}
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
                else tabRefs.current.delete(tab.id);
              }}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                // Hotel SES: labels never wrap; a long tab row scrolls instead. The focus ring
                // sits on the pill's edge (offset 0), not as a second outline around it.
                'relative shrink-0 whitespace-nowrap text-xs sm:text-sm font-medium transition-colors focus-ring focus-visible:outline-offset-0 select-none flex items-center gap-2 cursor-pointer',
                isGlass
                  ? 'px-4 py-1.5 rounded-full'
                  : 'px-3.5 py-1.5 rounded-md',
                isActive
                  ? 'text-text-primary font-medium'
                  : 'text-text-muted hover:text-text-secondary'
              )}
            >
              <span className="relative z-10 flex items-center gap-1.5">
                {tab.icon && <span>{tab.icon}</span>}
                {tab.label}
                {tab.badge !== undefined && tab.badge !== 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-surface-hover border border-border text-text-secondary">
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {renderContent && (
        <div className="relative min-h-[60px]">
          <AnimatePresence mode="wait">
            {currentTabObj?.content && (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={motionTransitions.springGentle}
                className="text-sm text-text-secondary"
              >
                {currentTabObj.content}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
