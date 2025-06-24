import { useState } from "react";
import { FaFileExcel, FaPrint, FaPaperPlane } from "react-icons/fa";

function Bills() {
  const [activeTab, setActiveTab] = useState("monthly");
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [searchRoom, setSearchRoom] = useState("");

  const buildings = [
    { id: "A", name: "หอพัก A" },
    { id: "B", name: "หอพัก B" },
  ];

  const allRooms = [
    { number: "101", floor: 1, type: "monthly", status: "unpaid", amount: 4646, buildingId: "A" },
    { number: "102", floor: 1, type: "monthly", status: "paid", amount: 4593, buildingId: "A" },
    { number: "103", floor: 1, type: "daily", status: "pending", amount: 4553, buildingId: "A" },
    { number: "104", floor: 1, type: "daily", status: "pending", amount: 4591, buildingId: "A" },
    { number: "105", floor: 1, type: "monthly", status: "pending", amount: 4647, buildingId: "A" },
    { number: "101", floor: 1, type: "monthly", status: "unpaid", amount: 4646, buildingId: "B" },
    { number: "102", floor: 1, type: "monthly", status: "paid", amount: 4593, buildingId: "B" },
    { number: "103", floor: 1, type: "daily", status: "pending", amount: 4553, buildingId: "B" },
    { number: "104", floor: 1, type: "daily", status: "pending", amount: 4591, buildingId: "B" },
    { number: "105", floor: 1, type: "monthly", status: "pending", amount: 4647, buildingId: "B" },
  ];

  const filteredRooms = allRooms.filter((room) => {
    const matchBuilding = !selectedBuilding || room.buildingId === selectedBuilding;
    const matchType = room.type === activeTab;
    const matchSearch = room.number.includes(searchRoom);
    return matchBuilding && matchType && matchSearch;
  });

  const roomsByBuilding = buildings.reduce((acc, b) => {
    acc[b.id] = filteredRooms.filter((r) => r.buildingId === b.id);
    return acc;
  }, {});

  const getRoomsByFloor = (rooms) =>
    rooms.reduce((acc, room) => {
      if (!acc[room.floor]) acc[room.floor] = [];
      acc[room.floor].push(room);
      return acc;
    }, {});

  return (
    <div className="m-4 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md shadow-lg text-white">
        <h1 className="text-2xl font-semibold text-white text-center bg-blue-900 rounded p-3 shadow-md">จัดการบิล</h1>
        <div className="flex justify-center bg-white text-gray-700 rounded overflow-hidden shadow-md">
          <button
            onClick={() => setActiveTab("monthly")}
            className={`flex-1 py-3 text-lg font-medium transition-all duration-200 border-r-2 ${
              activeTab === "monthly"
                ? "bg-blue-100 text-blue-700 font-bold"
                : "hover:bg-gray-100"
            }`}
          >
            บิลรายเดือน/วัน
          </button>
          <button
            onClick={() => setActiveTab("daily")}
            className={`flex-1 py-3 text-lg font-medium transition-all duration-200 ${
              activeTab === "daily"
                ? "bg-purple-100 text-purple-700 font-bold"
                : "hover:bg-gray-100"
            }`}
          >
            บิลรายวัน
          </button>
        </div>
      </div>


      {/* Filter + Buttons */}
      <div className="bg-white p-4 shadow-md rounded">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="font-medium">เลือกตึก/อาคาร</label>
            <select
              className="w-full mt-1 border px-3 py-2 rounded focus:outline-none focus:ring focus:border-blue-300"
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-medium">ค้นหาห้อง</label>
            <input
              className="w-full mt-1 border px-3 py-2 rounded focus:outline-none focus:ring focus:border-blue-300"
              value={searchRoom}
              onChange={(e) => setSearchRoom(e.target.value)}
              placeholder="ค้นหาหมายเลขห้อง"
            />
          </div>
          <div className="flex gap-2 items-end">
            <button className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
              <FaPrint /> พิมพ์
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              <FaFileExcel /> Excel
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
              <FaPaperPlane /> ส่ง
            </button>
          </div>
        </div>
      </div>

      {/* Room Display */}
      <div className="space-y-6">
        {Object.entries(roomsByBuilding).map(([buildingId, rooms]) => {
          if (rooms.length === 0) return null;
          const floors = getRoomsByFloor(rooms);

          return (
            <div key={buildingId} className="bg-white  p-4 rounded-md shadow-md border  border-gray-300 space-y-4">
              <h2 className="text-xl font-bold text-gray-700 border-b border-gray-300 pb-2">
                {buildings.find((b) => b.id === buildingId)?.name}
              </h2>

              {Object.entries(floors)
                .sort(([a], [b]) => a - b)
                .map(([floor, floorRooms]) => (
                  <div key={floor}>
                    <h3 className="text-gray-600 mt-2 mb-2">ชั้นที่ {floor}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                      {floorRooms.map((room) => (
                        <div
                          key={room.number + room.buildingId}
                          className={`relative rounded p-4 text-center border shadow-md transition duration-300 transform hover:scale-[1.03] ${
                            room.status === "paid"
                              ? "bg-green-100 border-green-500"
                              : room.status === "unpaid"
                              ? "bg-red-100 border-red-500"
                              : "bg-gray-100 border-gray-400"
                          }`}
                        >
                          <span
                            className={`absolute top-1 left-1 text-[10px] text-white px-2 py-[1px] rounded-full ${
                              room.type === "monthly" ? "bg-blue-500" : "bg-purple-500"
                            }`}
                          >
                            {room.type === "monthly" ? "รายเดือน" : "รายวัน"}
                          </span>
                          <div className="text-lg font-bold">{room.number}</div>
                          <div className="text-sm">{room.amount} บาท</div>
                          <div className="text-xs text-gray-700 mt-1">
                            {room.status === "paid"
                              ? "จ่ายแล้ว"
                              : room.status === "unpaid"
                              ? "ยังไม่จ่าย"
                              : "รอตรวจสอบ"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          );
        })}

        {filteredRooms.length === 0 && (
          <p className="text-center text-gray-500 py-10">ไม่พบข้อมูลห้อง</p>
        )}
      </div>
    </div>
  );
}

export default Bills;
