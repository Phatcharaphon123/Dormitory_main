import { TbLogout2 } from "react-icons/tb";
import { LuClock10 } from "react-icons/lu";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom"; // เพิ่ม useParams
import { FaChevronDown } from "react-icons/fa";
import { FiUser } from "react-icons/fi";
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
      fetch(`http://localhost:3001/api/dormitories/${dormId}`, {
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

  const formatDateTime = (date) => {
    return date.toLocaleString("th-TH", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
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
    <div className="bg-gray-800 text-white p-3.5 flex justify-between items-center shadow-md px-6">
      <div className="flex gap-2 items-center">
        <LuClock10 size={20}/> วันที่-เวลา 
        <span className=" text-gray-300">{formatDateTime(dateTime)}</span>
      </div>

      {/* ชื่อหอพักตรงกลาง */}
      <div className="flex justify-center items-center flex-1">
        <span className="text-xl font-bold text-blue-500 mr-2">หอพัก:</span>
        <span className="text-xl font-bold">{dormName || "..."}</span>
      </div>

      <div className="flex items-center space-x-4">
      <button
        onClick={() => navigate("/youdorm")}
        className="flex gap-1 items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-md border border-gray-600"
      >
        <TbLogout2 size={15} />
        <span>กลับไปหน้าหลัก</span>
      </button>

      {/* เมนูผู้ใช้ */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-medium rounded-md border border-blue-700"
        >
          <span>{user?.username || 'ผู้ใช้'}</span>
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

export default DormNavbar;