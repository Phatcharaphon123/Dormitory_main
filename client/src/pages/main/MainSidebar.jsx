import { Link } from 'react-router-dom';
import { useState } from "react";
import { FaChevronLeft } from "react-icons/fa";
import { TbLayoutDashboardFilled } from "react-icons/tb";
import logo from '../../assets/sweet-roomie-logo.png'; 
import { PiBuildingApartmentFill } from "react-icons/pi";

function SidebarMain() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
  { icon: <TbLayoutDashboardFilled size={20}/>, label: "Dashboard" ,path: "/dashboard-main"},
  { icon: <PiBuildingApartmentFill size={20}/>, label: "หอพักของคุณ" ,path: "/youdorm"},
  ];

  return (
      <div
        className={`relative ${collapsed ? 'w-20' : 'w-64'} bg-[#111322] pr-5 pl-5 pt-3 flex flex-col transition-all duration-500 ease-in-out`}
        style={{
          boxShadow: '4px 0 8px rgba(0, 0, 0, 0.5)',
          minHeight: '100vh', 
        }}
      >

       {/* Header */}
      <div className="flex items-center justify-between">
        {!collapsed && <div className="flex items-center gap-1 text-xl font-bold text-gray-300"><img src={logo} alt="Sweet Roomie Logo" className="w-11 h-11 rounded-xl"/><div><span className="text-blue-600 text-3xl">S</span>martDorm</div></div>}
          <button
            className={`p-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 ${collapsed ? 'mx-auto' : ''}`}
            onClick={() => setCollapsed(!collapsed)}
          >
          <div
            className={`transition-transform duration-500 ${
              collapsed ? 'rotate-180' : ''
            }`}
          >
            <FaChevronLeft size={20} className="text-blue-400" />
          </div>
        </button>
      </div>

      {/* Divider */}
      <hr className="border-b-2 border-gray-400 mb-3 mt-3 rounded-4xl" />

       {/* Menu */}
     <ul className="space-y-2">
        {menuItems.map((item, index) => (
          <li key={index}>
            <Link
              to={item.path}
              onClick={() => setActiveIndex(index)}
              className={`group flex items-center w-full p-2 rounded-lg transition-all duration-300 
                ${activeIndex === index ? 'bg-gray-600' : 'hover:bg-gray-500'}`}
            >
              <div className={`w-6 h-6 flex items-center justify-center text-gray-400 
                  ${activeIndex === index ? 'text-white' : 'group-hover:text-white'}`}>
                {item.icon}
              </div>
              {!collapsed && (
                <span className={`ml-2.5 text-gray-400 transition-all duration-300 
                    ${activeIndex === index ? 'text-white' : 'group-hover:text-white'}`}>
                  {item.label}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SidebarMain;
