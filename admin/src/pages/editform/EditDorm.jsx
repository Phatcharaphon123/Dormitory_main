import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import BackButton from "../../components/buttons/BackButton";
import { IoBuild } from "react-icons/io5";
import SaveButton from "../../components/buttons/SaveButton";
import EditButton from "../../components/buttons/EditButton";
import axios from "axios";
import EditRoom from "./EditRoom";
import { useNavigate } from "react-router-dom";


function EditDorm() {
  const { dormId } = useParams();
  const [dormName, setDormName] = useState("");
  const [numFloors, setNumFloors] = useState(0);
  const [roomsPerFloor, setRoomsPerFloor] = useState([]);

  const navigate = useNavigate();
  const [openEditRoom, setOpenEditRoom] = useState();

  // ดึงข้อมูลหอพักเดิม
  useEffect(() => {
    if (!dormId) return;

    const fetchDorm = async () => {
      try {
        const res = await axios.get(`http://localhost:3001/dorm/getDorm/${dormId}`);
        setDormName(res.data.dorm_name);
        setNumFloors(res.data.total_floors);
        setRoomsPerFloor(res.data.rooms_per_floor || []);
      } catch (err) {
        console.error("❌ Error fetching dorm:", err);
      }
    };

    fetchDorm();
  }, [dormId]);

  // เปลี่ยนจำนวนห้องต่อชั้น
  const handleRoomChange = (index, value) => {
    const updatedRooms = [...roomsPerFloor];
    updatedRooms[index] = parseInt(value);
    setRoomsPerFloor(updatedRooms);
  };

  // เมื่อเปลี่ยนจำนวนชั้น
    const handleNumFloorsChange = (e) => {
    const floors = parseInt(e.target.value);
    setNumFloors(floors);

    const updatedRooms = [...roomsPerFloor];

    // เพิ่มห้องถ้าจำนวนชั้นมากขึ้น
    while (updatedRooms.length < floors) {
      updatedRooms.push(0);
    }

    // ตัดห้องถ้าจำนวนชั้นลดลง
    if (updatedRooms.length > floors) {
      updatedRooms.length = floors;
    }

    setRoomsPerFloor(updatedRooms);
  };

  // ฟังก์ชันบันทึก
  const handleSubmit = async () => {
    try {
      await axios.put(`http://localhost:3001/dorm/updateDorm/${dormId}`, {
        dorm_name: dormName,
        floor_number: numFloors,
        room_count: roomsPerFloor,
      });

      alert("บันทึกข้อมูลสำเร็จแล้ว");
    } catch (error) {
      console.error("❌ Error saving:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  return (
    <div className="m-5">
      <div className="flex items-center mb-4 gap-4">
        <BackButton onClick={() => window.history.back()} />
        <div className="flex-1 bg-blue-900 p-2 rounded shadow-md">
          <div className="flex justify-center">
            <IoBuild size={20} className="text-white mr-2" />
            <h1 className="font-semibold text-white">แก้ไขข้อมูลหอพัก</h1>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-medium text-blue-950 w-full">
              ชื่อตึก/หอ :
            </h1>
            <input
              type="text"
              value={dormName}
              onChange={(e) => setDormName(e.target.value)}
              className="border border-gray-300 p-2 rounded w-full max-w-md"
            />
          </div>
          <SaveButton text="บันทึก" onClick={handleSubmit} />
        </div>

        <hr className="border-b-2 border-gray-300 mb-4" />

        <div className="mb-4">
          <label className="text-lg  font-medium text-gray-800 mr-4">จำนวนชั้น :</label>
          <input
            type="number"
            min={1}
            value={numFloors}
            onChange={handleNumFloorsChange}
            className="border border-gray-300 p-2 rounded w-full max-w-sm"
          />
        </div>

        {/* กรอกจำนวนห้องต่อชั้น */}
        <div className="grid grid-cols-6 gap-5">
        {roomsPerFloor.map((value, index) => (
          <div key={index} className="flex flex-col">
            <label className="text-sm text-gray-700 font-medium mb-1">
              ชั้นที่ {index + 1}
            </label>
            <input
              type="number"
              value={value}
              min={0}
              onChange={(e) => handleRoomChange(index, e.target.value)}
              className="border border-gray-300 p-2 rounded"
            />
          </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow-md mt-6">
        <h2 className="text-xl font-bold text-blue-950 mb-6">แผนผังห้องพัก</h2>

        {roomsPerFloor.length === 0 ? (
          <p className="text-gray-500 text-center">ยังไม่มีข้อมูลชั้น</p>
        ) : (
          roomsPerFloor.map((roomCount, floorIndex) => (
            <div key={floorIndex} className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">
                ชั้นที่ {floorIndex + 1}
              </h3>
              <div className="grid grid-cols-6 gap-5 ">
                {Array.from({ length: roomCount }, (_, i) => {
                  const roomNumber = `${floorIndex + 1}${String(i + 1).padStart(2, "0")}`;
                  return (
                    <div
                      key={i}
                      className="bg-green-100 p-5  flex flex-col items-center justify-center rounded-md shadow hover:bg-green-200 transition duration-200"
                    >
                      <div className="font-semibold text-green-800">ห้อง {roomNumber}</div>
                      <div className="text-xs text-gray-600 mb-2">ว่าง</div>
                      <EditButton onClick={() => {setOpenEditRoom(true);}}/>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      {openEditRoom && (
        <EditRoom onClose={() => setOpenEditRoom(false)} />
      )}
    </div>
  );
}

export default EditDorm;
