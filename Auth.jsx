import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Loader2, Box } from 'lucide-react';

export default function Auth({ onAuthenticated }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [persona, setPersona] = useState('sender'); // 'sender' or 'receiver'

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate authentication delay
    setTimeout(() => {
      setIsLoading(false);
      onAuthenticated({ name: 'Anshita', role: persona });
    }, 1500);
  };

  const toggleMode = () => setIsLogin(!isLogin);

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white font-sans overflow-hidden">
      
      {/* Left Section: Illustration */}
      <div className="hidden lg:flex items-start justify-center pt-8 p-12 bg-[#F9F7F2] relative">
        <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
            {/* Circular Background Decor */}
            <div className="absolute inset-0 rounded-full bg-[#F3F0E9] scale-150 opacity-40" />
            <div className="absolute inset-0 rounded-full border border-slate-200/30 scale-[1.7]" />
            
            <motion.img 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              src="/login-hero.png" 
              alt="Logistics Illustration" 
              className="relative z-10 w-full h-full object-contain"
            />
        </div>
      </div>

      {/* Right Section: Login Form */}
      <div className="flex flex-col items-center pt-8 lg:pt-10 p-8 lg:px-16 bg-[#FDFBF7] relative h-full overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[380px] space-y-4"
        >
          {/* Logo Area */}
          <div className="flex flex-col items-center mb-1">
             <img src="/genpact-logo.png" alt="Genpact Logo" className="h-16 w-auto mb-1" />
             <div className="space-y-0.5 text-center">
                <h1 className="text-[24px] font-bold text-[#1A1A1A] tracking-tight leading-tight">Inventory Intelligence</h1>
                <p className="text-[#666666] text-[11px] font-normal">Sign in to access your dashboard</p>
             </div>
          </div>

          {/* Persona Selection */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setPersona('sender')}
              className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 group ${
                persona === 'sender' 
                ? 'border-[#FFA500] bg-[#FFA500]/5' 
                : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                persona === 'sender' ? 'bg-[#FFA500] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
              }`}>
                <ArrowRight className="w-3.5 h-3.5 rotate-[-45deg]" />
              </div>
              <div className="text-center">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${persona === 'sender' ? 'text-slate-900' : 'text-slate-500'}`}>
                  Alert Sender
                </p>
              </div>
            </button>

            <button
              onClick={() => setPersona('receiver')}
              className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 group ${
                persona === 'receiver' 
                ? 'border-[#FFA500] bg-[#FFA500]/5' 
                : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                persona === 'receiver' ? 'bg-[#FFA500] text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
              }`}>
                <ArrowRight className="w-3.5 h-3.5 rotate-[135deg]" />
              </div>
              <div className="text-center">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${persona === 'receiver' ? 'text-slate-900' : 'text-slate-500'}`}>
                  Alert Receiver
                </p>
              </div>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-[13px] font-semibold text-[#1A1A1A] ml-0.5">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-[17px] w-[17px] text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-9 pr-4 py-2 border border-[#D1D5DB] rounded-lg bg-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#FFA500]/50 transition-all text-[13px] text-slate-900 placeholder:text-slate-400"
                  placeholder="product.manager@company.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-[13px] font-semibold text-[#1A1A1A] ml-0.5">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-[17px] w-[17px] text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="block w-full pl-9 pr-10 py-2 border border-[#D1D5DB] rounded-lg bg-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#FFA500]/50 transition-all text-[13px] text-slate-900 placeholder:text-slate-400"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Eye className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#FFA500] hover:bg-[#FF9500] text-white font-bold py-2.5 px-6 rounded-lg transition-all flex items-center justify-center uppercase tracking-wide text-[13px] mt-1 disabled:opacity-75"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'SIGN IN'
              )}
            </button>
          </form>

          <div className="text-center pt-1">
            <p className="text-[10px] text-[#666666]">
              Demo: Use any email and password to login
            </p>
          </div>

          {/* Social / SSO Divider */}
          <div className="relative pt-2 pb-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E7EB]" />
            </div>
            <div className="relative flex justify-center text-[10px] font-medium uppercase tracking-wider">
              <span className="px-3 bg-[#FDFBF7] text-[#666666]">Or Continue With</span>
            </div>
          </div>

          <button
            type="button"
            className="w-full bg-white border border-[#000000] hover:bg-slate-50 text-black font-bold py-2.5 px-6 rounded-lg transition-all uppercase tracking-wide text-[13px] flex items-center justify-center"
          >
            SSO LOGIN
          </button>

          {/* Optional Toggle Mode (Hidden UI to match image but kept for logic) */}
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-xs font-bold text-slate-400 hover:text-[#FFA500] transition-colors"
            >
              {isLogin ? 'Switch to dynamic portal' : 'Access core system'}
            </button>
          </div>
        </motion.div>

        {/* Footer Credit */}
        <div className="mt-auto pt-8 pb-4 text-[10px] text-slate-400 font-mono uppercase tracking-[0.2em]">
          Powered by Intelligence Platform
        </div>
      </div>
    </div>
  );
}
