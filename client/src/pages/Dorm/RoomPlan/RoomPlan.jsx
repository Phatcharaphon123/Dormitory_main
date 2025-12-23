import { useParams, useNavigate } from "react-router-dom";
import { HiMiniMagnifyingGlass } from "react-icons/hi2";
import { BiFilterAlt } from "react-icons/bi";
import { useState, useEffect } from "react";
import {
  MdMeetingRoom,
  MdCheckCircle,
  MdCancel,
  MdBusinessCenter,
  MdRefresh,
} from "react-icons/md";

import { PiBuildingApartmentFill } from "react-icons/pi";
import axios from 'axios';




function RoomPlan() {
  const navigate = useNavigate();  // สร้าง navigate
  const { dormId } = useParams();
  const dormIdNum = parseInt(dormId, 10);
  // State สำหรับการค้นหาและฟิลเตอร์
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("ทั้งหมด");
  const [searchRoomType, setSearchRoomType] = useState("");

  const [floors, setFloors] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // ฟังก์ชันสำหรับ refresh ข้อมูล
  const refreshData = () => {
    setLastRefresh(Date.now());
  };

  // Auto refresh เมื่อหน้าได้ focus กลับมา (เช่น กลับจากหน้าอื่น)
  useEffect(() => {
    const handleFocus = () => {
      refreshData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [roomsRes, typesRes] = await Promise.all([
          axios.get(`http://localhost:3001/api/rooms/dormitories/${dormId}/by-floor`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`http://localhost:3001/api/room-types/dormitories/${dormId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        // ตรวจสอบโครงสร้างข้อมูลและปรับให้ตรงกับที่คาดหวัง
        let floorsData = roomsRes.data;
        
        // ถ้าข้อมูลเป็น array แต่ไม่มี property ที่ถูกต้อง ให้แปลง
        if (Array.isArray(floorsData) && floorsData.length > 0) {
          // ตรวจสอบว่ามี property floor_number หรือ floorNumber
          floorsData = floorsData.map(floor => {
            const mapped = {
              floor_number: floor.floor_number || floor.floorNumber || 1,
              rooms: floor.rooms || []
            };
            return mapped;
          });
        } else {
          floorsData = [];
        }
        
        setFloors(floorsData);
        setRoomTypes(typesRes.data || []);
      } catch (err) {
        console.error("โหลดข้อมูลห้องล้มเหลว:", err);
        setFloors([]);
        setRoomTypes([]);
      }
    };

    if (dormId) fetchData();
  }, [dormId, lastRefresh]); // ← เพิ่ม lastRefresh เป็น dependency



  // ฟังก์ชันกรองห้อง
  const getFilteredRooms = (rooms, floorNumber) => {
    return rooms
      .map(r => transformRoom(r, floorNumber))
      .filter(room => {
        const matchSearch = room.roomNumber.includes(searchText);
        const matchStatus = filterStatus === "ทั้งหมด" || room.status === filterStatus;
        const matchRoomType = searchRoomType === "" || room.type === searchRoomType;
        return matchSearch && matchStatus && matchRoomType;
      });
  };



  // ฟังก์ชันไปที่หน้า Room โดยส่ง dormId และ roomNumber
  const handleGoToRoom = (roomNumber) => {
    navigate(`/dorm/${dormId}/room/${roomNumber}`); // นำทางไปยังหน้า RoomDetail พร้อมส่ง dormId และ roomNumber
  };

  const transformRoom = (room, floorNumber) => {
    const type = roomTypes.find(t => t.room_type_id === room.room_type_id);
    return {
      id: `${floorNumber}-${room.number}`,
      roomNumber: room.number,
      type: type?.room_type_name || "-",
      rent: type?.monthly_rent?.toLocaleString() || "-",
      status: room.available ? "ว่าง" : "ไม่ว่าง",
      customer: room.first_name ? `${room.first_name} ${room.last_name || ''}`.trim() : "-",
      service: "-",
      due: "0",
      reserve: "-",
      checkout: "-"
    };
  };


const allRooms = floors.flatMap(f => f.rooms);

const countTotal = allRooms.length;
const countAvailable = allRooms.filter(r => r.available).length;
const countUnavailable = allRooms.filter(r => !r.available).length;
const uniqueRoomTypes = [...new Set(
  allRooms.map(r => {
    const type = roomTypes.find(t => t.room_type_id === r.room_type_id);
    return type?.room_type_name;
  })
)].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-700 mb-1 flex items-center gap-2">
                <PiBuildingApartmentFill className="text-gray-700 text-3xl" />
                แผนผังห้องพัก
              </h1>
              <p className="text-gray-600 text-sm">จัดการและดูสถานะห้องพักในหอพัก</p>
            </div>
            <button
              onClick={refreshData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <MdRefresh className="text-lg" />
              รีเฟรชข้อมูล
            </button>
          </div>
        </div>

        {/* สถิติห้องพัก */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-md flex items-center justify-center">
                <MdMeetingRoom className="text-blue-600 text-lg" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">ห้องทั้งหมด</p>
                <p className="text-xl font-semibold text-gray-900">{countTotal}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-md flex items-center justify-center">
                <MdCheckCircle className="text-green-600 text-lg" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">ห้องว่าง</p>
                <p className="text-xl font-semibold text-gray-900">{countAvailable}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-red-100 rounded-md flex items-center justify-center">
                <MdCancel className="text-red-600 text-lg" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">ห้องไม่ว่าง</p>
                <p className="text-xl font-semibold text-gray-900">{countUnavailable}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-md flex items-center justify-center">
                <MdBusinessCenter className="text-purple-600 text-lg" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">ประเภทห้อง</p>
                <p className="text-xl font-semibold text-gray-900">{uniqueRoomTypes}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ช่องกรอง / ค้นหา */}
        <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4 mb-4">
          <div className="flex flex-wrap gap-4">
            {/* ฟิลเตอร์สถานะ */}
            <div className="flex items-center gap-2">
              <BiFilterAlt size={18} className="text-gray-500" />
              <select
                className="w-56 h-11 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="ทั้งหมด">สถานะทั้งหมด</option>
                <option value="ว่าง">ห้องว่าง</option>
                <option value="ไม่ว่าง">ห้องไม่ว่าง</option>
              </select>
            </div>

            {/* ช่องค้นหาหมายเลขห้อง */}
            <div className="relative">
              <HiMiniMagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="ค้นหาหมายเลขห้อง"
                className="w-56 h-11 pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
              />
            </div>

            {/* ฟิลเตอร์ประเภทห้อง */}
            <div className="flex items-center gap-2">
              <select
                className="w-56 h-11 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchRoomType}
                onChange={e => setSearchRoomType(e.target.value)}
              >
                <option value="">ประเภทห้องทั้งหมด</option>
                {roomTypes.map(type => (
                  <option key={type.room_type_id} value={type.room_type_name}>
                    {type.room_type_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* แสดงห้องตามชั้น */}
        <div className="space-y-4">
          {floors && floors.length > 0 ? (
            floors.map((floorData) => (
              <div key={floorData.floor_number} className="bg-white rounded-md shadow-sm border border-gray-300 overflow-hidden">
                <div className="bg-gray-100 px-6 py-3 border-b border-gray-300">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      ชั้นที่ {floorData.floor_number}
                    </h3>
                    <span className="text-sm text-gray-600">
                      {getFilteredRooms(floorData.rooms || [], floorData.floor_number).length} ห้อง
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  {/* Grid ของกล่องห้อง */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-4">
                      {getFilteredRooms(floorData.rooms || [], floorData.floor_number).map((r, idx) => (
                      <div 
                        key={`${r.id}-${idx}`} 
                        className={`relative p-4 rounded-md border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                          r.status === "ว่าง" 
                            ? "bg-green-50 border-green-200 hover:border-green-300" 
                            : "bg-red-50 border-red-200 hover:border-red-300"
                        }`}
                        onClick={() => handleGoToRoom(r.roomNumber)} // ใช้ roomNumber หรือ id ก็ได้
                      >
                        {/* Status Indicator */}
                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-md ${
                          r.status === "ว่าง" ? "bg-green-500" : "bg-red-500"
                        }`}></div>

                        {/* หมายเลขห้อง */}
                        <div className="text-center mb-2">
                          <h4 className="text-lg font-bold text-gray-900">
                            {r.roomNumber}
                          </h4>
                        </div>

                        {/* สถานะ */}
                        <div className="text-center mb-2">
                          <span className={`px-2 py-1 rounded-md text-white text-xs font-medium ${
                            r.status === "ว่าง" ? "bg-green-500" : "bg-red-500"
                          }`}>
                            {r.status}
                          </span>
                        </div>

                        {/* ประเภทห้อง */}
                        <div className="text-center mb-2">
                          <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${
                            r.status === "ว่าง" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-red-100 text-red-800"
                          }`}>
                            {r.type}
                          </span>
                        </div>

                        {/* ชื่อผู้เช่า */}
                        <div className="text-center">
                          <p className={`text-xs truncate ${
                            r.customer === "-" ? "text-gray-400 italic" : "text-gray-700"
                          }`}>
                            {r.customer === "-" ? "ไม่มีผู้เช่า" : r.customer}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))
          ) : (
            <div className="bg-white rounded-md shadow-sm border border-gray-300 p-8 text-center">
              <p className="text-gray-500">ไม่พบข้อมูลห้องพัก</p>
              <p className="text-sm text-gray-400 mt-2">กรุณาตรวจสอบการตั้งค่าห้องพักในระบบ</p>
            </div>
          )}
        </div>
    </div>
  );
}

export default RoomPlan;
