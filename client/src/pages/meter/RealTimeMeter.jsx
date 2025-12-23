import React, { useState, useEffect } from 'react';
import { FaWater, FaBolt, FaSync, FaEye, FaHome, FaCalendarAlt, FaTint, FaSearch, FaFilter, FaUndo, FaExclamationTriangle, FaCheckCircle, FaPlus } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../../config/api';

// ฟังก์ชันแปลงวันที่เป็นรูปแบบไทย
const formatThaiDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
  return `${day}-${month}-${year}`;
};

function RealTimeMeter() {
  const navigate = useNavigate();
  const { dormId } = useParams(); // ดึง dormId จาก URL parameter
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // State สำหรับข้อมูลจริงจาก API
  const [roomsData, setRoomsData] = useState({});
  const [metersData, setMetersData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allRooms, setAllRooms] = useState([]);

  // ฟังก์ชันดึงข้อมูลห้องและมิเตอร์จาก API
  const fetchRoomsAndMeters = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // ดึงข้อมูลห้องตามชั้น
      const roomsResponse = await axios.get(`${API_URL}/api/rooms/dormitories/${dormId}/by-floor`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // ดึงข้อมูลมิเตอร์
      const metersResponse = await axios.get(`${API_URL}/api/meters/dormitories/${dormId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setRoomsData(roomsResponse.data);
      setMetersData(metersResponse.data);
      
      // แปลงข้อมูลเป็นรูปแบบที่ใช้งาน
      const rooms = [];
      
      // ดึงข้อมูลรายละเอียดของแต่ละห้องเพื่อให้ได้ previous reading
      const roomDetailPromises = [];
      Object.keys(metersResponse.data).forEach(floor => {
        metersResponse.data[floor].forEach(room => {
          roomDetailPromises.push(
            axios.get(`${API_URL}/api/rooms/dormitories/${dormId}/rooms/${room.roomId}/detail`, {
              headers: { Authorization: `Bearer ${token}` }
            }).then(detailResponse => ({
              ...room,
              floor: floor,
              roomDetail: detailResponse.data
            })).catch(err => {
              console.warn(`Could not fetch room detail for room ${room.roomNumber}:`, err.message);
              return {
                ...room,
                floor: floor,
                roomDetail: null
              };
            })
          );
        });
      });
      
      // รอให้ดึงข้อมูลทุกห้องเสร็จ
      const roomsWithDetails = await Promise.all(roomDetailPromises);
      
      // สร้าง rooms array พร้อมข้อมูล previous reading
      roomsWithDetails.forEach(room => {
        const roomDetail = room.roomDetail;
        rooms.push({
          id: room.roomId,
          roomNumber: room.roomNumber,
          floor: room.floor,
          floorCode: `${room.floor.charAt(room.floor.length-1) === '1' ? 'A' : 'B'}${room.floor.charAt(room.floor.length-1)}`, // แปลง "ชั้น 1" -> "A1"
          tenant: room.tenant || '-',
          status: room.tenant ? 'active' : 'vacant',
          // ข้อมูลมิเตอร์น้ำ - ใช้ข้อมูลจาก room detail API
          waterMeter: roomDetail?.meter?.current_water || 0,
          waterPrevious: roomDetail?.meter?.previous_water || 0,
          waterUsage: (() => {
            const prevWater = roomDetail?.meter?.previous_water || 0;
            const currWater = roomDetail?.meter?.current_water || 0;
            const calcUsage = roomDetail?.meter?.water_usage || 0;
            
            // ใช้ค่าปัจจุบันถ้าไม่มีค่าก่อนหน้าหรือค่าปัจจุบันน้อยกว่าค่าก่อนหน้า
            let finalUsage;
            if (prevWater <= 0 || currWater < prevWater) {
              finalUsage = currWater;
            } else if (calcUsage > 0) {
              finalUsage = calcUsage;
            } else {
              finalUsage = Math.max(0, currWater - prevWater);
            }
            
            
            return finalUsage;
          })(),
          hasWaterMeter: room.meters?.water?.installed || false,
          waterMeterCode: room.meters?.water?.code || '',
          waterInstallationDate: room.meters?.water?.installationDate || '',
          // ข้อมูลมิเตอร์ไฟฟ้า - ใช้ข้อมูลจาก room detail API
          electricMeter: roomDetail?.meter?.current_electric || 0,
          electricPrevious: roomDetail?.meter?.previous_electric || 0,
          electricUsage: (() => {
            const prevElectric = roomDetail?.meter?.previous_electric || 0;
            const currElectric = roomDetail?.meter?.current_electric || 0;
            const calcUsage = roomDetail?.meter?.electric_usage || 0;
            
            // ใช้ค่าปัจจุบันถ้าไม่มีค่าก่อนหน้าหรือค่าปัจจุบันน้อยกว่าค่าก่อนหน้า
            let finalUsage;
            if (prevElectric <= 0 || currElectric < prevElectric) {
              finalUsage = currElectric;
            } else if (calcUsage > 0) {
              finalUsage = calcUsage;
            } else {
              finalUsage = Math.max(0, currElectric - prevElectric);
            }
            
            
            return finalUsage;
          })(),
          hasElectricMeter: room.meters?.electric?.installed || false,
          electricMeterCode: room.meters?.electric?.code || '',
          electricInstallationDate: room.meters?.electric?.installationDate || '',
          // สถานะมิเตอร์ดิจิตอล
          hasDigitalMeter: (room.meters?.water?.installed || false) || (room.meters?.electric?.installed || false),
          contractType: 'monthly'
        });
      });
      
      setAllRooms(rooms);
      
      // ดึงข้อมูลจาก InfluxDB สำหรับห้องที่มีมิเตอร์ดิจิตอล
      await fetchInfluxData(rooms);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('ไม่สามารถโหลดข้อมูลได้: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันดึงข้อมูลจาก InfluxDB
  const fetchInfluxData = async (rooms) => {
    try {
      const token = localStorage.getItem('token');
      
      // ดึงข้อมูลล่าสุดจาก InfluxDB สำหรับแต่ละห้องที่มีมิเตอร์ดิจิตอล
      const roomsWithDigitalMeters = rooms.filter(room => room.hasDigitalMeter);
      
      // เก็บข้อมูลที่จะอัปเดตทั้งหมด
      const updatedRoomsData = {};
      
      // ดึงข้อมูลจาก InfluxDB สำหรับทุกห้องพร้อมกัน
      const fetchPromises = roomsWithDigitalMeters.map(async (room) => {
        try {
          // ใช้รหัสมิเตอร์เป็น measurement name
          const measurement = room.waterMeterCode || room.electricMeterCode;
          
          if (!measurement) return null;
          
          // ดึงข้อมูลล่าสุดจาก InfluxDB
          const response = await axios.post('http://localhost:3001/api/influx/latest-data', {
            measurement: measurement
          }, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.data && response.data.data) {
            return {
              roomId: room.id,
              data: response.data.data
            };
          }
        } catch (roomError) {
          console.warn(`Could not fetch InfluxDB data for room ${room.roomNumber}:`, roomError.message);
        }
        return null;
      });
      
      // รอให้ข้อมูลทุกห้องมาครบ
      const results = await Promise.all(fetchPromises);
      
      // จัดกลุ่มข้อมูลที่ได้รับสำเร็จ
      results.forEach(result => {
        if (result) {
          updatedRoomsData[result.roomId] = result.data;
        }
      });
      
      // อัปเดต state ครั้งเดียวสำหรับทุกห้อง
      if (Object.keys(updatedRoomsData).length > 0) {
        setAllRooms(prev => prev.map(r => {
          const influxData = updatedRoomsData[r.id];
          if (influxData) {
            return {
              ...r,
              waterMeter: influxData.water || r.waterMeter,
              electricMeter: influxData.power || r.electricMeter,
              // คำนวณการใช้งาน - ถ้าไม่มีค่าก่อนหน้าให้ใช้ค่าปัจจุบัน
              waterUsage: (() => {
                if (influxData.water) {
                  // ถ้าไม่มีค่าก่อนหน้าหรือค่าก่อนหน้าเป็น 0 ให้ใช้ค่าปัจจุบัน
                  // ถ้ามีค่าก่อนหน้าแต่ค่าปัจจุบันน้อยกว่า ให้ใช้ค่าปัจจุบัน (reset มิเตอร์)
                  let newUsage;
                  if (r.waterPrevious <= 0 || influxData.water < r.waterPrevious) {
                    newUsage = influxData.water;
                  } else {
                    newUsage = influxData.water - r.waterPrevious;
                  }
                  
                  return newUsage;
                }
                return r.waterUsage;
              })(),
              electricUsage: (() => {
                if (influxData.power) {
                  // ถ้าไม่มีค่าก่อนหน้าหรือค่าก่อนหน้าเป็น 0 ให้ใช้ค่าปัจจุบัน
                  // ถ้ามีค่าก่อนหน้าแต่ค่าปัจจุบันน้อยกว่า ให้ใช้ค่าปัจจุบัน (reset มิเตอร์)
                  let newUsage;
                  if (r.electricPrevious <= 0 || influxData.power < r.electricPrevious) {
                    newUsage = influxData.power;
                  } else {
                    newUsage = influxData.power - r.electricPrevious;
                  }
                  
                  return newUsage;
                }
                return r.electricUsage;
              })()
            };
          }
          return r;
        }));
      }
    } catch (error) {
      console.error('Error fetching InfluxDB data:', error);
    }
  };

  // โหลดข้อมูลเมื่อเริ่มต้น
  useEffect(() => {
    if (dormId) {
      fetchRoomsAndMeters();
    }
  }, [dormId]);

  // อัปเดตข้อมูลแบบเรียลไทม์จาก InfluxDB
  useEffect(() => {
    if (allRooms.length === 0) return;
    
    const interval = setInterval(async () => {
      // ดึงข้อมูลล่าสุดจาก InfluxDB สำหรับห้องที่มีมิเตอร์ดิจิตอล
      await fetchInfluxDataRealtime();
      setLastUpdate(new Date());
    }, 5000); // อัปเดตทุก 5 วินาที

    return () => clearInterval(interval);
  }, [allRooms.length]);

  // ฟังก์ชันดึงข้อมูล real-time จาก InfluxDB
  const fetchInfluxDataRealtime = async () => {
    try {
      const token = localStorage.getItem('token');
      const roomsWithDigitalMeters = allRooms.filter(room => room.hasDigitalMeter);
      
      // เก็บข้อมูลที่จะอัปเดตทั้งหมด
      const updatedRoomsData = {};
      
      // ดึงข้อมูลจาก InfluxDB สำหรับทุกห้องพร้อมกัน
      const fetchPromises = roomsWithDigitalMeters.map(async (room) => {
        try {
          const measurement = room.waterMeterCode || room.electricMeterCode;
          if (!measurement) return null;
          
          const response = await axios.post('http://localhost:3001/api/influx/latest-data', {
            measurement: measurement
          }, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.data && response.data.data) {
            return {
              roomId: room.id,
              data: response.data.data
            };
          }
        } catch (roomError) {
          console.warn(`Real-time update failed for room ${room.roomNumber}:`, roomError.message);
        }
        return null;
      });
      
      // รอให้ข้อมูลทุกห้องมาครบ
      const results = await Promise.all(fetchPromises);
      
      // จัดกลุ่มข้อมูลที่ได้รับสำเร็จ
      results.forEach(result => {
        if (result) {
          updatedRoomsData[result.roomId] = result.data;
        }
      });
      
      // อัปเดต state ครั้งเดียวสำหรับทุกห้อง
      if (Object.keys(updatedRoomsData).length > 0) {
        setAllRooms(prev => prev.map(r => {
          const influxData = updatedRoomsData[r.id];
          if (influxData) {
            // คำนวณการใช้งาน
            const newWaterUsage = influxData.water ? 
              (r.waterPrevious <= 0 || influxData.water < r.waterPrevious ? 
                parseFloat(influxData.water.toFixed(2)) : 
                parseFloat((influxData.water - r.waterPrevious).toFixed(2))
              ) : r.waterUsage;
            const newElectricUsage = influxData.power ? 
              (r.electricPrevious <= 0 || influxData.power < r.electricPrevious ? 
                parseFloat(influxData.power.toFixed(2)) : 
                parseFloat((influxData.power - r.electricPrevious).toFixed(2))
              ) : r.electricUsage;
            
            return {
              ...r,
              waterMeter: influxData.water ? parseFloat(influxData.water.toFixed(2)) : r.waterMeter,
              electricMeter: influxData.power ? parseFloat(influxData.power.toFixed(2)) : r.electricMeter,
              waterUsage: newWaterUsage,
              electricUsage: newElectricUsage
            };
          }
          return r;
        }));
      }
    } catch (error) {
      console.error('Error in real-time InfluxDB update:', error);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await fetchRoomsAndMeters(); // ดึงข้อมูลใหม่จากฐานข้อมูลและ InfluxDB
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error refreshing data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewRoom = (roomId) => {
    navigate(`/room-meter-detail/${dormId}/${roomId}`);
  };

  // ฟังก์ชันสำหรับจัดกลุ่มห้องตามชั้น
  const groupRoomsByFloor = () => {
    // กรองข้อมูลตามคำค้นหาและตัวกรองก่อน
    const filteredRooms = allRooms.filter(room => {
      // กรองตามคำค้นหา
      let matchSearch = true;
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        matchSearch = (
          room.roomNumber.toLowerCase().includes(searchLower) ||
          (room.tenant !== '-' && room.tenant.toLowerCase().includes(searchLower)) ||
          getStatusText(room.status).toLowerCase().includes(searchLower)
        );
      }

      // กรองตามสถานะห้อง
      let matchStatus = true;
      if (filterStatus !== 'all') {
        matchStatus = room.status === filterStatus;
      }

      return matchSearch && matchStatus;
    });

    return filteredRooms.reduce((groups, room) => {
      const floor = room.floorCode;
      if (!groups[floor]) {
        groups[floor] = {
          name: room.floor,
          rooms: []
        };
      }
      groups[floor].rooms.push(room);
      return groups;
    }, {});
  };

  // ฟังก์ชันคำนวณสถิติแต่ละชั้น
  const getFloorStats = (rooms) => {
    return {
      totalRooms: rooms.length,
      occupiedRooms: rooms.filter(room => room.status === 'active').length,
      vacantRooms: rooms.filter(room => room.status === 'vacant').length,
      totalWaterUsage: rooms.reduce((sum, room) => sum + room.waterUsage, 0),
      totalElectricUsage: rooms.reduce((sum, room) => sum + room.electricUsage, 0)
    };
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'vacant': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'active': return 'มีผู้เช่า';
      case 'vacant': return 'ว่าง';
      default: return 'ไม่ทราบ';
    }
  };

  // ฟังก์ชันล้างตัวกรองทั้งหมด
  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
  };

  // นับจำนวนตัวกรองที่ใช้งาน
  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm) count++;
    if (filterStatus !== 'all') count++;
    return count;
  };

  // ตรวจสอบ dormId
  if (!dormId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <FaExclamationTriangle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">ไม่พบข้อมูลหอพัก</h2>
          <p className="text-gray-600 mb-4">กรุณาเลือกหอพักที่ต้องการดูข้อมูลมิเตอร์</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md"
          >
            กลับไปหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">กำลังโหลดข้อมูลห้องและมิเตอร์...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex items-center gap-2">
              <FaExclamationTriangle className="w-5 h-5 text-red-600" />
              <p className="text-red-800">{error}</p>
              <button 
                onClick={fetchRoomsAndMeters}
                className="ml-auto bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
              >
                ลองใหม่
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && (
          <>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-gray-700 flex items-center gap-2">
                  <FaEye className="text-gray-700 text-3xl" />
                  ดูมิเตอร์น้ำประปาและไฟฟ้า
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  อัปเดตล่าสุด: {formatThaiDate(lastUpdate.toISOString().split('T')[0])} {lastUpdate.toLocaleTimeString('th-TH')} น.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1">
                    <FaCheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">
                      มิเตอร์ดิจิตอล: {allRooms.filter(room => room.hasDigitalMeter).length} ห้อง
                    </span>
                  </div>
                  {allRooms.filter(room => room.hasDigitalMeter).length > 0 && (
                    <>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-500">อัปเดตแบบเรียลไทม์ทุก 5 วินาที</span>
                    </>
                  )}
                </div>
              </div>
              <button 
                onClick={handleRefresh}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors shadow-sm"
              >
                <FaSync className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? 'กำลังอัปเดต...' : 'อัปเดตทันที'}
              </button>
            </div>

            {/* Digital Meter Status Alert */}
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <FaExclamationTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-800 mb-1">ข้อมูลมิเตอร์</h3>
                  <p className="text-sm text-blue-700">
                    ห้องที่ติดตั้งมิเตอร์ดิจิตอลแล้วจะแสดงค่าการใช้งานแบบเรียลไทม์ 
                    ส่วนห้องที่ยังไม่ติดตั้งจะแสดงเป็น "ยังไม่ติดตั้งมิเตอร์"
                  </p>
                  <button 
                    onClick={() => navigate(`/add-meter-digital/${dormId}`)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    → ไปหน้าจัดการมิเตอร์ดิจิตอล
                  </button>
                </div>
              </div>
            </div>



            {/* Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white p-4 rounded-md shadow-sm border border-gray-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">มิเตอร์ดิจิตอล</p>
                    <p className="text-2xl font-semibold text-blue-600">
                      {allRooms.filter(room => room.hasDigitalMeter).length}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-md">
                    <FaCheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-md shadow-sm border border-gray-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">ห้องที่มีผู้เช่า</p>
                    <p className="text-2xl font-semibold text-green-600">
                      {allRooms.filter(room => room.status === 'active').length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-md">
                    <FaHome className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-md shadow-sm border border-gray-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">ห้องว่าง</p>
                    <p className="text-2xl font-semibold text-gray-600">
                      {allRooms.filter(room => room.status === 'vacant').length}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-md">
                    <FaHome className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-md shadow-sm border border-gray-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">ห้องทั้งหมด</p>
                    <p className="text-2xl font-semibold text-purple-600">
                      {allRooms.length}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-md">
                    <FaHome className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
            {/* Search Bar and Filters */}
            <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4 mb-4">         
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหา</label>
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="เลขห้อง, ชื่อผู้เช่า..."
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">สถานะห้อง</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full h-11  border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="all">ทั้งหมด</option>
                    <option value="active">มีผู้เช่า</option>
                    <option value="vacant">ห้องว่าง</option>
                  </select>
                </div>

                {/* Reset Button */}
                <div className="flex justify-end items-end">
                  <button
                    onClick={() => {
                      if (getActiveFiltersCount() > 0) {
                        clearAllFilters(); // reset filters only when needed
                      }
                    }}
                    className="h-11 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-md transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <FaUndo className="w-4 h-4" />
                    รีเซ็ต
                  </button>
                </div>
              </div>
            </div>

        {/* Meter Cards - Grouped by Floor (Digital Meter Only) */}
        <div className="space-y-4">
          {allRooms.length === 0 ? (
            <div className="bg-white rounded-md shadow p-8 text-center">
              <div className="text-gray-500">
                <FaExclamationTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-medium mb-2">ยังไม่มีมิเตอร์ดิจิตอล</h3>
                <p className="text-gray-600 mb-4">
                  ต้องติดตั้งมิเตอร์ดิจิตอลก่อนจึงจะสามารถดูข้อมูลแบบเรียลไทม์ได้
                </p>
                <button 
                  onClick={() => navigate(`/add-meter-digital/${dormId}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md flex items-center gap-2 mx-auto transition-colors"
                >
                  <FaPlus className="w-4 h-4" />
                  ติดตั้งมิเตอร์ดิจิตอล
                </button>
              </div>
            </div>
          ) : Object.keys(groupRoomsByFloor()).length === 0 ? (
            <div className="bg-white rounded-md shadow p-6 text-center ">
              <div className="text-gray-500">
                <FaSearch className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">ไม่พบผลการค้นหา</p>
                <p className="text-sm">ลองเปลี่ยนคำค้นหาหรือปรับตัวกรองเพื่อดูห้องที่ต้องการ</p>
              </div>
            </div>
          ) : (
            Object.entries(groupRoomsByFloor()).map(([floorCode, floorData]) => {
              const stats = getFloorStats(floorData.rooms);
              
              return (
                <div key={floorCode} className="bg-white rounded-md shadow border border-gray-300 overflow-hidden">
                  {/* Floor Header - Enhanced Style */}
                  <div className="flex items-center justify-between  pb-3 px-4 pt-4 border-b border-gray-300">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-semibold text-gray-800">{floorData.name}</h2>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">มิเตอร์ดิจิตอล</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      {floorData.rooms.filter(room => room.hasDigitalMeter).length}/{stats.totalRooms} ห้อง มีมิเตอร์ดิจิตอล
                    </div>
                  </div>

                  {/* Room Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 p-4">
                    {floorData.rooms.map((room) => (
                      <div key={room.id} className="border border-gray-200 rounded-md p-4 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50">
                        {/* Room Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-800">ห้อง {room.roomNumber}</h3>
                            {room.hasDigitalMeter && (
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="มิเตอร์ดิจิตอล"></div>
                            )}
                          </div>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(room.status)}`}>
                            {getStatusText(room.status)}
                          </span>
                        </div>

                        {/* Tenant Info */}
                        <div className="mb-3">
                          {room.tenant !== '-' ? (
                            <p className="text-xs text-center  text-gray-600">{room.tenant}</p>
                          ) : (
                            <p className="text-xs text-gray-500 text-center italic">ไม่มีผู้เช่า</p>
                          )}
                        </div>

                        {/* Digital Meter Info */}
                        {room.hasDigitalMeter && (
                          <div className="mb-3 p-2 bg-green-50 rounded-md border border-green-200">
                            <div className="flex items-center gap-1 justify-center">
                              <FaCheckCircle className="w-3 h-3 text-green-600" />
                              <span className="text-xs text-green-700 font-medium">มิเตอร์ดิจิตอล</span>
                            </div>
                          </div>
                        )}

                        {!room.hasDigitalMeter && (
                          <div className="mb-3 p-2 bg-gray-50 rounded-md border border-gray-200">
                            <div className="flex items-center gap-1 justify-center">
                              <FaExclamationTriangle className="w-3 h-3 text-gray-500" />
                              <span className="text-xs text-gray-500">ยังไม่ติดตั้งมิเตอร์</span>
                            </div>
                          </div>
                        )}

                          {/* Meter Readings - Enhanced Layout */}
                          <div className="space-y-2">
                            {/* Water Meter */}
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md border border-blue-100 min-h-[60px]">
                              <div className="flex items-center gap-2">
                                <FaTint className="text-blue-600 w-4 h-4" />
                                <span className="text-sm font-medium text-gray-700">น้ำ</span>
                              </div>
                              <div className="text-right min-w-[80px]">
                                {room.hasWaterMeter ? (
                                  <>
                                    <div className="text-sm font-semibold text-blue-800">
                                      {room.waterMeter.toFixed(2)} หน่วย
                                    </div>
                                    <div className="text-xs text-blue-600">ใช้ไป: {room.waterUsage.toFixed(2)} หน่วย</div>
                                  </>
                                ) : (
                                  <div className="text-sm text-gray-500">ยังไม่ติดตั้ง</div>
                                )}
                              </div>
                            </div>

                            {/* Electric Meter */}
                            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-md border border-yellow-100 min-h-[60px]">
                              <div className="flex items-center gap-2">
                                <FaBolt className="text-yellow-600 w-4 h-4" />
                                <span className="text-sm font-medium text-gray-700">ไฟฟ้า</span>
                              </div>
                              <div className="text-right min-w-[80px]">
                                {room.hasElectricMeter ? (
                                  <>
                                    <div className="text-sm font-semibold text-yellow-800">
                                      {room.electricMeter.toFixed(2)} หน่วย
                                    </div>
                                    <div className="text-xs text-yellow-600">ใช้ไป: {room.electricUsage.toFixed(2)} หน่วย</div>
                                  </>
                                ) : (
                                  <div className="text-sm text-gray-500">ยังไม่ติดตั้ง</div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <button
                              onClick={() => handleViewRoom(room.id)}
                              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-md transition-colors flex items-center justify-center gap-2 text-sm"
                            >
                              <FaEye className="w-4 h-4" />
                              ดูรายละเอียด
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-white rounded-md shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">การดำเนินการเพิ่มเติม</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button 
                onClick={() => navigate(`/add-meter-digital/${dormId}`)}
                className="p-4 bg-purple-50 hover:bg-purple-100 rounded-md border border-purple-200 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <FaPlus className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-purple-800">จัดการมิเตอร์ดิจิตอล</p>
                    <p className="text-sm text-purple-600">ติดตั้งมิเตอร์ใหม่</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => navigate(`/meter-reading/${dormId}`)}
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <FaCalendarAlt className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-800">รายการจดมิเตอร์</p>
                    <p className="text-sm text-blue-600">ดูประวัติการจดมิเตอร์</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => navigate(`/create-meter-reading/${dormId}`)}
                className="p-4 bg-green-50 hover:bg-green-100 rounded-md border border-green-200 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <FaSync className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">สร้างใบจดมิเตอร์</p>
                    <p className="text-sm text-green-600">จดค่ามิเตอร์รายเดือน</p>
                  </div>
                </div>
              </button>

              <button 
                onClick={() => navigate(`/dashboard/${dormId}`)}
                className="p-4 bg-orange-50 hover:bg-orange-100 rounded-md border border-orange-200 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <FaEye className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-800">Dashboard</p>
                    <p className="text-sm text-orange-600">มุมมองภาพรวม</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Auto-refresh indicator */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              {allRooms.filter(room => room.hasDigitalMeter).length > 0 ? 
                'อัปเดตอัตโนมัติทุก 5 วินาทีจากมิเตอร์ดิจิตอล' : 
                'ไม่มีมิเตอร์ดิจิตอลที่ใช้งาน'
              }
            </p>
            <p className="text-xs text-gray-400 mt-1">
              ข้อมูลที่แสดงมาจากฐานข้อมูลจริง - ห้องที่ไม่มีมิเตอร์ดิจิตอลจะแสดง "ยังไม่ติดตั้ง"
            </p>
          </div>
        </>
        )}
      </div>
    </div>
  );
}export default RealTimeMeter;
