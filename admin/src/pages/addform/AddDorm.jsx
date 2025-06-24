import { useState } from "react";
import { toast } from "react-toastify";
import SaveButton from "../../components/buttons/SaveButton";
import CancelButton from "../../components/buttons/CancelButton";

function AddDorm({ onClose }) {
  const [dormName, setDormName] = useState("");
  const [numFloors, setNumFloors] = useState(0);
  const [roomsPerFloor, setRoomsPerFloor] = useState([]);

  const handleNumFloorsChange = (e) => {
  const floors = parseInt(e.target.value);
  setNumFloors(floors);

  const updatedRooms = [...roomsPerFloor];

  // เพิ่มชั้นใหม่โดยใส่ค่าเริ่มต้นเป็น 0
  while (updatedRooms.length < floors) {
    updatedRooms.push(0);
  }

  // ถ้าลดจำนวนชั้น → ตัดชั้นที่เกินออก
  if (updatedRooms.length > floors) {
    updatedRooms.length = floors;
  }

  setRoomsPerFloor(updatedRooms);
  };

  const handleRoomChange = (index, value) => {
    const updatedRooms = [...roomsPerFloor];
    updatedRooms[index] = value;
    setRoomsPerFloor(updatedRooms);
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch("http://localhost:3001/dorm/createDormitory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dorm_name: dormName,
          total_floors: numFloors,
          rooms_per_floor: roomsPerFloor.map((r) => Number(r) || 0),
        }),
      });

      const result = await response.json();
      if (response.ok) {
        toast.success("เพิ่มข้อมูลหอพักสำเร็จ!");
        onClose(); // ปิด modal หลังเพิ่มเสร็จ
      } else {
        toast.error("เกิดข้อผิดพลาด: " + result.error);
      }
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    }
  };
  
  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-lg p-6 relative">
        <h1 className="text-2xl font-semibold text-blue-950 text-center">
          เพิ่มตึก/หอ
        </h1>
        <hr className="border-b-2 border-gray-300 mt-4" />

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <label className="w-32 font-medium">ชื่อตึก/หอ :</label>
            <input
              type="text"
              value={dormName}
              onChange={(e) => setDormName(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 w-full"
              placeholder="กรอกชื่อตึกหรือหอ"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="w-32 font-medium">จำนวนชั้น :</label>
            <input
              type="number"
              min={0}
              value={numFloors}
              onChange={handleNumFloorsChange}
              className="border border-gray-300 rounded px-3 py-2 w-full"
              placeholder="กรอกจำนวนชั้น"
            />
          </div>

          {numFloors > 0 && (
            <div className="space-y-2">
              <label className="font-medium block">
                จำนวนห้อง (หากไม่มีให้ใส่ 0) :
              </label>
              <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: numFloors }).map((_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <label className="w-20">ชั้น {index + 1}</label>
                    <div className="flex items-center border border-gray-300 rounded w-full">
                      <button
                        type="button"
                        onClick={() => handleRoomChange(index, Math.max(0, parseInt(roomsPerFloor[index] || "0") - 1))}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-l"
                      >
                        -
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={roomsPerFloor[index] || ""}
                        onChange={(e) => handleRoomChange(index, e.target.value)}
                        className="text-center w-full px-2 py-2 outline-none"
                        placeholder="0"
                      />
                      <button
                        type="button"
                        onClick={() => handleRoomChange(index, parseInt(roomsPerFloor[index] || "0") + 1)}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-r"
                      >
                        +
                      </button>
                    </div>
                  </div>
              ))}
            </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <SaveButton onClick={handleSubmit} />
          <CancelButton onClick={onClose} />
        </div>
      </div>
    </div>
  );
}

export default AddDorm;
