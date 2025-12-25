import { TbLogout2 } from "react-icons/tb";
import { LuClock10 } from "react-icons/lu";
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { IoPersonCircle } from "react-icons/io5";
import { useNavigate, useParams } from "react-router-dom"; // เพิ่ม useParams
import { useAuth } from "../../contexts/AuthContext";
import API_URL from '../../config/api';



function DormNavbar() {
  const [dateTime, setDateTime] = useState(new Date());
  const [dormName, setDormName] = useState(""); // state สำหรับชื่อหอ
  const [dropdownOpen, setDropdownOpen] = useState(false);
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

  // ฟังก์ชันออกจากระบบ (ใช้ SweetAlert2)
  const handleLogoutClick = () => {
    setDropdownOpen(false);
    Swal.fire({
      title: 'ยืนยันการออกจากระบบ',
      text: 'คุณต้องการออกจากระบบใช่หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d50000',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        logout();
        navigate("/login");
      }
    });
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
            หอพัก: {dormName || "loading..."}
          </span>
        </div>
        {/* ส่วนขวา: Profile Dropdown และปุ่มกลับหน้าหลัก */}
        <div className="ml-auto flex items-center gap-2 relative">
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
        {/* Logout Confirmation Popup ถูกแทนที่ด้วย SweetAlert2 */}
      </div>
    </header>
  );
}

export default DormNavbar;