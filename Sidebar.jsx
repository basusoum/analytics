import { useState } from 'react'
import { LayoutGrid, ShieldAlert, BarChart3, FileCheck, Box } from 'lucide-react'
import clsx from 'clsx'

const NAV = [
  { id: 'validation', label: 'Data Validation',  desc: 'File Checks & KPIs',icon: FileCheck },
  { id: 'allocation', label: 'Allocation Table', desc: 'Network Overview',  icon: LayoutGrid },
  { id: 'alerts',     label: 'Alert Center',     desc: 'Triage & Dispatch', icon: ShieldAlert },
  { id: 'dashboard',  label: 'Analytics',        desc: 'Metrics & Trends',  icon: BarChart3 },
]

export default function Sidebar({ activeTab, onTabChange, alertCount, userRole }) {
  const [hovered, setHovered] = useState(false)

  // Filter navigation items based on role
  const filteredNav = NAV.filter(item => {
    if (userRole === 'receiver' && item.id === 'validation') return false;
    return true;
  });

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 flex flex-col z-50 overflow-hidden shadow-[1px_0_4px_rgba(0,0,0,0.02)]"
      style={{
        width: hovered ? 260 : 68,
        background: '#FFFFFF',
        borderRight: '1px solid rgba(0, 0, 0, 0.06)',
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Brand */}
      <div className={clsx('flex items-center gap-3 flex-shrink-0', hovered ? 'h-20 px-4' : 'h-16 justify-center px-0')}>
        {hovered ? (
          <div className="flex flex-col">
            <img src="/genpact-logo.png" alt="Genpact" className="h-8 w-auto mb-1 object-contain" />
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="text-[14px] font-extrabold tracking-tight text-slate-900 leading-none">Inventory Intelligence</h1>
            </div>
          </div>
        ) : (
          <Box className="w-6 h-6 text-blue-600" />
        )}
      </div>

      <div className="mx-3 h-px bg-black/[0.06] flex-shrink-0" />

      {/* Navigation */}
      <nav className="flex-1 flex flex-col justify-center gap-0.5">
        {filteredNav.map(({ id, label, desc, icon: Icon }) => {
          const isActive = activeTab === id
          const showBadge = id === 'alerts' && alertCount > 0
          return (
              <button
              key={id}
              onClick={() => onTabChange(id)}
              title={!hovered ? label : undefined}
              className={clsx(
                'relative flex items-center h-11 transition-all duration-200 group text-left',
                isActive ? 'bg-blue-50/50' : 'hover:bg-slate-50'
              )}
            >
              {/* Active left bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
              )}

              {/* Icon — centered in the 68px collapsed area for all items */}
              <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 68 }}>
                <div className="relative">
                  <Icon className={clsx(
                    'w-[18px] h-[18px]',
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  )} />
                  {showBadge && !hovered && (
                    <span className="absolute -top-1.5 -right-2.5 text-[7px] font-bold min-w-[16px] h-[14px] flex items-center justify-center rounded-full bg-red-500 text-white px-1 shadow-sm">
                      {alertCount}
                    </span>
                  )}
                </div>
              </div>

              {/* Labels */}
              <div className={clsx(
                'flex-1 min-w-0 overflow-hidden whitespace-nowrap transition-opacity duration-200',
                hovered ? 'opacity-100' : 'opacity-0'
              )}>
                <div className={clsx(
                  'text-[13px] font-semibold leading-tight',
                  isActive ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'
                )}>
                  {label}
                </div>
                <div className={clsx('text-[9px] font-mono mt-0.5', isActive ? 'text-slate-500' : 'text-slate-400')}>{desc}</div>
              </div>

              {/* Badge */}
              {showBadge && hovered && (
                <span className={clsx(
                  'flex-shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded tabular-nums mr-3',
                  isActive ? 'text-blue-600 bg-blue-100' : 'text-red-500'
                )}>
                  {alertCount}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="mx-3 h-px bg-black/[0.06] flex-shrink-0" />

      {/* Footer — only when expanded */}
      <div className={clsx('px-4 py-4 flex-shrink-0 overflow-hidden whitespace-nowrap', hovered ? 'opacity-100' : 'opacity-0')}>
        <div style={{ borderLeft: '2px solid rgba(37,99,235,0.25)' }} className="pl-3">
          <p className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.14em] mt-1">Supply Chain Analytics POC</p>
        </div>
      </div>
    </aside>
  )
}
