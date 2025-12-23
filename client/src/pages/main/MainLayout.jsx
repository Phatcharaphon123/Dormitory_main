// src/layouts/MainLayout.jsx
import MainSidebar from "./MainSidebar";
import MainNavbar from "./MainNavbar";
import { Outlet } from "react-router-dom";

function MainLayout() {
  return (
    <div>
      {/* <MainSidebar /> */}
      <div className="flex flex-col flex-1 bg-gray-100 min-h-screen">
        <MainNavbar />
        <div>
          <Outlet /> 
        </div>
      </div>
    </div>
  );
}

export default MainLayout;
