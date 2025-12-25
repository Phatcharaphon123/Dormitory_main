import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API_URL from '../../../config/api';

function EditRoom({ onClose, roomTypeData, dormId, selectedRooms, onSaveSuccess }) {
  const [selectedType, setSelectedType] = useState('');

  const handleSave = async () => {
    if (!selectedType) return;

    const payload = {
      floors: [],
    };

    const roomsByFloor = {};
    selectedRooms.forEach((room) => {
      if (!roomsByFloor[room.floorNumber]) {
        roomsByFloor[room.floorNumber] = [];
      }
      roomsByFloor[room.floorNumber].push({
        room_id: room.room_id,
        number: room.number,
        available: room.available,
        room_type_id: parseInt(selectedType),
      });
    });

    Object.keys(roomsByFloor).forEach((floorNumber) => {
      payload.floors.push({
        floorNumber: parseInt(floorNumber),
        rooms: roomsByFloor[floorNumber],
      });
    });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/api/rooms/dormitories/${dormId}/selected`,
        payload,
        {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.status !== 200) throw new Error('อัปเดตห้องล้มเหลว');
      toast.success('บันทึกสำเร็จ');
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating rooms:', err);
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    }
  }

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-10">
      <div className="bg-white border border-gray-300 rounded-md shadow-lg w-[90%] md:w-[500px] p-6 z-50">
        <h2 className="text-lg font-semibold text-blue-700 mb-4">
          แก้ไขประเภทห้องที่เลือก ({selectedRooms.length} ห้อง)
        </h2>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full border border-gray-300 px-3 py-2 rounded-md mb-6"
        >
          <option value="">-- เลือกประเภทห้อง --</option>
          {roomTypeData.map((type) => (
            <option key={type.id} value={type.room_type_id}>{type.room_type_name}</option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button className="bg-gray-300 hover:bg-gray-400 text-sm px-4 py-1 rounded-md" onClick={onClose}>ปิด</button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1 rounded-md" onClick={handleSave} disabled={!selectedType}>
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingRoom() {
  const { dormId } = useParams();


  const [roomTypeData, setRoomTypeData] = useState([]);
  const [floorData, setFloorData] = useState([]);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    if (!dormId || dormId === 'undefined' || dormId.includes(':')) {
      console.error('❌ dormId ไม่ถูกต้อง:', dormId);
      return;
    }
    
    const token = localStorage.getItem('token');
    
    axios.get(`${API_URL}/api/room-types/dormitories/${dormId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then((response) => {
        console.log('✅ Room types loaded:', response.data);
        setRoomTypeData(response.data);
      })
      .catch((err) => {
        console.error('❌ โหลด room types ล้มเหลว:', err);
        toast.error('ไม่สามารถโหลดข้อมูลประเภทห้องได้');
      });
  }, [dormId]);

  const loadRoomsData = async () => {
    if (!dormId || dormId === 'undefined' || dormId.includes(':')) {
      console.error('❌ dormId ไม่ถูกต้องใน loadRoomsData:', dormId);
      return;
    }
    
    const url = `${API_URL}/api/rooms/dormitories/${dormId}/by-floor`;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const formatted = response.data.map((floor) => ({
        floorNumber: floor.floorNumber,
        roomCount: floor.rooms.length,
        rooms: floor.rooms.map((room) => ({
          room_id: room.room_id,
          number: room.number,
          type: room.room_type_id?.toString() || '',
          selected: false,
          available: room.available,
        })),
      }));
      setFloorData(formatted);
    } catch (err) {
      console.error('❌ โหลดข้อมูลห้องล้มเหลว:', err);
      toast.error('ไม่สามารถโหลดข้อมูลห้องได้');
    }
  };

  useEffect(() => {
    loadRoomsData();
  }, [dormId]);

  const handleRoomChange = (floorIdx, roomIdx, field, value) => {
    const newFloors = [...floorData];
    newFloors[floorIdx].rooms[roomIdx] = {
      ...newFloors[floorIdx].rooms[roomIdx],
      [field]: value,
    };
    setFloorData(newFloors);
  };

  const toggleRoomSelection = (floorIdx, roomIdx) => {
    const room = floorData[floorIdx].rooms[roomIdx];
    if (!room.available) return;
    const newFloors = [...floorData];
    newFloors[floorIdx].rooms[roomIdx].selected = !room.selected;
    setFloorData(newFloors);
  };

  const selectAllRooms = (floorIdx) => {
    const newFloors = [...floorData];
    newFloors[floorIdx].rooms = newFloors[floorIdx].rooms.map((room) => ({
      ...room,
      selected: room.available,
    }));
    setFloorData(newFloors);
  };

  const deselectAllRooms = (floorIdx) => {
    const newFloors = [...floorData];
    newFloors[floorIdx].rooms = newFloors[floorIdx].rooms.map((room) => ({
      ...room,
      selected: false,
    }));
    setFloorData(newFloors);
  };

  const getSelectedRoomCount = () =>
    floorData.reduce((count, floor) =>
      count + floor.rooms.filter((room) => room.selected).length, 0);

  const getSelectedRooms = () => {
    const selected = [];
    floorData.forEach((floor) => {
      floor.rooms.forEach((room) => {
        if (room.selected) {
          selected.push({ ...room, floorNumber: floor.floorNumber, room_id: room.room_id });
        }
      });
    });
    return selected;
  };

  const handleSaveFloor = async (floorIdx) => {
    const floor = floorData[floorIdx];
    
    const payload = {
      floors: [
        {
          floorNumber: floor.floorNumber,
          rooms: floor.rooms.map((room) => {
            const parsedType = room.type ? parseInt(room.type) : null;
            
            if (parsedType && isNaN(parsedType)) {
              return null;
            }
            
            return {
              number: room.number,
              available: room.available,
              room_type_id: parsedType,
            };
          }).filter(room => room !== null),
        },
      ],
    };

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/api/rooms/dormitories/${dormId}`,
        payload,
        {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.status !== 200) {
        console.error('Update failed:', response.data);
        throw new Error(`HTTP ${response.status}`);
      }
      
      toast.success('บันทึกข้อมูลสำเร็จ');
  // ไม่ต้อง alert ที่นี่
    } catch (err) {
      console.error('❌ Save error:', err);
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-blue-700">จัดการห้องพัก</h2>
      </div>

      <div className="space-y-4">
        {floorData.map((floor, floorIdx) => (
          <div key={floor.floorNumber} className="border border-gray-300 p-4 rounded-md shadow bg-white relative">
            <div className="flex justify-between items-center mb-2">
              <h3 className="p-1 px-2 text-md font-semibold text-gray-800 bg-blue-200 rounded-md inline-block">
                ชั้นที่ {floor.floorNumber}
              </h3>
              <div className="flex gap-2">
                <button
                  className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600"
                  onClick={() => selectAllRooms(floorIdx)}
                >
                  เลือกทั้งหมด
                </button>
                <button
                  className="bg-blue-100 text-blue-800 px-3 py-1 rounded-md text-sm hover:bg-blue-200 border border-blue-300"
                  onClick={() => deselectAllRooms(floorIdx)}
                >
                  ยกเลิกทั้งหมด
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {floor.rooms.map((room, roomIdx) => (
                <div
                  key={room.room_id}
                  onClick={() => toggleRoomSelection(floorIdx, roomIdx)}
                  className={`border rounded-md p-3 shadow-sm bg-white space-y-2 text-sm ${
                    room.selected
                      ? 'border-blue-500 ring-2 ring-blue-300'
                      : 'border-gray-300'
                  } ${room.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
                >
                  <div className="flex justify-center">
                    <p className="inline-block bg-blue-100 px-2 py-1 font-bold text-blue-600 rounded-md">
                      ห้อง {room.number}
                    </p>
                  </div>
                  <select
                    value={room.type}
                    disabled={!room.available}
                    className="border px-2 py-1 rounded-md w-full"
                    onChange={(e) =>
                      handleRoomChange(floorIdx, roomIdx, 'type', e.target.value)
                    }
                  >
                    <option value="">เลือกประเภทห้อง</option>
                    {roomTypeData.map((type) => (
                      <option key={type.room_type_id} value={type.room_type_id}>{type.room_type_name}</option>
                    ))}
                  </select>
                  <p className={`text-xs font-semibold ${room.available ? 'text-green-600' : 'text-red-600'}`}>
                    สถานะ: {room.available ? 'ว่าง' : 'ไม่ว่าง'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/5 bg-white border border-gray-300 py-3 px-6 flex justify-between items-center shadow-md rounded-md z-50 w-[350px]">
        <span className="text-sm text-gray-700">
          จำนวนห้องที่เลือก <strong>{getSelectedRoomCount()}</strong> ห้อง
        </span>
        <button
          className="bg-blue-600 text-white px-5 py-1 rounded-md hover:bg-blue-700 text-sm"
          onClick={() => setShowEdit(true)}
        >
          แก้ไข
        </button>
      </div>

      {showEdit && (
        <EditRoom
          onClose={() => setShowEdit(false)}
          roomTypeData={roomTypeData}
          dormId={dormId}
          selectedRooms={getSelectedRooms()}
          onSaveSuccess={loadRoomsData}
        />
      )}
    </div>
  );
}

export default SettingRoom;
