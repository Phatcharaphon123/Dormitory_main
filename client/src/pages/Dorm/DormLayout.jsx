// src/layouts/DormLayout.jsx
import DormNavbar from "./DormNavbar";
import DormSidebar from "./DormSidebar";
import { Outlet } from "react-router-dom";

function DormLayout() {
  return (
    <div className="flex">
      <DormSidebar/>
      <div className="flex flex-col flex-1 bg-gray-100">
        <DormNavbar />
        <div>
          <Outlet /> 
        </div>
      </div>
    </div>
  );
}

export default DormLayout;
