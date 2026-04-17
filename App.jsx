import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Database, AlertTriangle, BarChart3 } from 'lucide-react'
import Sidebar from './components/Sidebar'
import AllocationTable from './components/AllocationTable'
import AlertTable from './components/AlertTable'
import AnalyticsTab from './components/AnalyticsTab'
import DataValidationTab from './components/DataValidationTab'
import useData from './hooks/useData'
import { AlertProvider } from './context/AlertContext'
import Auth from './components/Auth'
import Header from './components/Header'

const pageVariants = {
  initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit:    { opacity: 0, y: -10, filter: 'blur(6px)' },
}

const DataPlaceholder = ({ title, icon: Icon, onSwitchToValidation }) => (
  <div className="flex-1 flex items-center justify-center p-8">
    <div className="glass p-12 max-w-xl text-center animate-fade-in relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-32 h-32" />
      </div>
      <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-6">
        <Icon className="w-8 h-8 text-gold" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-3 font-display">No {title} Data</h2>
      <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
        The {title.toLowerCase()} view is currently empty. Please upload an inventory data file or connect to your database in the <b>Validation</b> tab to generate these insights.
      </p>
      <button 
        onClick={onSwitchToValidation}
        className="btn-primary inline-flex items-center gap-2 group"
      >
        <span>Go to Data Validation</span>
        <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('validation')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleAuthenticated = (userData) => {
    setUser(userData);
    // If the persona is receiver, default to allocation tab and pre-load success state
    if (userData.role === 'receiver') {
      setActiveTab('allocation');
      setValidationState(prev => ({
        ...prev,
        result: { status: 'success', message: 'Pre-loaded synthetic data' }
      }));
    }
  }

  const triggerDataRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const { pivotData, flatData, dcFlatData, derived, loading, error } = useData(refreshTrigger)

  const [validationState, setValidationState] = useState({
    dataSource: 'file',
    file: null,
    dbConfig: {
      db_type: 'oracle', host: '', port: '', database: '', username: '', password: '', query: ''
    },
    result: null,
    error: null,
    connectionStatus: null,
    connectionMsg: ''
  });

  if (!user) {
    return <Auth onAuthenticated={handleAuthenticated} />
  }

  return (
    <AlertProvider>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <img src="/BD.png" alt="BD" className="h-14 w-auto mx-auto mb-5 loading-text" />
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.22em] mb-7 loading-sub">
              Inventory Intelligence
            </p>
            <div className="w-32 h-px bg-slate-300 mx-auto overflow-hidden loading-sub">
              <div className="h-full bg-gold" style={{ width: '45%', animation: 'scan 1.8s ease-in-out infinite' }} />
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="glass p-8 max-w-lg text-center animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-coral" />
            </div>
            <h2 className="text-xl font-bold text-coral mb-2 font-display">Data Load Error</h2>
            <p className="text-slate-600 mb-5 text-sm">{error}</p>
            <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200">
              <p className="text-xs text-slate-500 mb-3">Run these commands to set up:</p>
              <code className="text-xs text-gold font-mono block mb-1.5">cd inventory-stock</code>
              <code className="text-xs text-gold font-mono block mb-1.5">npm install</code>
              <code className="text-xs text-gold font-mono block mb-1.5">npm run setup</code>
              <code className="text-xs text-gold font-mono block">npm run dev</code>
            </div>
          </div>
        </div>
      ) : (
        <div className="min-h-screen flex">
          <Sidebar 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            alertCount={derived?.totalAlerts} 
            userRole={user?.role}
          />
          <main className="flex-1 ml-[68px] h-screen overflow-hidden flex flex-col relative" style={{ background: '#F8F9FA' }}>
            <Header 
              userName={user?.name || 'Anshita'} 
              role={user?.role}
              onSignOut={() => setUser(null)} 
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="px-7 pb-7 pt-20 flex-1 flex flex-col min-h-0"
              >
                {activeTab === 'allocation' && (
                  validationState.result ? <AllocationTable data={pivotData} /> : 
                  <DataPlaceholder title="Allocation" icon={Database} onSwitchToValidation={() => setActiveTab('validation')} />
                )}
                {activeTab === 'alerts' && (
                  validationState.result ? <AlertTable data={dcFlatData} userRole={user?.role} /> : 
                  <DataPlaceholder title="Alert Center" icon={AlertTriangle} onSwitchToValidation={() => setActiveTab('validation')} />
                )}
                {activeTab === 'dashboard' && (
                  validationState.result ? <AnalyticsTab data={flatData} derived={derived} /> : 
                  <DataPlaceholder title="Analytics" icon={BarChart3} onSwitchToValidation={() => setActiveTab('validation')} />
                )}
                {activeTab === 'validation' && (
                  <DataValidationTab 
                    validationState={validationState} 
                    setValidationState={setValidationState} 
                    onValidationSuccess={triggerDataRefresh}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      )}
    </AlertProvider>
  )
}
