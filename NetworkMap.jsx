import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Warehouse, ChevronRight, X,
  AlertTriangle, CheckCircle, TrendingUp, ZoomIn, ZoomOut, RotateCcw, Calendar, Package, MapPin
} from 'lucide-react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
  ZoomableGroup
} from 'react-simple-maps'
import clsx from 'clsx'

// ≡ƒìÀ Dynamic Site Discovery Help
const getStatus = (endInv, safetyStock, maxStock) => {
  if (endInv < safetyStock) return 'shortage'
  if (endInv > maxStock)    return 'excess'
  return 'healthy'
}

const STATUS_META = {
  shortage: { label: 'Shortage', color: '#EF4444', light: 'rgba(239,68,68,0.15)',  icon: AlertTriangle, glow: 'rgba(239,68,68,0.4)',  cls: 'text-red-400'     },
  healthy:  { label: 'Healthy',  color: '#10B981', light: 'rgba(16,185,129,0.15)', icon: CheckCircle,   glow: 'rgba(16,185,129,0.4)', cls: 'text-emerald-400' },
  excess:   { label: 'Excess',   color: '#3B82F6', light: 'rgba(59,130,246,0.15)',  icon: TrendingUp,    glow: 'rgba(59,130,246,0.4)', cls: 'text-blue-400'    },
}

function SkuDropdown({ skuList, selectedSku, onSelectSku }) {
  const [isOpen, setIsOpen] = useState(false)
  const label = selectedSku === 'all' ? 'All SKUs' : selectedSku

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-slate-900/60 border border-slate-700/50 hover:border-blue-500/50 px-3 py-1.5 rounded-lg transition-all"
      >
        <div className="flex items-center gap-2">
          <Package className="w-3 h-3 text-blue-400" />
          <span className="text-[10px] font-bold text-white tracking-tight truncate max-w-[160px]">{label}</span>
        </div>
        <ChevronRight className={clsx("w-3 h-3 text-slate-600 transition-transform flex-shrink-0", isOpen && "rotate-90")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute left-0 right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[200px] overflow-y-auto custom-scrollbar"
            >
              {/* All SKUs option */}
              <button
                onClick={() => { onSelectSku('all'); setIsOpen(false) }}
                className={clsx(
                  "w-full flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold hover:bg-blue-600/10 transition-colors border-b border-white/5",
                  selectedSku === 'all' ? "text-blue-400 bg-blue-600/5" : "text-slate-400/80"
                )}
              >
                <Package className="w-3 h-3 opacity-60" />
                <span>All SKUs</span>
                <span className="ml-auto text-[9px] font-mono opacity-40">{skuList.length} total</span>
              </button>
              {skuList.map((sku) => (
                <button
                  key={sku}
                  onClick={() => { onSelectSku(sku); setIsOpen(false) }}
                  className={clsx(
                    "w-full flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold hover:bg-blue-600/10 transition-colors border-b border-white/5",
                    selectedSku === sku ? "text-blue-400 bg-blue-600/5" : "text-slate-400/80"
                  )}
                >
                  <div className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", selectedSku === sku ? "bg-blue-400" : "bg-slate-600")} />
                  <span className="truncate">{sku}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function DCDropdown({ dcList, selectedDC, onSelectDC }) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = dcList.find(d => d.id === selectedDC)
  const label = selectedDC === 'all' ? 'All DCs' : (selected ? `${selected.id} – ${selected.city}` : 'All DCs')

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-slate-900/60 border border-amber-700/40 hover:border-amber-500/60 px-3 py-1.5 rounded-lg transition-all"
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-3 h-3 text-amber-400 flex-shrink-0" />
          <span className="text-[10px] font-bold text-white tracking-tight truncate">{label}</span>
        </div>
        <ChevronRight className={clsx("w-3 h-3 text-slate-600 transition-transform flex-shrink-0", isOpen && "rotate-90")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute left-0 right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[200px] overflow-y-auto custom-scrollbar"
            >
              <button
                onClick={() => { onSelectDC('all'); setIsOpen(false) }}
                className={clsx(
                  "w-full flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold hover:bg-amber-600/10 transition-colors border-b border-white/5",
                  selectedDC === 'all' ? "text-amber-400 bg-amber-600/5" : "text-slate-400/80"
                )}
              >
                <MapPin className="w-3 h-3 opacity-60" />
                <span>All DCs</span>
                <span className="ml-auto text-[9px] font-mono opacity-40">{dcList.length} total</span>
              </button>
              {dcList.map((dc) => (
                <button
                  key={dc.id}
                  onClick={() => { onSelectDC(dc.id); setIsOpen(false) }}
                  className={clsx(
                    "w-full flex items-center gap-2 px-4 py-2.5 text-[10px] font-bold hover:bg-amber-600/10 transition-colors border-b border-white/5",
                    selectedDC === dc.id ? "text-amber-400 bg-amber-600/5" : "text-slate-400/80"
                  )}
                >
                  <div className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", selectedDC === dc.id ? "bg-amber-400" : "bg-slate-600")} />
                  <span className="font-black">{dc.id}</span>
                  <span className="text-slate-500 truncate">{dc.city}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function SelectionCard({ node, activeWeek, allWeeks, onSelectWeek, onClose, skuList, selectedSku, onSelectSku, selectedDC, onSelectDC, dcSites }) {
  const isFactory = node.type === 'Factory'
  const [isOpen, setIsOpen] = useState(false)
  const dateStr = activeWeek?.weekDate || `Week ${activeWeek?.weekIndex}`

  return (
    <div className="bg-slate-800/40 rounded-lg border border-white/5 p-2 space-y-1.5 shadow-xl">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center border", isFactory ? "bg-amber-500/10 border-amber-500/20" : "bg-blue-500/10 border-blue-500/20")}>
            {isFactory ? <Building2 className="w-4 h-4 text-amber-400" /> : <Warehouse className="w-4 h-4 text-blue-400" />}
          </div>
          <div>
            <h3 className="text-[12px] font-black text-white tracking-tight leading-none">{node.label || node.city}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={clsx("px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border", isFactory ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-purple-500/20 text-purple-400 border-purple-500/30")}>
                {node.type}
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{node.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* DC Dropdown — only for Factory */}
      {isFactory && (
        <DCDropdown dcList={dcSites} selectedDC={selectedDC} onSelectDC={onSelectDC} />
      )}

      {/* SKU + Week Dropdowns — side by side */}
      <div className="flex gap-1.5">
        {/* SKU Dropdown */}
        <div className="flex-1 min-w-0">
          <SkuDropdown skuList={skuList} selectedSku={selectedSku} onSelectSku={onSelectSku} />
        </div>

        {/* Week Dropdown */}
        <div className="flex-1 min-w-0 relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between bg-slate-900/60 border border-slate-700/50 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-all"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span className="text-[10px] font-bold text-white tracking-tight truncate">{dateStr}</span>
            </div>
            <ChevronRight className={clsx("w-3 h-3 text-slate-600 transition-transform flex-shrink-0", isOpen && "rotate-90")} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 max-h-[200px] overflow-y-auto custom-scrollbar"
                >
                  {allWeeks.map((wk) => (
                    <button
                      key={wk.weekIndex}
                      onClick={() => { onSelectWeek(wk.weekIndex); setIsOpen(false) }}
                      className={clsx(
                        "w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-bold hover:bg-blue-600/10 transition-colors border-b border-white/5",
                        wk.weekIndex === activeWeek?.weekIndex ? "text-blue-400 bg-blue-600/5" : "text-slate-400/80"
                      )}
                    >
                      <span>{wk.weekDate}</span>
                      <span className="text-[9px] font-mono opacity-60">Week {wk.weekIndex}</span>
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

function NodeDetailPane({ node, weekData, activeWeekIndex, onClose, allWeeks, onSelectWeek, skuList, selectedSku, onSelectSku, selectedDC, onSelectDC, dcSites }) {
  const wk = weekData.find(w => w.weekIndex === activeWeekIndex) || weekData[0]
  const activeWeek = allWeeks.find(w => w.weekIndex === activeWeekIndex)
  const meta = wk ? STATUS_META[wk.status] : STATUS_META.healthy



  return (
    <div className="flex flex-col h-full bg-[#0f172a] p-2.5 space-y-2 overflow-hidden">
      <SelectionCard
        node={node}
        activeWeek={activeWeek}
        allWeeks={allWeeks}
        onSelectWeek={onSelectWeek}
        onClose={onClose}
        skuList={skuList}
        selectedSku={selectedSku}
        onSelectSku={onSelectSku}
        selectedDC={selectedDC}
        onSelectDC={onSelectDC}
        dcSites={dcSites}
      />


      {wk && (
        <>
          {/* Pipeline Status Card */}
          <div className="bg-slate-800/40 rounded-xl border border-white/5 p-2.5 space-y-1.5 shadow-xl">
             <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                <h4 className="text-[10px] font-black text-white/90 uppercase tracking-widest">Pipeline Status</h4>
             </div>
             <div className="space-y-1">
               {[
                 { label: 'Planned Prod', val: wk.plannedProd, color: 'text-amber-400' },
                 { label: 'Confirm Prod', val: wk.confirmProd, color: 'text-slate-300' },
               ].map((item, i) => (
                 <div key={i} className="flex justify-between items-center group">
                   <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter group-hover:text-slate-400 transition-colors uppercase tracking-tight">{item.label}</span>
                   <span className={clsx("font-mono text-[10px] font-black", item.color)}>
                     {Math.round(item.val).toLocaleString()}
                   </span>
                 </div>
               ))}
             </div>
          </div>

          {/* Flow Summary Card */}
          <div className="bg-slate-800/40 rounded-xl border border-white/5 overflow-hidden shadow-xl">

             <div className="p-2.5 space-y-1.5">
               {[
                 { label: 'End Inventory',          val: wk.endInv,      color: 'text-white', bold: true },
                 { label: 'Safety Stock',           val: wk.safetyStock, suffix: '(min)', color: 'text-slate-300' },
                 { label: 'Max Stock',              val: wk.maxStock,    suffix: '(max)', color: 'text-slate-300' },
                 { label: 'Demand',                 val: wk.demand,      color: 'text-slate-300' },
                 { label: 'Supply',                 val: wk.supply,      color: 'text-slate-300' },
                 { label: 'Shortage',               val: wk.shortage,    color: wk.shortage > 0 ? 'text-red-400' : 'text-slate-500' },
                 { label: 'Excess',                 val: wk.excess,      color: wk.excess > 0 ? 'text-amber-400' : 'text-slate-500' },
               ].map((item, i) => (
                 <div key={i} className="flex justify-between items-center group">
                   <div className="flex items-center gap-1.5">
                     <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">{item.label}</span>
                     {item.suffix && <span className="text-[8px] text-slate-600 font-medium italic lowercase">{item.suffix}</span>}
                   </div>
                   <span className={clsx("font-mono text-[10px] font-black", item.color, item.bold && "underline decoration-slate-700 underline-offset-1")}>
                     {item.val != null ? Math.round(item.val).toLocaleString() : '—'}
                   </span>
                 </div>
               ))}

               <div className="h-px bg-slate-800/50 my-1" />

               {[
                 { label: 'ESTN%', suffix: '(shortage)', val: wk.avgEstnPct, color: wk.shortage > 0 ? 'text-red-400' : 'text-slate-500' },
                 { label: 'MSTN%', suffix: '(excess)',   val: wk.avgMstnPct, color: wk.excess > 0 ? 'text-amber-400' : 'text-slate-500' },
               ].map((item, i) => (
                 <div key={i} className="flex justify-between items-center group">
                   <div className="flex items-center gap-1.5">
                     <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">{item.label}</span>
                     {item.suffix && <span className="text-[8px] text-slate-600 font-medium italic lowercase">{item.suffix}</span>}
                   </div>
                   <span className={clsx("font-mono text-[10px] font-black", item.color)}>
                     {item.val != null ? `${Math.round(item.val)}%` : '—'}
                   </span>
                 </div>
               ))}
             </div>
          </div>
        </>
      )}
    </div>
  )
}

// Map data URL (TopoJSON)
const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"

export default function NetworkMap({ data }) {
  const [selectedNode,    setSelectedNode]    = useState(null)
  const [activeWeekIndex, setActiveWeekIndex] = useState(null)
  const [center,          setCenter]          = useState([0, 0])
  const [zoom,            setZoom]            = useState(1)
  const [selectedSku,     setSelectedSku]     = useState('all')
  const [selectedDC,      setSelectedDC]      = useState('all') 

  // 1. Dynamic Site Discovery
  const sites = useMemo(() => {
    if (!data?.length) return []
    const siteMap = {}
    
    // Scan unique sites
    data.forEach(r => {
      const id = r["Site ID"] || r["Site"]
      if (!id || siteMap[id]) return
      
      const type = (r["Site Type"] || "DC").trim().toLowerCase() === 'factory' ? 'Factory' : 'DC'
      
      // Handle missing/zero coordinates with a deterministic "Jitter" spread 
      // centered around a default Midwest location if needed
      let lat = parseFloat(r["Latitude"])
      let lon = parseFloat(r["Longitude"])
      
      if (!lat || !lon || (lat === 0 && lon === 0)) {
        // Fallback: Create a small grid around Midwest
        const idx = Object.keys(siteMap).length
        lat = 41.8781 + (Math.floor(idx / 3) * 0.5) - 0.5
        lon = -87.6298 + ((idx % 3) * 0.5) - 0.5
      }

      siteMap[id] = {
        id,
        type,
        label: r["Location"] !== "N/A" ? r["Location"] : (type === 'Factory' ? 'Manufacturing Hub' : 'Distribution Center'),
        city:  r["Location"] !== "N/A" ? r["Location"] : id,
        lat,
        lng: lon
      }
    })
    
    return Object.values(siteMap)
  }, [data])

  // 2. Dynamic Factory → DC mapping
  const factoryDcMap = useMemo(() => {
    const factory = sites.find(s => s.type === 'Factory')
    const dcs = sites.filter(s => s.type === 'DC').map(s => s.id)
    if (!factory) return {}
    return { [factory.id]: dcs }
  }, [sites])

  const handleZoomIn  = () => setZoom(z => Math.min(8, z * 1.5))
  const handleZoomOut = () => setZoom(z => Math.max(1, z / 1.5))
  const handleReset   = () => { setZoom(1); setCenter([0, 0]) }

  const allWeeks = useMemo(() => {
    if (!data?.length) return []
    const map = {}
    data.forEach(r => {
      if (!map[r.Week_Index]) map[r.Week_Index] = r.Week || null
    })
    return Object.keys(map)
      .map(k => ({ weekIndex: +k, weekDate: map[k] }))
      .sort((a, b) => a.weekIndex - b.weekIndex)
  }, [data])

  useEffect(() => {
    if (allWeeks.length && activeWeekIndex === null) setActiveWeekIndex(allWeeks[0].weekIndex)
  }, [allWeeks])

  useEffect(() => {
    setSelectedSku('all')
    setSelectedDC('all')
  }, [selectedNode])

  const effectiveSiteIds = useMemo(() => {
    if (!selectedNode) return []
    if (selectedNode.type === 'Factory') {
      const connected = factoryDcMap[selectedNode.id] || []
      return selectedDC === 'all' ? connected : [selectedDC]
    }
    return [selectedNode.id]
  }, [selectedNode, selectedDC, factoryDcMap])

  const skusForNode = useMemo(() => {
    if (!data?.length || !effectiveSiteIds.length) return []
    const siteKey = data[0]?.["Site ID"] ? "Site ID" : "Site"
    const skus = [...new Set(data.filter(r => effectiveSiteIds.includes(r[siteKey])).map(r => r.SKU))].filter(Boolean).sort()
    return skus
  }, [data, effectiveSiteIds])

  const siteStatusForWeek = useMemo(() => {
    if (!data?.length || activeWeekIndex === null) return {}
    const result = {}
    const siteKey = data[0]?.["Site ID"] ? "Site ID" : "Site"
    
    sites.forEach(site => {
      const rows = data.filter(r => r[siteKey] === site.id && r.Week_Index === activeWeekIndex)
      if (!rows.length) { result[site.id] = 'healthy'; return }
      let endInv = 0, safetyStock = 0, maxStock = 0
      const seen = new Set()
      rows.forEach(r => {
        endInv += (r['End. Inventory'] || 0)
        const k = `${r.SKU}|${r[siteKey]}`
        if (!seen.has(k)) {
          safetyStock += (r['Target Safety Stock (in Units)'] || 0)
          maxStock    += (r['Target Max Stock (in Units)'] || 0)
          seen.add(k)
        }
      })
      result[site.id] = getStatus(endInv, safetyStock, maxStock)
    })
    return result
  }, [data, activeWeekIndex, sites])

  const siteWeekData = useMemo(() => {
    if (!data?.length || !effectiveSiteIds.length) return []
    const siteKey = data[0]?.["Site ID"] ? "Site ID" : "Site"
    
    const relevant = data.filter(r =>
      effectiveSiteIds.includes(r[siteKey]) && (selectedSku === 'all' || r.SKU === selectedSku)
    )
    if (!relevant.length) return []
    const weeks = [...new Set(relevant.map(r => r.Week_Index))].sort((a, b) => a - b)
    return weeks.map(weekIdx => {
      const rows = relevant.filter(r => r.Week_Index === weekIdx)
      let endInv = 0, safetyStock = 0, maxStock = 0, demand = 0, supply = 0,
          backorder = 0, shortage = 0, excess = 0, estnPct = 0, mstnPct = 0,
          estnCount = 0, mstnCount = 0, startInv = 0, plannedProd = 0, confirmProd = 0, forecast = 0
      const seen = new Set()
      rows.forEach(r => {
        endInv      += (r['End. Inventory'] || 0)
        startInv    += (r['Start Inventory'] || 0)
        demand      += (r['Total Demand'] || 0)
        forecast    += (r['Total Forecast/Order'] || 0)
        supply      += (r['Total Supply'] || 0)
        backorder   += (r['End. Backorder'] || 0)
        plannedProd += (r['Planned Prod'] || 0)
        confirmProd += (r['Confirm Prod'] || 0)
        shortage    += (r['Shortage'] || 0)
        excess      += (r['Excess'] || 0)
        if (r['ESTN%'] !== undefined) { estnPct += (r['ESTN%'] || 0); estnCount++ }
        if (r['MSTN%'] !== undefined) { mstnPct += (r['MSTN%'] || 0); mstnCount++ }
        const k = `${r.SKU}|${r[siteKey]}`
        if (!seen.has(k)) {
          safetyStock += (r['Target Safety Stock (in Units)'] || 0)
          maxStock    += (r['Target Max Stock (in Units)'] || 0)
          seen.add(k)
        }
      })
      return {
        weekIndex:   weekIdx,
        weekDate:    rows[0]?.Week || null,
        endInv, safetyStock, maxStock, demand, supply, backorder, shortage, excess,
        startInv, plannedProd, confirmProd, forecast,
        fillRate:    demand > 0 ? (Math.min(1.0, (supply / demand)) * 100) : 100,
        avgEstnPct:  estnCount > 0 ? estnPct / estnCount : null,
        avgMstnPct:  mstnCount > 0 ? mstnCount > 0 ? mstnPct / mstnCount : null : null,
        status:      getStatus(endInv, safetyStock, maxStock),
      }
    })
  }, [data, effectiveSiteIds, selectedSku])

  const siteFlows = useMemo(() => {
    if (!data?.length) return {}
    const flows = {}
    const siteKey = data[0]?.["Site ID"] ? "Site ID" : "Site"
    data.forEach(r => { flows[r[siteKey]] = (flows[r[siteKey]] || 0) + (r['Total Supply'] || 0) })
    return flows
  }, [data])

  const flowVals = Object.values(siteFlows).filter(Boolean)
  const minFlow  = Math.min(...flowVals)
  const maxFlow  = Math.max(...flowVals)
  const flowToStroke = (id) => {
    const f = siteFlows[id] || 0
    if (!f || maxFlow === minFlow) return 1.5
    return 1.5 + ((f - minFlow) / (maxFlow - minFlow)) * 4.5
  }

  return (
    <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

      {/* ── LEFT: MAP ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        <div
          className="flex-1 relative rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-[#0f172a]"
        >
          {/* High-Tech Grid Overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
            style={{ backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
          />

          {/* Title Overlay */}
          <div className="absolute top-6 left-8 z-20 pointer-events-none">
            <div>
              <h3
                className="text-lg font-black tracking-tight leading-none"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 60%, #60a5fa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 12px rgba(96,165,250,0.35))',
                  letterSpacing: '-0.02em',
                }}
              >
                USA Supply Chain Network
              </h3>
              <p className="text-[10px] font-semibold text-slate-500 tracking-widest uppercase mt-1">
                Live Inventory &amp; Flow Intelligence
              </p>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-8 right-8 z-30 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur border border-white/5 p-1.5 rounded-2xl shadow-2xl">
            <button
              onClick={handleZoomIn}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-slate-800 mx-1" />
            <button
              onClick={handleZoomOut}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-slate-800 mx-1" />
            <button
              onClick={handleReset}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Legend Overlay */}
          <div
            className="absolute bottom-8 left-8 z-20 flex flex-wrap items-center gap-6 px-6 py-3 rounded-2xl bg-slate-900/80 backdrop-blur border border-white/5 shadow-2xl"
          >
            <span className="text-[10px] font-black text-white uppercase tracking-widest mr-2">Legend:</span>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">DC</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Factory</span>
            </div>
            <div className="w-px h-4 bg-slate-700" />
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-[#334155] rounded-full" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Default Routes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-[#60a5fa] rounded-full shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Selected Routes</span>
            </div>
          </div>

          {/* Map Viewport */}
          <div className="absolute inset-0">
            <ComposableMap
              projection="geoAlbersUsa"
              projectionConfig={{ scale: 1000 }}
              style={{ width: "100%", height: "100%" }}
            >
              <ZoomableGroup
                zoom={zoom}
                center={center}
                onMoveEnd={({ zoom, center }) => {
                  setZoom(zoom)
                  setCenter(center)
                }}
              >
                {/* Visual Glow Filters */}
                <defs>
                   <filter id="glow">
                      <feGaussianBlur stdDeviation="1" result="coloredBlur" />
                      <feMerge>
                         <feMergeNode in="coloredBlur" />
                         <feMergeNode in="SourceGraphic" />
                      </feMerge>
                   </filter>
                   <filter id="path-glow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                   </filter>
                </defs>

                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        style={{
                          default: { fill: "#1e293b", stroke: "#334155", strokeWidth: 0.75, outline: "none" },
                          hover:   { fill: "#334155", stroke: "#475569", strokeWidth: 1, outline: "none" },
                          pressed: { fill: "#0f172a", outline: "none" }
                        }}
                      />
                    ))
                  }
                </Geographies>

                {/* Connection Lines (Flows) */}
                <g filter="url(#glow)">
                  {(() => {
                    const factory = sites.find(s => s.type === 'Factory')
                    if (!factory) return null
                    
                    return sites.filter(s => s.type === 'DC').map(dc => {
                      const fromCoords = [factory.lng, factory.lat]
                      const toCoords   = [dc.lng, dc.lat]
                      const sw = flowToStroke(dc.id)
                      const isSelected = selectedNode?.id === dc.id || selectedNode?.id === factory.id
                      
                      return (
                        <Line
                          key={`flow-${dc.id}`}
                          from={fromCoords}
                          to={toCoords}
                          stroke={isSelected ? "#60a5fa" : "#334155"}
                          strokeWidth={sw}
                          strokeLinecap="round"
                          opacity={isSelected ? 0.9 : 0.4}
                        />
                      )
                    })
                  })()}
                </g>

                {/* Site Markers */}
                {sites.map(site => {
                  const status = siteStatusForWeek[site.id] || 'healthy'
                  const meta = STATUS_META[status]
                  const nodeColor = site.type === 'Factory' ? '#F59E0B' : meta.color
                  const isSelected = selectedNode?.id === site.id

                  return (
                    <Marker 
                      key={site.id} 
                      coordinates={[site.lng, site.lat]}
                      onClick={() => setSelectedNode(prev => prev?.id === site.id ? null : site)}
                    >
                      <g className="cursor-pointer">
                        {/* Selected Pulsing Aura */}
                        {isSelected && (
                          <motion.circle
                            r="15"
                            fill="transparent"
                            stroke={nodeColor}
                            strokeWidth="2"
                            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                            transition={{ repeat: Infinity, duration: 2.5 }}
                          />
                        )}

                        {/* Outer Soft Glow */}
                        <circle r={isSelected ? 8 : 6} fill={nodeColor} opacity={0.3} filter="url(#glow)" />
                        
                        {/* Main Interaction Circle */}
                        <motion.circle
                          r={isSelected ? 5 : 4}
                          fill={nodeColor}
                          stroke="#020617"
                          strokeWidth="2"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          whileHover={{ scale: 1.4, transition: { duration: 0.2 } }}
                        />

                        {/* Label (Only when zooming in or selected) */}
                        <g transform={`translate(0, ${isSelected ? 16 : 12})`}>
                           <rect 
                             x="-35" y="-8" width="70" height="15" rx="4" 
                             fill="rgba(2, 6, 23, 0.9)" 
                             className={clsx("transition-opacity", isSelected ? "opacity-100" : "opacity-0")}
                           />
                           <text
                             textAnchor="middle"
                             fontSize="10"
                             fontWeight="900"
                             className={clsx("transition-all uppercase tracking-tighter", isSelected ? "opacity-100" : "opacity-0")}
                             fill={isSelected ? "#fff" : nodeColor}
                           >
                             {site.city}
                           </text>
                        </g>
                      </g>
                    </Marker>
                  )
                })}
              </ZoomableGroup>
            </ComposableMap>
          </div>
        </div>
      </div>

      {/* ── RIGHT: DETAIL PANE ── */}
      <div
        className="w-[320px] flex-shrink-0 flex flex-col rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-900 shadow-black"
      >
      {/* Status chip — top right corner */}
      {siteWeekData.length > 0 && (() => {
        const wk = siteWeekData.find(w => w.weekIndex === activeWeekIndex) || siteWeekData[0]
        const m = wk ? STATUS_META[wk.status] : STATUS_META.healthy
        return (
          <div
            className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest pointer-events-none"
            style={{ background: m.light, color: m.color, border: `1px solid ${m.color}30` }}
          >
            <m.icon className="w-2.5 h-2.5" />
            {m.label}
          </div>
        )
      })()}

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {selectedNode ? (
          <motion.div
            key={selectedNode.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <NodeDetailPane
              node={selectedNode}
              weekData={siteWeekData}
              activeWeekIndex={activeWeekIndex}
              onClose={() => setSelectedNode(null)}
              allWeeks={allWeeks}
              onSelectWeek={setActiveWeekIndex}
              skuList={skusForNode}
              selectedSku={selectedSku}
              onSelectSku={setSelectedSku}
              selectedDC={selectedDC}
              onSelectDC={setSelectedDC}
              dcSites={sites.filter(s => s.type === 'DC')}
            />
          </motion.div>
        ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6"
              style={{ minHeight: 400 }}
            >
              <div className="relative">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  className="w-20 h-20 rounded-[2rem] flex items-center justify-center bg-slate-800 shadow-2xl border border-white/5 relative z-10"
                >
                  <Warehouse className="w-10 h-10 text-slate-600" />
                </motion.div>
                <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" />
              </div>

              <div>
                <p className="text-base font-black text-white tracking-tight uppercase italic">No Site Selected</p>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-bold tracking-wide">
                  Select a planning horizon to analyze or click a node on the map to inspect its supply chain health.
                </p>
              </div>

              <div className="w-full space-y-2 mt-4 overflow-y-auto max-h-[250px] custom-scrollbar pr-1">
                {sites.map(site => {
                  const status = siteStatusForWeek[site.id] || 'healthy'
                  const meta   = STATUS_META[status]
                  return (
                    <button
                      key={site.id}
                      onClick={() => setSelectedNode(site)}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl border border-slate-800 hover:border-slate-600 bg-slate-800/20 hover:bg-slate-700/40 transition-all text-left group overflow-hidden relative shadow-sm"
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: site.type === 'Factory' ? '#F59E0B' : meta.color, boxShadow: `0 0 10px ${site.type === 'Factory' ? '#F59E0B' : meta.color}40` }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-black text-slate-300 group-hover:text-white uppercase block leading-tight">{site.id}</span>
                        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">{site.city}</span>
                      </div>
                      <span className="text-[10px] font-black tracking-tighter transition-colors group-hover:text-white" style={{ color: meta.color }}>{meta.label}</span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
