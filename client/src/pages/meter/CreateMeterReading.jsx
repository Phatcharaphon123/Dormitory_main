import { FaArrowLeft, FaSave, FaTimes, FaUser, FaBars, FaTint, FaBolt, FaDownload, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaSync } from 'react-icons/fa';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// ฟังก์ชันแปลงวันที่เป็นรูปแบบไทย
const formatThaiDate = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
  return `${day}-${month}-${year}`;
};



function CreateMeterReading() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('water'); // 'water' or 'electric'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isLoadingMeter, setIsLoadingMeter] = useState(false);
  const { dormId } = useParams();
  
const [formData, setFormData] = useState({
  readingDate: new Date().toISOString().split('T')[0],
  floors: []
});

useEffect(() => {
  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // ดึงข้อมูลห้องและมิเตอร์
      const res = await axios.get(`http://localhost:3001/api/meter-records/dormitories/${dormId}/rooms-with-meter`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data;

      // ดึงข้อมูลมิเตอร์เพิ่มเติมสำหรับ InfluxDB
      const metersResponse = await axios.get(`http://localhost:3001/api/meters/dormitories/${dormId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const metersData = metersResponse.data;

      const updatedFloors = data.floors.map(floor => ({
        floorNumber: floor.floorNumber,
        rooms: floor.rooms.map(room => {
          // หาข้อมูลมิเตอร์จาก metersData
          let waterMeterCode = '';
          let electricMeterCode = '';
          let hasWaterMeter = false;
          let hasElectricMeter = false;

          // ค้นหาข้อมูลมิเตอร์จาก metersData
          Object.keys(metersData).forEach(floorKey => {
            const roomMeter = metersData[floorKey].find(r => r.roomNumber === room.room_number);
            if (roomMeter) {
              hasWaterMeter = roomMeter.meters?.water?.installed || false;
              hasElectricMeter = roomMeter.meters?.electric?.installed || false;
              waterMeterCode = roomMeter.meters?.water?.code || '';
              electricMeterCode = roomMeter.meters?.electric?.code || '';
            }
          });

          return {
            roomId: room.room_id,
            roomNumber: room.room_number,
            tenant: room.tenant,
            contractId: room.contract_id,
            waterPrevious: room.water_prev,
            waterCurrent: '',
            electricPrevious: room.electric_prev,
            electricCurrent: '',
            hasDigitalMeter: room.hasDigitalMeter,
            // เพิ่มข้อมูลมิเตอร์สำหรับ InfluxDB
            hasWaterMeter,
            hasElectricMeter,
            waterMeterCode,
            electricMeterCode
          };
        })
      }));

      setFormData({
        readingDate: new Date().toISOString().split('T')[0],
        floors: updatedFloors
      });

      // ดึงค่ามิเตอร์เริ่มต้นจาก InfluxDB ทั้งน้ำและไฟฟ้า
      await fetchInitialMeterReadings(updatedFloors);

    } catch (err) {
      console.error('❌ Error loading meter data:', err);
      toast.error('ไม่สามารถโหลดข้อมูลมิเตอร์ล่าสุดได้', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    }
  };

  fetchData();
}, [dormId]);

// ฟังก์ชันดึงค่ามิเตอร์เริ่มต้นจาก InfluxDB
const fetchInitialMeterReadings = async (floors) => {
  try {
    const token = localStorage.getItem('token');
    let updatedFloors = [...floors];
    let totalRooms = 0;
    let successCount = 0;

    // นับจำนวนห้องที่มีมิเตอร์ดิจิตอล
    floors.forEach(floor => {
      floor.rooms.forEach(room => {
        if (room.hasWaterMeter || room.hasElectricMeter) {
          totalRooms++;
        }
      });
    });

    if (totalRooms === 0) {
      console.log('No digital meters found');
      return;
    }

    console.log(`🔄 กำลังดึงค่ามิเตอร์เริ่มต้นจาก ${totalRooms} ห้อง...`);

    // ดึงข้อมูลจาก InfluxDB สำหรับแต่ละห้องที่มีมิเตอร์ดิจิตอล
    for (let floorIndex = 0; floorIndex < updatedFloors.length; floorIndex++) {
      const floor = updatedFloors[floorIndex];
      
      for (let roomIndex = 0; roomIndex < floor.rooms.length; roomIndex++) {
        const room = floor.rooms[roomIndex];
        
        if (room.hasWaterMeter || room.hasElectricMeter) {
          try {
            // ดึงข้อมูลมิเตอร์น้ำ
            if (room.hasWaterMeter && room.waterMeterCode) {
              try {
                const waterResponse = await axios.post('http://localhost:3001/api/influx/latest-data', {
                  measurement: room.waterMeterCode
                }, {
                  headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (waterResponse.data && waterResponse.data.data && waterResponse.data.data.water !== undefined) {
                  room.waterCurrent = Math.round(waterResponse.data.data.water * 100) / 100;
                  console.log(`💧 ห้อง ${room.roomNumber}: น้ำ = ${room.waterCurrent}`);
                }
              } catch (waterError) {
                console.warn(`Could not fetch water meter for room ${room.roomNumber}:`, waterError.message);
              }
            }

            // ดึงข้อมูลมิเตอร์ไฟฟ้า
            if (room.hasElectricMeter && room.electricMeterCode) {
              try {
                const electricResponse = await axios.post('http://localhost:3001/api/influx/latest-data', {
                  measurement: room.electricMeterCode
                }, {
                  headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (electricResponse.data && electricResponse.data.data && electricResponse.data.data.power !== undefined) {
                  room.electricCurrent = Math.round(electricResponse.data.data.power * 100) / 100;
                  console.log(`⚡ ห้อง ${room.roomNumber}: ไฟฟ้า = ${room.electricCurrent}`);
                }
              } catch (electricError) {
                console.warn(`Could not fetch electric meter for room ${room.roomNumber}:`, electricError.message);
              }
            }

            if (room.waterCurrent || room.electricCurrent) {
              successCount++;
            }
          } catch (roomError) {
            console.warn(`Error processing room ${room.roomNumber}:`, roomError.message);
          }
        }
      }
    }
    
    // อัปเดต formData
    setFormData(prev => ({
      ...prev,
      floors: updatedFloors
    }));
    
    if (successCount > 0) {
      console.log(`ดึงค่ามิเตอร์เริ่มต้นสำเร็จ ${successCount}/${totalRooms} ห้อง`);
    }
  } catch (error) {
    console.error('Error fetching initial meter readings:', error);
  }
};
  const formatDateThai = (dateString) => {
    const date = new Date(dateString);
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543; // Convert to Buddhist Era
    
    return `${day} ${month} ${year}`;
  };

  const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];


  const formatThaiMonthYear = (dateString) => {
  const date = new Date(dateString);
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543;
  return `${month} ${year}`;
  };


  const generateCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      days.push(currentDate);
    }
    
    return days;
  };

  const handleDateSelect = (date) => {
    const dateString = date.toLocaleDateString('sv-SE');
    console.log('🗓️ Clicked date:', dateString); // ตรวจตรงนี้!
    setSelectedDate(dateString);
    setFormData({ ...formData, readingDate: dateString });
    setShowCalendar(false);
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(calendarDate.getMonth() + direction);
    setCalendarDate(newDate);
  };

  const generateDateOptions = () => {
    const currentDate = new Date();
    const options = [];
    
    // สร้างตัวเลือกวันที่ 30 วันก่อนหน้าถึง 30 วันข้างหน้า
    for (let i = -30; i <= 30; i++) {
      const date = new Date(currentDate);
      date.setDate(currentDate.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const thaiDate = formatDateThai(dateString);
      options.push({ value: dateString, label: thaiDate });
    }
    
    return options;
  };

  const handleInputChange = (floorIndex, roomIndex, field, value) => {
    const updatedFloors = [...formData.floors];
    const room = updatedFloors[floorIndex].rooms[roomIndex];
    
    // ตรวจสอบว่าค่าที่กรอกไม่ต่ำกว่าเลขมิเตอร์เดิม
    const previousField = field === 'waterCurrent' ? 'waterPrevious' : 'electricPrevious';
    const previousValue = room[previousField];
    const numericValue = parseInt(value) || 0;
    
    if (value && numericValue < previousValue) {
      toast.warning(`เลขมิเตอร์ปัจจุบันต้องมากกว่าหรือเท่ากับเลขมิเตอร์เดิม (${previousValue.toLocaleString()})`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      return;
    }
    
    updatedFloors[floorIndex].rooms[roomIndex][field] = value;
    setFormData({ ...formData, floors: updatedFloors });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const readings = [];

    formData.floors.forEach(floor => {
      floor.rooms.forEach(room => {
        const waterPrev = room.waterPrevious;
        const electricPrev = room.electricPrevious;
        const waterCurr = room.waterCurrent ? parseInt(room.waterCurrent) : null;
        const electricCurr = room.electricCurrent ? parseInt(room.electricCurrent) : null;

        // ตรวจสอบข้อมูลน้ำ
        if (waterCurr !== null && !isNaN(waterCurr) && waterCurr >= 0 && room.roomId) {
          readings.push({
            room_id: room.roomId,
            type: 'water',
            curr_value: waterCurr,
            prev_value: waterPrev || 0
          });
        }

        // ตรวจสอบข้อมูลไฟฟ้า
        if (electricCurr !== null && !isNaN(electricCurr) && electricCurr >= 0 && room.roomId) {
          readings.push({
            room_id: room.roomId,
            type: 'electric',
            curr_value: electricCurr,
            prev_value: electricPrev || 0
          });
        }
      });
    });

    if (readings.length === 0) {
      toast.warning('กรุณากรอกข้อมูลมิเตอร์น้ำหรือไฟให้ครบและถูกต้อง', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      return;
    }

    console.log('📤 ส่งข้อมูลรวม:', {
      readings,
      recordDate: formData.readingDate
    });

    // Debug: แสดงรายละเอียดข้อมูลที่ส่ง
    console.log('🔍 รายละเอียดข้อมูลที่ส่ง:');
    readings.forEach((reading, index) => {
      console.log(`${index + 1}. Room ID: ${reading.room_id}, Type: ${reading.type}, Current: ${reading.curr_value}, Previous: ${reading.prev_value}`);
    });

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`http://localhost:3001/api/meter-records/dormitories/${dormId}`, {
        readings,
        recordDate: formData.readingDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('บันทึกข้อมูลมิเตอร์น้ำและไฟฟ้าเรียบร้อยแล้ว', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      setTimeout(() => {
        navigate(`/meter-reading/${dormId}`);
      }, 1000);
    } catch (err) {
      console.error('❌ Submit Error:', err);
      if (err.response?.status === 400 && err.response.data?.message) {
        toast.error(`⚠️ ${err.response.data.message}`, {
          position: "top-right",
          autoClose: 7000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        });
      } else {
        toast.error('❌ เกิดข้อผิดพลาดในการบันทึก', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        });
      }
    }
  };




  const calculateUsage = (current, previous) => {
    const curr = parseInt(current);
    const prev = parseInt(previous);

    if (isNaN(curr) || isNaN(prev)) return 0;
    return Math.max(0, curr - prev);
  };

const handleDigitalMeterSync = async () => {
  setIsLoadingMeter(true);
  try {
    const token = localStorage.getItem('token');
    const updatedFloors = [...formData.floors];
    let successCount = 0;
    let totalAttempts = 0;

    // ดึงข้อมูลจาก InfluxDB สำหรับแต่ละห้องที่มีมิเตอร์ดิจิตอลประเภทที่เลือก
    for (let floorIndex = 0; floorIndex < updatedFloors.length; floorIndex++) {
      const floor = updatedFloors[floorIndex];
      
      for (let roomIndex = 0; roomIndex < floor.rooms.length; roomIndex++) {
        const room = floor.rooms[roomIndex];
        
        // ตรวจสอบว่าห้องมีมิเตอร์ประเภทที่เลือกหรือไม่
        const hasCurrentMeterType = activeTab === 'water' ? room.hasWaterMeter : room.hasElectricMeter;
        
        if (hasCurrentMeterType) {
          totalAttempts++;
          
          try {
            // เลือกรหัสมิเตอร์ตามประเภทที่เลือก
            const meterCode = activeTab === 'water' ? room.waterMeterCode : room.electricMeterCode;
            
            if (!meterCode) {
              console.warn(`Room ${room.roomNumber} doesn't have ${activeTab} meter code`);
              continue;
            }
            
            // ดึงข้อมูลล่าสุดจาก InfluxDB
            const response = await axios.post('http://localhost:3001/api/influx/latest-data', {
              measurement: meterCode
            }, {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.data && response.data.data) {
              const fieldToUpdate = activeTab === 'water' ? 'waterCurrent' : 'electricCurrent';
              const meterValue = activeTab === 'water' ? response.data.data.water : response.data.data.power;
              
              if (meterValue !== undefined && meterValue !== null) {
                room[fieldToUpdate] = Math.round(meterValue * 100) / 100; // ปัดเศษ 2 ตำแหน่ง
                successCount++;
              }
            }
          } catch (roomError) {
            console.warn(`Could not fetch InfluxDB data for room ${room.roomNumber}:`, roomError.message);
          }
        }
      }
    }
    
    setFormData({ ...formData, floors: updatedFloors });
    
    if (successCount > 0) {
      toast.success(`✅ ดึงค่ามิเตอร์${activeTab === 'water' ? 'น้ำ' : 'ไฟฟ้า'}จากระบบสำเร็จ ${successCount}/${totalAttempts} ห้อง`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    } else {
      toast.warning(`⚠️ ไม่สามารถดึงข้อมูลมิเตอร์${activeTab === 'water' ? 'น้ำ' : 'ไฟฟ้า'}ได้ กรุณาลองใหม่อีกครั้ง`, {
        position: "top-right",
        autoClose: 6000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    }
  } catch (error) {
    console.error('Error syncing digital meters:', error);
    toast.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลมิเตอร์ดิจิตอล', {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
    });
  } finally {
    setIsLoadingMeter(false);
  }
};

  // ฟังก์ชันย้อนกลับ
  const handleGoBack = () => {
    navigate(-1);
  };

  const handleSingleRoomDigitalMeterSync = async (floorIndex, roomIndex) => {
    try {
      const token = localStorage.getItem('token');
      const updatedFloors = [...formData.floors];
      const room = updatedFloors[floorIndex].rooms[roomIndex];

      // ตรวจสอบว่าห้องมีมิเตอร์ประเภทที่เลือกหรือไม่
      const hasCurrentMeterType = activeTab === 'water' ? room.hasWaterMeter : room.hasElectricMeter;
      
      if (hasCurrentMeterType) {
        // เลือกรหัสมิเตอร์ตามประเภทที่เลือก
        const meterCode = activeTab === 'water' ? room.waterMeterCode : room.electricMeterCode;
        
        if (!meterCode) {
          toast.warning(`ห้อง ${room.roomNumber} ไม่มีรหัสมิเตอร์${activeTab === 'water' ? 'น้ำ' : 'ไฟฟ้า'}`, {
            position: "top-right",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
          });
          return;
        }
        
        // ดึงข้อมูลล่าสุดจาก InfluxDB
        const response = await axios.post('http://localhost:3001/api/influx/latest-data', {
          measurement: meterCode
        }, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.data && response.data.data) {
          const fieldToUpdate = activeTab === 'water' ? 'waterCurrent' : 'electricCurrent';
          const meterValue = activeTab === 'water' ? response.data.data.water : response.data.data.power;
          
          if (meterValue !== undefined && meterValue !== null) {
            room[fieldToUpdate] = Math.round(meterValue * 100) / 100; // ปัดเศษ 2 ตำแหน่ง
            setFormData({ ...formData, floors: updatedFloors });
            toast.success(`✅ ดึงค่ามิเตอร์${activeTab === 'water' ? 'น้ำ' : 'ไฟฟ้า'}ห้อง ${room.roomNumber} สำเร็จ: ${meterValue.toFixed(2)}`, {
              position: "top-right",
              autoClose: 4000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
            });
          } else {
            toast.warning(`⚠️ ไม่พบข้อมูลมิเตอร์${activeTab === 'water' ? 'น้ำ' : 'ไฟฟ้า'}สำหรับห้อง ${room.roomNumber}`, {
              position: "top-right",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
            });
          }
        } else {
          toast.warning(`⚠️ ไม่สามารถดึงข้อมูลมิเตอร์ห้อง ${room.roomNumber} ได้`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
          });
        }
      } else {
        toast.info(`ห้อง ${room.roomNumber} ไม่มีมิเตอร์${activeTab === 'water' ? 'น้ำ' : 'ไฟฟ้า'}ดิจิตอล`, {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        });
      }
    } catch (error) {
      console.error(`Error syncing meter for room ${room.roomNumber}:`, error);
      toast.error(`❌ เกิดข้อผิดพลาดในการดึงข้อมูลมิเตอร์ห้อง ${room.roomNumber}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    }
  };

  const currentMonthYear = formatThaiMonthYear(formData.readingDate);
  const prevMonthDate = new Date(formData.readingDate);
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const previousMonthYear = formatThaiMonthYear(prevMonthDate);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleGoBack}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors border border-gray-200"
            >
              <FaArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-semibold text-gray-700">จดมิเตอร์</h1>
          </div>
          <div className="flex items-center space-x-2">
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md flex items-center space-x-2 transition-colors shadow-sm text-lg"
          >
            <FaSave className="w-5 h-5" />
            <span>บันทึกข้อมูลมิเตอร์</span>
          </button>
          </div>
        </div>

        {/* Date Selector */}
        <div className="bg-white rounded-md shadow-sm border border-gray-300 p-6 mb-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4 relative">
              <label className="text-sm font-medium text-gray-700">วันที่จดมิเตอร์:</label>
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-center bg-white min-w-48 flex items-center justify-between hover:bg-gray-50"
              >
                <span>{formatThaiDate(selectedDate)}</span>
                <FaCalendarAlt className="ml-2 text-gray-500" />
              </button>

              {/* Custom Calendar */}
              {showCalendar && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-md shadow-lg z-50 p-4 w-80">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => navigateMonth(-1)}
                      className="p-1 hover:bg-gray-100 rounded-md"
                    >
                      <FaChevronLeft className="text-gray-600" />
                    </button>
                    <h3 className="font-semibold text-gray-700">
                      {thaiMonths[calendarDate.getMonth()]} {calendarDate.getFullYear() + 543}
                    </h3>
                    <button
                      onClick={() => navigateMonth(1)}
                      className="p-1 hover:bg-gray-100 rounded-md"
                    >
                      <FaChevronRight className="text-gray-600" />
                    </button>
                  </div>

                  {/* Days of Week */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {thaiDays.map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {generateCalendarDays().map((date, index) => {
                      const isCurrentMonth = date.getMonth() === calendarDate.getMonth();
                      const isSelected = date.toLocaleDateString('sv-SE') === selectedDate;
                      const isToday = date.toLocaleDateString('sv-SE') === new Date().toLocaleDateString('sv-SE');

                                            
                      return (
                        <button
                          key={index}
                          onClick={() => handleDateSelect(date)}
                          className={`p-2 text-sm rounded-md hover:bg-blue-100 transition-colors ${
                            isSelected
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : isToday
                              ? 'bg-blue-100 text-blue-600 font-semibold'
                              : isCurrentMonth
                              ? 'text-gray-700 hover:bg-gray-100'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>

                  {/* Close Button */}
                  <div className="mt-4 text-center">
                    <button
                      onClick={() => setShowCalendar(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4">
          <div className="flex items-center justify-between bg-white rounded-md shadow-sm border border-gray-300 p-4 mb-4">
            <div className="flex">
             <button
                onClick={() => setActiveTab('water')}
                className={`w-50 px-4 py-3 text-sm font-medium rounded-l-md border-2 transition-colors ${
                  activeTab === 'water'
                    ? 'bg-cyan-500 text-white border-cyan-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <FaTint className="inline mr-2" />
                  จดมิเตอร์น้ำ
                </div>

              </button>

              <button
                onClick={() => setActiveTab('electric')}
                className={`w-50 px-4 py-3 text-sm font-medium rounded-r-md border-2 border-l-0 transition-colors ${
                  activeTab === 'electric'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <FaBolt className="inline mr-2" />
                  จดมิเตอร์ไฟฟ้า
                </div>
              </button>

            </div>
            
            {/* Digital Meter Sync Button */}
            <button
              onClick={handleDigitalMeterSync}
              disabled={isLoadingMeter}
              className={`px-4 py-3 text-sm font-medium rounded-md border-2 transition-colors shadow-sm ${
                isLoadingMeter 
                  ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed'
                  : activeTab === 'water'
                    ? 'bg-cyan-100 text-cyan-700 border-cyan-300 hover:bg-cyan-200'
                    : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
              }`}
            >
              <div className="flex items-center justify-center">
                {isLoadingMeter ? (
                  <>
                    <AiOutlineLoading3Quarters className="animate-spin inline mr-2" />
                    กำลังดึงข้อมูล...
                  </>
                ) : (
                  <>
                    <FaSync className="inline mr-2" />
                    ดึงค่ามิเตอร์{activeTab === 'water' ? 'น้ำ' : 'ไฟฟ้า'}ดิจิตอล
                  </>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        {formData.floors.map((floor, floorIndex) => (
          <div key={floorIndex} className="bg-white rounded-md shadow-sm border border-gray-300 p-6 mb-4">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-700">ชั้นที่ {floor.floorNumber}</h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-md">
                จำนวน {floor.rooms.length} ห้อง
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-md border border-gray-300">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-r border-b border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 w-16 rounded-tl-md">
                      ห้อง
                    </th>
                    <th className="border-r border-b border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 w-20">
                      สถานะ ห้อง
                    </th>
                    <th className="border-r border-b border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 w-24">
                      ดูผู้เช่า
                    </th>
                    <th className="border-r border-b border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                      {activeTab === 'water' 
                        ? `เลขมิเตอร์น้ำเดิม (${previousMonthYear})` 
                        : `เลขมิเตอร์ไฟเดิม (${previousMonthYear})`}
                    </th>
                    <th className="border-r border-b border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                      {activeTab === 'water' 
                        ? `เลขมิเตอร์น้ำปัจจุบัน (${currentMonthYear})` 
                        : `เลขมิเตอร์ไฟปัจจุบัน (${currentMonthYear})`}
                    </th>
                    <th className="border-r border-b border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 w-20">
                      หน่วยที่ใช้
                    </th>
                    <th className="border-b border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 w-24 rounded-tr-md">
                      Digital Meter
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {floor.rooms.map((room, roomIndex) => {
                    const previousValue = activeTab === 'water' ? room.waterPrevious : room.electricPrevious;
                    const currentField = activeTab === 'water' ? 'waterCurrent' : 'electricCurrent';
                    const currentValue = room[currentField];
                    
                    return (
                      <tr key={roomIndex} className="hover:bg-gray-50">
                        <td className={`border-r border-b border-gray-300 px-3 py-2 text-center font-medium ${
                          roomIndex === floor.rooms.length - 1 ? 'rounded-bl-md border-b-0' : ''
                        }`}>
                          {room.roomNumber}
                        </td>
                        <td className={`border-r border-b border-gray-300 px-3 py-2 text-center ${
                          roomIndex === floor.rooms.length - 1 ? 'border-b-0' : ''
                        }`}>
                          {room.tenant === 'มีผู้เช่า' ? (
                            <FaUser className="inline text-blue-600" />
                          ) : (
                            <div className="w-4 h-4 bg-gray-400 rounded-full inline-block"></div>
                          )}
                        </td>
                        <td className={`border-r border-b border-gray-300 px-3 py-2 text-center ${
                          roomIndex === floor.rooms.length - 1 ? 'border-b-0' : ''
                        }`}>
                          {room.tenant === 'มีผู้เช่า' ? (
                            <FaBars
                              className="inline text-blue-600 cursor-pointer hover:text-blue-800"
                              title="ดูข้อมูลผู้เช่า"
                              onClick={() => navigate(`/dorm/${dormId}/contracts/${room.contractId}/detail`, {
                                state: { fromMeterReading: true }
                              })}
                            />
                          ) : (
                            <FaBars className="inline text-gray-400" />
                          )}
                        </td>
                        <td className={`border-r border-b border-gray-300 px-3 py-2 text-center ${
                          roomIndex === floor.rooms.length - 1 ? 'border-b-0' : ''
                        }`}>
                          <div className="flex items-center justify-center">
                            {activeTab === 'water' && <FaTint className="text-blue-500 mr-1" />}
                            {activeTab === 'electric' && <FaBolt className="text-yellow-500 mr-1" />}
                            {previousValue.toLocaleString()}
                          </div>
                        </td>
                        <td className={`border-r border-b border-gray-300 px-3 py-2 ${
                          roomIndex === floor.rooms.length - 1 ? 'border-b-0' : ''
                        }`}>
                          <div className={`flex items-center justify-center py-2 rounded-md ${
                            activeTab === 'water' ? 'bg-blue-100' : 'bg-pink-100'
                          }`}>
                            {activeTab === 'water' && <FaTint className="text-blue-500 mr-1" />}
                            {activeTab === 'electric' && <FaBolt className="text-yellow-500 mr-1" />}
                            <input
                              type="number"
                              value={currentValue}
                              onChange={(e) => handleInputChange(floorIndex, roomIndex, currentField, e.target.value)}
                              className={`w-20 px-2 py-1 text-center bg-transparent border-none focus:outline-none ${
                                currentValue && parseInt(currentValue) < previousValue 
                                  ? 'text-red-600 font-bold' 
                                  : ''
                              }`}
                              placeholder="0"
                              min={previousValue}
                              title={`ค่าต้องมากกว่าหรือเท่ากับ ${previousValue.toLocaleString()}`}
                            />
                          </div>
                          {currentValue && parseInt(currentValue) < previousValue && (
                            <div className="text-red-500 text-xs mt-1 text-center">
                              ต้อง ≥ {previousValue.toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className={`border-r border-b border-gray-300 px-3 py-2 text-center font-medium ${
                          roomIndex === floor.rooms.length - 1 ? 'border-b-0' : ''
                        }`}>
                          {calculateUsage(currentValue, previousValue)}
                        </td>
                        <td className={`border-b border-gray-300 px-3 py-2 text-center ${
                          roomIndex === floor.rooms.length - 1 ? 'rounded-br-md border-b-0' : ''
                        }`}>
                          {((activeTab === 'water' && room.hasWaterMeter) || 
                            (activeTab === 'electric' && room.hasElectricMeter)) && (
                            <FaDownload
                              className="inline text-gray-600 cursor-pointer hover:text-blue-600"
                              onClick={() => handleSingleRoomDigitalMeterSync(floorIndex, roomIndex)}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Save Button - Center */}
        <div className="flex justify-center mt-6">
          <button
            onClick={handleSubmit}
            className="px-8 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-md flex items-center space-x-2 transition-colors shadow-sm text-lg"
          >
            <FaSave className="w-5 h-5" />
            <span>บันทึกข้อมูลมิเตอร์</span>
          </button>
        </div>
      </div>
      
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{ 
          zIndex: 99999,
          position: 'fixed',
          top: '20px',
          right: '20px'
        }}
      />
    </div>
  );
}

export default CreateMeterReading;
