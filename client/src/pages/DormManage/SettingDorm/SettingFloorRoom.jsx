import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import DeleteRoom from './DeleteRoom';
import { IoNewspaper } from "react-icons/io5";
import { PiSealWarningFill } from "react-icons/pi";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API_URL from '../../../config/api';

function SettingFloorRoom() {
  const { dormId } = useParams(); // ดึง dormId จาก URL parameter (ใช้ชื่อเดียวกับ route)
  const [floors, setFloors] = useState([]);
  const [originalFloors, setOriginalFloors] = useState([]); // เก็บข้อมูลเดิมเพื่อเปรียบเทียบ
  const [roomsData, setRoomsData] = useState({}); // เก็บข้อมูลว่าห้องไหนมีข้อมูลอยู่
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingRoom, setEditingRoom] = useState({});
  const [roomErrors, setRoomErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedRooms, setSelectedRooms] = useState([]);

  // ดึงข้อมูลห้องจาก backend
  useEffect(() => {
    if (dormId) {
      fetchRooms();
      fetchRoomsData();
    }
  }, [dormId]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/rooms/dormitories/${dormId}/by-floor`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = response.data;
      setFloors(data);
      setOriginalFloors(JSON.parse(JSON.stringify(data))); // เก็บสำเนาของข้อมูลเดิม
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      toast.error('ไม่สามารถโหลดข้อมูลชั้นและห้องได้');
      // กรณีไม่มีข้อมูล ให้สร้างชั้นแรกเริ่มต้น
      setFloors([
        {
          floorNumber: 1,
          rooms: [{ id: null, number: '101', available: true }]
        }
      ]);
      setOriginalFloors([
        {
          floorNumber: 1,
          rooms: [{ id: null, number: '101', available: true }]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลสถานะห้องว่ามีข้อมูลหรือไม่
  const fetchRoomsData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/rooms/dormitories/${dormId}/check-data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setRoomsData(response.data);
    } catch (error) {
      console.error('Failed to fetch rooms data:', error);
      toast.error('ไม่สามารถโหลดข้อมูลห้องได้');
    }
  };

  // บันทึกข้อมูลไป backend
  const saveRoomsToBackend = async (floorsData) => {
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await axios.put(
        `${API_URL}/api/rooms/dormitories/${dormId}`,
        { floors: floorsData },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.status === 200) {
        const result = response.data;
        console.log('บันทึกสำเร็จ:', result.message);
        // รีเฟรชข้อมูล
        await fetchRooms();
        await fetchRoomsData(); // รีเฟรชข้อมูลสถานะห้อง
        return true;
      } else {
        const error = await response.json();
        console.error('บันทึกไม่สำเร็จ:', error.error);
        toast.error('บันทึกไม่สำเร็จ: ' + error.error);
        return false;
      }
    } catch (error) {
      console.error('Error saving rooms:', error);
      
      // ตรวจสอบว่าเป็น error จากการลบห้องที่มีข้อมูลหรือไม่
      if (error.response && error.response.data && error.response.data.error) {
        const errorMessage = error.response.data.error;
        if (errorMessage.includes('ไม่สามารถลบห้อง')) {
          toast.error(`${errorMessage}\n\nสามารถลบได้เฉพาะห้องที่ไม่เคยมีผู้เช่าหรือข้อมูลทางการเงิน`);
        } else {
          toast.error('บันทึกไม่สำเร็จ: ' + errorMessage);
        }
      } else {
        toast.error('เกิดข้อผิดพลาดในการบันทึก: ' + (error.message || 'Unknown error'));
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ตรวจสอบว่าข้อมูลมีการเปลี่ยนแปลงหรือไม่
  const hasChanges = JSON.stringify(floors) !== JSON.stringify(originalFloors);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">กำลังโหลดข้อมูล...</div>
        </div>
      </div>
    );
  }

  const handleStatusChange = (floorIdx, roomIdx, value) => {
    const newFloors = [...floors];
    newFloors[floorIdx].rooms[roomIdx].available = value === 'ว่าง';
    setFloors(newFloors);
  };

    const handleRoomNumberChange = (floorIdx, roomIdx, newNum) => {
    const trimmed = newNum.trim();
    const key = `${floorIdx}-${roomIdx}`;
    const currentRoom = floors[floorIdx].rooms[roomIdx];

    // ถ้าค่าว่าง → ห้ามบันทึก + แจ้งเตือน
    if (!trimmed) {
        toast.error('ห้ามปล่อยเลขห้องว่าง');
        return;
    }

    // ตรวจสอบว่าห้องมีข้อมูลอยู่หรือไม่ ถ้ามีก็ห้ามเปลี่ยนหมายเลข
    if (roomsData[currentRoom.number]?.has_data) {
        toast.error('ไม่สามารถเปลี่ยนหมายเลขห้องได้ เนื่องจากห้องนี้มีข้อมูลอยู่ (สัญญาเช่า, ข้อมูลมิเตอร์, หรือใบแจ้งหนี้)');
        // รีเซ็ตค่ากลับเป็นเลขเดิม
        setEditingRoom(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
        });
        return;
    }

    // ถ้ามี error (เช่นเลขซ้ำ) ก็ห้ามบันทึก
    if (roomErrors[key]) return;

    const newFloors = [...floors];
    newFloors[floorIdx].rooms[roomIdx].number = trimmed;
    setFloors(newFloors);

    // ล้างสถานะ
    setEditingRoom(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
    });
    setRoomErrors(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
    });
    };


  const handleDelete = async () => {
    if (!deleteTarget) return;

    // ถ้าเป็นการลบพร้อมกัน
    if (deleteTarget.type === 'multiple') {
      const roomsToDelete = deleteTarget.rooms;
      let newFloors = [...floors];
      
      // จัดเรียงจากมากไปน้อย เพื่อลบจากท้ายไปหน้า
      roomsToDelete.sort((a, b) => {
        if (a.floorIdx === b.floorIdx) {
          return b.roomIdx - a.roomIdx;
        }
        return b.floorIdx - a.floorIdx;
      });
      
      // ลบห้องทีละห้อง
      roomsToDelete.forEach(({ floorIdx, roomIdx }) => {
        newFloors[floorIdx].rooms.splice(roomIdx, 1);
      });
      
      setFloors(newFloors);
      setSelectedRooms([]);
      setDeleteTarget(null);
      return;
    }

    // การลบห้องเดียว (เดิม)
    const { floorIdx, roomIdx } = deleteTarget;
    const newFloors = [...floors];
    newFloors[floorIdx].rooms.splice(roomIdx, 1);

    setFloors(newFloors);
    setDeleteTarget(null);
  };

  const addRoom = (floorIdx) => {
    const newFloors = [...floors];
    const floor = newFloors[floorIdx];
    let i = floor.rooms.length + 1;
    let generated = `${floor.floorNumber}${String(i).padStart(2, '0')}`;

    const allRoomNumbers = floors.flatMap(f => f.rooms.map(r => r.number));
    while (allRoomNumbers.includes(generated)) {
      i++;
      generated = `${floor.floorNumber}${String(i).padStart(2, '0')}`;
    }

    floor.rooms.push({ id: null, number: generated, available: true });
    setFloors(newFloors);
  };

  const addFloor = () => {
    const nextNumber = Math.max(...floors.map(f => f.floorNumber), 0) + 1;
    const newRoomNumber = `${nextNumber}01`;
    setFloors([
      ...floors,
      {
        floorNumber: nextNumber,
        rooms: [{ id: null, number: newRoomNumber, available: true }],
      },
    ]);
  };

  const deleteFloor = (floorIdx) => {
    const isLastFloor = floorIdx === floors.length - 1;
    if (!isLastFloor) {
      toast.error('สามารถลบได้เฉพาะชั้นสุดท้ายเท่านั้น');
      return;
    }
    const newFloors = [...floors];
    newFloors.splice(floorIdx, 1);
    setFloors(newFloors);
  };

  const addRoomToEmptyFloor = (floorIdx) => {
    const newFloors = [...floors];
    const floor = newFloors[floorIdx];
    const newRoomNumber = `${floor.floorNumber}01`;
    
    // ตรวจสอบว่าหมายเลขห้องนี้ซ้ำกับห้องอื่นหรือไม่
    const allRoomNumbers = floors.flatMap(f => f.rooms.map(r => r.number));
    let i = 1;
    let generated = `${floor.floorNumber}${String(i).padStart(2, '0')}`;
    
    while (allRoomNumbers.includes(generated)) {
      i++;
      generated = `${floor.floorNumber}${String(i).padStart(2, '0')}`;
    }
    
    floor.rooms.push({ id: null, number: generated, available: true });
    setFloors(newFloors);
  };

  const toggleRoomSelection = (floorIdx, roomIdx) => {
    const roomKey = `${floorIdx}-${roomIdx}`;
    setSelectedRooms(prev => {
      if (prev.includes(roomKey)) {
        return prev.filter(key => key !== roomKey);
      } else {
        return [...prev, roomKey];
      }
    });
  };

  const handleMultipleDelete = () => {
    if (selectedRooms.length === 0) {
      toast.error('กรุณาเลือกห้องที่ต้องการลบ');
      return;
    }
    
    const roomsToDelete = selectedRooms.map(roomKey => {
      const [floorIdx, roomIdx] = roomKey.split('-').map(Number);
      const room = floors[floorIdx].rooms[roomIdx];
      return { 
        floorIdx, 
        roomIdx, 
        roomNumber: room.number,
        floorNumber: floors[floorIdx].floorNumber
      };
    });
    
    setDeleteTarget({ 
      type: 'multiple', 
      rooms: roomsToDelete 
    });
  };

  const handleSaveAll = async () => {
    // บันทึกข้อมูลทั้งหมดไป backend
    const success = await saveRoomsToBackend(floors);
    if (success) {
      toast.success('บันทึกข้อมูลทั้งหมดสำเร็จ!');
    }
  };

  return (
    <div className='max-w-7xl mx-auto'>
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
        <h2 className="text-lg font-bold text-blue-700">ตั้งค่าชั้นและห้อง</h2>
      </div>

      {/* กล่องข้อมูลสำคัญ */}
      <div className="bg-blue-50 border border-blue-300 rounded-md p-3 mb-4">
        <div className="flex items-start gap-2">
          <span className="text-gray-600 text-lg">⚠️</span>
          <div className="text-sm text-gray-800">
            <p className="font-medium mb-1">ข้อมูลสำคัญ:</p>
            <ul className="space-y-1 text-sm">
              <li style={{display:'flex',alignItems:'center',gap:'4px'}}>• ห้องที่มีไอคอน <span style={{display:'inline-flex',verticalAlign:'middle'}}><PiSealWarningFill size={18} className='text-blue-800' /></span> คือห้องที่มีข้อมูลอยู่ (สัญญาเช่า, ข้อมูลมิเตอร์, ใบแจ้งหนี้)</li>
              <li>• <strong className='text-red-500'>ลบได้เฉพาะห้องที่ไม่เคยมีข้อมูล</strong> เพื่อป้องกันการสูญหายของข้อมูลสำคัญ</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* ปุ่มควบคุมการเลือกหลายห้อง */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedRooms([])}
              className="bg-gray-500 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-600"
            >
              ยกเลิกการเลือก
            </button>
            {selectedRooms.length > 0 && (
              <button
                onClick={handleMultipleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
              >
                ลบห้องที่เลือกทั้งหมด ({selectedRooms.length})
              </button>
            )}
          </div>
          
          {/* ปุ่มบันทึกและสถานะ */}
          <div className="flex items-center gap-4">
            {hasChanges && !saving && (
              <div className="flex items-center gap-2 text-orange-600">
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-pulse"></div>
                <span className="text-sm">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</span>
              </div>
            )}
            {saving && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">กำลังบันทึก...</span>
              </div>
            )}
            <button
              onClick={handleSaveAll}
              disabled={saving || !hasChanges}
              className={`px-6 py-2 text-white text-sm rounded-md font-medium transition-colors ${
                saving || !hasChanges
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg'
              }`}
            >
              {saving ? 'กำลังบันทึก...' : hasChanges ? '💾 บันทึกทั้งหมด' : '✅ บันทึกแล้ว'}
            </button>
          </div>
        </div>
        
        <p className="text-sm text-gray-600">
          {selectedRooms.length > 0 ? `เลือกแล้ว ${selectedRooms.length} ห้อง` : 'คลิกเพื่อเลือกห้องที่ต้องการลบ'}
        </p>

        {floors.map((floor, floorIdx) => (
          <div key={floor.floorNumber} className="border border-gray-300 p-4 rounded-md shadow bg-white relative">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-md font-semibold text-gray-800 bg-blue-100 px-3 py-1 rounded-md">
                ชั้น {floor.floorNumber}
              </h3>

              <div className="flex gap-2">
                {/* ปุ่มลบห้องที่เลือกในชั้นนี้ */}
                {selectedRooms.some(roomKey => roomKey.startsWith(`${floorIdx}-`)) && (
                  <>
                    <button
                      onClick={() => {
                        const roomsInThisFloor = selectedRooms.filter(roomKey => roomKey.startsWith(`${floorIdx}-`));
                        setSelectedRooms(prev => prev.filter(roomKey => !roomsInThisFloor.includes(roomKey)));
                      }}
                      className="bg-gray-500 text-white font-bold px-3 py-1 rounded-md text-sm hover:bg-gray-600"
                    >
                      ยกเลิกการเลือก
                    </button>
                    <button
                      onClick={handleMultipleDelete}
                      className="bg-red-600 text-white font-bold px-3 py-1 rounded-md text-sm hover:bg-red-700"
                    >
                      ลบห้องที่เลือกทั้งหมด ({selectedRooms.length})
                    </button>
                  </>
                )}
                
                {floor.rooms.length > 0 && (
                  <button
                    onClick={() => addRoom(floorIdx)}
                    className="bg-green-700 text-white font-bold px-3 py-1 rounded-md text-sm hover:bg-green-800"
                  >
                    + เพิ่มห้อง
                  </button>
                )}
              </div>
            </div>

            {floor.rooms.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm italic mb-4">ไม่มีห้องในชั้นนี้</p>
                <button
                  onClick={() => addRoomToEmptyFloor(floorIdx)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
                >
                  + เพิ่มห้องแรก
                </button>
                {/* แสดงปุ่มลบเฉพาะชั้นสุดท้ายที่ไม่มีห้อง */}
                {floorIdx === floors.length - 1 && (
                  <button
                    onClick={() => deleteFloor(floorIdx)}
                    className="ml-2 text-red-500 text-sm hover:underline"
                  >
                    ลบชั้นนี้
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-3">
                {floor.rooms.map((room, roomIdx) => {
                  const key = `${floorIdx}-${roomIdx}`;
                  const isSelected = selectedRooms.includes(key);
                  return (
                    <div
                      key={room.number}
                      className={`relative bg-white border rounded-md shadow px-3 py-2 text-sm text-gray-800 hover:shadow-md transition ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                      } ${room.available ? 'cursor-pointer' : ''}`}
                      onClick={() => room.available && toggleRoomSelection(floorIdx, roomIdx)}
                    >
                      {/* แสดงไอคอนเตือนสำหรับห้องที่มีข้อมูล */}
                      {roomsData[room.number]?.has_data && (
                        <div className="absolute -top-2 -right-2 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold" title="ห้องนี้มีข้อมูลอยู่ (ลบไม่ได้)">
                          <PiSealWarningFill size={18} className='text-blue-800' />
                        </div>
                      )}
                      
                      <input
                        type="text"
                        value={editingRoom[key] ?? room.number}
                        onChange={(e) => {
                          if (room.available && !roomsData[room.number]?.has_data) {
                            const value = e.target.value;
                            setEditingRoom(prev => ({ ...prev, [key]: value }));

                            const trimmed = value.trim();
                            const otherRoomNumbers = floors.flatMap((f, fIdx) =>
                              f.rooms
                                .filter((_, rIdx) => !(fIdx === floorIdx && rIdx === roomIdx))
                                .map(r => r.number)
                            );
                            const hasDuplicate = trimmed && otherRoomNumbers.includes(trimmed);

                            // แสดง toast ทุกครั้งที่ซ้ำ
                            if (hasDuplicate) {
                            toast.error('หมายเลขห้องนี้ซ้ำกับห้องอื่น');
                            }

                            setRoomErrors(prev => ({
                            ...prev,
                            [key]: hasDuplicate ? 'หมายเลขห้องนี้ซ้ำกับห้องอื่น' : '',
                            }));
                          }
                        }}
                        onBlur={() =>
                          room.available && !roomsData[room.number]?.has_data &&
                          handleRoomNumberChange(
                            floorIdx,
                            roomIdx,
                            editingRoom[key] ?? room.number
                          )
                        }
                        onClick={(e) => e.stopPropagation()}
                        disabled={!room.available || roomsData[room.number]?.has_data}
                        className={`w-full border rounded-md px-2 py-1 text-sm mb-1 text-center font-medium 
                          ${!room.available || roomsData[room.number]?.has_data ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''} 
                        `}
                      />

                      {roomErrors[key] && (
                        <p className="text-red-500 text-xs mt-1">{roomErrors[key]}</p>
                      )}

                      <select
                        value={room.available ? 'ว่าง' : 'ไม่ว่าง'}
                        onChange={(e) => handleStatusChange(floorIdx, roomIdx, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs border rounded-md px-2 py-1 w-full ${
                          room.available
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        <option value="ว่าง">✅ ว่าง</option>
                        <option value="ไม่ว่าง">❌ ไม่ว่าง</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ลบปุ่มบันทึกแยกตามชั้น */}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={addFloor}
          className="bg-blue-600 text-white px-6 py-2 rounded-md shadow hover:bg-blue-700 transition"
        >
          + เพิ่มชั้นใหม่
        </button>
      </div>

      {deleteTarget && (
        <DeleteRoom
          deleteTarget={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export default SettingFloorRoom;
