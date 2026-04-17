import React, { useState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Database,
  Activity,
  FileText,
  Search,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Papa from 'papaparse';
import { motion, AnimatePresence } from 'framer-motion';

// Helper Component for KPI Cards with Tooltips
const KPICard = ({ name, value, onClick, isSelected }) => {
  const isConsistency = name === "Data Consistency";
  const isCompleteness = name === "Data Completeness";
  const isHorizon = name === "Planning Horizon";
  const isDuplicates = name === "Duplicates Found";
  const showTooltip = isConsistency || isCompleteness;

  const isObject = typeof value === 'object' && value !== null;
  let displayValue = isObject ? (value.value || value.overall) : value;

  // Rule: Data Consistency should never show N/A if it's consistent
  if (isConsistency && (displayValue === 'N/A' || !displayValue)) {
    displayValue = '100.00%';
  }

  let tooltipContent = null;

  if (isConsistency && isObject && value.sub_metrics) {
    tooltipContent = (
      <div className="flex flex-col gap-1 items-start min-w-[180px]">
        <span className="font-bold border-b border-white/20 w-full mb-1 pb-1">Calculation Math:</span>
        {Object.entries(value.sub_metrics).map(([rule, pct]) => (
          <div key={rule} className="flex justify-between w-full gap-4 text-[9px]">
            <span>{rule}:</span>
            <span className="font-mono text-blue-300 font-bold">{pct === 'N/A' ? '100.00%' : pct}</span>
          </div>
        ))}
      </div>
    );
  } else if (isCompleteness && isObject) {
    const hasMissing = Object.keys(value.missing_details || {}).length > 0;
    if (!hasMissing) {
      tooltipContent = (
        <div className="flex items-center gap-2 text-green-400 font-bold">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
          No missing values
        </div>
      );
    } else {
      tooltipContent = (
        <div className="flex-w-[200px]">
          <span className="font-bold border-b border-white/20 w-full mb-1 pb-1">Missing Value Breakdown:</span>
          {Object.entries(value.missing_details).map(([col, data]) => (
            <div key={col} className="flex justify-between w-full gap-4 text-[9px] py-0.5 border-b border-white/5 last:border-0 hover:bg-white/5 px-1 rounded">
              <span className="max-w-[150px] truncate">{col}:</span>
              <div className="flex gap-2 items-baseline">
                <span className="font-mono text-amber-400 font-bold">{data.count}</span>
                <span className="text-[7px] text-slate-400 uppercase font-black tracking-tighter">({data.pct})</span>
              </div>
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <div
      onClick={onClick}
      className={`glass p-6 rounded-2xl flex flex-col items-start min-h-[110px] relative group border transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
        } ${isSelected
          ? 'border-blue-500 bg-blue-50/30'
          : 'border-slate-200/50 hover:border-blue-400/30'
        }`}
    >
      {showTooltip && tooltipContent && (
        <div className={`absolute opacity-0 group-hover:opacity-100 transition-all duration-300 bg-slate-900/95 backdrop-blur-xl text-white text-[10px] py-4 px-4 rounded-xl left-1/2 -translate-x-1/2 pointer-events-auto z-50 shadow-2xl border border-white/10 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-8 after:border-transparent after:border-t-slate-900/95 ${isConsistency ? '-top-24' : '-top-14'} transform group-hover:-translate-y-1`}>
          {tooltipContent}
        </div>
      )}
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-4 font-mono">{name}</p>
      <p className="text-xl font-bold text-[#0F172A] leading-tight flex items-baseline gap-2">
        <span>{typeof displayValue === 'string' ? displayValue : displayValue?.toLocaleString()}</span>
        {isDuplicates && (
          <span className="text-[10px] font-medium text-slate-400 font-mono tracking-tight">
            (SKU+Site+Week)
          </span>
        )}
      </p>
      {(isCompleteness || isConsistency) && (
        <p className="absolute bottom-3 right-4 text-[9px] text-slate-400 italic font-medium">
          Click to view the Data drill-down table
        </p>
      )}
    </div>
  );
};

export default function DataValidationTab({ validationState, setValidationState, onValidationSuccess }) {
  const {
    dataSource,
    file,
    dbConfig,
    result,
    error,
    connectionStatus,
    connectionMsg
  } = validationState;

  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [expandedMetric, setExpandedMetric] = useState(null);
  const [showThresholds, setShowThresholds] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const rowsPerPage = 10;

  // Helper to toggle variability metric expansion
  const toggleMetric = (name) => {
    setExpandedMetric(expandedMetric === name ? null : name);
  };
  const updateState = (updates) => {
    setValidationState(prev => ({ ...prev, ...updates }));
  };

  const setDataSource = (val) => updateState({ dataSource: val });
  const setFile = (val) => updateState({ file: val });
  const setDbConfig = (val) => updateState({ dbConfig: val });
  const setResult = (val) => updateState({ result: val });
  const setError = (val) => updateState({ error: val });
  const setConnectionStatus = (val) => updateState({ connectionStatus: val });
  const setConnectionMsg = (val) => updateState({ connectionMsg: val });

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDbChange = (e) => {
    setDbConfig({ ...dbConfig, [e.target.name]: e.target.value });
    if (connectionStatus) {
      setConnectionStatus(null);
      setConnectionMsg('');
    }
  };

  const handleTestConnection = async () => {
    if (!dbConfig.host || !dbConfig.database || !dbConfig.username || !dbConfig.query) {
      setError("Please fill out all required database fields before testing.");
      return;
    }
    setTestLoading(true);
    setError(null);
    setConnectionStatus(null);
    setConnectionMsg('');
    setResult(null);

    try {
      const response = await fetch('http://127.0.0.1:8001/api/test_db_connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbConfig),
      });

      const data = await response.json();
      if (data.status === 'success') {
        setConnectionStatus('success');
        setConnectionMsg(data.message || 'Connected successfully');
      } else {
        setConnectionStatus('error');
        setConnectionMsg(data.message || 'Connection failed - check credentials');
      }
    } catch (err) {
      setConnectionStatus('error');
      setConnectionMsg('Connection failed - check credentials');
    } finally {
      setTestLoading(false);
    }
  };

  const handleValidation = async () => {
    setLoading(true);
    setError(null);

    try {
      let response;
      if (dataSource === 'file') {
        if (!file) {
          setError("Please select a file first.");
          setLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append('file', file);
        response = await fetch('http://127.0.0.1:8001/api/validate', {
          method: 'POST',
          body: formData,
        });
      } else {
        if (!dbConfig.host || !dbConfig.database || !dbConfig.username || !dbConfig.query) {
          setError("Please fill out all required database fields.");
          setLoading(false);
          return;
        }
        response = await fetch('http://127.0.0.1:8001/api/validate_db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbConfig),
        });
      }

      const data = await response.json();
      if (data.status === 'success') {
        setResult(data);
        if (onValidationSuccess) onValidationSuccess();
      } else {
        setError(data.message || 'Validation failed');
      }
    } catch (err) {
      setError(err.message || 'Error connecting to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const renderIcon = (msg) => {
    const isError = msg.toLowerCase().includes('alert') || msg.toLowerCase().includes('zero') || msg.toLowerCase().includes('skipped');
    if (isError) return <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />;
    return <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />;
  };

  const cleanMessage = (msg) => {
    return msg.replace(/[✅❌⚠️🎉🚩]/g, '').trim();
  };

  return (
    <div className="flex flex-col pr-2 custom-scrollbar overflow-y-auto h-full">
      {/* Header Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-display font-bold text-[#0F172A] leading-relaxed pb-1 mb-2">Data Source Configuration</h2>
        <p className="text-base text-slate-600">Connect a database or upload a file to run integrity checks and generate KPIs.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Configuration Panel (Left - 1/3) */}
        <div className="xl:col-span-4 glass p-8 rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col items-center">
          {/* Tabs Toggle */}
          <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-full mb-8">
            <button
              onClick={() => { setDataSource('file'); setError(null); setConnectionStatus(null); }}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 text-sm font-semibold rounded-xl transition-all ${dataSource === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <UploadCloud className="w-4.5 h-4.5" /> File Upload
            </button>
            <button
              onClick={() => { setDataSource('db'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 text-sm font-semibold rounded-xl transition-all ${dataSource === 'db' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Database className="w-4.5 h-4.5" /> Database
            </button>
          </div>

          {/* File Upload Section */}
          {dataSource === 'file' && (
            <div className="w-full">
              <div className="relative border-2 border-dotted border-slate-200 rounded-3xl p-12 hover:bg-slate-50/50 transition-colors text-center group mb-8 flex flex-col items-center justify-center min-h-[220px]">
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {file ? (
                  <div className="flex flex-col items-center animate-fade-in">
                    <FileSpreadsheet className="w-12 h-12 text-blue-500 mb-4" />
                    <p className="text-sm text-[#0F172A] font-bold mb-1 max-w-[200px] truncate">{file.name}</p>
                    <p className="text-xs text-slate-400 font-mono">{(file.size / 1024 / 1024).toFixed(4)} MB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <UploadCloud className="w-12 h-12 text-slate-300 mb-4 group-hover:text-blue-400 transition-colors" />
                    <p className="text-sm text-[#0F172A] font-bold mb-1">Choose CSV or Excel file</p>
                    <p className="text-xs text-slate-400">Drag and drop or click to browse</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleValidation}
                disabled={loading}
                className="w-full btn-primary py-4 px-6 text-base font-bold flex justify-center items-center gap-3"
              >
                {loading ? "Processing..." : "Run Validation & KPIs"}
              </button>
            </div>
          )}

          {/* Database Section */}
          {dataSource === 'db' && (
            <div className="w-full space-y-5 animate-fade-in">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Database Type</label>
                  <select name="db_type" value={dbConfig.db_type} onChange={handleDbChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer">
                    <option value="oracle">Oracle Database</option>
                    <option value="sqlserver">SQL Server</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Host</label>
                    <input type="text" name="host" value={dbConfig.host} onChange={handleDbChange} placeholder="localhost" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Port</label>
                    <input type="text" name="port" value={dbConfig.port} onChange={handleDbChange} placeholder={dbConfig.db_type === 'oracle' ? '1521' : '1433'} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Database / SID</label>
                  <input type="text" name="database" value={dbConfig.database} onChange={handleDbChange} placeholder="DB_NAME" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Username</label>
                    <input type="text" name="username" value={dbConfig.username} onChange={handleDbChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                    <input type="password" name="password" value={dbConfig.password} onChange={handleDbChange} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">SQL Query</label>
                  <textarea name="query" value={dbConfig.query} onChange={handleDbChange} rows="3" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none"></textarea>
                </div>
              </div>

              {connectionStatus && (
                <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-3 border ${connectionStatus === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                  }`}>
                  {connectionStatus === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {connectionMsg}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={testLoading}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-xl transition-all flex justify-center items-center gap-2.5"
                >
                  <Activity className="w-4 h-4" /> {testLoading ? "Testing..." : "Test Connection"}
                </button>
                <button
                  onClick={handleValidation}
                  disabled={loading || connectionStatus !== 'success'}
                  className="btn-primary w-full py-4 text-base font-bold"
                >
                  {loading ? "Processing..." : "Run Database Validation"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 w-full p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-semibold flex items-center gap-3 animate-slide-up">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Results Panel (Right - 2/3) */}
        <div className="xl:col-span-8 space-y-8 flex flex-col">
          {result ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 flex-1">

              {/* KPI Cards (2-Row Layout) */}
              {result.kpis && (
                <div className="space-y-4">
                  {/* Row 1: Scope & Scale (4 Cards) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {["Total Records", "SKUs", "Sites", "Planning Horizon"].map((key) => {
                      const value = result.kpis[key];
                      if (!value) return null;
                      return <KPICard key={key} name={key} value={value} />;
                    })}
                  </div>

                  {/* Row 2: Audit & Quality Metrics (3 Cards) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {["Data Completeness", "Data Consistency", "Duplicates Found"].map((key) => {
                      const value = result.kpis[key];
                      if (!value) return null;
                      return (
                        <KPICard
                          key={key}
                          name={key}
                          value={value}
                          onClick={(key === "Data Completeness" || key === "Data Consistency") ? () => setSelectedKPI(selectedKPI === key ? null : key) : null}
                          isSelected={selectedKPI === key}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Missing Data Drill-down Table (Conditional) */}
              {selectedKPI === 'Data Completeness' && result.kpis['Data Completeness']?.missing_rows && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass p-10 rounded-[2.5rem] bg-white border border-blue-100 shadow-xl shadow-blue-900/5 mb-8"
                >
                  <div className="flex flex-col gap-6 mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[#0F172A] tracking-tight">Missing Data Drill-down Table</h3>
                        <p className="text-sm text-slate-500 font-medium">Identifying specific records with integrity gaps</p>
                      </div>
                    </div>

                    {/* Search & Export Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      {/* Search Bar */}
                      <div className="relative w-full sm:w-72 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                          type="text"
                          placeholder="Search SKU, Site or Week..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1); // Reset to page 1 on search
                          }}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        />
                      </div>

                      {/* Export Button */}
                      <button
                        onClick={() => {
                          const csv = Papa.unparse(result.kpis['Data Completeness'].missing_rows.map(r => ({
                            SKU: r.SKU,
                            Site: r.Site,
                            Week: r.Week,
                            ...r.RowData
                          })));
                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                          const link = document.createElement('a');
                          const url = URL.createObjectURL(blob);
                          link.setAttribute('href', url);
                          link.setAttribute('download', `missing_data_audit_${new Date().toISOString().split('T')[0]}.csv`);
                          link.style.visibility = 'hidden';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95 group"
                      >
                        <Download className="w-4 h-4 text-blue-500 group-hover:translate-y-0.5 transition-transform" />
                        Export Full Audit (.csv)
                      </button>
                    </div>

                    {/* Insights Summary Section */}
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2.5 text-sm font-bold text-red-600 bg-red-50/50 px-4 py-2.5 rounded-2xl border border-red-100/50">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        ⚠️ {result.kpis['Data Completeness'].total_affected_rows} rows have missing values
                      </div>
                      {Object.entries(result.kpis['Data Completeness'].missing_details).map(([col, data]) => (
                        <div key={col} className="flex items-center gap-2.5 text-xs font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          ⚠️ {col} missing in {data.count} rows
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Drill-down Table Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <h4 className="text-2xl font-bold text-[#0F172A]">Rows with missing values</h4>
                  </div>

                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr>
                          <th className="pb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">SKU</th>
                          <th className="pb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Site</th>
                          <th className="pb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Week</th>
                          {Object.keys(result.kpis['Data Completeness']?.missing_details || {}).map(col => (
                            <th key={col} className="pb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(() => {
                          const filteredRows = result.kpis['Data Completeness']?.missing_rows?.filter(r =>
                            r.SKU.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.Site.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.Week.toLowerCase().includes(searchTerm.toLowerCase())
                          ) || [];

                          const startIndex = (currentPage - 1) * rowsPerPage;
                          const paginatedRows = filteredRows.slice(startIndex, startIndex + rowsPerPage);
                          const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

                          return (
                            <>
                              {paginatedRows.map((row, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                  <td className="py-5 px-4 text-sm font-mono text-slate-900 font-bold tracking-tight whitespace-nowrap">{row.SKU}</td>
                                  <td className="py-5 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">{row.Site}</td>
                                  <td className="py-5 px-4 text-sm font-bold text-blue-600 font-mono italic whitespace-nowrap">{row.Week}</td>
                                  {Object.keys(result.kpis['Data Completeness']?.missing_details || {}).map(col => {
                                    const val = row.RowData?.[col];
                                    const isMissing = !val || val === "" || val === "nan" || val === "None";
                                    return (
                                      <td key={col} className={`py-5 px-4 text-[11px] text-center border-l border-slate-50/20 ${isMissing ? 'bg-red-50/30' : ''}`}>
                                        {isMissing ? (
                                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 opacity-40 inline-block" />
                                        ) : (
                                          <span className="font-mono text-slate-600 font-bold">{val}</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                              {filteredRows.length > rowsPerPage && (
                                <tr>
                                  <td colSpan={3 + Object.keys(result.kpis['Data Completeness'].missing_details).length} className="pt-8">
                                    <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                      <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-30 disabled:cursor-not-not-allowed hover:text-blue-600 transition-colors"
                                      >
                                        <ChevronLeft className="w-4 h-4" /> Previous
                                      </button>

                                      <div className="flex gap-2 items-center">
                                        {[...Array(totalPages)].map((_, i) => (
                                          <button
                                            key={i}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                              }`}
                                          >
                                            {i + 1}
                                          </button>
                                        ))}
                                      </div>

                                      <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-30 disabled:cursor-not-not-allowed hover:text-blue-600 transition-colors"
                                      >
                                        Next <ChevronRight className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* Data Consistency Drill-down Table (Conditional) */}
              {selectedKPI === 'Data Consistency' && result.kpis['Data Consistency'] && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass p-10 rounded-[2.5rem] bg-white border border-amber-100 shadow-xl shadow-amber-900/5 mb-8"
                >
                  <div className="flex flex-col gap-6 mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100">
                        <Activity className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[#0F172A] tracking-tight">Calculation Consistency Drill-down</h3>
                        <p className="text-sm text-slate-500 font-medium">Identifying rows where inventory balance or supply/demand formulas do not add up</p>
                      </div>
                    </div>
                            {/* Summary Chips (Always Visible) */}
                    <div className="flex flex-wrap gap-2.5 mb-8">
                      {Object.entries(result.kpis['Data Consistency'].sub_metrics || {}).map(([rule, pct]) => (
                        <div key={rule} className="flex items-center gap-2.5 text-xs font-bold text-slate-600 bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:bg-slate-50">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-slate-500 uppercase font-bold tracking-tight text-[10px]">{rule}:</span>
                          <span className="text-emerald-700 font-mono text-[11px]">{pct}</span>
                        </div>
                      ))}
                    </div>

                    {/* Conditional Content: Success Message OR Inconsistency Audit Table */}
                    {result.kpis['Data Consistency'].inconsistent_rows?.length > 0 ? (
                      <div className="space-y-8">
                        {/* Search & Export Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="relative w-full sm:w-72 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                            <input
                              type="text"
                              placeholder="Search SKU, Site or Week..."
                              value={searchTerm}
                              onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                              }}
                              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all font-medium"
                            />
                          </div>

                          <button
                            onClick={() => {
                              const csv = Papa.unparse(result.kpis['Data Consistency'].inconsistent_rows.map(r => ({
                                SKU: r.SKU,
                                Site: r.Site,
                                Week: r.Week,
                                ...r.Metrics
                              })));
                              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                              const link = document.createElement('a');
                              const url = URL.createObjectURL(blob);
                              link.setAttribute('href', url);
                              link.setAttribute('download', `consistency_audit_${new Date().toISOString().split('T')[0]}.csv`);
                              link.click();
                            }}
                            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95 group"
                          >
                            <Download className="w-4 h-4 text-amber-500 group-hover:translate-y-0.5 transition-transform" />
                            Export Consistency Audit (.csv)
                          </button>
                        </div>

                        {/* Error Alert */}
                        <div className="flex items-center gap-2.5 text-sm font-bold text-amber-600 bg-amber-50/50 px-4 py-3 rounded-2xl border border-amber-100/50">
                          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          ⚠️ {result.kpis['Data Consistency'].total_affected_rows} rows have calculation inconsistencies
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr>
                                <th className="pb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">SKU</th>
                                <th className="pb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Site</th>
                                <th className="pb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Week</th>
                                <th className="pb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Start Inv</th>
                                <th className="pb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Supply</th>
                                <th className="pb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Demand</th>
                                <th className="pb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center font-black">End Inv</th>
                                <th className="pb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Planned</th>
                                <th className="pb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Confirmed</th>
                                <th className="pb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Forecast</th>
                                <th className="pb-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center">Backorder</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {(() => {
                                const filteredRows = result.kpis['Data Consistency']?.inconsistent_rows?.filter(r =>
                                  r.SKU.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  r.Site.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  r.Week.toLowerCase().includes(searchTerm.toLowerCase())
                                ) || [];

                                const startIndex = (currentPage - 1) * rowsPerPage;
                                const paginatedRows = filteredRows.slice(startIndex, startIndex + rowsPerPage);
                                const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

                                return (
                                  <>
                                    {paginatedRows.map((row, idx) => (
                                      <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="py-5 px-4 text-sm font-mono text-slate-900 font-bold tracking-tight whitespace-nowrap">{row.SKU}</td>
                                        <td className="py-5 px-4 text-sm font-semibold text-slate-600 whitespace-nowrap">{row.Site}</td>
                                        <td className="py-5 px-4 text-sm font-bold text-amber-600 font-mono italic whitespace-nowrap">{row.Week}</td>

                                        <td className="py-5 px-4 text-[11px] text-center font-mono text-slate-600">{row.Metrics["Start Inventory"]}</td>
                                        <td className="py-5 px-4 text-[11px] text-center font-mono text-slate-600">{row.Metrics["Total Supply"]}</td>
                                        <td className="py-5 px-4 text-[11px] text-center font-mono text-slate-600">{row.Metrics["Total Demand"]}</td>
                                        <td className="py-5 px-4 text-sm text-center font-black text-slate-900 bg-amber-50/30">{row.Metrics["End Inventory"]}</td>
                                        <td className="py-5 px-4 text-[11px] text-center font-mono text-slate-600">{row.Metrics["Planned Supply"]}</td>
                                        <td className="py-5 px-4 text-[11px] text-center font-mono text-slate-600">{row.Metrics["Confirmed Supply"]}</td>
                                        <td className="py-5 px-4 text-[11px] text-center font-mono text-slate-600">{row.Metrics["Forecast"]}</td>
                                        <td className="py-5 px-4 text-[11px] text-center font-mono text-slate-600">{row.Metrics["Backorder"]}</td>
                                      </tr>
                                    ))}
                                    {filteredRows.length > rowsPerPage && (
                                      <tr>
                                        <td colSpan={11} className="pt-8">
                                          <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                            <button
                                              disabled={currentPage === 1}
                                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:text-amber-600 transition-colors"
                                            >
                                              <ChevronLeft className="w-4 h-4" /> Previous
                                            </button>

                                            <div className="flex gap-2 items-center">
                                              {[...Array(totalPages)].map((_, i) => (
                                                <button
                                                  key={i}
                                                  onClick={() => setCurrentPage(i + 1)}
                                                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i + 1
                                                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                                                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                                    }`}
                                                >
                                                  {i + 1}
                                                </button>
                                              ))}
                                            </div>

                                            <button
                                              disabled={currentPage === totalPages}
                                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:text-amber-600 transition-colors"
                                            >
                                              Next <ChevronRight className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-12 text-center bg-emerald-50/20 rounded-3xl border border-emerald-100/50 animate-fade-in flex flex-col items-center">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-4" />
                        <h4 className="text-xl font-bold text-emerald-900 mb-1">Great News!</h4>
                        <p className="text-sm text-emerald-700 font-medium">All calculations are 100.00% consistent across your dataset.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Side-by-Side: Variability (Left) & Report (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

                {/* Variability Metrics Section (Left - 2/5) */}
                {result.variability_metrics && (
                  <div className="lg:col-span-2 glass p-8 rounded-[2rem] border border-slate-200/60 bg-white/50 shadow-sm flex flex-col">
                    <div className="flex flex-col gap-1 mb-6">
                      <h3 className="text-base font-bold text-[#0F172A]">Variability Metrics</h3>
                      <button
                        onClick={() => setShowThresholds(!showThresholds)}
                        className="text-[10px] text-slate-400 italic hover:text-slate-600 transition-colors cursor-pointer text-left w-fit"
                      >
                        {showThresholds ? "Hide thresholds" : "Click to view thresholds"}
                      </button>
                      <div className="h-px w-24 bg-slate-200 mt-1"></div>
                    </div>

                    <AnimatePresence>
                      {showThresholds && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mb-6 bg-blue-50/30 rounded-2xl border border-blue-100/50 p-4"
                        >
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr>
                                <th className="pb-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider">CV Range</th>
                                <th className="pb-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-blue-100/30">
                              <tr>
                                <td className="py-2 text-[10px] font-mono font-bold text-slate-600">CV &lt; 0.3</td>
                                <td className="py-2 text-center"><span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase">Low</span></td>
                              </tr>
                              <tr>
                                <td className="py-2 text-[10px] font-mono font-bold text-slate-600">0.3 ≤ CV &lt; 0.6</td>
                                <td className="py-2 text-center"><span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[9px] font-bold uppercase">Moderate</span></td>
                              </tr>
                              <tr>
                                <td className="py-2 text-[10px] font-mono font-bold text-slate-600">CV ≥ 0.6</td>
                                <td className="py-2 text-center"><span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[9px] font-bold uppercase">High</span></td>
                              </tr>
                            </tbody>
                          </table>
                          <div className="mt-3 space-y-2">
                            <div className="text-[9px] leading-relaxed text-slate-500"><span className="font-bold text-emerald-600">Stable:</span> Very predictable; regular planning.</div>
                            <div className="text-[9px] leading-relaxed text-slate-500"><span className="font-bold text-amber-600">Average:</span> Normal business fluctuations.</div>
                            <div className="text-[9px] leading-relaxed text-slate-500"><span className="font-bold text-red-600">Volatile:</span> Unpredictable patterns; requires buffers.</div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="space-y-6">
                      {Object.entries(result.variability_metrics).map(([key, value]) => {
                        const isExpanded = expandedMetric === key;
                        const isObject = typeof value === 'object' && value !== null;
                        const status = isObject ? value.status : value;
                        const showDetails = isExpanded && isObject;

                        return (
                          <div key={key} className="flex flex-col gap-2 py-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{key.split(' ')[0]}</span>
                            <div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleMetric(key);
                                }}
                                className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 hover:scale-[1.05] active:scale-[0.95] shadow-sm border ${status === 'High' ? 'bg-red-50 text-red-600 border-red-200 cursor-pointer hover:bg-red-100' :
                                    status === 'Moderate' ? 'bg-amber-50 text-amber-600 border-amber-200 cursor-pointer hover:bg-amber-100' :
                                      status === 'Low' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 cursor-pointer hover:bg-emerald-100' :
                                        'bg-slate-50 text-slate-400 border-slate-200 cursor-default'
                                  }`}>
                                {status}
                              </button>
                            </div>

                            {showDetails && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                transition={{ duration: 0.25, ease: "circOut" }}
                                className="overflow-hidden bg-white/40 backdrop-blur-sm rounded-xl border border-slate-200/50 mt-2 p-3 space-y-3 shadow-inner"
                              >
                                <div className="flex justify-between items-center bg-slate-100/50 p-2 rounded-lg border border-slate-200/30">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Exact Score:</span>
                                  <span className="text-[10px] font-mono font-bold text-slate-700">CV = {value.cv || 0}</span>
                                </div>
                                <div className="space-y-2">
                                  {value.sku_highlights && (
                                    <div className="flex gap-2 items-start">
                                      <span className="text-[10px] text-amber-500">⚠</span>
                                      <span className="text-[10px] font-medium text-slate-600 leading-tight">{value.sku_highlights} show high volatility</span>
                                    </div>
                                  )}
                                  {value.top_sites && value.top_sites.length > 0 && (
                                    <div className="flex gap-2 items-start">
                                      <span className="text-[10px] text-amber-500">⚠</span>
                                      <span className="text-[10px] font-medium text-slate-600 leading-tight">
                                        {value.top_sites.join(' and ')} driving variability
                                      </span>
                                    </div>
                                  )}
                                  {value.spikes && value.spikes.length > 0 && (
                                    <div className="flex gap-2 items-start">
                                      <span className="text-[10px] text-amber-500">⚠</span>
                                      <span className="text-[10px] font-medium text-slate-600 leading-tight">
                                        Demand spikes observed in {value.spikes.slice(0, 3).join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Inspection Report Grid (Right - 3/5) */}
                <div className={`${result.variability_metrics ? 'lg:col-span-3' : 'lg:col-span-5'} glass p-10 rounded-[2.5rem] flex flex-col`}>
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                      <CheckCircle2 className="w-4.5 h-4.5 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-[#0F172A]">Inspection Report</h3>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {(result.validation || []).map((msg, i) => (
                      <div key={i} className="flex gap-3 bg-slate-50/70 py-3 px-5 rounded-xl border border-slate-100/80 items-center">
                        <div className="shrink-0 scale-75">
                          {renderIcon(msg)}
                        </div>
                        <p className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                          {cleanMessage(msg)}
                        </p>
                      </div>
                    ))}
                    {(!result.validation || result.validation.length === 0) && (
                      <div className="w-full py-10 text-center">
                        <p className="text-slate-400 font-medium">No validation messages found.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center border-2 border-dotted border-slate-200 rounded-[2.5rem] bg-white group min-h-[500px]">
              <div className="text-center group-hover:scale-105 transition-transform duration-500">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Activity className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-base text-slate-400 font-medium max-w-xs mx-auto">
                  Configure a data source to see validation insights and preview data.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
