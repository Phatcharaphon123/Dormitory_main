import React from 'react';
import { useAuth } from '../../contexts/AuthContext'; // ✅ 1. เรียกใช้ Context

const FooterSidebar = () => {
  // ดึง user จาก AuthContext โดยตรง (ไม่ต้องรับ props)
  const { user: currentUser } = useAuth();

  // ✅ 2. Safety Check: ถ้ายังไม่มีข้อมูล User (เช่น กำลังโหลด หรือ Logout แล้ว) ให้ return null
  if (!currentUser) {
    return null; // หรือแสดง <div className="p-4 text-white">Loading...</div>
  }

  // ✅ 3. หาชื่อที่จะแสดง (กันเหนียว)
  // Database ของคุณส่งค่ามาเป็น username หรือ first_name แต่ในโค้ดเก่าใช้ name
  const displayName = currentUser.username || currentUser.name || currentUser.email || "User";

  // ✅ 4. รวม Logic สีไว้ที่เดียว (รองรับทุก Role)
  const getRoleStyle = (role) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-pink-500 text-white";
      case "OWNER":
        return "bg-yellow-500 text-gray-900";
      case "STAFF":
        return "bg-blue-600 blue-white";
      case "TENANT":
        return "bg-purple-500 text-white";
      default:
        return "bg-gray-600 text-gray-200";
    }
  };

  const roleStyle = getRoleStyle(currentUser.role);

  return (
    <div className="bg-gray-900 border-t border-gray-700">
      <div className="p-3">
        <div className="flex items-center gap-3">
          
          {/* Avatar Area */}
          {/* ใช้ roleStyle เพื่อให้สีพื้นหลัง Avatar ตรงกับ Badge */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-inner overflow-hidden ${roleStyle}`}>
            {currentUser.avatarUrl ? (
              <img 
                src={currentUser.avatarUrl} 
                alt="avatar" 
                className="w-full h-full object-cover" 
              />
            ) : (
              // ✅ ใช้ ?. (Optional Chaining) ป้องกัน Error charAt
              <span>{displayName?.charAt(0)?.toUpperCase()}</span>
            )}
          </div>

          {/* Text Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white text-sm truncate">
              {displayName}
            </p>
            
            {/* Role Badge */}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide inline-block mt-0.5 border border-white/20 ${roleStyle}`}>
              {currentUser.role}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FooterSidebar;