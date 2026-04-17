import { useState, useMemo, useEffect, Fragment } from 'react'
import { Search, Building2, Warehouse, Table2, Download, X, Settings, Filter, FileSpreadsheet, ChevronRight, ShieldAlert, Package, Zap, Coins, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import Papa from 'papaparse'
import DualRangeSlider from './DualRangeSlider'

const CAT = {
  Inv:    { bg: 'bg-gold/[0.04]',   text: 'text-blue-600/80',   accent: 'border-l-gold/20' },
  Demand: { bg: 'bg-copper/[0.04]', text: 'text-orange-500/80', accent: 'border-l-copper/20' },
  Supply: { bg: 'bg-sage/[0.04]',   text: 'text-green-600/80',   accent: 'border-l-sage/20' },
  Val:    { bg: 'bg-purple-500/[0.03]', text: 'text-purple-600/80', accent: 'border-l-purple-300' },
  '':     { bg: '',                  text: 'text-slate-500',  accent: 'border-l-slate-300' },
}

const PAGE_SIZES = [8, 12, 20, 50]

function formatVal(val, figureName) {
  if (val === '' || val === null || val === undefined) return '\u2014'
  const n = Number(val)
  if (isNaN(n)) return val
  if (figureName?.includes('%')) return (n * 100).toFixed(0) + '%'
  if (figureName?.includes('Price') || figureName?.includes('Value') || figureName?.includes('($)')) {
    return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }
  if (Number.isInteger(n)) return n.toLocaleString()
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function formatWeekHeader(dateStr) {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('-')) return dateStr
  try {
    const d = new Date(dateStr + 'T00:00:00')
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function getStatisticalStats(values) {
  if (!values || values.length === 0) return { mean: 0, stdDev: 0 };
  const nums = values.map(v => Number(v)).filter(n => !isNaN(n));
  if (nums.length === 0) return { mean: 0, stdDev: 0 };

  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / nums.length;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev };
}

const INITIAL_MODAL_FILTERS = {
  region: 'all',
  location: 'all',
  skuType: 'all',
  category: 'all',
  site: 'all',
  part: 'all',
  week: 'all',
  mstnRange: [0, 100],
  estnRange: [0, 100],
}

export default function AllocationTable({ data }) {
  const [skuFilter, setSkuFilter] = useState('all')
  const [siteFilter, setSiteFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [collapsedBlocks, setCollapsedBlocks] = useState(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  
  // Data Filter View Modal State
  const [isDataModalOpen, setIsDataModalOpen] = useState(false)
  const [modalView, setModalView] = useState('settings') // 'settings' or 'preview'
  const [modalFilters, setModalFilters] = useState(INITIAL_MODAL_FILTERS)

  const { blocks, skus, regions, locations, skuTypes, siteMap, weekCols } = useMemo(() => {
    if (!data?.length) return { blocks: [], skus: [], siteMap: new Map(), weekCols: [] }

    const fixed = new Set([
      'SKU', 'Site ID', 'Site', 'Site Desc', 'Site Type', 'SKU Desc', 'Factory ID', 'Location', 'Region', 
      'SKU_Category', 'SKU Category', 'Category', 'SKU Importance', 'Unit Price', 'Value Impact', 'Lat', 'Long', 
      'Latitude', 'Longitude', 'DC_IDS', 'Common id', 'Figure Name', 'Category',
      'Alert_ID', 'Snapshot_Date', 'Week', 'Week_Index', 'Priority', 'Alert', 'Alert Type',
      'MSTN%', 'ESTN%', 'Shortage', 'Excess', 'Business Unit', 'RCA_Summary'
    ])
    const weekCols = Object.keys(data[0]).filter(k => !k.includes('_ID') && !fixed.has(k))

    const blockMap = new Map()
    const siteMap = new Map() // siteType -> Set of siteIds

    for (const row of data) {
      const figure = row['Figure Name']
      if (!figure) continue
      
      const siteId = row['Site ID'] || row['Site']
      const type = row['Site Type'] || 'DC'
      const key = `${row.SKU}|${siteId}`
      
      if (!blockMap.has(key)) {
        // Robust metadata extraction
        const getVal = (r, keys, fallback) => {
          for (const k of keys) {
            if (r[k] !== undefined && r[k] !== null && r[k] !== '') return r[k];
          }
          return fallback;
        };

        blockMap.set(key, {
          sku: row.SKU, 
          site: siteId,
          siteType: type,
          region:   getVal(row, ['Region', 'region', 'REGION'], 'Midwest'),
          location: getVal(row, ['Location', 'location', 'LOCATION'], 'Chicago'),
          category: getVal(row, ['Category', 'category', 'CATEGORY'], 'Standard'),
          skuType:  getVal(row, ['SKU_Category', 'sku_category', 'Category', 'category'], 'C'),
          rows: [],
        })
      }
      blockMap.get(key).rows.push(row)

      if (!siteMap.has(type)) siteMap.set(type, new Set())
      siteMap.get(type).add(siteId)
    }

    const blocks = [...blockMap.values()]
    return {
      blocks,
      skus: [...new Set(blocks.map(b => b.sku))].sort(),
      regions: [...new Set(blocks.map(b => b.region))].sort(),
      locations: [...new Set(blocks.map(b => b.location))].sort(),
      skuTypes: [...new Set(blocks.map(b => b.skuType))].sort(),
      siteMap,
      weekCols,
    }
  }, [data])

  const availableSites = useMemo(() => {
    if (typeFilter === 'all') {
      const all = new Set()
      siteMap.forEach(s => s.forEach(id => all.add(id)))
      return [...all].sort()
    }
    return [...(siteMap.get(typeFilter) || [])].sort()
  }, [siteMap, typeFilter])

  const filtered = useMemo(() => {
    return blocks
      .filter(b => {
        if (skuFilter !== 'all' && b.sku !== skuFilter) return false
        if (siteFilter !== 'all' && b.site !== siteFilter) return false
        if (typeFilter !== 'all' && b.siteType.toLowerCase() !== typeFilter.toLowerCase()) return false
        if (search) {
          const s = search.toLowerCase()
          return b.sku.toLowerCase().includes(s) ||
                 b.site.toLowerCase().includes(s)
        }
        return true
      })
      .sort((a, b) => {
        if (a.sku !== b.sku) return a.sku.localeCompare(b.sku)
        const aIsFactory = a.siteType === 'Factory' ? 0 : 1
        const bIsFactory = b.siteType === 'Factory' ? 0 : 1
        if (aIsFactory !== bIsFactory) return aIsFactory - bIsFactory
        return a.site.localeCompare(b.site)
      })
  }, [blocks, skuFilter, siteFilter, typeFilter, search])

  // DYNAMIC MODAL OPTIONS - CASCADING FILTERS
  const modalOptions = useMemo(() => {
    // 1. Function to filter blocks based on all selections EXCEPT the current one
    const getOptions = (targetName) => {
      let filtered = blocks;
      Object.entries(modalFilters).forEach(([name, val]) => {
        if (name === targetName || val === 'all' || !val) return;
        if (name === 'skuType')     filtered = filtered.filter(b => b.siteType === val);
        if (name === 'region')      filtered = filtered.filter(b => b.region === val);
        if (name === 'location')    filtered = filtered.filter(b => b.location === val);
        if (name === 'category')    filtered = filtered.filter(b => b.category === val);
        if (name === 'site')        filtered = filtered.filter(b => b.site === val);
        if (name === 'part')        filtered = filtered.filter(b => b.sku === val);
      });
      
      // 2. Extract unique sorted values
      if (targetName === 'skuType')  return ['Factory', 'DC'];
      if (targetName === 'region')   return [...new Set(filtered.map(b => b.region))].filter(Boolean).sort();
      if (targetName === 'location') return [...new Set(filtered.map(b => b.location))].filter(Boolean).sort();
      if (targetName === 'category') return [...new Set(filtered.map(b => b.category))].filter(Boolean).sort();
      if (targetName === 'site')     return [...new Set(filtered.map(b => b.site))].filter(Boolean).sort();
      if (targetName === 'part')     return [...new Set(filtered.map(b => b.sku))].filter(Boolean).sort();
      return [];
    };

    return {
      skuTypes:  getOptions('skuType'),
      regions:   getOptions('region'),
      locations: getOptions('location'),
      categories: getOptions('category'),
      sites:     getOptions('site'),
      parts:     getOptions('part'),
    };
  }, [blocks, modalFilters]);

  // AUTO-RESET DEPENDENT FILTERS
  useEffect(() => {
    setModalFilters(prev => {
      const next = { ...prev };
      let changed = false;

      if (prev.region !== 'all' && !modalOptions.regions.includes(prev.region)) {
        next.region = 'all'; changed = true;
      }
      if (prev.location !== 'all' && !modalOptions.locations.includes(prev.location)) {
        next.location = 'all'; changed = true;
      }
      if (prev.category !== 'all' && !modalOptions.categories.includes(prev.category)) {
        next.category = 'all'; changed = true;
      }
      if (prev.site !== 'all' && !modalOptions.sites.includes(prev.site)) {
        next.site = 'all'; changed = true;
      }
      if (prev.part !== 'all' && !modalOptions.parts.includes(prev.part)) {
        next.part = 'all'; changed = true;
      }

      return changed ? next : prev;
    });
  }, [modalOptions]);

  useEffect(() => {
    setPage(1)
    if (typeFilter !== 'all' && siteFilter !== 'all') {
      const allowed = siteMap.get(typeFilter)
      if (allowed && !allowed.has(siteFilter)) {
        setSiteFilter('all')
      }
    }
  }, [typeFilter, skuFilter, siteFilter, search, siteMap])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pagedBlocks = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize]
  )
  const pageStart = filtered.length === 0 ? 0 : ((safePage - 1) * pageSize) + 1
  const pageEnd = Math.min(safePage * pageSize, filtered.length)

  const handleDownloadCSV = async (rows, filename = 'inventory_data') => {
    if (!rows || rows.length === 0) return
    const csv = Papa.unparse(rows)
    const csvData = "\ufeff" + csv
    const datedFilename = `${filename}_${new Date().toISOString().slice(0,10)}.csv`

    // 1. Try Modern File System Access API (often bypasses corporate GUID renaming)
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: datedFilename,
          types: [{
            description: 'CSV File',
            accept: { 'text/csv': ['.csv'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(csvData);
        await writable.close();
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('FilePicker failed, trying fallback...', err);
      }
    }

    // 2. Fallback to standard download
    try {
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
      if (window.navigator && window.navigator.msSaveBlob) {
        window.navigator.msSaveBlob(blob, datedFilename)
        return
      }
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = datedFilename
      link.style.visibility = 'hidden'
      link.style.position = 'absolute'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 1000)
    } catch (err) {
      console.error('Download failed:', err)
      alert("Security policy blocked the download.")
    }
  }

  const toggleBlock = (key) => {
    setCollapsedBlocks(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {/* Page Header */}
      <div className="mb-6 stagger stagger-1">
        <div className="flex items-center gap-3 mb-1">
          <Table2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight font-display text-slate-800">Allocation Table</h2>
            <p className="text-xs text-slate-600 mt-0.5 font-mono">
              POC Network Overview &mdash; {filtered.length} of {blocks.length} SKU-Site blocks
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap stagger stagger-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search SKU, site, description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-dark"
          />
        </div>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setSiteFilter('all'); }} className="select-dark">
          <option value="all">All Site Types</option>
          <option value="Factory">Factory</option>
          <option value="DC">DC</option>
        </select>
        <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} className="select-dark">
          <option value="all">All Sites ({availableSites.length})</option>
          {availableSites.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={skuFilter} onChange={e => setSkuFilter(e.target.value)} className="select-dark">
          <option value="all">All SKUs ({skus.length})</option>
          {skus.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(search || skuFilter !== 'all' || siteFilter !== 'all' || typeFilter !== 'all') && (
          <button
            onClick={() => { setSearch(''); setSkuFilter('all'); setSiteFilter('all'); setTypeFilter('all'); setPage(1); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-500 bg-red-50 border border-red-200 hover:bg-red-100/50 transition-colors ml-1"
          >
            Clear Filters
          </button>
        )}
        
        <div className="flex items-center gap-2 ml-auto">
          {/* Download button removed */}
          
          <button
            onClick={() => { setIsDataModalOpen(true); setModalView('settings'); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Data filter view
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3 text-[11px] font-mono text-slate-600 stagger stagger-3 flex-wrap">
        <span>
          {filtered.length === 0
            ? 'No blocks'
            : `${pageStart}-${pageEnd} of ${filtered.length.toLocaleString()} blocks`}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 text-[10px]">Show</span>
            {PAGE_SIZES.map(size => (
              <button
                key={size}
                onClick={() => { setPageSize(size); setPage(1) }}
                className={clsx(
                  'px-2 py-0.5 rounded text-[10px] border transition-all cursor-pointer',
                  size === pageSize ? 'border-blue-300 bg-gold/[0.06] text-blue-600 font-bold' : 'border-slate-200 text-slate-600 hover:text-slate-700'
                )}
              >
                {size}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className={clsx(
                'px-2 py-1 rounded-lg border transition-colors',
                safePage === 1 ? 'border-slate-100 text-slate-500 cursor-default' : 'border-slate-200 text-slate-700 hover:border-white/[0.12]'
              )}
            >
              Prev
            </button>
            <span className="px-1 text-slate-600">{safePage}/{totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className={clsx(
                'px-2 py-1 rounded-lg border transition-colors',
                safePage === totalPages ? 'border-slate-100 text-slate-500 cursor-default' : 'border-slate-200 text-slate-700 hover:border-white/[0.12]'
              )}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-220px)]">
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 z-30">
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="sticky left-0 z-40 px-4 py-3 text-left font-semibold text-slate-800 uppercase tracking-wider text-[10px] min-w-[200px] border-b border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]" style={{ background: '#f1f5f9' }}>
                  Figure Name
                </th>
                {weekCols.map((w, idx) => (
                  <th key={w} className="px-3 py-3 text-right font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap min-w-[88px] border-b border-slate-200">
                    <div className="text-slate-800">Week {idx + 1}</div>
                    <div className="text-[9px] text-slate-500 font-normal mt-0.5">{formatWeekHeader(w)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedBlocks.map((block) => {
                const key = `${block.sku}|${block.site}`
                const collapsed = collapsedBlocks.has(key)
                const isFactory = block.siteType === 'Factory'

                // Statistical thresholds for color cohorts
                const shortageRow = block.rows.find(r => r['Figure Name'] === 'Shortage')
                const excessRow = block.rows.find(r => r['Figure Name'] === 'Excess')
                const oosValRow = block.rows.find(r => r['Figure Name'] === 'Out of stock Value($)')
                const excValRow = block.rows.find(r => r['Figure Name'] === 'Excess and over($)')

                const stats = {
                  'Shortage': shortageRow ? getStatisticalStats(weekCols.map(w => shortageRow[w])) : null,
                  'Excess': excessRow ? getStatisticalStats(weekCols.map(w => excessRow[w])) : null,
                  'Out of stock Value($)': oosValRow ? getStatisticalStats(weekCols.map(w => oosValRow[w])) : null,
                  'Excess and over($)': excValRow ? getStatisticalStats(weekCols.map(w => excValRow[w])) : null
                }

                return (
                  <Fragment key={key}>
                    {/* Block Header */}
                    <tr
                      className={clsx(
                        'cursor-pointer transition-all duration-300',
                        isFactory
                          ? 'hover:bg-gold/[0.05]'
                          : 'hover:bg-copper/[0.04]'
                      )}
                      style={{ background: isFactory ? 'rgba(200,166,105,0.03)' : 'rgba(192,122,107,0.025)' }}
                      onClick={() => toggleBlock(key)}
                    >
                      <td colSpan={1 + weekCols.length} className="px-4 py-2.5" style={{ borderTop: `1px solid ${isFactory ? 'rgba(200,166,105,0.08)' : 'rgba(192,122,107,0.07)'}` }}>
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            'w-6 h-6 rounded-md flex items-center justify-center text-xs',
                            isFactory ? 'bg-gold/[0.1] text-blue-600/80' : 'bg-copper/[0.1] text-orange-500/80'
                          )}>
                            {isFactory ? <Building2 className="w-3.5 h-3.5" /> : <Warehouse className="w-3.5 h-3.5" />}
                          </div>
                          <span className="font-bold text-[13px] text-slate-700">{block.sku}</span>
                          <span className="text-slate-400">|</span>
                          <span className="font-medium text-slate-600">{block.site}</span>
                          <span className={clsx(
                            'text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider',
                            isFactory ? 'bg-gold/[0.08] text-blue-600/70' : 'bg-copper/[0.08] text-orange-500/70'
                          )}>
                            {block.siteType}
                          </span>
                          <svg className={clsx('w-4 h-4 text-slate-500 transition-transform', !collapsed && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </div>
                      </td>
                    </tr>

                    {/* Figure Rows */}
                    {!collapsed && block.rows
                      .filter(row => row['Figure Name'] !== 'MSTN Thresold' && row['Figure Name'] !== 'ESTN Thresold')
                      .map((row, ri) => {
                      const cat = row.Category || ''
                      const s = CAT[cat] || CAT['']
                      const isEven = ri % 2 === 0
                      const figureName = row['Figure Name'] || ''
                      const isKeyMetric = (figureName === 'MSTN%' || figureName === 'ESTN%')
                      return (
                        <tr
                          key={ri}
                          className={clsx(
                            'border-b transition-colors hover:bg-white/[0.025]',
                            isKeyMetric
                              ? 'border-b-gold/15 bg-gold/[0.06]'
                              : 'border-b-white/[0.03]',
                            !isKeyMetric && s.bg,
                            'border-l-2',
                            isKeyMetric ? 'border-l-gold/40' : s.accent
                          )}
                          style={!isKeyMetric && !isEven ? undefined : (!isKeyMetric ? { background: 'rgba(255,255,255,0.01)' } : undefined)}
                        >
                          <td className={clsx(
                            'sticky left-0 z-10 px-4 py-[6px] font-medium whitespace-nowrap',
                            isKeyMetric ? 'text-blue-600 font-semibold' : s.text
                          )} style={{ background: isKeyMetric ? '#F8FAFC' : '#FFFFFF' }}>
                            {figureName}
                          </td>
                          {weekCols.map(w => {
                            const raw = row[w]
                            const formatted = formatVal(raw, figureName)
                            const num = Number(raw)
                            const isNeg = !isNaN(num) && num < 0
                            const isZero = num === 0

                            let overrideColor = null
                            if (figureName === 'Value Impact' && !isZero) {
                              const sRow = block.rows.find(r => r['Figure Name'] === 'Shortage')
                              const eRow = block.rows.find(r => r['Figure Name'] === 'Excess')
                              if (sRow && Number(sRow[w]) > 0) overrideColor = 'text-red-500 font-bold'
                              else if (eRow && Number(eRow[w]) > 0) overrideColor = 'text-amber-600 font-bold'
                            }

                            let cohortText = null
                            const sObj = stats[figureName]
                            
                            if (sObj && !isZero) {
                              const { mean, stdDev } = sObj
                              if (stdDev > 0) {
                                const zScore = (num - mean) / stdDev
                                if (zScore > 3) {
                                  cohortText = 'text-red-600 font-bold'
                                } else if (zScore > 1.5) {
                                  cohortText = 'text-amber-600 font-bold'
                                }
                              } else if (num > mean) {
                                // Fallback if all values were the same but now we have a spike
                                cohortText = 'text-red-600 font-bold'
                              }
                            }

                            return (
                              <td key={w} className={clsx(
                                'px-3 py-[6px] text-right tabular-nums font-mono text-[11px] transition-all duration-300',
                                isKeyMetric
                                  ? 'text-blue-600/90 font-semibold'
                                  : (cohortText || overrideColor || (isNeg ? 'text-red-400' : isZero ? 'text-slate-500' : 'text-slate-700'))
                              )}>
                                {formatted}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Data Filter View Modal */}
      {isDataModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            {/* Modal Header */}
            <div className="bg-slate-100 px-6 py-4 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1 rounded">
                  <FileSpreadsheet className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-slate-800 tracking-tight">Data Settings</h3>
              </div>
              <button 
                onClick={() => {
                  setIsDataModalOpen(false)
                  setModalFilters(INITIAL_MODAL_FILTERS)
                  setModalView('settings')
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalView === 'settings' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {/* Interconnected Filters in requested order */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">Site type:</label>
                      <select 
                        value={modalFilters.skuType}
                        onChange={e => setModalFilters(prev => ({...prev, skuType: e.target.value}))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow shadow-sm"
                      >
                        <option value="all">All Site Types</option>
                        {modalOptions.skuTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">Region:</label>
                      <select 
                        value={modalFilters.region}
                        onChange={e => setModalFilters(prev => ({...prev, region: e.target.value}))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow shadow-sm"
                      >
                        <option value="all">All Regions</option>
                        {modalOptions.regions.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">Location:</label>
                      <select 
                        value={modalFilters.location}
                        onChange={e => setModalFilters(prev => ({...prev, location: e.target.value}))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow shadow-sm"
                      >
                        <option value="all">All Locations</option>
                        {modalOptions.locations.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">Sku category:</label>
                      <select 
                        value={modalFilters.category}
                        onChange={e => setModalFilters(prev => ({...prev, category: e.target.value}))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow shadow-sm"
                      >
                        <option value="all">All Categories</option>
                        {modalOptions.categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">Sku site:</label>
                      <select 
                        value={modalFilters.site}
                        onChange={e => setModalFilters(prev => ({...prev, site: e.target.value}))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow shadow-sm"
                      >
                        <option value="all">All Sites</option>
                        {modalOptions.sites.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">Sku:</label>
                      <select 
                        value={modalFilters.part}
                        onChange={e => setModalFilters(prev => ({...prev, part: e.target.value}))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow shadow-sm"
                      >
                        <option value="all">All SKUs</option>
                        {modalOptions.parts.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-800 uppercase tracking-widest ml-1">Week:</label>
                      <select 
                        value={modalFilters.week}
                        onChange={e => setModalFilters(prev => ({...prev, week: e.target.value}))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-shadow shadow-sm"
                      >
                        <option value="all">All Weeks</option>
                        {weekCols.map((w, idx) => <option key={w} value={w}>Week {idx + 1} ({formatWeekHeader(w)})</option>)}
                      </select>
                    </div>
                    
                    <div className="col-span-2 pt-2 mt-2 pb-1 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-[10px] font-black text-blue-700 uppercase tracking-[0.2em]">Risk & Metric Thresholds</span>
                      <ShieldAlert className="w-3.5 h-3.5 text-blue-600/40" />
                    </div>


                    <div className="col-span-2 grid grid-cols-2 gap-x-16 gap-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mt-2">
                      <DualRangeSlider 
                        label="Select MSTN Range"
                        initialMin={modalFilters.mstnRange[0]}
                        initialMax={modalFilters.mstnRange[1]}
                        onChange={([min, max]) => setModalFilters(prev => ({...prev, mstnRange: [min, max]}))}
                      />
                      <DualRangeSlider 
                        label="Select ESTN Range"
                        initialMin={modalFilters.estnRange[0]}
                        initialMax={modalFilters.estnRange[1]}
                        onChange={([min, max]) => setModalFilters(prev => ({...prev, estnRange: [min, max]}))}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
                    <button 
                      onClick={() => setModalView('preview')}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-8 rounded-lg shadow-lg shadow-blue-200 transition-all text-sm ml-auto"
                    >
                      OK
                    </button>
                    <button 
                      onClick={() => setIsDataModalOpen(false)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-6 rounded-lg transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button className="bg-white border border-slate-200 text-slate-400 font-medium py-2 px-4 rounded-lg text-xs cursor-not-allowed">
                      Help
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  {/* Data Preview View */}
                  {(() => {
                    // FLATTEN LOGIC - Alert center view
                    const flattened = []
                    for (const b of blocks) {
                      // Initial Filtering based on hierarchy
                      if (modalFilters.region !== 'all' && b.region !== modalFilters.region) continue
                      if (modalFilters.location !== 'all' && b.location !== modalFilters.location) continue
                      if (modalFilters.category !== 'all' && b.category !== modalFilters.category) continue
                      if (modalFilters.skuType !== 'all' && b.siteType !== modalFilters.skuType) continue
                      if (modalFilters.site !== 'all' && b.site !== modalFilters.site) continue
                      if (modalFilters.part !== 'all' && b.sku !== modalFilters.part) continue

                      for (const week of weekCols) {
                        if (modalFilters.week !== 'all' && week !== modalFilters.week) continue

                        const rowData = { 
                          SKU: b.sku, 
                          Site: b.site, 
                          'Site Type': b.siteType, 
                          Week: week 
                        }
                        // Collect all figures into columns
                        for (const r of b.rows) {
                           rowData[r['Figure Name']] = r[week]
                        }



                        const mstnRaw = Number(rowData['MSTN%'] || 0)
                        const mstn = Math.round(mstnRaw * 100)
                        if (mstn < modalFilters.mstnRange[0] || mstn > modalFilters.mstnRange[1]) continue

                        const estnRaw = Number(rowData['ESTN%'] || 0)
                        const estn = Math.round(estnRaw * 100)
                        if (estn < modalFilters.estnRange[0] || estn > modalFilters.estnRange[1]) continue

                        flattened.push(rowData)
                      }
                    }

                    return (
                      <>
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setModalView('settings')}
                              className="text-blue-600 hover:text-blue-700 font-bold text-xs flex items-center gap-1"
                            >
                              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                              Back to Settings
                            </button>
                            <h4 className="text-sm font-bold text-slate-800 ml-4">Preview: Column-Level Data ({flattened.length} rows)</h4>
                          </div>
                          <div className="flex gap-2">
                             <button 
                               className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                               onClick={() => handleDownloadCSV(flattened)}
                             >
                               <Download className="w-3.5 h-3.5" />
                               Download Data
                             </button>
                           </div>
                        </div>

                        <div className="flex-1 overflow-auto rounded-xl border border-slate-100 bg-slate-50/50">
                          {flattened.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                              <Settings className="w-8 h-8 opacity-20" />
                              <span className="text-sm">No data matching these settings</span>
                            </div>
                          ) : (
                            <table className="w-full text-xs text-left border-collapse">
                              <thead className="sticky top-0 bg-white border-b border-slate-200">
                                <tr>
                                  <th className="px-3 py-3 font-bold text-slate-700">SKU</th>
                                  <th className="px-3 py-3 font-bold text-slate-700">Site</th>
                                  <th className="px-3 py-3 font-bold text-slate-700">Week</th>
                                  <th className="px-3 py-3 font-bold text-slate-700 text-right">Shortage</th>
                                  <th className="px-3 py-3 font-bold text-slate-700 text-right">Excess</th>
                                  <th className="px-3 py-3 font-bold text-slate-700 text-right">MSTN%</th>
                                   <th className="px-3 py-3 font-bold text-slate-700 text-right">ESTN%</th>
                                  <th className="px-3 py-3 font-bold text-slate-700 text-right">OOS Value</th>
                                   <th className="px-3 py-3 font-bold text-slate-700 text-right">Excess Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {flattened.slice(0, 50).map((r, i) => (
                                  <tr key={i} className="border-b border-slate-50 hover:bg-white transition-colors">
                                    <td className="px-3 py-2 text-slate-600 font-medium">{r.SKU}</td>
                                    <td className="px-3 py-2 text-slate-500">{r.Site}</td>
                                    <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">{r.Week}</td>
                                    <td className={clsx("px-3 py-2 text-right font-mono", r['Shortage'] > 0 ? "text-red-500 font-bold" : "text-slate-400")}>{r['Shortage'] || '—'}</td>
                                    <td className={clsx("px-3 py-2 text-right font-mono", r['Excess'] > 0 ? "text-orange-500 font-bold" : "text-slate-400")}>{r['Excess'] || '—'}</td>
                                    <td className={clsx("px-3 py-2 text-right font-mono", (r['MSTN%'] * 100) < 50 ? "text-red-500" : "text-slate-500")}>{formatVal(r['MSTN%'], 'MSTN%')}</td>
                                     <td className={clsx("px-3 py-2 text-right font-mono", (r['ESTN%'] * 100) > 20 ? "text-red-500" : (r['ESTN%'] * 100) > 0 ? "text-orange-500" : "text-slate-500")}>{formatVal(r['ESTN%'], 'ESTN%')}</td>
                                    <td className={clsx("px-3 py-2 text-right font-mono text-slate-700", r['Out of stock Value($)'] > 0 && "font-bold")}>{formatVal(r['Out of stock Value($)'], 'Value')}</td>
                                     <td className={clsx("px-3 py-2 text-right font-mono text-slate-700 whitespace-nowrap", r['Excess and over($)'] > 0 && "font-bold")}>{formatVal(r['Excess and over($)'], 'Value')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                        <div className="mt-4 text-[10px] text-slate-400 italic text-center">
                          {flattened.length > 50 ? "Note: Showing first 50 rows. Download for full dataset." : "Preview of filtered data."}
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
