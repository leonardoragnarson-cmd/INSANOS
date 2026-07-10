/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, LayoutDashboard, UserCheck, Flame } from 'lucide-react';

interface HeaderProps {
  isAdminMode: boolean;
  onToggleAdminMode: () => void;
  isLoggedIn: boolean;
  onLogout: () => void;
  logoUrl?: string;
}

export default function Header({
  isAdminMode,
  onToggleAdminMode,
  isLoggedIn,
  onLogout,
  logoUrl,
}: HeaderProps) {
  return (
    <header className="bg-[#0a0a0a] border-b border-white/10 text-white sticky top-0 z-50 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-4 select-none">
          <div className="relative">
            {logoUrl ? (
              <div className="w-12 h-12 rounded-sm overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                <img src={logoUrl} alt="Regional Logo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <>
                <div className="bg-amber-500 text-black w-11 h-11 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center animate-pulse">
                  <Flame className="w-5 h-5 fill-black stroke-black" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-[#0a0a0a]" />
              </>
            )}
          </div>
          <div>
            <h1 className="font-sans font-black tracking-tighter text-xl sm:text-2xl uppercase leading-none">
              INSANOS MC
            </h1>
            <p className="text-[9px] text-amber-500 font-bold uppercase tracking-[0.2em] mt-0.5">
              SISTEMA DE GESTÃO DE EVENTOS
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {isAdminMode ? (
            <button
              id="btn-view-event"
              onClick={onToggleAdminMode}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white px-5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-widest transition-all duration-200 border border-white/10 hover:border-white/20 shadow-md cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-amber-500" />
              <span>Ver Evento</span>
            </button>
          ) : (
            <button
              id="btn-admin-panel"
              onClick={onToggleAdminMode}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-amber-500 px-5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-widest transition-all duration-200 border border-white/10 hover:border-amber-500/30 shadow-md cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Portal Adm</span>
            </button>
          )}

          {isLoggedIn && isAdminMode && (
            <button
              id="btn-logout"
              onClick={onLogout}
              className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-widest transition-all duration-200 border border-red-500/20 shadow-md cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              <span>Sair</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
