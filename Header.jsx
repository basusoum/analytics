import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header({ userName = 'Anshita', role = 'sender', onSignOut }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="absolute top-4 right-12 z-50">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 bg-white border border-slate-200 shadow-sm hover:shadow pl-3 pr-2 py-1 rounded-full transition-all group"
        >
          <div className="flex flex-col items-end mr-1">
            <span className="text-[13px] font-bold text-slate-900 leading-tight">{userName}</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 rounded-sm leading-none py-0.5 ${
              role === 'sender' ? 'bg-orange-100 text-[#FFA500]' : 'bg-blue-100 text-blue-600'
            }`}>
              {role === 'sender' ? 'Alert Sender' : 'Alert Receiver'}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-100 transition-colors">
            <User className="w-4 h-4" />
          </div>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden"
            >
              <div className="p-1.5">
                <button
                  onClick={onSignOut}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors font-medium group"
                >
                  <span className="ml-1">Sign Out</span>
                  <LogOut className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
