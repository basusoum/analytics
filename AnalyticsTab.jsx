import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Globe2, BarChart3, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import Dashboard from './Dashboard'
import NetworkMap from './NetworkMap'

export default function AnalyticsTab({ data, derived }) {
  const [view, setView] = useState('metrics') // 'metrics' or 'map'

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent">
      {/* Tab Switcher & Header */}
      <div className="flex items-center justify-between mb-8 stagger stagger-1">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
            {view === 'metrics' ? <LayoutDashboard className="text-white w-5 h-5" /> : <Globe2 className="text-white w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">Analytics Hub</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Network Overview</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest">
                {view === 'metrics' ? 'Metric Performance' : 'Geographical Network'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex p-1 bg-slate-200/50 backdrop-blur-md rounded-2xl border border-slate-200">
          <button
            onClick={() => setView('metrics')}
            className={clsx(
              'flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all duration-300 ease-out cursor-pointer',
              view === 'metrics' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Performance Metrics
          </button>
          <button
            onClick={() => setView('map')}
            className={clsx(
              'flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold transition-all duration-300 ease-out cursor-pointer',
              view === 'map' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Globe2 className="w-3.5 h-3.5" />
            Network Map
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex flex-col stagger stagger-2">
        <AnimatePresence mode="wait">
          {view === 'metrics' ? (
            <motion.div
              key="metrics"
              initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col min-h-0"
            >
              <Dashboard data={data} derived={derived} />
            </motion.div>
          ) : (
            <motion.div
              key="map"
              initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col min-h-0"
            >
              <NetworkMap data={data} derived={derived} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
