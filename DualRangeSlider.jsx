import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'

export default function DualRangeSlider({ min = 0, max = 100, step = 1, initialMin, initialMax, onChange, label, unit = '%' }) {
  const [localMin, setLocalMin] = useState(initialMin ?? min)
  const [localMax, setLocalMax] = useState(initialMax ?? max)
  const containerRef = useRef(null)

  const handleUpdate = useCallback((newMin, newMax) => {
    if (onChange) onChange([newMin, newMax])
  }, [onChange])

  useEffect(() => {
    setLocalMin(initialMin ?? min)
    setLocalMax(initialMax ?? max)
  }, [initialMin, initialMax, min, max])

  const calculateValue = (pixelX) => {
    if (!containerRef.current) return 0
    const rect = containerRef.current.getBoundingClientRect()
    const percentage = Math.max(0, Math.min(1, (pixelX - rect.left) / rect.width))
    const rawValue = min + percentage * (max - min)
    return Math.round(rawValue / step) * step
  }

  const handleDragMin = (event, info) => {
    const newVal = calculateValue(info.point.x)
    if (newVal < localMax) {
      setLocalMin(newVal)
      handleUpdate(newVal, localMax)
    }
  }

  const handleDragMax = (event, info) => {
    const newVal = calculateValue(info.point.x)
    if (newVal > localMin) {
      setLocalMax(newVal)
      handleUpdate(localMin, newVal)
    }
  }

  const minPos = ((localMin - min) / (max - min)) * 100
  const maxPos = ((localMax - min) / (max - min)) * 100

  return (
    <div className="py-2 px-1">
      {label && (
        <div className="flex justify-between items-end mb-4">
          <div className="space-y-0.5">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none block">Threshold Filter</span>
            <h5 className="text-[10px] font-bold text-slate-800 uppercase tracking-tight m-0">{label}</h5>
          </div>
          <div className="flex items-center gap-1.5 bg-indigo-50/50 backdrop-blur-md px-2 py-1 rounded-lg border border-indigo-100/50 shadow-sm">
            <span className="text-[9px] font-bold text-indigo-400 font-mono tracking-tighter uppercase whitespace-nowrap">Range</span>
            <span className="text-[11px] font-black text-indigo-700 font-mono">
              {localMin}{unit} <span className="text-indigo-300 mx-0.5">—</span> {localMax}{unit}
            </span>
          </div>
        </div>
      )}
      
      <div ref={containerRef} className="relative h-1 bg-slate-100 rounded-full select-none cursor-pointer">
        {/* Track Ticks (Subtle dots) */}
        <div className="absolute inset-0 flex justify-between px-0.5 items-center">
            {[0, 25, 50, 75, 100].map(tick => (
                <div key={tick} className="w-0.5 h-0.5 rounded-full bg-slate-200" />
            ))}
        </div>

        {/* Active Range Highlight */}
        <div 
          className="absolute h-full bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.3)] transition-all duration-200"
          style={{ left: `${minPos}%`, right: `${100 - maxPos}%` }}
        />

        {/* Min Handle (Modern Capsule) */}
        <motion.div
          drag="x"
          dragMomentum={false}
          dragConstraints={containerRef}
          onDrag={handleDragMin}
          style={{ left: `${minPos}%`, x: '-50%' }}
          className="absolute top-1/2 -translate-y-1/2 w-1.5 h-5 bg-white border border-indigo-100 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] cursor-grab active:cursor-grabbing z-20 flex items-center justify-center group"
          whileHover={{ scaleY: 1.2, width: 8 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-[1px] h-2 bg-indigo-500/30 rounded-full" />
          {/* Tooltip on drag/hover */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity pointer-events-none shadow-xl">
            {localMin}{unit}
          </div>
        </motion.div>

        {/* Max Handle (Modern Capsule) */}
        <motion.div
          drag="x"
          dragMomentum={false}
          dragConstraints={containerRef}
          onDrag={handleDragMax}
          style={{ left: `${maxPos}%`, x: '-50%' }}
          className="absolute top-1/2 -translate-y-1/2 w-1.5 h-5 bg-indigo-600 border border-white/20 rounded-full shadow-[0_2px_8px_rgba(79,70,229,0.3)] cursor-grab active:cursor-grabbing z-30 flex items-center justify-center group"
          whileHover={{ scaleY: 1.2, width: 8 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="w-[1px] h-2 bg-white/40 rounded-full" />
          {/* Tooltip on drag/hover */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-indigo-900 text-white text-[9px] font-black px-1.5 py-1 rounded opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity pointer-events-none shadow-xl">
            {localMax}{unit}
          </div>
        </motion.div>

        {/* Dynamic Legend */}
        <div className="absolute top-5 left-0 w-full flex justify-between px-0.5 pointer-events-none">
          <span className="text-[10px] font-black text-slate-900 font-mono tracking-tighter uppercase whitespace-nowrap">0%</span>
          <span className="text-[10px] font-black text-slate-900 font-mono tracking-tighter uppercase whitespace-nowrap">50%</span>
          <span className="text-[10px] font-black text-slate-900 font-mono tracking-tighter uppercase whitespace-nowrap">100%</span>
        </div>
      </div>
    </div>
  )
}
