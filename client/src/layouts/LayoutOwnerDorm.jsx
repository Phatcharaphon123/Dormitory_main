
import React from "react";
import { Outlet } from "react-router-dom";
import SidebarMain from "../components/OwnerDorm/SidebarMain";
import HeaderMain from "../components/OwnerDorm/HeaderMain";

const LayoutOwnerDorm = () => {
  return (
    <div className="flex h-screen">
      <SidebarMain/>
      <div className="flex-1 flex flex-col">
        <HeaderMain />
        <main className="flex-1 bg-gray-100 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default LayoutOwnerDorm;
