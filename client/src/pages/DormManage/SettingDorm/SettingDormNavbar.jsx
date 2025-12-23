import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import SettingDormInfo from './SettingDormInfo';
import SettingRoom from './SettingRoom';
import SettingRoomType from './SettingRoomType';
import SettingFloorRoom from './SettingFloorRoom';
import SettingUtility from './SettingUtility';
import { IoMdSettings } from "react-icons/io";

function SettingDormNavbar() {
  const { dormId } = useParams(); // ดึง dormId จาก URL parameter
  const [selectedMenu, setSelectedMenu] = useState('settingDormInfo'); // ตั้งค่าเริ่มต้นเป็น 'settingDormInfo'

  console.log('🏢 SettingDormNavbar dormId:', dormId, typeof dormId);

  // ฟังก์ชันการเลือกเมนู
  const handleMenuSelect = (menu) => {
    console.log('🎯 Selected menu:', menu, 'with dormId:', dormId);
    setSelectedMenu(menu);
  };

  return (
    <div className='px-6'>
      <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white p-4 shadow-sm rounded-b-md">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <IoMdSettings className="text-white text-3xl" />
          ตั้งค่าหอพัก
        </h1>
        <div className="mt-3 flex space-x-4">
          <button
            onClick={() => handleMenuSelect('settingDormInfo')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 transform ${
              selectedMenu === 'settingDormInfo'
                ? 'bg-white text-blue-700 shadow-md'
                : 'bg-transparent hover:bg-blue-400 hover:text-white'
            }`}
          >
            ข้อมูลหอพัก
          </button>
          <button
            onClick={() => handleMenuSelect('roomType')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 transform ${
              selectedMenu === 'roomType'
                ? 'bg-white text-blue-700 shadow-md'
                : 'bg-transparent hover:bg-blue-400 hover:text-white'
            }`}
          >
            ประเภทห้อง
          </button>
          <button
            onClick={() => handleMenuSelect('floorRoom')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 transform ${
              selectedMenu === 'floorRoom'
                ? 'bg-white text-blue-700 shadow-md'
                : 'bg-transparent hover:bg-blue-400 hover:text-white'
            }`}
          >
           ชั้นและห้องพัก
          </button>
          <button
            onClick={() => handleMenuSelect('roomManagement')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 transform ${
              selectedMenu === 'roomManagement'
                ? 'bg-white text-blue-700 shadow-md'
                : 'bg-transparent hover:bg-blue-400 hover:text-white'
            }`}
          >
            ห้องพัก
          </button>
          <button
            onClick={() => handleMenuSelect('utility')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 transform ${
              selectedMenu === 'utility'
                ? 'bg-white text-blue-700 shadow-md'
                : 'bg-transparent hover:bg-blue-400 hover:text-white'
            }`}
          >
            ค่าน้ำ-ค่าไฟ
          </button>
        </div>
      </div>

      {/* แสดงข้อมูลตามเมนูที่เลือก */}
      <div className="py-4">
        {!dormId || dormId === 'undefined' || dormId.includes(':') ? (
          <div className="bg-red-50 border border-red-300 rounded-md p-4">
            <h3 className="text-red-800 font-semibold">❌ เกิดข้อผิดพลาด</h3>
            <p className="text-red-700">dormId ไม่ถูกต้อง: {dormId}</p>
            <p className="text-red-600 text-sm">กรุณาลองกลับไปหน้าหลักและเข้าใหม่อีกครั้ง</p>
          </div>
        ) : (
          <>
            {selectedMenu === 'settingDormInfo' && (<SettingDormInfo />)}
            {selectedMenu === 'roomType' && (<SettingRoomType />)}
            {selectedMenu === 'floorRoom' && (<SettingFloorRoom />)}
            {selectedMenu === 'roomManagement' && (<SettingRoom />)}
            {selectedMenu === 'utility' && (<SettingUtility />)}
          </>
        )}
      </div>
    </div>
  );
}

export default SettingDormNavbar;
