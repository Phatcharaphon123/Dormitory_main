import { TbLogout2 } from "react-icons/tb";
import { LuClock10 } from "react-icons/lu";
import { useState, useEffect, useRef } from "react";
import { IoPersonCircle } from "react-icons/io5";
import { useNavigate, useParams } from "react-router-dom"; // เพิ่ม useParams
import { useAuth } from "../../contexts/AuthContext";
import API_URL from '../../config/api';

// Component สำหรับ Logout Confirmation Popup
function LogoutConfirmPopup({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white border border-gray-400 rounded-lg shadow-lg w-[90%] md:w-[400px] p-6 z-50">
        <h2 className="text-2xl text-center font-bold text-[#d50000] mb-4 flex items-center justify-center gap-2">
          <TbLogout2 size={22} />
          ยืนยันการออกจากระบบ
        </h2>
        <p className="text-gray-700 mb-6 text-center text-base">คุณต้องการออกจากระบบใช่หรือไม่?</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-[#d50000] text-white rounded-md  hover:bg-[#b71c1c] transition-colors flex items-center gap-2"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}

function DormNavbar() {
  const [dateTime, setDateTime] = useState(new Date());
  const [dormName, setDormName] = useState(""); // state สำหรับชื่อหอ
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { dormId } = useParams(); // ดึง dormId จาก URL
  const { logout, user } = useAuth();

  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // โหลดชื่อหอเมื่อ dormId เปลี่ยน
  useEffect(() => {
    if (dormId) {
      const token = localStorage.getItem('token');
      fetch(`${API_URL}/api/dormitories/${dormId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          setDormName(data.name || "");
        })
        .catch((error) => {
          setDormName("");
        });
    } else {
      setDormName("");
    }
  }, [dormId]);

  // ใช้รูปแบบวันเวลาแบบไทยเต็มเหมือน HeaderMain
  const formatDateTime = (date) => {
    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'full',
      timeStyle: 'medium'
    }).format(date);
  };

  // ฟังก์ชันออกจากระบบ
  const handleLogoutClick = () => {
    setShowLogoutPopup(true);
    setDropdownOpen(false);
  };

  const handleConfirmLogout = () => {
    logout();
    navigate("/login");
    setShowLogoutPopup(false);
  };

  const handleCloseLogoutPopup = () => {
    setShowLogoutPopup(false);
  };

  return (
    <header className="bg-yellow-400 flex items-center h-16 relative z-30 shadow-md">
      <div className="flex items-center justify-between mx-auto w-full max-w-8xl py-3 px-6">
        {/* เวลามุมซ้าย */}
        <div className="text-gray-700 font-bold text-sm flex items-center gap-2">
          {formatDateTime(dateTime)}
        </div>
        {/* ชื่อหอพักตรงกลาง */}
        <div className="flex-1 flex justify-center items-center">
          <span className="text-blue-900 font-bold text-lg truncate max-w-xs text-center">
            หอพัก: {dormName || "..."}
          </span>
        </div>
        {/* ส่วนขวา: Profile Dropdown และปุ่มกลับหน้าหลัก */}
        <div className="ml-auto flex items-center gap-2 relative">
          <button
            onClick={() => navigate("/youdorm")}
            className="flex gap-1 items-center px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-md border border-gray-600"
          >
            <TbLogout2 size={15} />
            <span>กลับไปหน้าหลัก</span>
          </button>
          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`text-gray-700 font-medium flex items-center gap-2 cursor-pointer rounded-full transition-colors duration-200 px-3 py-1 focus:outline-none ${dropdownOpen ? "bg-white/35" : "hover:bg-white/35"}`}
            >
              {user?.username || 'ผู้ใช้'} <IoPersonCircle  size={32} />
            </button>
            {dropdownOpen && (
              <>
                {/* Overlay โปร่งใส เต็มจอ: เอาไว้เช็คว่าถ้ากดข้างนอก ให้ปิดเมนู */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setDropdownOpen(false)}
                ></div>
                {/* ตัวกล่องเมนู */}
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                  {/* Header: Manage Account */}
                  <div className="px-4 py-3 text-sm font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                    จัดการบัญชี
                  </div>
                  {/* Menu Items */}
                  <div className="flex flex-col">
                    <a
                      className="px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left cursor-pointer"
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Profile
                    </a>
                    <div className="border-t border-gray-100 my-0"></div>
                    <button
                      className="px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors text-left w-full"
                      onClick={handleLogoutClick}
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {/* Logout Confirmation Popup */}
        <LogoutConfirmPopup 
          isOpen={showLogoutPopup}
          onClose={handleCloseLogoutPopup}
          onConfirm={handleConfirmLogout}
        />
      </div>
    </header>
  );
}

export default DormNavbar;