// src/layouts/DormLayout.jsx
import DormNavbar from "../pages/DormManage/DormNavbar";
import DormSidebar from "../pages/DormManage/DormSidebar";
import { Outlet } from "react-router-dom";

function LayoutDormManage() {
  return (
    <div className="flex h-screen">
      <DormSidebar/>
      <div className="flex-1 flex flex-col">
        <DormNavbar />
        <main className="flex-1 p-6 bg-gray-100 overflow-y-auto">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
}

export default LayoutDormManage;

