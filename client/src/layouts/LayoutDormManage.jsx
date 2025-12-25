// src/layouts/DormLayout.jsx
import DormNavbar from "../components/DormManage/DormNavbar";
import DormSidebar from "../components/DormManage/DormSidebar";
import { Outlet } from "react-router-dom";

function LayoutDormManage() {
  return (
    <div className="flex h-screen">
      <DormSidebar/>
      <div className="flex-1 flex flex-col">
        <DormNavbar />
        <main className="flex-1 bg-gray-100 overflow-y-auto">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
}

export default LayoutDormManage;

