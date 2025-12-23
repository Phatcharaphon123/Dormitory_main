import { Link } from 'react-router-dom';
import { useState } from "react";
import {
  FaChevronLeft,
  FaChevronDown,
  FaChevronRight,
  FaEye,
  FaList,
  FaRegCalendarAlt,
} from "react-icons/fa";
import { IoCalendar } from "react-icons/io5";
import { MdSaveAs } from "react-icons/md";
import { TbLayoutDashboardFilled } from "react-icons/tb";
import { FaFileInvoiceDollar } from "react-icons/fa6";
import { PiBuildingApartmentFill } from "react-icons/pi";
import { IoNewspaper } from "react-icons/io5";
import { IoSpeedometer } from "react-icons/io5";
import { FaPersonWalkingLuggage } from "react-icons/fa6";
import { IoMdSettings } from "react-icons/io";
import { MdGasMeter } from "react-icons/md";
import { IoFileTrayFullSharp } from "react-icons/io5";
import { HiDocumentReport } from "react-icons/hi";
import { FaReceipt } from "react-icons/fa";
import { useParams } from "react-router-dom";
import { BsPersonFillX,BsPersonFillExclamation } from "react-icons/bs";
import { FaUsers } from "react-icons/fa";
import { RiWaterFlashFill } from "react-icons/ri";
import { HiNewspaper } from "react-icons/hi2";

function DormSidebar() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [meterMenuOpen, setMeterMenuOpen] = useState(false);
  const [billsMenuOpen, setBillsMenuOpen] = useState(false);
  const [reportsMenuOpen, setReportsMenuOpen] = useState(false);
  const [moveoutMenuOpen, setMoveoutMenuOpen] = useState(false);
  const { dormId } = useParams();
  
  const menuItems = [
    { icon: <TbLayoutDashboardFilled size={20}/>, label: "Dashboard", path: `/dashboard/${dormId}`, type: "link" },
    { icon: <PiBuildingApartmentFill size={20}/>, label: "ห้องพัก", path: `/rooms-plan/${dormId}`, type: "link" },
    {
      icon: <FaPersonWalkingLuggage size={20}/>,
      label: "การย้ายออก",
      type: "dropdown",
      submenu: [
        { icon: <BsPersonFillExclamation size={20}/>, label: "รอย้ายออก", path: `/moveout/${dormId}` },
        { icon: <BsPersonFillX size={20}/>, label: "ย้ายออกแล้ว", path: `/moveout/completed/${dormId}` },
      ]
    },
    {
      icon: <IoSpeedometer size={20}/>,
      label: "มิเตอร์",
      type: "dropdown",
      submenu: [
        { icon: <MdSaveAs size={20}/>, label: "รายการจดมิเตอร์", path: `/meter-reading/${dormId}` },
        { icon: <FaEye size={20}/>, label: "ดูมิเตอร์น้ำประปาและมิเตอร์ไฟฟ้า", path: `/real-time-meter/${dormId}` },
        { icon: <MdGasMeter size={20}/>, label: "เพิ่มมิเตอร์ดิจิตอล", path: `/add-meter-digital/${dormId}` },
      ]
    },
    {
      icon: <IoNewspaper size={20}/>,
      label: "บิลรายเดือน",
      type: "dropdown",
      submenu: [
        { icon: <IoCalendar size={20}/>, label: "ออกบิลรายเดือน", path: `/bills/${dormId}` },
        { icon: <FaFileInvoiceDollar size={20}/>, label: "บิลค้างชำระ", path: `/bills/pending/${dormId}` },
        { icon: <IoFileTrayFullSharp size={20}/>, label: "บิลทั้งหมด", path: `/bills/all/${dormId}` },
      ]
    },
    {
      icon: <HiDocumentReport size={20}/>,
      label: "สรุปรายงาน",
      type: "dropdown",
      submenu: [
        { icon: <FaReceipt size={20}/>, label: "ใบเสร็จรับเงิน", path: `/reports/receipts/${dormId}` },
        { icon: <HiNewspaper size={20}/>, label: "ใบแจ้งหนี้รายเดือน", path: `/reports/monthly-bills/${dormId}` },
        { icon: <FaUsers size={20}/>, label: "รายงานผู้เช่า", path: `/reports/tenant/${dormId}` },
        { icon: <RiWaterFlashFill size={20}/>, label: "รายงานค่าน้ำค่าไฟ", path: `/reports/utility-summary/${dormId}` },
      ]
    },
    { icon: <IoMdSettings size={20}/>, label: "ตั้งค่าหอพัก", path: `/dorm-settings/${dormId}`, type: "link" },
  ];


  return (
      <div
        className={`relative ${collapsed ? 'w-20' : 'w-60'} bg-[#111322] pr-5 pl-5 pt-3 flex flex-col transition-all duration-500 ease-in-out`}
        style={{
          boxShadow: '4px 0 8px rgba(0, 0, 0, 0.5)',
          minHeight: '100vh', 
        }}
      >

       {/* Header */}
<div className="flex items-center justify-between">
  {!collapsed && (
    <div className="flex items-center gap-1 text-xl font-bold text-gray-300">
      <div>
        <span className="text-blue-600 text-3xl">S</span>martDorm
      </div>
    </div>
  )}
  <button
    className={`p-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 ${collapsed ? 'mx-auto' : ''}`}
    onClick={() => setCollapsed(!collapsed)}
  >
    <div
      className={`transition-transform duration-500 ${collapsed ? 'rotate-180' : ''}`}
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
            {item.type === "dropdown" ? (
              <>
                {/* Dropdown Menu Item */}
                <button
                  onClick={() => {
                    if (item.label === "มิเตอร์") {
                      setMeterMenuOpen(!meterMenuOpen);
                    } else if (item.label === "บิลรายเดือน") {
                      setBillsMenuOpen(!billsMenuOpen);
                    } else if (item.label === "สรุปรายงาน") {
                      setReportsMenuOpen(!reportsMenuOpen);
                    } else if (item.label === "การย้ายออก") {
                      setMoveoutMenuOpen(!moveoutMenuOpen);
                    }
                    setActiveIndex(index);
                  }}
                  className={`group flex items-center justify-between w-full p-2 rounded-lg transition-all duration-300 
                    ${activeIndex === index ? 'bg-gray-600' : 'hover:bg-gray-500'}`}
                >
                  <div className="flex items-center">
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
                  </div>
                  {!collapsed && (
                    <div className={`text-gray-400 transition-all duration-300 
                        ${activeIndex === index ? 'text-white' : 'group-hover:text-white'}`}>
                      {item.label === "มิเตอร์" && meterMenuOpen ? (
                        <FaChevronDown size={12} />
                      ) : item.label === "บิลรายเดือน" && billsMenuOpen ? (
                        <FaChevronDown size={12} />
                      ) : item.label === "สรุปรายงาน" && reportsMenuOpen ? (
                        <FaChevronDown size={12} />
                      ) : item.label === "การย้ายออก" && moveoutMenuOpen ? (
                        <FaChevronDown size={12} />
                      ) : (
                        <FaChevronRight size={12} />
                      )}
                    </div>
                  )}
                </button>
                
                {/* Submenu */}
                {item.label === "มิเตอร์" && meterMenuOpen && !collapsed && (
                  <ul className="ml-4 mt-2 space-y-1">
                    {item.submenu.map((subItem, subIndex) => (
                      <li key={subIndex}>
                        <Link
                          to={subItem.path}
                          className="group flex items-center w-full p-2 pl-4 rounded-lg transition-all duration-300 hover:bg-gray-500"
                        >
                          <div className="w-4 h-4 flex items-center justify-center text-gray-400 group-hover:text-white">
                            {subItem.icon}
                          </div>
                          <span className="ml-2 text-sm text-gray-400 transition-all duration-300 group-hover:text-white">
                            {subItem.label}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Moveout Submenu */}
                {item.label === "การย้ายออก" && moveoutMenuOpen && !collapsed && (
                  <ul className="ml-4 mt-2 space-y-1">
                    {item.submenu.map((subItem, subIndex) => (
                      <li key={subIndex}>
                        <Link
                          to={subItem.path}
                          className="group flex items-center w-full p-2 pl-4 rounded-lg transition-all duration-300 hover:bg-gray-500"
                        >
                          <div className="w-4 h-4 flex items-center justify-center text-gray-400 group-hover:text-white">
                            {subItem.icon}
                          </div>
                          <span className="ml-2 text-sm text-gray-400 transition-all duration-300 group-hover:text-white">
                            {subItem.label}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Bills Submenu */}
                {item.label === "บิลรายเดือน" && billsMenuOpen && !collapsed && (
                  <ul className="ml-4 mt-2 space-y-1">
                    {item.submenu.map((subItem, subIndex) => (
                      <li key={subIndex}>
                        <Link
                          to={subItem.path}
                          className="group flex items-center w-full p-2 pl-4 rounded-lg transition-all duration-300 hover:bg-gray-500"
                        >
                          <div className="w-4 h-4 flex items-center justify-center text-gray-400 group-hover:text-white">
                            {subItem.icon}
                          </div>
                          <span className="ml-2 text-sm text-gray-400 transition-all duration-300 group-hover:text-white">
                            {subItem.label}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Reports Submenu */}
                {item.label === "สรุปรายงาน" && reportsMenuOpen && !collapsed && (
                  <ul className="ml-4 mt-2 space-y-1">
                    {item.submenu.map((subItem, subIndex) => (
                      <li key={subIndex}>
                        <Link
                          to={subItem.path}
                          className="group flex items-center w-full p-2 pl-4 rounded-lg transition-all duration-300 hover:bg-gray-500"
                        >
                          <div className="w-4 h-4 flex items-center justify-center text-gray-400 group-hover:text-white">
                            {subItem.icon}
                          </div>
                          <span className="ml-2 text-sm text-gray-400 transition-all duration-300 group-hover:text-white">
                            {subItem.label}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              /* Regular Menu Item */
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
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DormSidebar;
