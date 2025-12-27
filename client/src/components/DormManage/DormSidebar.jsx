import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import FooterSidebar from "../../components/common/FooterSidebar";

// Icons
import {
  FaChevronDown,
  FaChevronRight,
  FaEye,
  FaReceipt,
  FaUsers,
} from "react-icons/fa";
import { BsFillPeopleFill } from "react-icons/bs";
import { IoCalendar, IoNewspaper, IoSpeedometer, IoFileTrayFullSharp } from "react-icons/io5";
import { MdSaveAs, MdGasMeter } from "react-icons/md";
import { TbLayoutDashboardFilled } from "react-icons/tb";
import { FaFileInvoiceDollar, FaPersonWalkingLuggage } from "react-icons/fa6";
import { PiBuildingApartmentFill } from "react-icons/pi";
import { IoMdSettings } from "react-icons/io";
import { HiNewspaper } from "react-icons/hi2";
import { HiDocumentReport } from "react-icons/hi";
import { BsPersonFillX, BsPersonFillExclamation } from "react-icons/bs";
import { RiWaterFlashFill } from "react-icons/ri";

function DormSidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const { dormId } = useParams();

  // ใช้ state แบบ object เพื่อจัดการการเปิดปิด submenu (เหมือน SidebarMain)
  const [openSubMenu, setOpenSubMenu] = useState({});

  // Mock currentUser (ตามโค้ดเดิม)
  const currentUser = {
    name: "Admin",
    role: "ADMIN"
  };

  // กำหนดเมนู
  const menuItems = [
    { 
      label: "Dashboard", 
      path: `/dashboard/${dormId}`, 
      icon: <TbLayoutDashboardFilled size={20}/>,
      exact: true 
    },
    { 
      label: "ห้องพัก", 
      path: `/rooms-plan/${dormId}`, 
      icon: <PiBuildingApartmentFill size={20}/> 
    },
    {
      label: "จัดการผู้เช่า",
      icon: <BsFillPeopleFill size={20}/>,
      submenu: [
        { label: "รายชื่อผู้เช่า", path: `/tenants/${dormId}`, icon: <FaPersonWalkingLuggage size={16}/> },
        { label: "รอย้ายออก", path: `/moveout/${dormId}`, icon: <BsPersonFillExclamation size={16}/> },
        { label: "ย้ายออกแล้ว", path: `/moveout/completed/${dormId}`, icon: <BsPersonFillX size={16}/> },
      ]
    },
    {
      label: "มิเตอร์",
      icon: <IoSpeedometer size={20}/>,
      submenu: [
        { label: "รายการจดมิเตอร์", path: `/meter-reading/${dormId}`, icon: <MdSaveAs size={16}/> },
        { label: "ดูมิเตอร์ (Real-time)", path: `/real-time-meter/${dormId}`, icon: <FaEye size={16}/> },
        { label: "เพิ่มมิเตอร์ดิจิตอล", path: `/add-meter-digital/${dormId}`, icon: <MdGasMeter size={16}/> },
      ]
    },
    {
      label: "บิลรายเดือน",
      icon: <IoNewspaper size={20}/>,
      submenu: [
        { label: "ออกบิลรายเดือน", path: `/bills/${dormId}`, icon: <IoCalendar size={16}/> },
        { label: "บิลค้างชำระ", path: `/bills/pending/${dormId}`, icon: <FaFileInvoiceDollar size={16}/> },
        { label: "บิลทั้งหมด", path: `/bills/all/${dormId}`, icon: <IoFileTrayFullSharp size={16}/> },
      ]
    },
    {
      label: "สรุปรายงาน",
      icon: <HiDocumentReport size={20}/>,
      submenu: [
        { label: "ใบเสร็จรับเงิน", path: `/reports/receipts/${dormId}`, icon: <FaReceipt size={16}/> },
        { label: "ใบแจ้งหนี้รายเดือน", path: `/reports/monthly-bills/${dormId}`, icon: <HiNewspaper size={16}/> },
        { label: "รายงานผู้เช่า", path: `/reports/tenant/${dormId}`, icon: <FaUsers size={16}/> },
        { label: "รายงานค่าน้ำค่าไฟ", path: `/reports/utility-summary/${dormId}`, icon: <RiWaterFlashFill size={16}/> },
      ]
    },
    { 
      label: "ตั้งค่าหอพัก", 
      path: `/dorm-settings/${dormId}`, 
      icon: <IoMdSettings size={20}/> 
    },
  ];

  // ฟังก์ชันเช็คว่า Active หรือไม่ (ถอดแบบจาก SidebarMain)
  const isActiveLink = (path, exact = false) => {
    const cleanPathname = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
    const cleanPath = path?.endsWith('/') ? path.slice(0, -1) : path;

    if (!cleanPath) return false;

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

  // Auto Expand เมนูตาม URL เมื่อโหลดหน้าเว็บ
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
        {/* Header */}
        <div className="h-16 bg-gray-900/50 backdrop-blur-sm text-yellow-400 flex items-center justify-center text-2xl font-bold sticky top-0 z-10 border-b border-gray-700/50">
          SmartDorm
        </div>

        {/* Menu Items */}
        <nav className="flex flex-col gap-2 px-3 mt-6 pb-4">
          {menuItems.map((item, index) => {
            const isParentActive = openSubMenu[index];

            return (
            <div key={index}>
              {item.submenu ? (
                <>
                  {/* ปุ่มเมนูหลักที่มีลูก (Dropdown Head) */}
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
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {openSubMenu[index] 
                      ? <FaChevronDown className={isParentActive ? "text-gray-900" : "text-yellow-400"} /> 
                      : <FaChevronRight className={isParentActive ? "text-gray-800" : "text-gray-500 group-hover:text-gray-300"} />
                    }
                  </button>

                  {/* พื้นที่แสดงเมนูย่อย (Submenu Body) */}
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
                          
                          {/* แสดงไอคอนเล็กใน submenu (ถ้าต้องการ) ถ้าไม่ต้องการให้ลบ subItem.icon ออก */}
                          {/* {subItem.icon && <span className={active ? "text-yellow-400" : "text-gray-500"}>{subItem.icon}</span>} */}
                          
                          <span>{subItem.label}</span>
                        </Link>
                      )})}
                    </div>
                  </div>
                </>
              ) : (
                /* ปุ่มเมนูปกติ (Single Link) */
                <Link
                  to={item.path}
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
                  <span className="font-medium">{item.label}</span>
                </Link>
              )}
            </div>
          )})}
        </nav>
      </div>

      <FooterSidebar currentUser={currentUser} />
    </div>
  );
}

export default DormSidebar;