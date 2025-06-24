import React from 'react'
import { FaMapMarkerAlt } from "react-icons/fa";
import MapWithControl  from "./MapWithControl.jsx";
import SaveButton from '../../components/buttons/SaveButton.jsx';
import UtilityBills from './UtilityBills.jsx';

function DormInfo() {
  return (
    <div className='m-5'>
        <h1 className="text-2xl font-semibold mb-4 text-blue-950 text-center bg-gray-200 rounded p-3">ข้อมูลหอพัก</h1>
        <div className='flex justify-between gap-5  rounded bg-gray-100'>
          <div className="bg-white p-6 rounded  shadow-md flex-2">
              <div className="space-y-4">
                {/* ชื่อหอพัก */}
                <div className="flex justify-between items-start">
                  <label className="w-[25rem] pt-2  text-[1.2rem]">ชื่อหอพัก :</label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-3 py-2 w-full"
                    placeholder="กรุณากรอกชื่อหอพัก"
                    defaultValue="หอพัก Pisit Place"
                  />
                </div>

                {/* เบอร์โทร */}
                <div className="flex justify-between items-start">
                  <label className="w-[25rem] text pt-2 text-[1.2rem]">เบอร์โทร :</label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-3 py-2 w-full"
                    placeholder="กรุณากรอกเบอร์โทร"
                    defaultValue="0948616709"
                  />
                </div>

                {/* ไลน์ */}
                <div className="flex justify-between items-start">
                  <label className="w-[25rem] text pt-2 text-[1.2rem]">ไลน์ :</label>
                  <input
                    type="text"
                    className="border border-gray-300 rounded px-3 py-2 w-full"
                    placeholder="กรุณากรอกไอดีไลน์"
                    defaultValue="pisit_place"
                  />
                </div>

                {/* ที่อยู่ */}
                <div className="flex justify-between items-start">
                  <label className="w-[25rem] text pt-2 text-[1.2rem]">ที่อยู่ :</label>
                  <textarea
                    className="border border-gray-300 rounded px-3 py-2 w-full"
                    rows="3"
                    placeholder="กรุณากรอกที่อยู่หอพัก"
                    defaultValue="199/11 ลาดพร้าว อ่อนนุช ซอยกลาง กทม 10100"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <SaveButton onClick={() => alert("ข้อมูลถูกบันทึก")} />
              </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md flex-1">
            <div>
              <div className='flex items-center gap-2 mb-4'>
                <h2 className="text-xl font-bold">แผนที่</h2>
                <span className='text-red-600'><FaMapMarkerAlt size={20}/></span>
              </div>
              <div className="h-auto w-full rounded-lg border  border-gray-300 ">
                <MapWithControl/>
              </div>
            </div>
            <div>
              
            </div>
          </div>
        </div>
        <div className='mt-5'>
          <UtilityBills />
        </div>
    </div>
  )
}

export default DormInfo;
