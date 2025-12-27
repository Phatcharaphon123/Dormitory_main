
import React from "react";
import { Outlet } from "react-router-dom";
import TenantSidebar from "../components/Tenant/TenantSidebar";
import TenantHeader from "../components/Tenant/TenantHeader";


const LayoutTenant = () => {
  return (
    <div className="flex h-screen">
    <TenantSidebar />
      <div className="flex-1 flex flex-col">
        <TenantHeader />
        <main className="flex-1 bg-gray-100 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default LayoutTenant;
