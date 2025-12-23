import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import axios from "axios";
import API_URL from "../../../utils/api";
import FooterSidebar from "../common/FooterSidebar";

// Icons
import { RxDashboard } from "react-icons/rx";
import { HiOutlineBuildingOffice2, HiOutlineUsers, HiOutlineBanknotes } from "react-icons/hi2";
import { GoPeople } from "react-icons/go";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";

const SidebarMain = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const { dormId } = useParams();
  
  const [currentUser, setCurrentUser] = useState({
    name: "Loading...",
    role: "ADMIN"
  });

  const [openSubMenu, setOpenSubMenu] = useState({});

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
          role: payload.role || res.data.role || "ADMIN"
        });
      } catch (error) {
        setCurrentUser({
          name: "ไม่พบชื่อผู้ใช้",
          role: "ADMIN"
        });
      }
    };
    
    fetchUserData();
  }, []);

  const menuItems = [
    {
      title: "แดชบอร์ด",
      path: `/admin/${dormId}`,
      icon: <RxDashboard size={20} />,
      exact: true, 
    },
    {
      title: "จัดการผู้เช่า", 
      icon: <HiOutlineUsers size={20} />, 
      submenu: [
        { title: "รายชื่อผู้เช่า", path: `/admin/${dormId}/tenantlist` },
        // { title: "รอย้ายออก", path: `/admin/${dormId}/wait-checkout` },
      ]
    },
    {
      title: "มิเตอร์", 
      icon: <HiOutlineBanknotes size={20} />, 
      submenu: [
        { title: "รายการจดมิเตอร์", path: `/admin/${dormId}/meter-record` },

      ]
    },
    {
      title: "จัดการบิล",
      icon: <GoPeople size={20} />, 
      submenu: [
        { title: "รายการบิลรายเดือน", path: `/admin/${dormId}/invoices` },
      ]
    },
    // {
    //   title: "จัดการพนักงาน",
    //   icon: <GoPeople size={20} />, 
    //   submenu: [
    //     { title: "รายชื่อพนักงาน", path: `/admin/${dormId}/staff` },
    //     { title: "สิทธิ์การใช้งาน", path: `/admin/${dormId}/permissions` },
    //   ]
    // },
    {
      title: "ตั้งค่าหอพัก",
      icon: <HiOutlineBuildingOffice2 size={20} />,
      submenu: [
        { title: "ข้อมูลหอพัก", path: `/admin/${dormId}/dorminfo` },
        { title: "ประเภทห้องพัก", path: `/admin/${dormId}/roomtype` },
        { title: "ชั้นและห้องพัก", path: `/admin/${dormId}/floor-rooms` },
        { title: "ตั้งค่ามิเตอร์ (ราคา)", path: `/admin/${dormId}/meter-settings` },
      ]
    },
  ];

  // ฟังก์ชันเช็คว่า Active หรือไม่
  const isActiveLink = (path, exact = false) => {
    // ลบ Trailing Slash ออกก่อนเช็ค เพื่อความแม่นยำ (เช่น /admin/1/ -> /admin/1)
    const cleanPathname = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path;

    if (exact) {
        return cleanPathname === cleanPath;
    }
    return cleanPathname === cleanPath || cleanPathname.startsWith(cleanPath + "/");
  };

  // Logic การเปิดเมนู
  const toggleSubMenu = (index) => {
    setOpenSubMenu((prev) => {
        if (prev[index]) return {}; // ถ้าเปิดอยู่ ให้ปิด
        return { [index]: true }; // ถ้าปิดอยู่ ให้เปิด (และปิดอันอื่นอัตโนมัติ)
    });
  };

  // Auto Expand เมนูตาม URL
  useEffect(() => {
    let newOpenState = {};
    menuItems.forEach((item, index) => {
        if (item.submenu && item.submenu.some(sub => isActiveLink(sub.path))) {
            newOpenState = { [index]: true };
        }
    });
    setOpenSubMenu(newOpenState);
  }, [pathname, dormId]);

  // ตัวแปรเช็คว่ามีเมนูย่อยเปิดอยู่ไหม
  const isAnySubmenuOpen = Object.values(openSubMenu).some(isOpen => isOpen);

  return (
    <div className="bg-gray-800 w-64 text-gray-100 flex flex-col h-screen justify-between overflow-y-auto scrollbar-hide bg-gradient-to-b from-gray-800 to-gray-900">
      
      <div>
        <div className="h-16 bg-gray-900/50 backdrop-blur-sm text-yellow-400 flex items-center justify-center text-2xl font-bold sticky top-0 z-10 border-b border-gray-700/50">
          DormManage
        </div>

        <nav className="flex flex-col gap-2 px-3 mt-6 pb-4">
          {menuItems.map((item, index) => {
            const isParentActive = openSubMenu[index];

            return (
            <div key={index}>
              {item.submenu ? (
                <>
                  <button
                    onClick={() => toggleSubMenu(index)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200 group
                      ${isParentActive
                        ? "bg-yellow-500 text-gray-900 shadow-md font-bold" 
                        : "hover:bg-gray-700/50 text-gray-300 hover:text-white"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`transition-colors ${isParentActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-yellow-400'}`}>
                        {item.icon}
                      </span>
                      <span className="font-medium">{item.title}</span>
                    </div>
                    {openSubMenu[index] 
                      ? <FiChevronDown className={isParentActive ? "text-gray-900" : "text-yellow-400"} /> 
                      : <FiChevronRight className={isParentActive ? "text-gray-800" : "text-gray-500 group-hover:text-gray-300"} />
                    }
                  </button>

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
                      )})}
                    </div>
                  </div>
                </>
              ) : (
                <Link
                  to={item.path}
                  // [แก้ไขสำคัญ] Dashboard จะเหลืองก็ต่อเมื่อ Active และต้อง "ไม่มีเมนูย่อยเปิดอยู่" (!isAnySubmenuOpen)
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group
                    ${isActiveLink(item.path, item.exact) && !isAnySubmenuOpen
                      ? "bg-yellow-500 text-gray-900 shadow-md font-bold" 
                      : "hover:bg-gray-700/50 text-gray-300 hover:text-white"
                    }
                  `}
                >
                  <span className={`${isActiveLink(item.path, item.exact) && !isAnySubmenuOpen ? 'text-gray-900' : 'text-gray-400 group-hover:text-yellow-400'}`}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.title}</span>
                </Link>
              )}
            </div>
          )})}
        </nav>
      </div>

      <FooterSidebar currentUser={currentUser} />
    </div>
  );
};

export default SidebarMain;