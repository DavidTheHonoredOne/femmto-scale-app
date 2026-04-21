import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', name: 'Dashboard', icon: 'fa-chart-line' },
  { path: '/profiles', name: 'Perfiles', icon: 'fa-users' },
  { path: '/performance', name: 'Alcance y Bloqueo', icon: 'fa-ranking-star' },
];

export const Sidebar: React.FC = () => {
  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-64 bg-white border-r border-[#E8EDF2] shadow-sm z-40 flex-col">
        {/* Logo Area */}
        <div className="p-6 border-b border-[#E8EDF2]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4CAF82]/10 flex items-center justify-center">
              <i className="fa-solid fa-weight-scale text-[#4CAF82] text-xl"></i>
            </div>
            <h1 className="text-2xl font-bold text-[#1A2B3C] tracking-tight">Belu's</h1>
          </div>
          <p className="text-xs text-[#64748B] mt-1 font-medium tracking-wide">HEALTH SYSTEM</p>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-colors
                ${isActive 
                  ? 'bg-[#4CAF82]/10 text-[#4CAF82]' 
                  : 'text-[#64748B] hover:bg-[#F8FAFB] hover:text-[#1A2B3C]'
                }
              `}
            >
              <i className={`fa-solid ${item.icon} w-5 text-center`}></i>
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Area (Info/Support) */}
        <div className="p-6 border-t border-[#E8EDF2]">
          <div className="bg-[#E8EDF2]/50 p-4 rounded-xl">
            <p className="text-xs text-[#64748B] font-medium mb-1">Scale Version</p>
            <p className="text-sm text-[#1A2B3C] font-semibold">1.0.0 (BIA-8)</p>
          </div>
        </div>
      </aside>

      {/* Bottom Navigation Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-[#E8EDF2] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 flex justify-around items-center px-2 py-2 safe-area-bottom">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
              flex flex-col items-center justify-center w-full min-h-[56px] py-1 rounded-xl transition-colors
              ${isActive 
                ? 'text-[#4CAF82]' 
                : 'text-[#64748B] hover:text-[#1A2B3C] hover:bg-[#F8FAFB]'
              }
            `}
          >
            <i className={`fa-solid ${item.icon} text-xl mb-1`}></i>
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
};
