import React, { useState } from 'react';
import { FaArrowLeft, FaSave, FaTimes, FaPlus, FaExclamationTriangle , FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function CreateBillForm({ onBack, onBillCreated, existingBills = [] }) {
  const navigate = useNavigate();
  // Pagination for meter dates
  const [meterDatePage, setMeterDatePage] = useState(1);
  const meterDatesPerPage = 6;
  const [showCalendar, setShowCalendar] = useState(false);
  const [showMeterDateCalendar, setShowMeterDateCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [meterCalendarDate, setMeterCalendarDate] = useState(new Date());
  const [selectedFloors, setSelectedFloors] = useState([]); // เพิ่มการเลือกชั้น
  const { dormId } = useParams(); // ✅ ดึง dormId จาก URL
  const [meterReadingDates, setMeterReadingDates] = useState([]);
  const [loadingMeterDates, setLoadingMeterDates] = useState(true);
  const [selectedMeterRecordId, setSelectedMeterRecordId] = useState(null);

  useEffect(() => {
    setMeterDatePage(1); // reset page when dormId changes
    const fetchMeterDates = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/api/bills/dormitories/${dormId}/meter-records`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });

        const formatted = response.data.map((record) => ({
          id: record.meter_record_id,
          date: record.meter_record_date.slice(0, 10)
        }));
        setMeterReadingDates(formatted); // ✅ เก็บทั้ง id กับ date

        // Set default meterReadingDate to the latest date และเลือกอัตโนมัติ
        if (formatted.length > 0) {
          // Find the latest date (assuming sorted descending is not guaranteed)
          const latest = formatted.reduce((a, b) => (a.date > b.date ? a : b));
          setFormData(prev => ({ ...prev, meterReadingDate: latest.date }));
          setSelectedMeterRecordId(latest.id); // ✅ ตั้งค่า selectedMeterRecordId ด้วย
          // Also fetch room data for the latest date
          await getMeterReadingData(latest.id);
          console.log('🔄 เลือกวันที่จดมิเตอร์ล่าสุดอัตโนมัติ:', latest.date, 'ID:', latest.id);
        }
      } catch (error) {
        console.error('ไม่สามารถดึงข้อมูลรอบจดมิเตอร์:', error);
      } finally {
        setLoadingMeterDates(false);
      }
    };

    fetchMeterDates();
  }, [dormId]);

  // ดึงข้อมูลหอพักเพื่อตั้งค่าเริ่มต้นสำหรับวันครบกำหนดและค่าปรับ
  useEffect(() => {
    const fetchDormitoryData = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/api/dormitories/${dormId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        const dormData = response.data;
        
        // ตั้งค่าเริ่มต้นจากข้อมูลหอพัก
        setFormData(prev => ({
          ...prev,
          lateFeePerDay: dormData.late_fee_per_day || 50 // ใช้ค่าจากฐานข้อมูลหรือ default 50
        }));

        // คำนวณวันครบกำหนดจากวันที่กำหนดในหอพัก (เป็นเดือนถัดไปเสมอ)
        if (dormData.payment_due_day) {
          const today = new Date();
          const currentMonth = today.getMonth();
          const currentYear = today.getFullYear();
          
          // ตั้งให้เป็นเดือนถัดไปเสมอ
          let targetMonth = currentMonth + 1;
          let targetYear = currentYear;
          
          // หากข้ามปีใหม่
          if (targetMonth > 11) {
            targetMonth = 0;
            targetYear = targetYear + 1;
          }
          
          // สร้างวันครบกำหนดสำหรับเดือนถัดไป
          let dueDate = new Date(targetYear, targetMonth, dormData.payment_due_day);
          
          // แปลงเป็น string format YYYY-MM-DD โดยใช้ local date
          const year = dueDate.getFullYear();
          const month = String(dueDate.getMonth() + 1).padStart(2, '0');
          const day = String(dueDate.getDate()).padStart(2, '0');
          const dueDateString = `${year}-${month}-${day}`;
          
          setFormData(prev => ({
            ...prev,
            dueDate: dueDateString
          }));
        }
        
      } catch (error) {
        console.error('❌ ไม่สามารถดึงข้อมูลหอพัก:', error);
      }
    };

    if (dormId) {
      fetchDormitoryData();
    }
  }, [dormId]);
  
  const [availableDates, setAvailableDates] = useState([]);
  const totalMeterDatePages = Math.ceil(meterReadingDates.length / meterDatesPerPage);
  const paginatedMeterDates = meterReadingDates.slice(
    (meterDatePage - 1) * meterDatesPerPage,
    meterDatePage * meterDatesPerPage
  );

  const [formData, setFormData] = useState({
    meterReadingDate: '', // วันที่จดมิเตอร์
    billMonth: new Date().toISOString().slice(0, 7), // YYYY-MM format
    dueDate: '',
    selectedRooms: [],
    lateFeePerDay: 50 // ค่าปรับต่อวัน (บาท)
  });

  const [errors, setErrors] = useState({});
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const getMeterReadingData = async (meterRecordId) => {
    try {
      console.log('🔍 Fetching meter reading data for record ID:', meterRecordId);
      const response = await axios.get(
        `http://localhost:3001/api/bills/dormitories/${dormId}/meter-records/${meterRecordId}/rooms`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      console.log('✅ API Response:', response.data);
      // กรองเฉพาะห้องที่มี tenant_id และไม่เป็น null
      const validRooms = response.data.filter(room => room.tenant_id && room.tenant_id !== null);
      
      const roomsData = validRooms.map((room) => ({
        room_id: room.room_id,               
        tenant_id: room.tenant_id,       
        floor: room.floor,
        number: room.room_number,
        tenant: room.tenant || 'ไม่มีผู้เช่า',
        roomRate: room.room_rate || 0,
        waterUsage: room.water_usage || 0,
        electricUsage: room.electric_usage || 0,
        waterRate: room.water_rate || 0,
        electricityRate: room.electricity_rate || 0,
        waterCharge: room.water_charge || 0,
        electricityCharge: room.electricity_charge || 0,
        totalAmount: room.total_amount || 0,
        hasExistingBill: room.has_invoice || false
      }));

      console.log('🏠 Processed rooms data:', roomsData);
      console.log(`📊 Found ${response.data.length} total rooms, ${roomsData.length} rooms with tenants`);
      setAvailableRooms(roomsData);
    } catch (error) {
      console.error('❌ ไม่สามารถดึงข้อมูลห้อง:', error);
      console.error('Error details:', error.response?.data);
      setAvailableRooms([]);
      toast.error('❌ ไม่สามารถดึงข้อมูลห้องได้: ' + (error.response?.data?.error || error.message), {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    }
  };



  const [availableRooms, setAvailableRooms] = useState([]);

  // ฟังก์ชันตรวจสอบห้องที่มีใบแจ้งหนี้แล้ว
  const getRoomsWithExistingBills = () => {
    if (!formData.billMonth) return [];
    
    return existingBills
      .filter(bill => bill.billMonth === formData.billMonth)
      .map(bill => bill.roomNumber);
  };

  // จัดกลุ่มห้องตามชั้น
  const groupRoomsByFloor = (rooms) => {
    const grouped = rooms.reduce((acc, room) => {
      // ใช้ hasExistingBill จากฐานข้อมูลโดยตรง
      const roomWithStatus = { ...room, hasExistingBill: room.hasExistingBill };
      
      if (!acc[room.floor]) {
        acc[room.floor] = [];
      }
      acc[room.floor].push(roomWithStatus);
      return acc;
    }, {});
    
    return grouped;
  };

  // ฟังก์ชันจัดการวันที่
  const formatDateThai = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;
    
    return `${day} ${month} ${year}`;
  };

  const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const generateCalendarDays = (calendarDate) => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const days = [];
    const startDayOfWeek = firstDayOfMonth.getDay();

    // วันที่ของเดือนก่อนหน้า (แสดงสีอ่อน)
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push(prevDate);
    }

    // วันที่ของเดือนปัจจุบัน
    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    // วันที่ของเดือนถัดไป (แสดงสีอ่อน)
    const remainingDays = 42 - days.length;
    for (let d = 1; d <= remainingDays; d++) {
      days.push(new Date(year, month + 1, d));
    }

    return days;
  };

  const handleDateSelect = (date) => {
    // ตรวจสอบว่าวันที่ที่เลือกอยู่ในเดือนปัจจุบันของปฏิทินหรือไม่
    if (date.getMonth() !== calendarDate.getMonth() || date.getFullYear() !== calendarDate.getFullYear()) {
      // ถ้าเป็นวันที่จากเดือนอื่น ให้ย้ายปฏิทินไปเดือนนั้นแทน
      setCalendarDate(new Date(date.getFullYear(), date.getMonth(), 1));
      return;
    }
    
    // Always use local date (yyyy-mm-dd) to avoid timezone issues
    const pad = (n) => n.toString().padStart(2, '0');
    const dateString = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    setFormData(prev => ({ ...prev, dueDate: dateString }));
    setShowCalendar(false);
  };

  const handleMeterDateSelect = async (record) => {
    setFormData(prev => ({
      ...prev,
      meterReadingDate: record.date,
      selectedRooms: []
    }));

    setSelectedMeterRecordId(record.id); // ✅ เก็บไว้ใช้ตอน POST
    setShowMeterDateCalendar(false);

    await getMeterReadingData(record.id); // ✅ โหลดห้องของรอบนี้
  };


  const navigateMonth = (direction) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(calendarDate.getMonth() + direction);
    setCalendarDate(newDate);
  };

  const navigateMeterMonth = (direction) => {
    const newDate = new Date(meterCalendarDate);
    newDate.setMonth(meterCalendarDate.getMonth() + direction);
    setMeterCalendarDate(newDate);
  };

  const handleRoomToggle = (roomNumber) => {
    setFormData(prev => ({
      ...prev,
      selectedRooms: prev.selectedRooms.includes(roomNumber)
        ? prev.selectedRooms.filter(r => r !== roomNumber)
        : [...prev.selectedRooms, roomNumber]
    }));
  };

  const handleSelectAllRooms = () => {
    const roomsWithoutBills = availableRooms.filter(room => !room.hasExistingBill);
    
    if (formData.selectedRooms.length === roomsWithoutBills.length) {
      // ยกเลิกเลือกทั้งหมด
      setFormData(prev => ({ ...prev, selectedRooms: [] }));
    } else {
      // เลือกทั้งหมด (เฉพาะห้องที่ยังไม่มีบิล)
      setFormData(prev => ({ 
        ...prev, 
        selectedRooms: roomsWithoutBills.map(room => room.number) 
      }));
    }
  };

  const handleSelectFloorRooms = (floor) => {
    const floorRooms = availableRooms.filter(room => room.floor === floor && !room.hasExistingBill);
    const floorRoomNumbers = floorRooms.map(room => room.number);
    const selectedFloorRooms = formData.selectedRooms.filter(roomNumber => 
      floorRoomNumbers.includes(roomNumber)
    );

    if (selectedFloorRooms.length === floorRoomNumbers.length) {
      // ยกเลิกเลือกทั้งชั้น
      setFormData(prev => ({
        ...prev,
        selectedRooms: prev.selectedRooms.filter(roomNumber => !floorRoomNumbers.includes(roomNumber))
      }));
    } else {
      // เลือกทั้งชั้น
      setFormData(prev => ({
        ...prev,
        selectedRooms: [...prev.selectedRooms.filter(roomNumber => !floorRoomNumbers.includes(roomNumber)), ...floorRoomNumbers]
      }));
    }
  };

  const addBillItem = () => {
    // ฟังก์ชันนี้ไม่ใช้แล้ว
  };

  const removeBillItem = (id) => {
    // ฟังก์ชันนี้ไม่ใช้แล้ว
  };

  const updateBillItem = (id, field, value) => {
    // ฟังก์ชันนี้ไม่ใช้แล้ว
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.meterReadingDate) {
      newErrors.meterReadingDate = 'กรุณาเลือกวันที่จดมิเตอร์';
    }

    if (!formData.billMonth) {
      newErrors.billMonth = 'กรุณาเลือกเดือนที่ออกบิล';
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'กรุณาเลือกวันที่ครบกำหนดชำระ';
    }

    if (formData.selectedRooms.length === 0) {
      newErrors.selectedRooms = 'กรุณาเลือกห้องที่ต้องการออกบิล';
    }

    if (formData.lateFeePerDay < 0) {
      newErrors.lateFeePerDay = 'ค่าปรับต่อวันต้องไม่ติดลบ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.warning('กรุณากรอกข้อมูลให้ครบถ้วน', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      return;
    }

    try {
      const payload = {
        meterRecordId: selectedMeterRecordId, // ⬅️ รหัสรอบจดมิเตอร์
        billMonth: formData.billMonth, // ส่งเป็น YYYY-MM
        dueDate: formData.dueDate,
        lateFeePerDay: formData.lateFeePerDay,
        rooms: formData.selectedRooms.map(roomNumber => {
          const room = availableRooms.find(r => r.number === roomNumber);
          if (!room) {
            console.error('❌ Room not found for roomNumber:', roomNumber);
            throw new Error(`ไม่พบข้อมูลห้อง ${roomNumber}`);
          }
          return {
            roomId: room.room_id,
            tenantId: room.tenant_id,
            roomRate: room.roomRate,
            waterUsage: room.waterUsage,
            electricUsage: room.electricUsage,
            waterRate: room.waterRate,
            electricityRate: room.electricityRate,
            waterCharge: room.waterCharge,
            electricityCharge: room.electricityCharge,
            totalAmount: room.totalAmount
          };
        })
      };
      console.log("🚀 Final Payload", JSON.stringify(payload, null, 2));
      await axios.post(`http://localhost:3001/api/bills/dormitories/${dormId}/invoices`, payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      toast.success(`สร้างบิลสำเร็จแล้ว (${formData.selectedRooms.length} ห้อง)`, {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });

      setTimeout(() => {
        if (onBillCreated) onBillCreated();
        navigate(`/bills/${dormId}`);
      }, 2000); 
      
    } catch (error) {
      console.error(error.response?.data || error)
      console.error('❌ เกิดข้อผิดพลาดในการสร้างบิล:', error);
      toast.error('❌ เกิดข้อผิดพลาดในการสร้างบิล กรุณาลองใหม่', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    }
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancel = () => {
    setShowCancelConfirm(false);
    if (onBack) {
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <FaArrowLeft className="w-4 h-4" />
              กลับ
            </button>
            <h1 className="text-2xl font-bold text-gray-800">สร้างใบแจ้งหนี้รายเดือน</h1>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              <FaTimes className="w-4 h-4" />
              ยกเลิก
            </button>
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              <FaSave className="w-4 h-4" />
              สร้างบิล
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* ข้อมูลพื้นฐาน */}
          <div className="bg-white rounded-md shadow-sm border border-gray-300 p-6">
            <h3 className="text-lg font-semibold text-gray-800 border-b-2 border-gray-300 pb-2 mb-4">ข้อมูลพื้นฐาน</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* วันที่จดมิเตอร์ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  วันที่จดมิเตอร์ <span className="text-red-500">*</span>
                </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMeterDateCalendar(!showMeterDateCalendar)}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between hover:bg-gray-50 ${
                    errors.meterReadingDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <span className={formData.meterReadingDate ? 'text-gray-900' : 'text-gray-500'}>
                    {formData.meterReadingDate ? formatDateThai(formData.meterReadingDate) : 'เลือกวันที่จดมิเตอร์'}
                  </span>
                  <FaCalendarAlt className="text-gray-500" />
                </button>

                {/* Custom Calendar for Meter Date */}
                {showMeterDateCalendar && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-md shadow-lg z-50 p-4 w-80">
                    {/* วันที่ที่มีข้อมูลการจดมิเตอร์ */}
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-2">วันที่ที่มีข้อมูลการจดมิเตอร์:</h4>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                        {loadingMeterDates ? (
                          <p className="text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
                        ) : meterReadingDates.length === 0 ? (
                          <p className="text-sm text-gray-500">ไม่มีข้อมูลรอบจดมิเตอร์</p>
                        ) : (
                        paginatedMeterDates.map((record) => (
                          <button
                            key={record.id}
                            type="button"
                            onClick={() => handleMeterDateSelect(record)}
                            className={`px-3 py-2 text-sm rounded-md focus:outline-none transition-colors duration-150
                              ${formData.meterReadingDate === record.date
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-white text-gray-700 hover:bg-blue-50'}
                            `}
                            style={{ border: 'none', minWidth: 0 }}
                          >
                            {formatDateThai(record.date)}
                          </button>
                        ))
                        )}
                      </div>
                    {/* Pagination controls for meter dates */}
                    {meterReadingDates.length > meterDatesPerPage && (
                      <div className="flex justify-end items-center gap-3 mt-3 pt-2 ">
                        <button
                          type="button"
                          onClick={() => setMeterDatePage((p) => Math.max(1, p - 1))}
                          disabled={meterDatePage === 1}
                          className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors duration-150
                            ${meterDatePage === 1
                              ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-600'}
                          `}
                        >
                          ก่อนหน้า
                        </button>
                        <span className="text-sm text-gray-500 select-none">
                          หน้า <span className="font-semibold text-blue-600">{meterDatePage}</span> / {totalMeterDatePages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setMeterDatePage((p) => Math.min(totalMeterDatePages, p + 1))}
                          disabled={meterDatePage === totalMeterDatePages}
                          className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors duration-150
                            ${meterDatePage === totalMeterDatePages
                              ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-600'}
                          `}
                        >
                          ถัดไป
                        </button>
                      </div>
                    )}
                    </div>

                    {/* Close Button */}
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setShowMeterDateCalendar(false)}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                      >
                        ปิด
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {errors.meterReadingDate && (
                <p className="text-red-500 text-xs mt-1">{errors.meterReadingDate}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                เลือกวันที่ที่มีการจดมิเตอร์เพื่อสร้างบิล
              </p>
            </div>
            
            {/* เดือนที่ออกบิล */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เดือนที่ออกบิล <span className="text-red-500">*</span>
              </label>
              <input
                type="month"
                value={formData.billMonth}
                onChange={(e) => setFormData(prev => ({ ...prev, billMonth: e.target.value }))}
                className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.billMonth ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.billMonth && (
                <p className="text-red-500 text-xs mt-1">{errors.billMonth}</p>
              )}
            </div>

            {/* วันที่ครบกำหนดชำระ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                วันที่ครบกำหนดชำระ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between hover:bg-gray-50 ${
                    errors.dueDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <span className={formData.dueDate ? 'text-gray-900' : 'text-gray-500'}>
                    {formData.dueDate ? formatDateThai(formData.dueDate) : 'เลือกวันที่ครบกำหนด'}
                  </span>
                  <FaCalendarAlt className="text-gray-500" />
                </button>

                {/* Custom Calendar */}
                {showCalendar && (
                  <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-md shadow-lg z-50 p-4 w-80">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        type="button"
                        onClick={() => navigateMonth(-1)}
                        className="p-1 hover:bg-gray-100 rounded-md"
                      >
                        <FaChevronLeft className="text-gray-600" />
                      </button>
                      <h3 className="font-semibold text-gray-700">
                        {thaiMonths[calendarDate.getMonth()]} {calendarDate.getFullYear() + 543}
                      </h3>
                      <button
                        type="button"
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
                      {generateCalendarDays(calendarDate).map((date, index) => {
                        // Fix timezone issue: use yyyy-mm-dd in local time
                        const pad = (n) => n.toString().padStart(2, '0');
                        const localDateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
                        const isCurrentMonth = date.getMonth() === calendarDate.getMonth();
                        const isSelected = localDateStr === formData.dueDate;
                        const todayObj = new Date();
                        const todayStr = `${todayObj.getFullYear()}-${pad(todayObj.getMonth() + 1)}-${pad(todayObj.getDate())}`;
                        const isToday = localDateStr === todayStr;
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleDateSelect(new Date(date.getFullYear(), date.getMonth(), date.getDate()))}
                            className={`relative p-2 text-sm rounded-md transition-colors w-full
                              ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' :
                                isToday ? 'bg-blue-100 text-blue-600 font-semibold' :
                                isCurrentMonth ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-50 cursor-default'}
                            `}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>

                    {/* Close Button */}
                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={() => setShowCalendar(false)}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                      >
                        ปิด
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {errors.dueDate && (
                <p className="text-red-500 text-xs mt-1">{errors.dueDate}</p>
              )}
            </div>

            {/* ค่าปรับต่อวัน */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ค่าปรับต่อวัน (บาท) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.lateFeePerDay}
                onChange={(e) => setFormData(prev => ({ ...prev, lateFeePerDay: parseFloat(e.target.value) || 0 }))}
                className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.lateFeePerDay ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              {errors.lateFeePerDay && (
                <p className="text-red-500 text-xs mt-1">{errors.lateFeePerDay}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                ค่าปรับที่จะเรียกเก็บเมื่อชำระเงินเกินกำหนด
              </p>
            </div>
            </div>
             <div className="mt-2 text-xs text-red-600 flex items-center"><span className="font-bold mr-1">*</span>หมายเหตุ: ผู้เช่าที่เข้าพักหลังวันจดมิเตอร์จะถูกคิดบิลใบแจ้งนี้ในเดือนถัดไป</div>
          </div>

          {/* เลือกห้อง */}
          <div className="bg-white rounded-md shadow-sm border border-gray-300 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                เลือกห้องที่ต้องการออกบิล ({formData.selectedRooms.length}/{availableRooms.filter(room => !room.hasExistingBill).length} ห้อง)
              </h3>
              <button
                type="button"
                onClick={handleSelectAllRooms}
                disabled={availableRooms.filter(room => !room.hasExistingBill).length === 0}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  availableRooms.filter(room => !room.hasExistingBill).length === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : formData.selectedRooms.length === availableRooms.filter(room => !room.hasExistingBill).length
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
              >
                {formData.selectedRooms.length === availableRooms.filter(room => !room.hasExistingBill).length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
              </button>
            </div>
            
            {errors.selectedRooms && (
              <p className="text-red-500 text-xs mb-4">{errors.selectedRooms}</p>
            )}
            
            {!formData.meterReadingDate ? (
              <div className="text-center py-8 text-gray-500">
                <FaCalendarAlt className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                <p>กรุณาเลือกวันที่จดมิเตอร์ก่อน</p>
              </div>
            ) : availableRooms.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>ไม่มีข้อมูลห้องสำหรับวันที่ที่เลือก</p>
              </div>
            ) : (
              <div className="max-h-full overflow-y-auto">
                {/* แสดงสถิติสรุป */}
                <div className="mb-4 p-3 bg-gray-50 rounded-md">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">{availableRooms.length}</div>
                      <div className="text-gray-600">ทั้งหมด</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-600">{availableRooms.filter(room => !room.hasExistingBill).length}</div>
                      <div className="text-gray-600">ออกบิลได้</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-red-600">{availableRooms.filter(room => room.hasExistingBill).length}</div>
                      <div className="text-gray-600">มีบิลแล้ว</div>
                    </div>
                  </div>
                </div>

                {Object.entries(groupRoomsByFloor(availableRooms)).map(([floor, rooms]) => (
                  <div key={floor} className="mb-4 border border-gray-200 rounded-md">
                    {/* หัวข้อชั้น */}
                    <div className="flex items-center justify-between p-3 bg-gray-100 border-b border-gray-200">
                      <h4 className="font-medium text-gray-800">
                        ชั้นที่ {floor} ({rooms.filter(room => !room.hasExistingBill).length}/{rooms.length} ห้อง)
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleSelectFloorRooms(parseInt(floor))}
                        disabled={rooms.filter(room => !room.hasExistingBill).length === 0}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          rooms.filter(room => !room.hasExistingBill).length === 0
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : rooms.filter(room => !room.hasExistingBill && formData.selectedRooms.includes(room.number)).length === rooms.filter(room => !room.hasExistingBill).length
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {rooms.filter(room => !room.hasExistingBill && formData.selectedRooms.includes(room.number)).length === rooms.filter(room => !room.hasExistingBill).length ? 'ยกเลิกชั้น' : 'เลือกชั้น'}
                      </button>
                    </div>

                    {/* รายการห้องในชั้น */}
                    <div className="p-2  grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                      {rooms.map((room) => (
                        <label
                          key={room.number}
                          className={`flex flex-col p-2 py-3 rounded-md border cursor-pointer transition-all duration-150 shadow-sm bg-white hover:shadow-md text-xs
                            ${room.hasExistingBill ? 'opacity-60 cursor-not-allowed border-gray-200' : formData.selectedRooms.includes(room.number) ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100'}
                          `}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <input
                              type="checkbox"
                              checked={formData.selectedRooms.includes(room.number)}
                              onChange={() => !room.hasExistingBill && handleRoomToggle(room.number)}
                              disabled={room.hasExistingBill}
                              className="w-3 h-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-gray-800">ห้อง {room.number}</span>
                              {room.hasExistingBill && (
                                <span className="px-1 py-0.5 text-[10px] bg-red-100 text-red-600 rounded-md font-medium">มีบิล</span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-right">
                              <span className="text-[11px] text-gray-500 mr-1">จำนวน</span>
                              <span className="text-base font-medium text-blue-600">{room.totalAmount.toLocaleString()}</span>
                              <span className="text-[11px] text-gray-500 ml-1">บาท</span>
                            </div>
                            <p className="text-[11px] text-gray-500 truncate">
                              <span className="font-bold text-gray-700 mr-1">ผู้เช่า</span>{room.tenant || '-'}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
           
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Popup */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-[10vh]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-md bg-red-100 mb-4">
                <FaExclamationTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ยืนยันการยกเลิก
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                คุณต้องการยกเลิกการสร้างบิลหรือไม่? ข้อมูลที่กรอกจะหายไป
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ไม่ยกเลิก
                </button>
                <button
                  onClick={confirmCancel}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  );
}

export default CreateBillForm;
