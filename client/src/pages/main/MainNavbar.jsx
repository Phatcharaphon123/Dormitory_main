import { useState, useRef, useEffect } from "react";
import { FaChevronDown } from "react-icons/fa";
import { FiUser } from "react-icons/fi";
import { TbLogout2 } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

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
            className="px-5 py-2 bg-[#d50000] text-white rounded-md hover:bg-[#b71c1c] transition-colors flex items-center gap-2"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );
}

function MainNavbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

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
    <div className="bg-blue-950 text-white shadow-md px-[10%] py-4 flex justify-between items-center">
      {/* ซ้าย: โลโก้ */}
      <div className="flex items-center gap-2">
        <div className="text-xl font-bold">
          <span className="text-blue-400 text-3xl">S</span>martDorm
        </div>
      </div>

      {/* ขวา: เมนูผู้ใช้ */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-sm text-white rounded-md border border-blue-700"
        >
          <span className="font-medium">{user?.username || 'ผู้ใช้'}</span>
          <FaChevronDown size={14} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-blue-800 rounded-md shadow-lg border border-blue-700 z-50 overflow-hidden">
            <div className="px-4 py-2 text-xs text-gray-300 border-b border-blue-700">Manage Account</div>
            <a
              href="/profile"
              className="flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              <FiUser size={18} />
              <span>Profile</span>
            </a>
            <button
              onClick={handleLogoutClick}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              <TbLogout2 size={18} />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>

      {/* Logout Confirmation Popup */}
      <LogoutConfirmPopup 
        isOpen={showLogoutPopup}
        onClose={handleCloseLogoutPopup}
        onConfirm={handleConfirmLogout}
      />
    </div>
  );
}

export default MainNavbar;
