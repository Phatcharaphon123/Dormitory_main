import { FaUser, FaCalendarDay, FaCalendarAlt, FaPlus } from "react-icons/fa";
import { useState } from "react";
import AddMonthRenter from "./AddMonthRenter";
import AddDayRenter from "./AddDayRenter";

import { useNavigate } from "react-router-dom";


function RoomRenter({ room }) {
  const rentalType = room?.rentalType;

  // สถานะจำลองว่ามีผู้เช่าหรือยัง
  const [hasTenant, setHasTenant] = useState(false);

  const navigate = useNavigate();
  const [openAddMonthRenter, setOpenAddMonthRenter] = useState(false);

  const [openAddDayRenter, setOpenAddDayRenter] = useState(false);

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
          <FaUser />
          ข้อมูลผู้เช่าห้องพัก
        </h3>
        <button
          onClick={() => setHasTenant(!hasTenant)}
          className="text-sm px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
        >
          {hasTenant ? "ทดสอบ: ไม่มีผู้เช่า" : "ทดสอบ: มีผู้เช่า"}
        </button>
      </div>

      {/* รายเดือน */}
      {rentalType === "รายเดือน" && hasTenant && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-orange-600 font-semibold">
            <FaCalendarAlt /> ผู้เช่ารายเดือน
          </div>
          <div className="bg-gray-100 p-4 rounded border">
            <p><span className="font-semibold">ชื่อ:</span> สุรีย์พร วิชญาภา</p>
            <p><span className="font-semibold">เบอร์โทร:</span> 094-xxx-xxxx</p>
            <p><span className="font-semibold">เริ่มเช่า:</span> 01/05/2568</p>
            <div className="mt-2">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">
                ดูข้อมูลผู้เช่า
              </button>
              <button className="ml-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">
                ย้ายออก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* รายวัน */}
      {rentalType === "รายวัน" && hasTenant && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-green-600 font-semibold">
            <FaCalendarDay /> ผู้เช่ารายวัน
          </div>

          <div>
            <div className="bg-gray-100 p-4 rounded border">
              <p><span className="font-semibold">ชื่อ:</span> ก้องภพ อินทร์ศรี</p>
              <p><span className="font-semibold">วันที่เช่า:</span> 20/06/2568</p>
              <p><span className="font-semibold">คืนห้อง:</span> 22/06/2568</p>
              <button className="mt-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                ดูข้อมูลผู้จอง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ปุ่มเพิ่ม */}
{/* ข้อความแจ้งเตือน (อยู่กลางแถวแต่ไม่กระทบปุ่ม) */}
{!hasTenant && (
  <div className="w-full text-center text-gray-500 text-sm py-4">
    ยังไม่มีข้อมูลผู้เช่าในขณะนี้
  </div>
)}

{/* ปุ่มเพิ่มผู้เช่า (ชิดซ้าย) */}
<div className=" mt-2 flex flex-row-reverse gap-3">
  {rentalType === "รายเดือน" && (
    <button 
      onClick={() => setOpenAddMonthRenter(true)}
      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
      <FaPlus />
      เพิ่มผู้เช่ารายเดือน
    </button>
  )}
  {rentalType === "รายวัน" && (
    <button 
      onClick={() => setOpenAddDayRenter(true)}
      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2">
      <FaPlus />
      เพิ่มผู้เช่ารายวัน
    </button>
  )}
</div>
    {openAddMonthRenter && (
      <AddMonthRenter room={room} onClose={() => setOpenAddMonthRenter(false)} />
    )}
    {openAddDayRenter && (
      <AddDayRenter room={room} onClose={() => setOpenAddDayRenter(false)} />
    )}
    </div>
  );
}

export default RoomRenter;
