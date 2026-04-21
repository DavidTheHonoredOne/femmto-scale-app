import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const MainLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-[#F8FAFB]">
      <Sidebar />
      {/* md:ml-64 padding for desktop sidebar. pb-24 padding for mobile bottom nav */}
      <main className="flex-1 w-full md:ml-64 pb-24 md:pb-0 transition-all duration-300">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
