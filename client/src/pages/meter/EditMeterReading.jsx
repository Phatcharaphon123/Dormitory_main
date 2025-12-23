import { FaArrowLeft, FaSave, FaTimes, FaUser, FaBars, FaTint, FaBolt, FaDownload, FaCalendarAlt, FaChevronLeft, FaChevronRight, FaSync } from 'react-icons/fa';
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



function EditMeterReading() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('water'); // 'water' or 'electric'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const { dormId, recordId } = useParams();

    
const [formData, setFormData] = useState({
  readingDate: new Date().toISOString().split('T')[0],
  floors: []
});

  useEffect(() => {
    const fetchMeterRecord = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:3001/api/meter-records/dormitories/${dormId}/${recordId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log("✅ Meter record response:", res.data);

          const record_date = res.data.record_date; // มั่นใจว่าเป็น YYYY-MM-DD แล้วจาก backend

          setFormData({
            readingDate: record_date ?? new Date().toISOString().split('T')[0],
          floors: res.data.floors.map(floor => ({
            floorNumber: floor.floorNumber,
            rooms: floor.rooms.map(room => ({
              roomId: room.room_id,
              roomNumber: room.room_number,
              tenant: room.tenant,
              contractId: room.contract_id || null,
              waterPrevious: room.water_prev || 0,
              waterCurrent: room.water_curr?.toString() || '',
              electricPrevious: room.electric_prev || 0,
              electricCurrent: room.electric_curr?.toString() || '',
              hasDigitalMeter: room.hasDigitalMeter ?? true
            }))
          }))
        });

        setSelectedDate(record_date ?? new Date().toISOString().split('T')[0]);

      } catch (err) {
        console.error('❌ Error loading meter data:', err);
        const errorMessage = err.response?.data?.message || err.message || 'ไม่สามารถโหลดข้อมูลมิเตอร์ได้';
        toast.error(`เกิดข้อผิดพลาด: ${errorMessage}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        });
      }
    };

    fetchMeterRecord();
  }, [dormId, recordId]);


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
        readings.push({
          room_id: room.roomId,
          water_prev: room.waterPrevious,
          water_curr: parseInt(room.waterCurrent) || 0,
          electric_prev: room.electricPrevious,
          electric_curr: parseInt(room.electricCurrent) || 0
        });
      });
    });

    // Validate that we have readings data
    if (readings.length === 0) {
      toast.warning('ไม่พบข้อมูลห้องที่จะบันทึก', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    // Validate that all room_ids are valid
    const invalidRooms = readings.filter(r => !r.room_id);
    if (invalidRooms.length > 0) {
      toast.error('พบข้อมูลห้องที่ไม่ถูกต้อง', {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    console.log('📤 Sending data:', {
      meter_record_date: formData.readingDate,
      readings: readings
    });

    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:3001/api/meter-records/dormitories/${dormId}/${recordId}`, {
        meter_record_date: formData.readingDate,
        readings
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('บันทึกการแก้ไขใบจดมิเตอร์เรียบร้อยแล้ว', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      setTimeout(() => {
        navigate(-1);
      }, 1000);
    } catch (error) {
      console.error('❌ Error saving meter record:', error);
      const errorMessage = error.response?.data?.message || error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      toast.error(`เกิดข้อผิดพลาด: ${errorMessage}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    }
  };

  const calculateUsage = (current, previous) => {
    const curr = parseInt(current || 0);
    const prev = parseInt(previous || 0);
    return Math.max(0, curr - prev);
  };

  const handleDigitalMeterSync = () => {
    const updatedFloors = [...formData.floors];
    const fieldToUpdate = activeTab === 'water' ? 'waterCurrent' : 'electricCurrent';
    const previousField = activeTab === 'water' ? 'waterPrevious' : 'electricPrevious';
    
    // จำลองการดึงค่าจากมิเตอร์ดิจิตอล
    updatedFloors.forEach(floor => {
      floor.rooms.forEach(room => {
          // สร้างค่าจำลองที่สมจริง (เพิ่มขึ้นจากค่าเดิม 50-200 หน่วย)
          const randomIncrease = Math.floor(Math.random() * 151) + 50; // 50-200
          room[fieldToUpdate] = room[previousField] + randomIncrease;
      });
    });
    
    setFormData({ ...formData, floors: updatedFloors });
    toast.success(`ดึงค่ามิเตอร์${activeTab === 'water' ? 'น้ำ' : 'ไฟฟ้า'}ดิจิตอลเรียบร้อยแล้ว`);
  };

  // ฟังก์ชันย้อนกลับ
  const handleGoBack = () => {
    navigate(-1);
  };

  const handleSingleRoomDigitalMeterSync = (floorIndex, roomIndex) => {
  const updatedFloors = [...formData.floors];
  const fieldToUpdate = activeTab === 'water' ? 'waterCurrent' : 'electricCurrent';
  const previousField = activeTab === 'water' ? 'waterPrevious' : 'electricPrevious';

  const room = updatedFloors[floorIndex].rooms[roomIndex];

    const randomIncrease = Math.floor(Math.random() * 151) + 50;
    room[fieldToUpdate] = room[previousField] + randomIncrease;

  setFormData({ ...formData, floors: updatedFloors });
};

  const currentMonthYear = formatThaiMonthYear(formData.readingDate);
  const prevMonthDate = new Date(formData.readingDate);
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const previousMonthYear = formatThaiMonthYear(prevMonthDate);

  return (
    <div className="min-h-screen= bg-gray-100 p-6">
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
            <h1 className="text-2xl font-semibold text-gray-700">แก้ไขใบจดมิเตอร์</h1>
          </div>
          <div className="flex items-center space-x-2">
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md flex items-center space-x-2 transition-colors shadow-sm text-lg"
          >
            <FaSave className="w-5 h-5" />
            <span>บันทึกการแก้ไข</span>
          </button>
          </div>
        </div>

        {/* Date Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-1">
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
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 p-4 w-80">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => navigateMonth(-1)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <FaChevronLeft className="text-gray-600" />
                    </button>
                    <h3 className="font-semibold text-gray-700">
                      {thaiMonths[calendarDate.getMonth()]} {calendarDate.getFullYear() + 543}
                    </h3>
                    <button
                      onClick={() => navigateMonth(1)}
                      className="p-1 hover:bg-gray-100 rounded"
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
                        className={`p-2 text-sm rounded hover:bg-blue-100 transition-colors ${
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
          <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex">
             <button
                onClick={() => setActiveTab('water')}
                className={`w-50 px-4 py-3 text-sm font-medium rounded-l-lg border-2 transition-colors ${
                  activeTab === 'water'
                    ? 'bg-cyan-500 text-white border-cyan-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <FaTint className="inline mr-2" />
                  แก้ไขมิเตอร์น้ำ
                </div>

              </button>

              <button
                onClick={() => setActiveTab('electric')}
                className={`w-50 px-4 py-3 text-sm font-medium rounded-r-lg border-2 border-l-0 transition-colors ${
                  activeTab === 'electric'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center">
                  <FaBolt className="inline mr-2" />
                  แก้ไขมิเตอร์ไฟฟ้า
                </div>
              </button>

            </div>
            
            {/* Digital Meter Sync Button */}
            <button
              onClick={handleDigitalMeterSync}
              className={`px-4 py-3 text-sm font-medium rounded-lg border-2 transition-colors shadow-sm ${
                activeTab === 'water'
                  ? 'bg-cyan-100 text-cyan-700 border-cyan-300 hover:bg-cyan-200'
                  : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'
              }`}
            >
              <div className="flex items-center justify-center">
                <FaSync className="inline mr-2" />
                ดึงค่ามิเตอร์{activeTab === 'water' ? 'น้ำ' : 'ไฟฟ้า'}ดิจิตอล
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        {formData.floors.map((floor, floorIndex) => (
          <div key={floorIndex} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">ชั้นที่ {floor.floorNumber}</h2>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 w-16">
                      ห้อง
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 w-20">
                      สถานะ ห้อง
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 w-24">
                      ดูผู้เช่า
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                      {activeTab === 'water' 
                        ? `เลขมิเตอร์น้ำเดิม (${previousMonthYear})` 
                        : `เลขมิเตอร์ไฟเดิม (${previousMonthYear})`}
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700">
                      {activeTab === 'water' 
                        ? `เลขมิเตอร์น้ำปัจจุบัน (${currentMonthYear})` 
                        : `เลขมิเตอร์ไฟปัจจุบัน (${currentMonthYear})`}
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 w-20">
                      หน่วยที่ใช้
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium text-gray-700 w-24">
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
                        <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                          {room.roomNumber}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {room.tenant === 'มีผู้เช่า' ? (
                            <FaUser className="inline text-blue-600" />
                          ) : (
                            <div className="w-4 h-4 bg-gray-400 rounded-full inline-block"></div>
                          )}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {room.tenant === 'มีผู้เช่า' ? (
                            <FaBars
                              className="inline text-blue-600 cursor-pointer hover:text-blue-800"
                              title="ดูข้อมูลผู้เช่า"
                              onClick={() => navigate(`/dorm/${dormId}/contracts/${room.contractId}/detail`)}
                            />
                          ) : (
                            <FaBars className="inline text-gray-400" />
                          )}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          <div className="flex items-center justify-center">
                            {activeTab === 'water' && <FaTint className="text-blue-500 mr-1" />}
                            {activeTab === 'electric' && <FaBolt className="text-yellow-500 mr-1" />}
                            {previousValue.toLocaleString()}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className={`flex items-center justify-center py-2 rounded ${
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
                        <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                          {calculateUsage(currentValue, previousValue)}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-center">
                          {room.hasDigitalMeter && (
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
            <span>บันทึกการแก้ไข</span>
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default EditMeterReading;
