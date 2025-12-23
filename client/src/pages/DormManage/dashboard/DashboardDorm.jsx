import React, { useState } from 'react'
import { 
  IoCash, 
  IoWater, 
  IoPeople,
} from 'react-icons/io5'
import { RiWaterFlashFill } from "react-icons/ri";
import { FaChartColumn } from "react-icons/fa6";
import Income from './Income'
import Utilities from './Utilities'
import Tenants from './Tenants'

function DashboardDorm() {
  const [activeTab, setActiveTab] = useState('รายได้')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <FaChartColumn className="w-7 h-7 text-blue-800 font-weight-bold" />
        <h1 className="text-2xl font-semibold text-gray-700">Dashboard</h1>
      </div>

      <div className="flex items-center justify-between bg-white p-4 rounded-md shadow mb-4">
        <div className="flex space-x-4 mb-2 md:mb-0">
          <button
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
              activeTab === 'รายได้' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => setActiveTab('รายได้')}
          >
            <IoCash className="w-4 h-4" />
            รายได้
          </button>
          <button
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
              activeTab === 'ค่าน้ำ-ค่าไฟ' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => setActiveTab('ค่าน้ำ-ค่าไฟ')}
          >
            <RiWaterFlashFill className="w-4 h-4" />
            ค่าน้ำ-ค่าไฟ
          </button>
          <button
            className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
              activeTab === 'ผู้เช่า' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'
            }`}
            onClick={() => setActiveTab('ผู้เช่า')}
          >
            <IoPeople className="w-4 h-4" />
            ผู้เช่า
          </button>
        </div>
        {/* ลบ select dropdown ของการเลือกตึกออก */}
      </div>

      {/* ✅ สลับแสดง content ตาม tab */}
      {activeTab === 'รายได้' && <Income />}
      {activeTab === 'ค่าน้ำ-ค่าไฟ' && <Utilities />}
      {activeTab === 'ผู้เช่า' && <Tenants />}
    </div>
  )
}

export default DashboardDorm
