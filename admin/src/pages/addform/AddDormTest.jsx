import { useState } from "react";
import SaveButton from "../../components/buttons/SaveButton";
import CancelButton from "../../components/buttons/CancelButton";

function AddDorm({ onClose }) {
  const [dormName, setDormName] = useState("");
  const [numFloors, setNumFloors] = useState(0);
  const [roomsPerFloor, setRoomsPerFloor] = useState([]);
  const [billingDay, setBillingDay] = useState("");


  const handleNumFloorsChange = (e) => {
    const floors = parseInt(e.target.value);
    setNumFloors(floors);

    const updatedRooms = [...roomsPerFloor];
    while (updatedRooms.length < floors) updatedRooms.push(0);
    if (updatedRooms.length > floors) updatedRooms.length = floors;
    setRoomsPerFloor(updatedRooms);
  };

  const handleRoomChange = (index, value) => {
    const updatedRooms = [...roomsPerFloor];
    updatedRooms[index] = value;
    setRoomsPerFloor(updatedRooms);
  };

    console.log("✅ MOCK SAVE: ", {
    dorm_name: dormName,
    total_floors: numFloors,
    rooms_per_floor: roomsPerFloor.map((r) => Number(r) || 0),
    billing_day: billingDay,
  });

  const handleSubmit = () => {
    console.log("✅ MOCK SAVE: ", {
      dorm_name: dormName,
      total_floors: numFloors,
      rooms_per_floor: roomsPerFloor.map((r) => Number(r) || 0),
    });

    alert("Mock บันทึกข้อมูลหอพักเรียบร้อย (ดู console)");
    onClose(); // ปิด popup
  };

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg p-6 relative">
        <h1 className="text-2xl font-semibold text-blue-950 text-center">
          🏢 เพิ่มตึก/หอ
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
            <label className="w-32 font-medium">เบอร์โทร :</label>
            <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full"
                placeholder="กรอกเบอร์โทรศัพท์"
            />
            </div>

            <div className="flex items-center gap-2">
            <label className="w-32 font-medium">ที่อยู่ :</label>
                <textarea
                    className="border border-gray-300 rounded px-3 py-2 w-full h-17 resize-y"
                    placeholder="ที่อยู่โดยรวม"
                ></textarea>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
                <label className="w-43.5 font-medium">ตำบล :</label>
                <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full"
                placeholder="ตำบล"
                />
            </div>

            <div className="flex items-center gap-2">
                <label className="w-43.5 font-medium">อำเภอ :</label>
                <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full"
                placeholder="อำเภอ"
                />
            </div>

            <div className="flex items-center gap-2">
                <label className="w-43.5 font-medium">จังหวัด :</label>
                <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full"
                placeholder="จังหวัด"
                />
            </div>

            <div className="flex items-center gap-2">
                <label className="w-43.5 font-medium">รหัสไปรษณีย์ :</label>
                <input
                type="text"
                className="border border-gray-300 rounded px-3 py-2 w-full"
                placeholder="รหัสไปรษณีย์"
                />
            </div>
            </div>

          <div className="flex items-center gap-2 mt-4">
            <label className="w-32 font-medium">วันตัดรอบบิล :</label>
            <select
              className="border border-gray-300 rounded px-3 py-2 w-full"
              // เพิ่ม useState เช่น const [billingDay, setBillingDay] = useState("1")
              value={billingDay}
              onChange={(e) => setBillingDay(e.target.value)}
            >
              <option value="">เลือกวัน</option>
              {[...Array(31)].map((_, i) => (
                <option key={i} value={i + 1}>
                  วันที่ {i + 1} ของทุกเดือน
                </option>
              ))}
            </select>
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
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: numFloors }).map((_, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <label className="w-20">ชั้น {index + 1}</label>
                    <div className="flex items-center border border-gray-300 rounded w-full">
                      <button
                        type="button"
                        onClick={() =>
                          handleRoomChange(
                            index,
                            Math.max(0, parseInt(roomsPerFloor[index] || "0") - 1)
                          )
                        }
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
                        onClick={() =>
                          handleRoomChange(
                            index,
                            parseInt(roomsPerFloor[index] || "0") + 1
                          )
                        }
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
