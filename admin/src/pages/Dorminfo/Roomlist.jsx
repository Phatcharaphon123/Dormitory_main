import { BiFilterAlt } from "react-icons/bi";
import { HiMiniMagnifyingGlass } from "react-icons/hi2";
import { FaPlus } from "react-icons/fa6";
import EditRoom from "./EditRoom";
import AddRoom from "./Addroom";
import React, { useState } from "react";
import EditRoomAll from "./EditRoomAll";
import RoomDetail from "./RoomDetail";

const roomData = [
  {
    floor: 1,
    rooms: [
      { id: 101, price: 4100, status: "ว่างพร้อมเช่า" },
      { id: 102, price: 4100, status: "ว่างพร้อมเช่า" },
      { id: 103, price: 4100, status: "ว่างพร้อมเช่า" },
      { id: 104, price: 4100, status: "ว่างพร้อมเช่า" },
      { id: 105, price: 4100, status: "ว่างพร้อมเช่า" },
      { id: 106, price: 4100, status: "ว่างพร้อมเช่า" },
      { id: 107, price: 4100, status: "ว่างพร้อมเช่า" },
      { id: 108, price: 4100, status: "ว่างพร้อมเช่า" },
    ],
  },
  {
    floor: 2,
    rooms: [
      { id: 101, price: 4100, status: "ว่างพร้อมเช่า" },
      { id: 102, price: 4100, status: "ว่างพร้อมเช่า" },
      { id: 103, price: 4100, status: "ว่างพร้อมเช่า" },
      { id: 104, price: 4100, status: "ว่างพร้อมเช่า" },
      { id: 105, price: 4100, status: "ว่างพร้อมเช่า" },
      { id: 106, price: 4100, status: "ว่างพร้อมเช่า" },
      { id: 107, price: 4100, status: "ว่างพร้อมเช่า" },
      { id: 108, price: 4100, status: "ว่างพร้อมเช่า" },
    ],
  },
  // รองรับชั้น 2, 3, ... ได้ในอนาคต
];

function Roomlist() {
  const [openAddRoom, setOpenAddRoom] = useState(false);
  const [openEditRoomAll, setOpenEditRoomAll] = useState(false);
  const [openEditRoom, setOpenEditRoom] = useState(false);
  const [openRoomDetail, setOpenRoomDetail] = useState(false);
  return (
    <div>
      <h2 className="text-blue-800 font-bold text-lg mb-4">รายการห้องพัก</h2>

      <div className="bg-white p-3 rounded shadow mb-4">
        {/* ปุ่มฟิลเตอร์ห้อง */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-blue-950">เลือกชั้น</h2>

            <select className="border border-gray-300 rounded px-3 py-[6px] w-64 text-sm focus:outline-none">
              <option value="">ทั้งหมด</option>
              <option value="1">ชั้นที่ 1</option>
              <option value="2">ชั้นที่ 2</option>
              <option value="3">ชั้นที่ 3</option>
            </select>

            <div className="flex gap-3 items-center">
              <button className="flex items-center gap-1 border border-gray-300 rounded px-3 py-1 hover:bg-gray-100">
                <BiFilterAlt size={20} className="text-gray-500" />
                <span className="text-gray-500">ฟิลเตอร์ห้อง</span>
              </button>

              {/* ช่องค้นหา */}
              <div className="relative">
                <HiMiniMagnifyingGlass
                  size={20}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="text"
                  placeholder="ค้นหาตามหมายเลขห้อง"
                  className="pl-8 pr-3 py-1 border border-gray-300 rounded w-64"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-row-reverse items-center gap-1">
              <button
                onClick={() => setOpenAddRoom(true)}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 cursor-pointer text-white font-medium px-3 py-[6px] rounded shadow text-sm"
              >
                <FaPlus size={20} />
                เพิ่มห้องพัก
              </button>
            <button 
            onClick={() => setOpenEditRoomAll(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-2 py-1.5 rounded shadow">
              แก้ไขทั้งหมด
            </button>
          </div>
        </div>
      </div>

      {roomData.map((floorGroup) => (
        <div key={floorGroup.floor} className="mb-4">
          {/* ชื่อชั้น */}
          <div className="bg-gray-200 rounded p-4 mb-4 font-semibold">
            หอพัก A ชั้น {floorGroup.floor}
          </div>

          {/* ห้องพักในชั้นนี้ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {floorGroup.rooms.map((room) => (
              <div key={room.id} className="relative">
                <div className="bg-white px-4 py-5 rounded-lg shadow ">
                  <div className="font-semibold mb-1">
                    ประเภท: -
                  </div>
                  <div>ขนาด: -</div>
                  <div>ประเภทการเช่า: -</div>
                  <div>ราคา: -</div>
                  <div>มัดจำ: -</div>
                  <div>
                    สถานะ:
                    <span className="inline-block px-2 py-1 rounded text-xs font-bold ml-1 mb-1 bg-green-100 text-green-700">
                      ว่าง
                    </span>
                  </div>
                  

                  <button 
                  onClick={() => setOpenRoomDetail(true)}
                  className="mt-2 bg-blue-500 text-white rounded px-2 py-1 text-xs hover:bg-blue-600">
                    ดูรายละเอียด
                  </button>
                  <button 
                  onClick={() => setOpenEditRoom(true)}
                  className="ml-1 mt-2 bg-orange-500 text-white rounded px-2 py-1 text-xs hover:bg-orange-600">
                    แก้ไขห้อง
                  </button>
                  {/* <div className="text-sm bg-blue-100 text-blue-600 font-semibold rounded px-2 py-1 inline-block mb-2">
                    {room.status}
                  </div> */}
                  <div className="text-sm font-semibold text-gray-800">
                    {/* ฿ {room.price.toLocaleString()} บาท/เดือน */}
                  </div>
                </div>

                {/* หมายเลขห้องบนกล่อง */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
                  {room.id}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {openAddRoom && <AddRoom onClose={() => setOpenAddRoom(false)} />}
      {openEditRoomAll && <EditRoomAll onClose={() => setOpenEditRoomAll(false)} />}
      {openEditRoom && <EditRoom onClose={() => setOpenEditRoom(false)} />}
      {openRoomDetail && <RoomDetail onClose={() => setOpenRoomDetail(false)} />}
    </div>
  );
}
export default Roomlist;
