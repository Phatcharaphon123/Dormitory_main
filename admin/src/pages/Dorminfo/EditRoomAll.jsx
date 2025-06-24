import React, { useState } from "react";

// ตัวอย่างข้อมูลห้อง
const allRooms = [
  { id: 101, roomNumber: "101", floor: "1", status: "ว่าง", roomType: "ห้องแอร์", rentalType: "รายเดือน" },
  { id: 102, roomNumber: "102", floor: "1", status: "ไม่ว่าง", roomType: "ห้องพัดลม", rentalType: "รายวัน" },
  { id: 103, roomNumber: "103", floor: "1", status: "ว่าง", roomType: "ห้อง VIP", rentalType: "รายเดือน" },
  { id: 104, roomNumber: "103", floor: "1", status: "ว่าง", roomType: "ห้อง VIP", rentalType: "รายเดือน" },
  { id: 105, roomNumber: "103", floor: "1", status: "ว่าง", roomType: "ห้อง VIP", rentalType: "รายเดือน" },
  { id: 106, roomNumber: "103", floor: "1", status: "ว่าง", roomType: "ห้อง VIP", rentalType: "รายเดือน" },
  { id: 201, roomNumber: "201", floor: "2", status: "ว่าง", roomType: "ห้องแอร์", rentalType: "รายวัน" },
];

function EditRoomAll({ onClose }) {
  const [selectedFloor, setSelectedFloor] = useState("1");
  const [selectedRooms, setSelectedRooms] = useState([]);

  const roomsOnFloor = allRooms.filter((r) => r.floor === selectedFloor);

  const toggleSelectRoom = (room) => {
    if (room.status === "ไม่ว่าง") return;

    const isSelected = selectedRooms.find((r) => `${r.floor}-${r.id}` === `${room.floor}-${room.id}`);
    if (isSelected) {
      setSelectedRooms((prev) => prev.filter((r) => `${r.floor}-${r.id}` !== `${room.floor}-${room.id}`));
    } else {
      setSelectedRooms((prev) => [...prev, room]);
    }
  };

  const [roomType, setRoomType] = useState("");
  const [size, setSize] = useState("");
  const [rentalType, setRentalType] = useState("");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");


  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white w-[1000px] max-h-[90vh] overflow-y-auto rounded-lg shadow-lg p-6 ">
        <h2 className="text-xl font-bold text-blue-800 text-center mb-4">แก้ไขห้องพักทั้งหมด</h2>

        {/* dropdown ชั้น */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-4 mb-2">
            <div className="flex items-center gap-2">
              <label className="font-medium">เลือกชั้น:</label>
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="border px-4 py-1.5 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="1">ชั้น 1</option>
                <option value="2">ชั้น 2</option>
              </select>
            </div>

            <button
              className="bg-orange-600 text-white px-4 py-2 rounded shadow hover:bg-orange-700 transition duration-200"
              onClick={() => {
                const vacantRooms = allRooms.filter((r) => r.status === "ว่าง");
                setSelectedRooms(vacantRooms);
              }}
              >
              เลือกห้องที่ว่างทั้งหมด
            </button>
          </div>
        </div>


        {/* แสดงห้อง */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {roomsOnFloor.map((room) => {
            const roomKey = `${room.floor}-${room.id}`;
            const isSelected = selectedRooms.find((r) => `${r.floor}-${r.id}` === roomKey);
            const isDisabled = room.status === "ไม่ว่าง";

            return (
              <div
                key={roomKey}
                className={`p-3 rounded cursor-pointer text-center border
                  ${isDisabled ? "bg-red-200 text-gray-500 cursor-not-allowed"
                    : isSelected ? "bg-green-300 border-green-500"
                    : "bg-gray-100 hover:bg-green-100"}
                `}
                onClick={() => toggleSelectRoom(room)}
              >
                ห้อง {room.roomNumber}
                <div className="text-sm">{room.roomType}</div>
                <div className="text-xs">{room.status}</div>
              </div>
            );
          })}
        </div>

        {/* แสดงผลลัพธ์ */}
        {selectedRooms.length > 0 && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-bold mb-3">
              ห้องที่เลือก: {selectedRooms.map((r) => r.roomNumber).join(", ")}
            </h3>

            <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block font-medium">ประเภทห้อง:</label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full border px-3 py-1 rounded"
              >
                <option value="">-- เลือกประเภทห้อง --</option>
                <option value="ห้องแอร์">ห้องแอร์ (กลาง)</option>
                <option value="ห้องพัดลม">ห้องพัดลม (เล็ก)</option>
                <option value="ห้อง VIP">ห้อง VIP (กลาง)</option>
                <option value="ห้องรวม">ห้องรวม (กลาง)</option>
              </select>
            </div>
                        <div>
              <label className="block font-medium">ราคา:</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border px-3 py-1 rounded"
                placeholder="เช่น 3000"
              />
            </div>

            <div>
              <label className="block font-medium">ประเภทการเช่า:</label>
              <select
                value={rentalType}
                onChange={(e) => setRentalType(e.target.value)}
                className="w-full border px-3 py-1 rounded"
              >
                <option value="">-- เลือก --</option>
                <option value="รายวัน">รายวัน</option>
                <option value="รายเดือน">รายเดือน</option>
              </select>
            </div>
                        <div>
              <label className="block font-medium">มัดจำ:</label>
              <input
                type="number"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                className="w-full border px-3 py-1 rounded"
                placeholder="เช่น 1000"
              />
            </div>
          </div>


            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-200"
              >
                ยกเลิก
              </button>
              <button
                className="bg-blue-600  text-white px-4 py-2 rounded hover:bg-blue-700"
                onClick={() => console.log("📝 ส่งข้อมูลห้องที่เลือก:", selectedRooms)}
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditRoomAll;
