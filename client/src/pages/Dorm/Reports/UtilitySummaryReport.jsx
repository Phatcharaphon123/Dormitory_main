import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { FaPrint, FaFilter, FaTint, FaBolt, FaCalculator } from "react-icons/fa";
import Pagination from "../../../components/Pagination";
import ExcelExportButton from "../../../components/ExcelExportButton";
import { RiWaterFlashFill } from "react-icons/ri";
import axios from 'axios';

function UtilitySummaryReport() {
  const [utilityData, setUtilityData] = useState({
    summary: {
      totalWaterUsage: 0,
      totalElectricityUsage: 0,
      totalWaterCost: 0,
      totalElectricityCost: 0,
      totalUtilityCost: 0,
      averageWaterPerRoom: 0,
      averageElectricityPerRoom: 0,
      totalRooms: 0
    },
    roomDetails: [],
    monthlyTrend: []
  });
  
  const [utilityRates, setUtilityRates] = useState({
    water_rate: 0,
    electricity_rate: 0
  });

  const [roomTypes, setRoomTypes] = useState([]);
  
  const [filters, setFilters] = useState({
    selectedMonth: '', // ค่าว่างหมายถึงแสดงทั้งหมด
    roomType: "all",
    sortBy: "room_number" // room_number, water_usage, electricity_usage, total_cost
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [loading, setLoading] = useState(false);
  const { dormId } = useParams();

  // Pagination calculations
  const totalPages = Math.ceil(utilityData.roomDetails.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRooms = utilityData.roomDetails.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  useEffect(() => {
    fetchUtilityData();
  }, [dormId, filters]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when data changes
  }, [utilityData.roomDetails]);

  const fetchUtilityData = async () => {
    setLoading(true);
    try {
      // Step 1: ดึงข้อมูล meter records ของหอพัก
      const meterRecordsRes = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/bills/dormitories/${dormId}/meter-records`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const meterRecordsData = meterRecordsRes.data;

      let selectedMeterRecord = null;

      if (filters.selectedMonth) {
        // ถ้าเลือกเดือนเฉพาะ
        const [year, month] = filters.selectedMonth.split('-');
        const targetDate = `${year}-${month}`;
        
        selectedMeterRecord = meterRecordsData.find(record => {
          const recordDate = new Date(record.meter_record_date);
          const recordYearMonth = `${recordDate.getFullYear()}-${(recordDate.getMonth() + 1).toString().padStart(2, '0')}`;
          return recordYearMonth === targetDate;
        });

        if (!selectedMeterRecord) {
          // ถ้าไม่มีข้อมูลในเดือนที่เลือก ให้แสดงข้อมูลว่าง
          setUtilityData({
            summary: {
              totalWaterUsage: 0,
              totalElectricityUsage: 0,
              totalWaterCost: 0,
              totalElectricityCost: 0,
              totalUtilityCost: 0,
              averageWaterPerRoom: 0,
              averageElectricityPerRoom: 0,
              totalRooms: 0
            },
            roomDetails: [],
            monthlyTrend: []
          });
          setUtilityRates({ water_rate: 0, electricity_rate: 0 });
          setLoading(false);
          return;
        }
      } else {
        // ถ้าไม่ได้เลือกเดือน (ดูทั้งหมด) ให้ใช้ meter record ล่าสุด
        if (meterRecordsData.length > 0) {
          selectedMeterRecord = meterRecordsData.sort((a, b) => 
            new Date(b.meter_record_date) - new Date(a.meter_record_date)
          )[0];
        }

        if (!selectedMeterRecord) {
          // ถ้าไม่มีข้อมูลเลย ให้แสดงข้อมูลว่าง
          setUtilityData({
            summary: {
              totalWaterUsage: 0,
              totalElectricityUsage: 0,
              totalWaterCost: 0,
              totalElectricityCost: 0,
              totalUtilityCost: 0,
              averageWaterPerRoom: 0,
              averageElectricityPerRoom: 0,
              totalRooms: 0
            },
            roomDetails: [],
            monthlyTrend: []
          });
          setUtilityRates({ water_rate: 0, electricity_rate: 0 });
          setLoading(false);
          return;
        }
      }

      // Step 2: ดึงข้อมูลห้องและค่าน้ำค่าไฟจาก meter record ที่เลือก
      const roomsRes = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/bills/dormitories/${dormId}/meter-records/${selectedMeterRecord.meter_record_id}/rooms`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const roomsData = roomsRes.data;

      // Step 3: ดึงข้อมูลประเภทห้อง
      const roomTypesRes = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/room-types/dormitories/${dormId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const roomTypesData = roomTypesRes.data;

      // อัพเดท state ของประเภทห้อง
      setRoomTypes(roomTypesData);

      // สร้าง mapping ของประเภทห้อง
      const roomTypeMap = {};
      roomTypesData.forEach(type => {
        roomTypeMap[type.room_type_id] = type.room_type_name;
      });

      // ดึง utility rates จากข้อมูลห้องแรกที่มีข้อมูล
      if (roomsData.length > 0) {
        const firstRoom = roomsData[0];
        setUtilityRates({
          water_rate: parseFloat(firstRoom.water_rate) || 0,
          electricity_rate: parseFloat(firstRoom.electricity_rate) || 0
        });
      } else {
        setUtilityRates({ water_rate: 0, electricity_rate: 0 });
      }

      // ประมวลผลข้อมูล
      processUtilityData(roomsData, roomTypeMap);
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูล:', error);
      // แสดงข้อมูลว่างเมื่อเกิดข้อผิดพลาด
      setUtilityData({
        summary: {
          totalWaterUsage: 0,
          totalElectricityUsage: 0,
          totalWaterCost: 0,
          totalElectricityCost: 0,
          totalUtilityCost: 0,
          averageWaterPerRoom: 0,
          averageElectricityPerRoom: 0,
          totalRooms: 0
        },
        roomDetails: [],
        monthlyTrend: []
      });
    } finally {
      setLoading(false);
    }
  };

  const processUtilityData = (roomsData, roomTypeMap) => {
    let totalWaterUsage = 0;
    let totalElectricityUsage = 0;
    let totalWaterCost = 0;
    let totalElectricityCost = 0;
    const roomDetails = [];

    roomsData.forEach(room => {
      // กรองตามประเภทห้อง (ถ้ามีการเลือก)
      if (filters.roomType !== "all" && room.room_type_id) {
        // แปลงทั้งคู่เป็น string เพื่อเปรียบเทียบ
        if (String(room.room_type_id) !== String(filters.roomType)) {
          return;
        }
      }

      // ตรวจสอบและแปลงข้อมูลให้เป็นตัวเลข
      const waterUsage = parseFloat(room.water_usage) || 0;
      const electricityUsage = parseFloat(room.electric_usage) || 0;
      const waterCost = parseFloat(room.water_charge) || 0;
      const electricityCost = parseFloat(room.electricity_charge) || 0;

      // ตรวจสอบข้อมูลมิเตอร์
      const waterPrev = parseFloat(room.water_prev) || 0;
      const waterCurr = parseFloat(room.water_curr) || 0;
      const electricPrev = parseFloat(room.electric_prev) || 0;
      const electricCurr = parseFloat(room.electric_curr) || 0;

      totalWaterUsage += waterUsage;
      totalElectricityUsage += electricityUsage;
      totalWaterCost += waterCost;
      totalElectricityCost += electricityCost;

      roomDetails.push({
        room_id: room.room_id,
        room_number: room.room_number || 'N/A',
        room_type: roomTypeMap[room.room_type_id] || 'ไม่ระบุ',
        tenant_name: room.tenant || 'ไม่มีผู้เช่า',
        reading_month: room.reading_month || room.bill_month || room.created_at || null,
        water_previous: waterPrev,
        water_current: waterCurr,
        water_usage: waterUsage,
        water_cost: waterCost,
        electricity_previous: electricPrev,
        electricity_current: electricCurr,
        electricity_usage: electricityUsage,
        electricity_cost: electricityCost,
        total_utility_cost: waterCost + electricityCost,
        has_invoice: room.has_invoice || false,
        status: room.has_invoice ? 'invoiced' : 'pending'
      });
    });

    console.log('✅ Rooms after filtering:', roomDetails.length);

    // เรียงลำดับตาม sortBy
    console.log('🔀 Sorting by:', filters.sortBy);
    roomDetails.sort((a, b) => {
      switch (filters.sortBy) {
        case 'water_usage':
          return b.water_usage - a.water_usage;
        case 'electricity_usage':
          return b.electricity_usage - a.electricity_usage;
        case 'total_cost':
          return b.total_utility_cost - a.total_utility_cost;
        default:
          // เรียงตามหมายเลขห้อง (ใช้ natural sort)
          return a.room_number.localeCompare(b.room_number, undefined, { numeric: true });
      }
    });

    console.log('📊 Final processed data:', {
      totalWaterUsage,
      totalElectricityUsage,
      totalWaterCost,
      totalElectricityCost,
      roomsCount: roomDetails.length
    });

    setUtilityData({
      summary: {
        totalWaterUsage: totalWaterUsage || 0,
        totalElectricityUsage: totalElectricityUsage || 0,
        totalWaterCost: totalWaterCost || 0,
        totalElectricityCost: totalElectricityCost || 0,
        totalUtilityCost: (totalWaterCost + totalElectricityCost) || 0,
        averageWaterPerRoom: roomDetails.length ? (totalWaterUsage / roomDetails.length) || 0 : 0,
        averageElectricityPerRoom: roomDetails.length ? (totalElectricityUsage / roomDetails.length) || 0 : 0,
        totalRooms: roomDetails.length || 0
      },
      roomDetails,
      monthlyTrend: [] // สามารถเพิ่มข้อมูล trend ได้ในอนาคต
    });
  };

  const handleFilterChange = (key, value) => {
    console.log('🔄 Filter changed:', key, '=', value);
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [key]: value
      };
      console.log('📝 New filters state:', newFilters);
      return newFilters;
    });
    // Reset to first page when filter changes
    setCurrentPage(1);
  };

  // เตรียมข้อมูลสำหรับ Export Excel
  const exportData = utilityData.roomDetails.map((room) => {
    // แปลงเดือนเป็น format ที่อ่านง่าย
    let monthDisplay = '';
    
    if (room.reading_month) {
      // ใช้เดือนจากข้อมูลของ room
      const roomDate = new Date(room.reading_month);
      if (!isNaN(roomDate.getTime())) {
        const year = roomDate.getFullYear();
        const month = roomDate.getMonth() + 1;
        const monthNames = [
          'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
          'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
        const thaiYear = year + 543;
        monthDisplay = `${monthNames[month - 1]} ${thaiYear}`;
      }
    }
    
    // ถ้าไม่มีข้อมูลเดือนของ room ใช้จาก filter
    if (!monthDisplay && filters.selectedMonth) {
      const [year, month] = filters.selectedMonth.split('-');
      const monthNames = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      const thaiYear = parseInt(year) + 543;
      monthDisplay = `${monthNames[parseInt(month) - 1]} ${thaiYear}`;
    }
    
    // ถ้าไม่มีทั้งคู่ ใช้เดือนปัจจุบัน
    if (!monthDisplay) {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear() + 543;
      const monthNames = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      monthDisplay = `${monthNames[currentMonth - 1]} ${currentYear}`;
    }

    return {
      room_number: room.room_number,
      room_type: room.room_type,
      tenant_name: room.tenant_name || '-',
      month: monthDisplay,
      water_previous: room.water_previous || 0,
      water_current: room.water_current || 0,
      water_usage: room.water_usage || 0,
      water_cost: room.water_cost || 0,
      electricity_previous: room.electricity_previous || 0,
      electricity_current: room.electricity_current || 0,
      electricity_usage: room.electricity_usage || 0,
      electricity_cost: room.electricity_cost || 0,
      total_utility_cost: room.total_utility_cost || 0
    };
  });

  // กำหนดคอลัมน์สำหรับ Excel
  const excelColumns = {
    room_number: 'เลขห้อง',
    room_type: 'ประเภทห้อง',
    tenant_name: 'ชื่อผู้เช่า',
    month: 'เดือน',
    water_previous: 'มิเตอร์น้ำเก่า',
    water_current: 'มิเตอร์น้ำใหม่',
    water_usage: 'หน่วยน้ำที่ใช้',
    water_cost: 'ค่าน้ำ',
    electricity_previous: 'มิเตอร์ไฟเก่า',
    electricity_current: 'มิเตอร์ไฟใหม่',
    electricity_usage: 'หน่วยไฟที่ใช้',
    electricity_cost: 'ค่าไฟ',
    total_utility_cost: 'ค่าสาธารณูปโภครวม'
  };

  const formatNumber = (num) => {
    // ตรวจสอบว่าเป็นตัวเลขที่ถูกต้องหรือไม่
    if (!num || isNaN(num) || !isFinite(num)) {
      return '0';
    }
    return new Intl.NumberFormat('th-TH').format(num);
  };

  const formatCurrency = (amount) => {
    // ตรวจสอบว่าเป็นตัวเลขที่ถูกต้องหรือไม่
    if (!amount || isNaN(amount) || !isFinite(amount)) {
      return '฿0.00';
    }
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-md shadow-sm p-4 mb-4 border border-gray-300">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
              <RiWaterFlashFill className="text-gray-700 text-3xl" />
              รายงานค่าน้ำค่าไฟ
            </h1>
            <p className="text-gray-600 mt-1">
              รายงานสรุปการใช้และค่าใช้จ่ายสาธารณูปโภค {(() => {
                if (!filters.selectedMonth) {
                  return "ทั้งหมด";
                }
                const [year, month] = filters.selectedMonth.split('-');
                return `เดือน ${month}/${year}`;
              })()}
            </p>
          </div>
          <div className="flex space-x-2">
            <ExcelExportButton
              data={exportData}
              columns={excelColumns}
              fileName="รายงานค่าน้ำค่าไฟ"
              sheetName="รายงานค่าน้ำค่าไฟ"
              buttonText="ส่งออก Excel"
              className=""
            />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-md">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">เลือกเดือน</label>
            <div className="flex gap-2">
              <input
                type="month"
                value={filters.selectedMonth}
                onChange={(e) => handleFilterChange('selectedMonth', e.target.value)}
                className="h-11 flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={() => handleFilterChange('selectedMonth', '')}
                className={`h-11 px-3 py-2 border rounded-md transition-colors text-sm ${
                  filters.selectedMonth === '' 
                    ? 'bg-blue-500 text-white border-blue-500' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="แสดงทั้งหมด"
              >
                ดูทั้งหมด
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ประเภทห้อง</label>
            <select
              value={filters.roomType}
              onChange={(e) => handleFilterChange('roomType', e.target.value)}
              className="w-full h-11 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ทั้งหมด</option>
              {roomTypes.map(type => (
                <option key={type.room_type_id} value={type.room_type_id}>
                  {type.room_type_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">เรียงตาม</label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full h-11 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="room_number">เลขห้อง</option>
              <option value="water_usage">การใช้น้ำ (มาก-น้อย)</option>
              <option value="electricity_usage">การใช้ไฟ (มาก-น้อย)</option>
              <option value="total_cost">ค่าใช้จ่ายรวม (มาก-น้อย)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">แสดง</label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="w-full h-11 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5 รายการ</option>
              <option value={10}>10 รายการ</option>
              <option value={20}>20 รายการ</option>
              <option value={50}>50 รายการ</option>
              <option value={100}>100 รายการ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Total Water Usage */}
        <div className="bg-white rounded-md shadow-sm p-4 border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">น้ำที่ใช้รวม</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatNumber(utilityData.summary.totalWaterUsage)}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">อัตราต่อหน่วย </p>
                <p className="text-xs ml-2 text-blue-600 font-medium">
                  {utilityRates.water_rate > 0 ? `${utilityRates.water_rate} บาท/หน่วย` : 'ยังไม่ตั้งค่า'}
                </p>
              </div>
            </div>
            <FaTint className="text-3xl text-blue-600" />
          </div>
        </div>

        {/* Total Electricity Usage */}
        <div className="bg-white rounded-md shadow-sm p-4 border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ไฟที่ใช้รวม</p>
              <p className="text-2xl font-bold text-yellow-600">
                {utilityData.summary.totalElectricityUsage > 0 ? 
                  formatNumber(utilityData.summary.totalElectricityUsage) : 
                  <span className="text-gray-400">ไม่มีข้อมูล</span>
                }
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">อัตราต่อหน่วย </p>
                <p className="text-xs ml-2 text-yellow-600 font-medium">
                  {utilityRates.electricity_rate > 0 ? `${utilityRates.electricity_rate} บาท/หน่วย` : 'ยังไม่ตั้งค่า'}
                </p>
              </div>
            </div>
            <FaBolt className="text-3xl text-yellow-400" />
          </div>
        </div>

        {/* Total Water Cost */}
        <div className="bg-white rounded-md shadow-sm p-4 border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ค่าน้ำรวม</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(utilityData.summary.totalWaterCost)}
              </p>
            </div>
            <div className="text-3xl text-blue-500">💧</div>
          </div>
        </div>

        {/* Total Electricity Cost */}
        <div className="bg-white rounded-md shadow-sm p-4 border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ค่าไฟรวม</p>
              <p className="text-2xl font-bold text-yellow-600">
                {utilityData.summary.totalElectricityCost > 0 ? 
                  formatCurrency(utilityData.summary.totalElectricityCost) : 
                  <span className="text-gray-400">฿0.00</span>
                }
              </p>
              <p className="text-xs text-gray-500">
                {utilityData.summary.totalElectricityCost === 0 ? 'ยังไม่มีการใช้ไฟ' : ''}
              </p>
            </div>
            <div className="text-3xl text-yellow-500">⚡</div>
          </div>
        </div>
      </div>

      {/* Additional Summary Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-md shadow-sm p-4 border border-gray-300">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">สรุปรวม</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">ค่าสาธารณูปโภครวม:</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(utilityData.summary.totalUtilityCost)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">จำนวนห้องทั้งหมด:</span>
              <span className="font-semibold">{utilityData.summary.totalRooms} ห้อง</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-md shadow-sm p-4 border border-gray-300">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">ค่าเฉลี่ยต่อห้อง</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">น้ำเฉลี่ย:</span>
              <span className="font-semibold text-blue-600">
                {formatNumber(utilityData.summary.averageWaterPerRoom.toFixed(1))} หน่วย
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ไฟเฉลี่ย:</span>
              <span className="font-semibold text-yellow-600">
                {formatNumber(utilityData.summary.averageElectricityPerRoom.toFixed(1))} หน่วย
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-md shadow-sm p-4 border border-gray-300">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">ค่าใช้จ่ายเฉลี่ย</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">ค่าน้ำเฉลี่ย:</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(utilityData.summary.totalRooms && utilityData.summary.totalWaterCost > 0 ? 
                  utilityData.summary.totalWaterCost / utilityData.summary.totalRooms : 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ค่าไฟเฉลี่ย:</span>
              <span className="font-semibold text-yellow-600">
                {formatCurrency(utilityData.summary.totalRooms && utilityData.summary.totalElectricityCost > 0 ? 
                  utilityData.summary.totalElectricityCost / utilityData.summary.totalRooms : 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Room Details Table */}
      <div className="bg-white rounded-md shadow-sm border border-gray-300 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-700">รายละเอียดแต่ละห้อง</h3>
          <div className="text-sm text-gray-700">
            แสดง <span className="font-medium">{startIndex + 1}</span>-<span className="font-medium">{Math.min(endIndex, utilityData.roomDetails.length)}</span> จาก <span className="font-medium">{utilityData.roomDetails.length}</span> รายการ
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-7 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider first:rounded-tl-none">ห้อง</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้เช่า</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">เดือน</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">มิเตอร์น้ำ</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">หน่วยน้ำ</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ค่าน้ำ</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">มิเตอร์ไฟ</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">หน่วยไฟ</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ค่าไฟ</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider last:rounded-tr-none">รวม</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentRooms.map((room, index) => (
                <tr key={room.room_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {startIndex + index + 1}
                  </td>
                  <td className="px-7 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-600">{room.room_number}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{room.tenant_name || '-'}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-600">
                      {(() => {
                        // ใช้เดือนจากข้อมูลของแต่ละ room ก่อน ถ้าไม่มีใช้ filter
                        let monthToDisplay = '';
                        
                        if (room.reading_month) {
                          // ถ้ามีข้อมูลเดือนของ room
                          const roomDate = new Date(room.reading_month);
                          if (!isNaN(roomDate.getTime())) {
                            const year = roomDate.getFullYear();
                            const month = roomDate.getMonth() + 1;
                            const monthNames = [
                              'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                              'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                            ];
                            const thaiYear = year + 543;
                            monthToDisplay = `${monthNames[month - 1]} ${thaiYear}`;
                          }
                        }
                        
                        // ถ้าไม่มีข้อมูลเดือนของ room ให้ใช้จาก filter
                        if (!monthToDisplay && filters.selectedMonth) {
                          const [year, month] = filters.selectedMonth.split('-');
                          const monthNames = [
                            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                          ];
                          const thaiYear = parseInt(year) + 543;
                          monthToDisplay = `${monthNames[parseInt(month) - 1]} ${thaiYear}`;
                        }
                        
                        // ถ้าไม่มีทั้งคู่ ให้แสดงเดือนปัจจุบัน
                        if (!monthToDisplay) {
                          const now = new Date();
                          const currentMonth = now.getMonth() + 1;
                          const currentYear = now.getFullYear() + 543;
                          const monthNames = [
                            'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
                            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
                          ];
                          monthToDisplay = `${monthNames[currentMonth - 1]} ${currentYear}`;
                        }
                        
                        return monthToDisplay;
                      })()}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="text-sm text-gray-600">
                      <span className="font-mono">{room.water_previous}</span>
                      <span className="mx-1 text-gray-400">→</span>
                      <span className="font-mono">{room.water_current}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-semibold text-blue-600">{formatNumber(room.water_usage)}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-semibold text-blue-600">{formatCurrency(room.water_cost)}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {room.electricity_previous || room.electricity_current ? (
                      <div className="text-sm text-gray-600">
                        <span className="font-mono">{room.electricity_previous || '0'}</span>
                        <span className="mx-1 text-gray-400">→</span>
                        <span className="font-mono">{room.electricity_current || '-'}</span>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">ไม่มีข้อมูล</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {room.electricity_usage > 0 ? (
                      <div className="text-sm font-semibold text-yellow-600">{formatNumber(room.electricity_usage)}</div>
                    ) : (
                      <div className="text-sm text-gray-400">0</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {room.electricity_cost > 0 ? (
                      <div className="text-sm font-semibold text-yellow-600">{formatCurrency(room.electricity_cost)}</div>
                    ) : (
                      <div className="text-sm text-gray-400">฿0.00</div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="text-sm font-bold text-green-600">{formatCurrency(room.total_utility_cost)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {utilityData.roomDetails.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-lg font-medium">ไม่พบข้อมูลในช่วงเวลาที่เลือก</div>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={utilityData.roomDetails.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            startIndex={startIndex}
            endIndex={endIndex}
          />
        </div>
      </div>
    </div>
    </div>
  );
}

export default UtilitySummaryReport;
