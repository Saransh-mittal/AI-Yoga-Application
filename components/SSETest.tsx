// components/SSETest.tsx
// Simple SSE Test Component - Create this new file
// File Location: components/SSETest.tsx (NEW FILE)

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Loader2, CheckCircle, XCircle } from 'lucide-react'

interface TestProgress {
  operation_id: string
  status: string
  progress: number
  message: string
  current_step?: number
  total_steps?: number
}

export const SSETest: React.FC = () => {
  const [operationId, setOperationId] = useState<string | null>(null)
  const [progress, setProgress] = useState<TestProgress | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [eventCount, setEventCount] = useState(0)
  const [isStarting, setIsStarting] = useState(false)
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`].slice(-10)) // Keep last 10
    console.log(`🧪 SSETest: ${message}`)
  }

  // Start the test task
  const startTest = async () => {
    setIsStarting(true)
    setProgress(null)
    setEventCount(0)
    setLogs([])
    addLog('Starting test task...')

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_XTTS_BACKEND_URL || 'http://localhost:8000'
      const response = await fetch(`${backendUrl}/api/test/start-slow-task`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      addLog(`✅ Task started! Operation ID: ${data.operation_id}`)
      setOperationId(data.operation_id)
    } catch (error) {
      addLog(`❌ Failed to start task: ${error}`)
      setIsStarting(false)
    }
  }

  // Connect to SSE when operation ID is set
  useEffect(() => {
    if (!operationId) return

    addLog(`📡 Connecting to SSE for: ${operationId}`)

    const backendUrl =
      process.env.NEXT_PUBLIC_XTTS_BACKEND_URL || 'http://localhost:8000'
    const sseUrl = `${backendUrl}/api/test/progress/${operationId}`

    addLog(`🌐 SSE URL: ${sseUrl}`)

    const eventSource = new EventSource(sseUrl)
    let count = 0

    eventSource.onopen = () => {
      addLog('✅ SSE connection opened!')
      setIsConnected(true)
      setIsStarting(false)
    }

    eventSource.onmessage = event => {
      count++
      setEventCount(count)

      try {
        const data = JSON.parse(event.data)

        addLog(`📨 Event #${count}: ${data.status} - ${data.progress || 0}%`)

        if (data.status === 'done') {
          addLog('🏁 Stream completed (received done signal)')
          eventSource.close()
          return
        }

        if (data.status === 'connected') {
          addLog('🔗 Connection confirmed by server')
          return
        }

        setProgress(data)

        if (data.status === 'completed') {
          addLog('🎉 Task completed successfully!')
          setTimeout(() => {
            eventSource.close()
            setIsConnected(false)
          }, 2000)
        }

        if (data.status === 'error') {
          addLog(`❌ Task failed: ${data.message}`)
          eventSource.close()
          setIsConnected(false)
        }
      } catch (err) {
        addLog(`❌ Failed to parse event: ${err}`)
      }
    }

    eventSource.onerror = error => {
      addLog(`❌ SSE error occurred`)
      console.error('SSE Error:', error)
      setIsConnected(false)
    }

    return () => {
      addLog('🔌 Closing SSE connection')
      eventSource.close()
    }
  }, [operationId])

  return (
    <div className="w-full max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          SSE Test Component
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tests Server-Sent Events with a 10-second simulated task
        </p>
      </div>

      {/* Start Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={startTest}
        disabled={isStarting || isConnected}
        className="w-full px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
      >
        {isStarting || isConnected ? (
          <>
            <Loader2 size={24} className="animate-spin" />
            {isConnected ? 'Task Running...' : 'Starting...'}
          </>
        ) : (
          <>
            <Play size={24} />
            Start 10-Second Test
          </>
        )}
      </motion.button>

      {/* Progress Display */}
      {progress && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border-2 rounded-xl p-6 ${
            progress.status === 'completed'
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
              : progress.status === 'error'
              ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700'
              : 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700'
          }`}
        >
          {/* Status Icon */}
          <div className="flex items-center gap-3 mb-4">
            {progress.status === 'completed' ? (
              <CheckCircle size={32} className="text-green-600" />
            ) : progress.status === 'error' ? (
              <XCircle size={32} className="text-red-600" />
            ) : (
              <Loader2 size={32} className="text-purple-600 animate-spin" />
            )}

            <div className="flex-1">
              <div className="text-lg font-bold">
                {progress.status === 'completed'
                  ? 'Completed!'
                  : progress.status === 'error'
                  ? 'Error'
                  : 'Processing...'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {progress.message}
              </div>
            </div>

            {/* Percentage Badge */}
            {progress.status === 'processing' && (
              <div className="px-4 py-2 bg-purple-600 text-white rounded-full font-bold text-xl">
                {progress.progress}%
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {progress.status === 'processing' && (
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.progress}%` }}
                  transition={{ duration: 0.3 }}
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 relative overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                </motion.div>
              </div>

              {/* Step Counter */}
              {progress.current_step && progress.total_steps && (
                <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Step {progress.current_step} of {progress.total_steps}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Connection
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected
                  ? 'bg-green-500 animate-pulse'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
            <span className="text-sm font-medium">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Events Received
          </div>
          <div className="text-2xl font-bold text-purple-600">{eventCount}</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Progress
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {progress?.progress || 0}%
          </div>
        </div>
      </div>

      {/* Logs */}
      <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-xs max-h-60 overflow-y-auto">
        <div className="mb-2 text-gray-500">📜 Event Log (last 10):</div>
        {logs.length === 0 ? (
          <div className="text-gray-500">
            No events yet. Click "Start Test" above.
          </div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="mb-1">
              {log}
            </div>
          ))
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
          📖 How to Use:
        </div>
        <ol className="text-xs text-blue-800 dark:text-blue-300 space-y-1 ml-4 list-decimal">
          <li>Click "Start 10-Second Test" button</li>
          <li>Watch progress bar update in real-time (every 1 second)</li>
          <li>Check event log to see SSE events arriving</li>
          <li>Should see 10+ events over 10 seconds</li>
          <li>Progress should go from 0% → 100%</li>
        </ol>
      </div>

      {/* Expected vs Actual */}
      {eventCount > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
            📊 Analysis:
          </div>
          <div className="text-xs text-yellow-800 dark:text-yellow-300 space-y-1">
            <div>
              ✅ Expected: ~12 events (1 connection + 10 progress + 1 done)
            </div>
            <div
              className={
                eventCount >= 10
                  ? 'text-green-600 font-bold'
                  : 'text-red-600 font-bold'
              }
            >
              {eventCount >= 10 ? '✅' : '❌'} Actual: {eventCount} events
              received
            </div>
            {eventCount < 10 && (
              <div className="text-red-600 font-bold mt-2">
                ⚠️ Problem detected! Not receiving all progress events.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
