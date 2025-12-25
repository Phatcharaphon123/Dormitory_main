import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import API_URL from "../../config/api";
import FooterSidebar from "../common/FooterSidebar";

// Icons
import { RxDashboard } from "react-icons/rx";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import { GoPeople } from "react-icons/go";
import { FiChevronDown, FiChevronRight, FiSettings } from "react-icons/fi"; // เพิ่มไอคอน Settings

const SidebarMain = () => {
  const location = useLocation();
  const pathname = location.pathname;
  
  // State สำหรับ User
  const [currentUser, setCurrentUser] = useState({
    name: "Loading...",
    role: "OWNER"
  });

  // State สำหรับจัดการ Submenu (เพิ่มมาเพื่อให้รองรับอนาคต)
  const [openSubMenu, setOpenSubMenu] = useState({});

  // --- Fetch User Data ---
  useEffect(() => {
    const fetchUserData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const id = payload.id || payload.userId;
        
        const res = await axios.get(`${API_URL}/api/userall/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        setCurrentUser({
          name: res.data.username,
          role: payload.role || res.data.role || "OWNERDORM"
        });
      } catch (error) {
        setCurrentUser({
          name: "ไม่พบชื่อผู้ใช้",
          role: "OWNERDORM"
        });
      }
    };
    
    fetchUserData();
  }, []);

  // --- Config เมนู (ปรับเป็น Array เพื่อให้จัดการง่ายและรองรับ Submenu) ---
  const menuItems = [
    {
      title: "แดชบอร์ด",
      path: "/dashboard",
      icon: <RxDashboard size={20} />,
    },
    {
      title: "จัดการหอพัก",
      path: "/dormmanage", // ลิ้งค์หลัก (ถ้ากดที่หัวข้อ)
      icon: <HiOutlineBuildingOffice2 size={20} />,
      // ตัวอย่าง: ถ้าอนาคตอยากมีเมนูย่อยให้ Owner สามารถ uncomment บรรทัดล่างได้เลย
      /* submenu: [
           { title: "หอพักทั้งหมด", path: "/ownerdorm/dormmanage" },
           { title: "เพิ่มหอพักใหม่", path: "/ownerdorm/add-dorm" },
         ] */
    },
    {
      title: "จัดการพนักงาน",
      path: "/ownerdorm/staffmanage",
      icon: <GoPeople size={20} />,
    },
  ];

  // --- Functions ---
  const toggleSubMenu = (index) => {
    setOpenSubMenu((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const isActiveLink = (path) => pathname === path || pathname.startsWith(path);

  return (
    <div className="flex h-screen">
      <div className="bg-gray-800 w-64 text-gray-100 flex flex-col justify-between border-r border-gray-700 shadow-xl overflow-y-auto scrollbar-hide bg-gradient-to-b from-gray-800 to-gray-900">
        
        {/* --- ส่วนบน: Logo และ Menu --- */}
        <div>
          <div className="h-16 bg-gray-900/50 backdrop-blur-sm text-yellow-400 flex items-center justify-center text-2xl font-bold sticky top-0 z-10 border-b border-gray-700/50">
            OwnerDorm
          </div>
          
          <nav className="flex flex-col gap-2 px-3 mt-6 pb-4">
            {menuItems.map((item, index) => (
              <div key={index}>
                {/* กรณีมี Submenu */}
                {item.submenu ? (
                  <>
                    <button
                      onClick={() => toggleSubMenu(index)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 group
                        ${openSubMenu[index] || item.submenu.some(sub => isActiveLink(sub.path)) 
                          ? "bg-gray-700 text-white shadow-sm" 
                          : "hover:bg-gray-700/50 text-gray-300 hover:text-white"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`transition-colors ${openSubMenu[index] ? 'text-yellow-400' : 'group-hover:text-yellow-400'}`}>
                          {item.icon}
                        </span>
                        <span className="font-medium">{item.title}</span>
                      </div>
                      {openSubMenu[index] 
                        ? <FiChevronDown className="text-yellow-400/70" /> 
                        : <FiChevronRight className="text-gray-500 group-hover:text-gray-300" />
                      }
                    </button>

                    {/* Submenu Items */}
                    <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openSubMenu[index] ? "max-h-96 opacity-100 mt-2 mb-2" : "max-h-0 opacity-0"}`}>
                      <div className="flex flex-col gap-1 pl-6 ml-2 space-y-0.5">
                        {item.submenu.map((subItem, subIndex) => {
                          const active = isActiveLink(subItem.path);
                          return (
                            <Link
                              key={subIndex}
                              to={subItem.path}
                              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-all duration-200
                                ${active 
                                  ? "text-yellow-400 bg-gray-700/30 font-medium" 
                                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/20"
                                }
                              `}
                            >
                              <span className={`shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-500 transition-all duration-300
                                 ${active ? 'shadow-[0_0_6px_rgba(234,179,8,0.8)] scale-110' : 'opacity-70 group-hover:opacity-100'}
                              `}></span>
                              <span>{subItem.title}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  // กรณีไม่มี Submenu (ลิ้งค์ปกติ)
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group
                      ${isActiveLink(item.path) 
                        ? "bg-yellow-500 text-gray-900 shadow-md font-bold" 
                        : "hover:bg-gray-700/50 text-gray-300 hover:text-white"
                      }
                    `}
                  >
                    <span className={`${isActiveLink(item.path) ? 'text-gray-900' : 'group-hover:text-yellow-400'}`}>
                      {item.icon}
                    </span>
                    <span className="font-medium">{item.title}</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* --- ส่วนล่าง: Footer User Profile --- */}
        <FooterSidebar currentUser={currentUser} />
      </div>
    </div>
  );
};

export default SidebarMain;