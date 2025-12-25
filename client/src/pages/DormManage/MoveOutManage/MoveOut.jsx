import React, { useState, useMemo, useEffect } from 'react';
import { BiMessageSquareDetail } from "react-icons/bi";
import { FaSearch, FaFilter,FaUser, FaHome, FaPhone, FaCalendarAlt, FaCheck} from 'react-icons/fa';
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Pagination from "../../../components/common/Pagination";
import ExcelExportButton from "../../../components/common/ExcelExportButton";
import { BsPersonFillX } from "react-icons/bs";
import API_URL from '../../../config/api';

function MoveOut() {
  const navigate = useNavigate();
  const { dormId } = useParams();
  
  // States
  const [moveOutData, setMoveOutData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('checkOutDate');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    const fetchMoveOutData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/contracts/dormitories/${dormId}/terminated`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data && Array.isArray(response.data)) {
          setMoveOutData(response.data);
        } else {
          console.error('❌ ไม่สามารถดึงข้อมูลการย้ายออกได้');
          setMoveOutData([]);
        }
      } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลการย้ายออก:', error);
        setMoveOutData([]);
      } finally {
        setLoading(false);
      }
    };

    if (dormId) {
      fetchMoveOutData();
    }
  }, [dormId]);

  // ฟังก์ชันกรองและค้นหาข้อมูล
  const filteredData = useMemo(() => {
    let filtered = moveOutData.filter(item => {
      const tenant = `${item.first_name || ''} ${item.last_name || ''}`.trim();
      const phone = item.phone_number || '';
      const room = item.room_number || '';
      
      return tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
             phone.includes(searchTerm) ||
             room.toString().toLowerCase().includes(searchTerm.toLowerCase());
    });

        // กรองตามวันที่ย้ายออก
        if (filterType !== 'all') {
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          filtered = filtered.filter(item => {
            const checkOutDate = new Date(item.termination_date);
            if (isNaN(checkOutDate.getTime())) return false;
            const checkOutDateOnly = new Date(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate());
            
            switch (filterType) {
              case 'this_week':
                // ย้ายออกในสัปดาห์นี้
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                return checkOutDateOnly >= startOfWeek && checkOutDateOnly <= endOfWeek;
                
              case 'this_month':
                // ย้ายออกในเดือนนี้
                return checkOutDate.getMonth() === now.getMonth() && 
                       checkOutDate.getFullYear() === now.getFullYear();
                
              case 'last_month':
                // ย้ายออกในเดือนที่แล้ว
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                return checkOutDate.getMonth() === lastMonth.getMonth() && 
                       checkOutDate.getFullYear() === lastMonth.getFullYear();
                

                
              case 'this_year':
                // ย้ายออกในปีนี้
                return checkOutDate.getFullYear() === now.getFullYear();
                
              case 'last_year':
                // ย้ายออกในปีที่แล้ว
                return checkOutDate.getFullYear() === (now.getFullYear() - 1);
                
              default:
                return true;
            }
          });
        }
        
        // เรียงลำดับข้อมูล
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      if (sortBy === 'tenant') {
        aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim();
        bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim();
      } else if (sortBy === 'room') {
        aValue = a.room_number || '';
        bValue = b.room_number || '';
      } else if (sortBy === 'checkInDate') {
        aValue = new Date(a.contract_start_date);
        bValue = new Date(b.contract_start_date);
      } else if (sortBy === 'checkOutDate') {
        aValue = new Date(a.termination_date);
        bValue = new Date(b.termination_date);
      } else {
        aValue = a[sortBy];
        bValue = b[sortBy];
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [moveOutData, searchTerm, filterType, sortBy, sortOrder]);

  // การแบ่งหน้า
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // ฟังก์ชันจัดการการเปลี่ยนหน้า
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // ฟังก์ชันจัดการการเปลี่ยนจำนวนรายการต่อหน้า
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // รีเซ็ตไปหน้าแรกเมื่อเปลี่ยนจำนวนรายการต่อหน้า
  };

  // Reset หน้าเมื่อค้นหาหรือเปลี่ยน filter
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setCurrentPage(1);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const formatThaiDate = (dateString) => {
    if (!dateString) return 'ไม่ระบุ';
    
    const date = new Date(dateString);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) return 'วันที่ไม่ถูกต้อง';
    
    // Format manually to avoid locale issues
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear() + 543; // Convert to Buddhist Era
    
    return `${day}/${month}/${year}`;
  };

  const getDateStatus = (dateString) => {
    if (!dateString) return { status: 'unknown', label: 'ไม่ระบุ', color: 'bg-gray-100 text-gray-600' };
    
    const checkOutDate = new Date(dateString);
    if (isNaN(checkOutDate.getTime())) {
      return { status: 'invalid', label: 'วันที่ไม่ถูกต้อง', color: 'bg-red-100 text-red-600' };
    }
    
    const today = new Date();
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const checkOutOnly = new Date(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate());
    
    if (checkOutOnly < todayOnly) {
      // คำนวณจำนวนวันที่ผ่านมา
      const daysDiff = Math.floor((todayOnly - checkOutOnly) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 7) {
        return { status: 'recent', label: `${daysDiff} วันที่แล้ว`, color: 'bg-green-100 text-green-800' };
      } else if (daysDiff <= 30) {
        return { status: 'past_month', label: 'เมื่อเดือนที่แล้ว', color: 'bg-blue-100 text-blue-800' };
      } else if (daysDiff <= 365) {
        return { status: 'past_year', label: 'ปีนี้', color: 'bg-gray-100 text-gray-800' };
      } else {
        return { status: 'long_ago', label: 'นานแล้ว', color: 'bg-gray-200 text-gray-600' };
      }
    } else if (checkOutOnly.getTime() === todayOnly.getTime()) {
      return { status: 'today', label: 'วันนี้', color: 'bg-orange-100 text-orange-800' };
    } else {
      return { status: 'future', label: 'ในอนาคต', color: 'bg-purple-100 text-purple-800' };
    }
  };

  // เตรียมข้อมูลสำหรับ Export Excel
  const exportData = useMemo(() => {
    return filteredData.map((item, index) => {
      const checkIn = new Date(item.contract_start_date);
      const checkOut = new Date(item.termination_date);
      
      // ตรวจสอบว่าวันที่ valid หรือไม่
      const isCheckInValid = !isNaN(checkIn.getTime());
      const isCheckOutValid = !isNaN(checkOut.getTime());
      
      let durationText = 'ไม่ระบุ';
      if (isCheckInValid && isCheckOutValid) {
        const daysDiff = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        
        // ตรวจสอบว่า daysDiff เป็นตัวเลขที่ valid หรือไม่
        if (!isNaN(daysDiff) && daysDiff >= 0) {
          const months = Math.floor(daysDiff / 30);
          const remainingDays = daysDiff % 30;
          
          if (months > 0) {
            durationText = `${months} เดือน`;
            if (remainingDays > 0) {
              durationText += ` ${remainingDays} วัน`;
            }
          } else {
            durationText = `${daysDiff} วัน`;
          }
        }
      }

      return {
        room: item.room_number || 'ไม่ระบุ',
        tenant: `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'ไม่ระบุ',
        phone: item.phone_number || 'ไม่ระบุ',
        checkInDate: formatThaiDate(item.contract_start_date),
        checkOutDate: formatThaiDate(item.termination_date),
        duration: durationText,
      };
    });
  }, [filteredData]);

  // กำหนดคอลัมน์สำหรับ Excel
  const excelColumns = {
    room: 'ห้อง',
    tenant: 'ชื่อ-นามสกุล',
    phone: 'เบอร์โทร',
    checkInDate: 'วันเข้าพัก',
    checkOutDate: 'วันย้ายออก',
    duration: 'ระยะเวลาเช่า',
  };

  const handleViewDetail = (item) => {
    // นำทางไปยังหน้ารายละเอียดการย้ายออก - ใช้ contract_id
    const contractId = item.contract_id;
    if (!contractId) {
      alert('ไม่พบข้อมูลสัญญา กรุณาลองอีกครั้ง');
      return;
    }
    console.log('Navigating to MoveOutDetail for contract:', { contractId, item });
    navigate(`/dorm/${dormId}/move-out/detail/${contractId}`);
  };



  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <div className="bg-white p-4 border border-gray-300 rounded-t-md flex flex-col md:flex-row md:items-center md:justify-between shadow mb-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
              <BsPersonFillX className="text-gray-700 text-3xl" />
              ประวัติการย้ายออก
            </h1>
            <p className="text-gray-700 mt-1">รายชื่อผู้เช่าที่ย้ายออกไปแล้ว และข้อมูลการสิ้นสุดสัญญา</p>
          </div>
          <ExcelExportButton
            data={exportData}
            columns={excelColumns}
            fileName="ประวัติการย้ายออก"
            sheetName="ประวัติการย้ายออก"
            buttonText="ส่งออก Excel"
            className="mt-4 md:mt-0"
          />
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white p-4 rounded-b-md shadow border border-gray-300 -mt-1 mb-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">ค้นหาและกรองข้อมูล</h3>
          
          {/* สถิติสรุป */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-md border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">ทั้งหมด</p>
                  <p className="text-2xl font-bold text-blue-800">{moveOutData.length}</p>
                </div>
                <FaUser className="text-3xl text-blue-400" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-md border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">สัปดาห์นี้</p>
                  <p className="text-2xl font-bold text-red-800">
                    {moveOutData.filter(item => {
                      const checkOutDate = new Date(item.termination_date);
                      if (isNaN(checkOutDate.getTime())) return false;
                      const today = new Date();
                      const startOfWeek = new Date(today);
                      startOfWeek.setDate(today.getDate() - today.getDay());
                      const endOfWeek = new Date(startOfWeek);
                      endOfWeek.setDate(startOfWeek.getDate() + 6);
                      return checkOutDate >= startOfWeek && checkOutDate <= endOfWeek;
                    }).length}
                  </p>
                </div>
                <FaCalendarAlt className="text-3xl text-red-400" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-md border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">เดือนนี้</p>
                  <p className="text-2xl font-bold text-green-800">
                    {moveOutData.filter(item => {
                      const checkOutDate = new Date(item.termination_date);
                      if (isNaN(checkOutDate.getTime())) return false;
                      const now = new Date();
                      return checkOutDate.getMonth() === now.getMonth() && 
                             checkOutDate.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </div>
                <FaCheck className="text-3xl text-green-400" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-md border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">ปีนี้</p>
                  <p className="text-2xl font-bold text-orange-800">
                    {moveOutData.filter(item => {
                      const checkOutDate = new Date(item.termination_date);
                      if (isNaN(checkOutDate.getTime())) return false;
                      const now = new Date();
                      return checkOutDate.getFullYear() === now.getFullYear();
                    }).length}
                  </p>
                </div>
                <FaCheck className="text-3xl text-orange-400" />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ค้นหา ชื่อ, เบอร์โทร, ห้อง
              </label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหา ชื่อ, เบอร์โทร, ห้อง..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white"
                />
              </div>
            </div>

            {/* Filter Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                กรองตามวันที่ย้ายออก
              </label>
              <div className="relative">
                <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="this_week">สัปดาห์นี้</option>
                  <option value="this_month">เดือนนี้</option>
                  <option value="last_month">เดือนที่แล้ว</option>

                  <option value="this_year">ปีนี้</option>
                  <option value="last_year">ปีที่แล้ว</option>
                </select>
              </div>
            </div>

            {/* Items per page */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                จำนวนรายการต่อหน้า
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white"
              >
                <option value={10}>10 รายการ/หน้า</option>
                <option value={20}>20 รายการ/หน้า</option>
                <option value={50}>50 รายการ/หน้า</option>
              </select>
            </div>
          </div>
          
          {/* Reset Filters Button */}
          {(searchTerm || filterType !== 'all') && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors flex items-center gap-2"
              >
                <span>ล้างการกรอง</span>
                <span className="text-xs bg-gray-600 text-white px-2 py-1 rounded-full">
                  {filteredData.length} รายการ
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table Section */}
      {loading ? (
        <div className="bg-white rounded-md shadow border border-gray-200 overflow-hidden">
          <div className="p-12 text-center">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mb-4"></div>
              <p className="text-gray-600">กำลังโหลดข้อมูลการย้ายออก...</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-md shadow-sm overflow-hidden mb-6 border border-gray-300">
        {/* Table Header */}
        <div className="bg-white text-gray-700 p-4 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700">ประวัติการย้ายออกที่สมบูรณ์</h2>
          <div className="text-sm text-gray-700">
            แสดง <span className="font-medium">{startIndex + 1}</span>-<span className="font-medium">{Math.min(endIndex, filteredData.length)}</span> จาก <span className="font-medium">{filteredData.length}</span> รายการ
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('room')}>
                  ห้อง {sortBy === 'room' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('tenant')}>
                  ชื่อ-นามสกุล {sortBy === 'tenant' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เบอร์โทร</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('checkInDate')}>
                  วันเข้าพัก {sortBy === 'checkInDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('checkOutDate')}>
                  วันที่ย้ายออก {sortBy === 'checkOutDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ระยะเวลาเช่า</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <FaUser className="text-4xl text-gray-300 mb-2" />
                      <p>ไม่พบข้อมูลที่ค้นหา</p>
                      <p className="text-sm">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentData.map((item, index) => (
                  <tr key={item.contract_id || `moveout-${index}`} className="hover:bg-gray-50"> 
                    <td className="px-6 py-4 text-sm text-gray-600">{startIndex + index + 1}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FaHome className="text-gray-600" />
                        <span className="font-bold text-gray-900">{item.room_number || 'ไม่ระบุ'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FaUser className="text-gray-500" />
                        <span className="font-medium text-gray-700">
                          {`${item.first_name || ''} ${item.last_name || ''}`.trim() || 'ไม่ระบุ'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                        <FaPhone className="text-blue-600" />
                        {item.phone_number || 'ไม่ระบุ'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{formatThaiDate(item.contract_start_date)}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-gray-800">{formatThaiDate(item.termination_date)}</span>
                        <span className={`inline-flex w-fit items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getDateStatus(item.termination_date).color}`}>
                          <FaCalendarAlt />
                          {getDateStatus(item.termination_date).label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      <div className="text-sm text-gray-600">
                        {(() => {
                          const checkIn = new Date(item.contract_start_date);
                          const checkOut = new Date(item.termination_date);
                          
                          // ตรวจสอบว่าวันที่ valid หรือไม่
                          if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
                            return <span className="text-gray-500">ไม่ระบุ</span>;
                          }
                          
                          const daysDiff = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                          
                          // ตรวจสอบว่า daysDiff เป็นตัวเลขที่ valid หรือไม่
                          if (isNaN(daysDiff) || daysDiff < 0) {
                            return <span className="text-gray-500">ไม่ระบุ</span>;
                          }
                          
                          const months = Math.floor(daysDiff / 30);
                          const remainingDays = daysDiff % 30;
                          
                          if (months > 0) {
                            return (
                              <div>
                                <span className="font-medium text-blue-700">{months}</span>
                                <span className="text-blue-600"> เดือน</span>
                                {remainingDays > 0 && (
                                  <>
                                    <span className="font-medium text-blue-700"> {remainingDays}</span>
                                    <span className="text-blue-600"> วัน</span>
                                  </>
                                )}
                              </div>
                            );
                          } else {
                            return (
                              <div>
                                <span className="font-medium text-blue-700">{daysDiff}</span>
                                <span className="text-blue-600"> วัน</span>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => handleViewDetail(item)}
                        className="inline-flex items-center justify-center gap-1 text-sm text-gray-600 hover:text-blue-600 hover:underline transition-colors"
                      >
                        <BiMessageSquareDetail className="text-base" />
                        <span>ดูรายละเอียด</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredData.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            startIndex={startIndex}
            endIndex={endIndex}
          />
        </div>
      </div>
      )}
    </div>
  );
}

export default MoveOut;
