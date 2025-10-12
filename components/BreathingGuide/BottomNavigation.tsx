// components/BreathingGuide/BottomNavigation.tsx
// Mobile-first bottom navigation with smooth transitions
// Location: components/BreathingGuide/BottomNavigation.tsx

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Home, MessageCircle, Settings, Mic } from 'lucide-react'

type NavigationTab = 'breathe' | 'guide' | 'settings' | 'voice'

interface BottomNavigationProps {
  activeTab: NavigationTab
  onTabChange: (tab: NavigationTab) => void
  hasNotification?: boolean
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  hasNotification = false,
}) => {
  const tabs = [
    { id: 'breathe' as NavigationTab, icon: Home, label: 'Breathe' },
    {
      id: 'guide' as NavigationTab,
      icon: MessageCircle,
      label: 'AI Guide',
      notification: hasNotification,
    },
    { id: 'settings' as NavigationTab, icon: Settings, label: 'Settings' },
    { id: 'voice' as NavigationTab, icon: Mic, label: 'Voice' },
  ]

  return (
    <>
      {/* Mobile Bottom Nav */}
      <motion.nav
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', damping: 20 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 shadow-2xl"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon

            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.9 }}
                onClick={() => onTabChange(tab.id)}
                className="relative flex flex-col items-center justify-center flex-1 h-full group"
              >
                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  />
                )}

                {/* Icon Container */}
                <motion.div
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    y: isActive ? -2 : 0,
                  }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="relative"
                >
                  <Icon
                    size={24}
                    className={`transition-colors ${
                      isActive
                        ? 'text-purple-600 dark:text-purple-400'
                        : 'text-gray-400 dark:text-gray-500 group-active:text-gray-600'
                    }`}
                  />

                  {/* Notification Dot */}
                  {tab.notification && !isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"
                    />
                  )}
                </motion.div>

                {/* Label */}
                <motion.span
                  animate={{
                    opacity: isActive ? 1 : 0.6,
                    scale: isActive ? 1 : 0.9,
                  }}
                  className={`text-xs mt-1 font-medium ${
                    isActive
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {tab.label}
                </motion.span>
              </motion.button>
            )
          })}
        </div>
      </motion.nav>

      {/* Desktop Sidebar */}
      <motion.nav
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20 }}
        className="hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 shadow-xl border border-gray-200 dark:border-gray-800"
      >
        {tabs.map(tab => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon

          return (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.1, x: 4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onTabChange(tab.id)}
              className="relative group"
              title={tab.label}
            >
              {/* Active Background */}
              {isActive && (
                <motion.div
                  layoutId="desktopActiveTab"
                  className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl"
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                />
              )}

              {/* Icon */}
              <div className="relative w-12 h-12 flex items-center justify-center">
                <Icon
                  size={24}
                  className={`transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                  }`}
                />

                {/* Notification Dot */}
                {tab.notification && !isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900"
                  />
                )}
              </div>

              {/* Tooltip */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                whileHover={{ opacity: 1, x: 0 }}
                className="absolute left-full ml-3 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-sm font-medium rounded-lg whitespace-nowrap pointer-events-none"
              >
                {tab.label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-800" />
              </motion.div>
            </motion.button>
          )
        })}
      </motion.nav>
    </>
  )
}
