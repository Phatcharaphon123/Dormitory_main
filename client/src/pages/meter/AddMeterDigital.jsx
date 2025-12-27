import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaPlus, FaEdit, FaSearch, FaBolt, FaTint, FaCheckCircle, FaUndo} from 'react-icons/fa';
import AddMeterForm from './AddEditMeterFormDB';
import { useParams } from 'react-router-dom';
import { MdGasMeter } from "react-icons/md";
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API_URL from '../../config/api';

function AddMeterDigital({ onBack }) {
  const { dormId } = useParams();
  
  // State สำหรับข้อมูลจาก API
  const [roomsData, setRoomsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State สำหรับ UI
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedMeterType, setSelectedMeterType] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloor, setSelectedFloor] = useState('ทั้งหมด');
  const [filterStatus, setFilterStatus] = useState('ทั้งหมด');
  const [filterMeterType, setFilterMeterType] = useState('ทั้งหมด');

  // ดึงข้อมูลมิเตอร์เมื่อโหลดหน้า
  useEffect(() => {
    fetchMeterData();
  }, [dormId]);

  const fetchMeterData = async () => {
    if (!dormId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/meters/meter-records/dormitories/${dormId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoomsData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching meter data:', err);
      setError('ไม่สามารถโหลดข้อมูลมิเตอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  // การจัดการกับการเพิ่ม/แก้ไขมิเตอร์
  const handleAddMeter = (room, meterType) => {
    setSelectedRoom(room);
    setSelectedMeterType(meterType);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setSelectedRoom(null);
    setSelectedMeterType(null);
  };

  const handleSaveMeter = async (meterData) => {
    try {
      const endpoint = meterData.type === 'electric' ? 
        `${API_URL}/api/meters/meter-records/electric` : 
        `${API_URL}/api/meters/meter-records/water`;
      
      // รวมวันที่และเวลาติดตั้ง
      const postData = {
        roomId: meterData.roomId,
        meterCode: meterData.meterCode,
        installationDate: meterData.installationDate,
        installationTime: meterData.installationTime
      };
      
      const token = localStorage.getItem('token');
      await axios.post(endpoint, postData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // รีเฟรชข้อมูล
      await fetchMeterData();
      handleCloseForm();
      toast.success(`✅ ${meterData.type === 'electric' ? 'มิเตอร์ไฟฟ้า' : 'มิเตอร์น้ำ'}ถูกบันทึกเรียบร้อยแล้ว`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    } catch (err) {
      console.error('Error saving meter:', err);
      toast.error('❌ เกิดข้อผิดพลาดในการบันทึกมิเตอร์', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    }
  };

  // ฟังก์ชันกรองข้อมูล
  const filterRooms = () => {
    const filteredData = {};
    
    Object.keys(roomsData).forEach(floor => {
      const filteredRooms = roomsData[floor].filter(room => {
        const matchesSearch = room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (room.tenant && room.tenant.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesFloor = selectedFloor === 'ทั้งหมด' || floor === selectedFloor;
        
        let matchesStatus = true;
        if (filterStatus !== 'ทั้งหมด') {
          const roomStatus = room.tenant ? 'มีผู้เช่า' : 'ห้องว่าง';
          matchesStatus = roomStatus === filterStatus;
        }
        
        let matchesMeterType = true;
        if (filterMeterType !== 'ทั้งหมด') {
          if (filterMeterType === 'มีมิเตอร์ไฟฟ้า') {
            matchesMeterType = room.meters.electric.installed;
          } else if (filterMeterType === 'มีมิเตอร์น้ำ') {
            matchesMeterType = room.meters.water.installed;
          } else if (filterMeterType === 'ติดตั้งครบ') {
            matchesMeterType = room.meters.electric.installed && room.meters.water.installed;
          }
        }
        
        return matchesSearch && matchesFloor && matchesStatus && matchesMeterType;
      });
      
      if (filteredRooms.length > 0) {
        filteredData[floor] = filteredRooms;
      }
    });
    
    return filteredData;
  };

  const filteredRoomsData = filterRooms();

  // สถิติ
  const getStats = () => {
    let totalRooms = 0;
    let electricMeters = 0;
    let waterMeters = 0;
    let completedRooms = 0; // ห้องที่ติดตั้งมิเตอร์ครบทั้งไฟฟ้าและน้ำ

    Object.values(roomsData).forEach(rooms => {
      rooms.forEach(room => {
        totalRooms++;
        if (room.meters.electric.installed) electricMeters++;
        if (room.meters.water.installed) waterMeters++;
        if (room.meters.electric.installed && room.meters.water.installed) completedRooms++;
      });
    });

    return { totalRooms, electricMeters, waterMeters, completedRooms };
  };

  const stats = getStats();

  // รับสถานะการเช่า
  const getRoomStatus = (room) => {
    return room.tenant ? 'มีผู้เช่า' : 'ห้องว่าง';
  };

  const getRoomStatusColor = (room) => {
    return room.tenant ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600';
  };

  if (showAddForm) {
    return (
      <AddMeterForm
        room={selectedRoom}
        meterType={selectedMeterType}
        onClose={handleCloseForm}
        onSave={handleSaveMeter}
        onDelete={fetchMeterData}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
                  <MdGasMeter className="text-gray-700 text-3xl" />
                  จัดการมิเตอร์ดิจิตอล
                </h1>
                <p className="text-gray-600 mt-1">เพิ่ม แก้ไข และจัดการมิเตอร์ไฟฟ้าและน้ำประปา</p>
              </div>
            </div>
          </div>
        </div>

        {/* กรณี Loading */}
        {loading && (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">กำลังโหลดข้อมูลมิเตอร์...</p>
          </div>
        )}

        {/* กรณี Error */}
        {error && (
          <div className="bg-white rounded-md shadow-sm border border-red-200 p-6 mb-6">
            <div className="text-center text-red-600">
              <p className="text-lg font-medium">{error}</p>
              <button 
                onClick={fetchMeterData}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                ลองใหม่
              </button>
            </div>
          </div>
        )}

        {/* แสดงข้อมูลเมื่อโหลดเสร็จ */}
        {!loading && !error && (
          <>
            {/* สถิติ */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
              <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">ห้องทั้งหมด</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalRooms}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center">
                    <FaSearch className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">มิเตอร์ไฟฟ้า</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.electricMeters}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-md flex items-center justify-center">
                    <FaBolt className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">มิเตอร์น้ำ</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.waterMeters}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center">
                    <FaTint className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">ติดตั้งครบ</p>
                    <p className="text-2xl font-bold text-green-600">{stats.completedRooms}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-md flex items-center justify-center">
                    <FaCheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* ตัวกรอง */}
            <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ค้นหา</label>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="ค้นหาเลขห้อง หรือชื่อผู้เช่า"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ชั้น</label>
                  <select
                    value={selectedFloor}
                    onChange={(e) => setSelectedFloor(e.target.value)}
                    className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ทั้งหมด">ทั้งหมด</option>
                    {Object.keys(roomsData).map(floor => (
                      <option key={floor} value={floor}>{floor}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">สถานะห้อง</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ทั้งหมด">ทั้งหมด</option>
                    <option value="มีผู้เช่า">มีผู้เช่า</option>
                    <option value="ห้องว่าง">ห้องว่าง</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">สถานะมิเตอร์</label>
                  <select
                    value={filterMeterType}
                    onChange={(e) => setFilterMeterType(e.target.value)}
                    className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ทั้งหมด">ทั้งหมด</option>
                    <option value="มีมิเตอร์ไฟฟ้า">มีมิเตอร์ไฟฟ้า</option>
                    <option value="มีมิเตอร์น้ำ">มีมิเตอร์น้ำ</option>
                    <option value="ติดตั้งครบ">ติดตั้งครบ</option>
                  </select>
                </div>
              </div>
            </div>

            {/* รายการห้องตามชั้น */}
            <div className="space-y-4">
              {Object.keys(filteredRoomsData).length === 0 ? (
                <div className="bg-white rounded-md shadow-sm border border-gray-200 p-12 text-center">
                  <p className="text-gray-500 text-lg">ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา</p>
                </div>
              ) : (
                Object.entries(filteredRoomsData).map(([floor, rooms]) => (
                  <div key={floor} className="bg-white rounded-md shadow-sm border border-gray-300 overflow-hidden">
                    <div className=" border-b border-gray-300 px-6 py-4 flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-800">{floor}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        <span>
                          {rooms.length} ห้อง | 
                          ติดตั้งครบ {rooms.filter(room => room.meters.electric.installed && room.meters.water.installed).length}/{rooms.length}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {rooms.map((room) => (
                          <div key={room.roomId} className="border border-gray-200 rounded-md p-4 hover:shadow-md transition-shadow">
                            {/* Header ห้อง */}
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-lg font-semibold text-gray-800">ห้อง {room.roomNumber}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoomStatusColor(room)}`}>
                                {getRoomStatus(room)}
                              </span>
                            </div>

                            {/* ข้อมูลผู้เช่า */}
                            <div className="mb-4">
                              <p className="text-sm text-gray-600">
                                ผู้เช่า: {room.tenant || 'ไม่มีผู้เช่า'}
                              </p>
                            </div>

                            {/* สถานะมิเตอร์ */}
                            <div className="space-y-3">
                              
                              {/* มิเตอร์น้ำ */}
                              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                                <div className="flex items-center gap-2">
                                  <FaTint className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm font-medium text-gray-700">น้ำ</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {room.meters.water.installed ? (
                                    <>
                                      <FaCheckCircle className="w-4 h-4 text-green-500" />
                                      <button
                                        onClick={() => handleAddMeter(room, 'water')}
                                        className="text-blue-600 hover:text-blue-700 transition-colors"
                                        title="แก้ไข"
                                      >
                                        <FaEdit className="w-3 h-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleAddMeter(room, 'water')}
                                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                      <FaPlus className="w-3 h-3" />
                                      <span className="text-xs">เพิ่ม</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                              {/* มิเตอร์ไฟฟ้า */}
                              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-md">
                                <div className="flex items-center gap-2">
                                  <FaBolt className="w-4 h-4 text-yellow-600" />
                                  <span className="text-sm font-medium text-gray-700">ไฟฟ้า</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {room.meters.electric.installed ? (
                                    <>
                                      <FaCheckCircle className="w-4 h-4 text-green-500" />
                                      <button
                                        onClick={() => handleAddMeter(room, 'electric')}
                                        className="text-yellow-600 hover:text-yellow-700 transition-colors"
                                        title="แก้ไข"
                                      >
                                        <FaEdit className="w-3 h-3" />
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => handleAddMeter(room, 'electric')}
                                      className="flex items-center gap-1 text-yellow-600 hover:text-yellow-700 transition-colors"
                                    >
                                      <FaPlus className="w-3 h-3" />
                                      <span className="text-xs">เพิ่ม</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
      <ToastContainer />
    </div>
  );
}

export default AddMeterDigital;
