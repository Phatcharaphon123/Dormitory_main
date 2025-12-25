import { useEffect, useState } from "react";
import { IoPersonCircle } from "react-icons/io5";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../contexts/AuthContext';


const HeaderMain = () => {
  const [currentTime, setCurrentTime] = useState('');
  const { user } = useAuth();
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const thaiDate = new Intl.DateTimeFormat('th-TH', { 
        dateStyle: 'full', 
        timeStyle: 'medium' 
      }).format(date);
      setCurrentTime(thaiDate);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);


  const [isOpen, setIsOpen] = useState(false); // 1. สร้าง State ไว้เช็ค เปิด/ปิด
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: "warning",
      title: 'ยืนยันการออกจากระบบ',
      text: 'คุณต้องการออกจากระบบใช่หรือไม่?',
      showCancelButton: true,
      confirmButtonText: "ออกจากระบบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    });
    if (result.isConfirmed) {
      // ลบ token จาก localStorage (ถ้ามี)
      localStorage.removeItem("token");

      Swal.fire({
        icon: "success",
        title: "ออกจากระบบสำเร็จ",
        showConfirmButton: false,
        timer: 2000,
      }).then(() => {
        navigate("/login");
      });
    }
  };
  return (
    <div>
      <header className="bg-yellow-400 flex items-center h-16 relative z-30 shadow-md">
        <div className="flex items-center justify-between mx-auto w-full max-w-8xl py-3 px-6 ">
          {/* เวลามุมซ้าย */}
          <div className="text-gray-700 font-bold text-sm  flex items-center gap-2">
            {currentTime}
          </div>
          {/* ส่วนขวา: Profile Dropdown */}
          {/* 2. สร้าง div ครอบ ใส่ relative เพื่อเป็นจุดอ้างอิง */}
          <div className="ml-auto relative">
            {/* ปุ่มกด: เพิ่ม onClick เพื่อสลับสถานะ */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`text-gray-700 font-medium flex items-center gap-2 cursor-pointer rounded-full transition-colors duration-200 px-3 py-1 focus:outline-none ${
                isOpen ? "bg-white/35" : "hover:bg-white/35"
              }`}
            >
              {user.username || "Loading..."} <IoPersonCircle size={40} />
            </button>

            {/* 3. ตัว Popup Dropdown (แสดงเมื่อ isOpen = true) */}
            {isOpen && (
              <>
                {/* Overlay โปร่งใส เต็มจอ: เอาไว้เช็คว่าถ้ากดข้างนอก ให้ปิดเมนู */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsOpen(false)}
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
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/profile');
                      }}
                    >
                      Profile
                    </a>

                    <div className="border-t border-gray-100 my-0"></div>

                    <button
                      className="px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors text-left w-full"
                      onClick={handleLogout}
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
    </div>
  );
};

export default HeaderMain;
