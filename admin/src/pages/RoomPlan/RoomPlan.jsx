import { HiMiniMagnifyingGlass } from "react-icons/hi2";
import { BiFilterAlt } from "react-icons/bi";
import { HiOutlineBuildingOffice2 } from "react-icons/hi2";
import AddDorm from "../addform/AddDorm";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import RoomNavbar from "./RoomNavbar";

function RoomsPlan() {
  const [openAddDorm, setOpenAddDorm] = useState(false);
  const [selectedDorm, setSelectedDorm] = useState("");
  const [openRoomPopup, setOpenRoomPopup] = useState(false);
  const navigate = useNavigate();

  const handleCloseRoomPopup = () => setOpenRoomPopup(false);
  const onCloseAddDorm = () => setOpenAddDorm(false);

  const [selectedRoom, setSelectedRoom] = useState(null);

  const dorms = [
    { dorm_id: 1, dorm_name: "หอ A" },
    { dorm_id: 2, dorm_name: "หอ B" },
  ];

  const allFloors = [
    {
      dorm_id: 1,
      dorm_name: "หอ A",
      floors: [
        {
          floor_number: 1,
          rooms: [
            {
              roomNumber: "101",
              type: "แอร์",
              size: "24 ตร.ม.",
              rentalType: "รายเดือน",
              price: "3,500 บาท/เดือน",
              deposit: "2,000 บาท",
              status: "ว่าง",
            },
            {
              roomNumber: "102",
              type: "พัดลม",
              size: "20 ตร.ม.",
              rentalType: "รายวัน",
              price: "500 บาท/วัน",
              deposit: "1,000 บาท",
              status: "ไม่ว่าง",
            },
          ],
        },
        {
          floor_number: 2,
          rooms: [
            {
              roomNumber: "201",
              type: "VIP",
              size: "30 ตร.ม.",
              rentalType: "รายเดือน",
              price: "5,000 บาท/เดือน",
              deposit: "2,500 บาท",
              status: "ว่าง",
            },
          ],
        },
      ],
    },
    {
      dorm_id: 2,
      dorm_name: "หอ B",
      floors: [
        {
          floor_number: 1,
          rooms: [
            {
              roomNumber: "101",
              type: "แอร์",
              size: "22 ตร.ม.",
              rentalType: "รายเดือน",
              price: "3,200 บาท",
              deposit: "1,500 บาท",
              status: "ว่าง",
            },
          ],
        },
      ],
    },
  ];

    const handleOpenRoomPopup = (room) => {
    setSelectedRoom(room);
    setOpenRoomPopup(true);
  };

  const filteredFloors = selectedDorm
    ? allFloors.filter((f) => f.dorm_id === parseInt(selectedDorm))
    : allFloors;

  return (
    <div className="m-5 space-y-4">
      <h1 className="text-2xl font-semibold text-white text-center bg-blue-900 rounded p-3 shadow-md">
        ผังห้องพัก
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded shadow-md p-4 flex items-center gap-4"
          >
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-blue-600 text-3xl">
              <HiOutlineBuildingOffice2 />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-800">ห้องทั้งหมด</p>
              <p className="text-2xl font-bold">4 ห้อง</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-3 rounded shadow-md">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-blue-950">เลือกตึก/หอพัก</h2>
            <select
              className="border border-gray-300 rounded px-3 py-[6px] w-64 text-sm focus:outline-none"
              value={selectedDorm}
              onChange={(e) => setSelectedDorm(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {dorms.map((dorm) => (
                <option key={dorm.dorm_id} value={dorm.dorm_id.toString()}>
                  {dorm.dorm_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 items-center">
            <button className="flex items-center gap-1 border border-gray-300 rounded px-3 py-1 hover:bg-gray-100">
              <BiFilterAlt size={20} className="text-gray-500" />
              <span className="text-gray-500">ฟิลเตอร์ห้อง</span>
            </button>

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
      </div>

      <div className="space-y-4">
        {filteredFloors.length === 0 ? (
          <div className="text-gray-500 text-sm text-center mt-8">
            ไม่พบข้อมูลห้องในหอพักที่เลือก
          </div>
        ) : (
          filteredFloors.map((dormData) => (
            <div
              key={dormData.dorm_id}
              className="bg-white p-6 rounded shadow-md"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-blue-950">
                  ชื่อหอ/ตึก : {dormData.dorm_name}
                </h2>
                <button
                  onClick={() => navigate(`/dorm-info/${dormData.dorm_id}`)}
                  className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-500"
                >
                  <HiOutlineBuildingOffice2 size={20} />
                  ดูข้อมูลหอพัก/แก้ไข
                </button>
              </div>

              {dormData.floors.map((floorData) => (
                <div
                  key={floorData.floor_number}
                  className="border border-gray-300 mb-4 bg-gray-50 p-4 rounded"
                >
                  <h3 className="bg-gray-200 rounded p-2 font-semibold text-gray-700 mb-3">
                    ชั้นที่ {floorData.floor_number}
                  </h3>

                  <div className="grid lg:grid-cols-5 gap-4">
                    {floorData.rooms.map((room, i) => (
                      <div
                        key={i}
                        className="bg-white border p-3 rounded-lg shadow hover:shadow-lg transition cursor-pointer flex flex-col items-center text-sm"
                        onClick={() => handleOpenRoomPopup(room)}
                      >
                        <div className="font-bold text-blue-900 text-center bg-blue-200 px-3 py-1.5 rounded mb-2 text-sm shadow-sm">
                          ห้อง {room.roomNumber}
                        </div>

                        <div className="text-sm text-gray-700 w-full space-y-1.5">
                          <p>
                            <span className="font-semibold">ประเภท:</span>{" "}
                            {room.type || "-"}
                          </p>
                          <p>
                            <span className="font-semibold">ขนาด:</span>{" "}
                            {room.size || "-"}
                          </p>
                          <p className="flex items-center gap-2">
                            <span className="font-semibold">ประเภทการเช่า:</span>
                            <span
                              className={`px-2 py-0.5 rounded text-white text-sm ${
                                room.rentalType === "รายเดือน"
                                  ? "bg-blue-600"
                                  : "bg-yellow-500"
                              }`}
                            >
                              {room.rentalType}
                            </span>
                          </p>
                          <p>
                            <span className="font-semibold">ราคา:</span>{" "}
                            {room.price || "-"}
                          </p>
                          <p>
                            <span className="font-semibold">มัดจำ:</span>{" "}
                            {room.deposit || "-"}
                          </p>
                          <p>
                            <span className="font-semibold">สถานะ:</span>
                            <span
                              className={`ml-2 px-2 py-0.5 rounded text-white text-sm ${
                                room.status === "ว่าง"
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            >
                              {room.status}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {openAddDorm && <AddDorm onClose={onCloseAddDorm} />}
      {openRoomPopup && <RoomNavbar onClose={handleCloseRoomPopup} room={selectedRoom} />}
    </div>
  );
}

export default RoomsPlan;
