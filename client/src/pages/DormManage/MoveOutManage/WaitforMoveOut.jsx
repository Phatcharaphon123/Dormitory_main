import React, { useState, useMemo } from 'react'
import { FaCalendarAlt, FaUser, FaHome, FaClock, FaEye, FaEdit, FaTrash, FaSearch, FaFilter, FaExclamationTriangle, FaCheckCircle, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import Pagination from '../../../components/Pagination';
import ExcelExportButton from '../../../components/ExcelExportButton';
import { FaBusinessTime } from "react-icons/fa6";
import { BsPersonFillX,BsPersonFillExclamation } from "react-icons/bs";
import API_URL from '../../../config/api';

// ฟังก์ชันแปลงวันที่เป็นรูปแบบไทย
const formatThaiDate = (dateString) => {
  if (!dateString) return 'ไม่ระบุ';
  
  // ถ้าเป็น YYYY-MM-DD format ให้แปลงโดยตรงเพื่อหลีกเลี่ยงปัญหา timezone
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateString.split('-').map(Number);
    const thaiYear = year + 543;
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${thaiYear}`;
  }
  
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) return 'วันที่ไม่ถูกต้อง';
  
  // Format manually to avoid locale issues
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear() + 543; // Convert to Buddhist Era
  
  return `${day}/${month}/${year}`;
};

function MoveOutPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCancelPopup, setShowCancelPopup] = useState(false);
  const [selectedMoveOut, setSelectedMoveOut] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('moveOutDate');
  const [sortOrder, setSortOrder] = useState('asc');
  const { dormId } = useParams();

  const [pendingMoveOuts, setPendingMoveOuts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  
  React.useEffect(() => {
    if (dormId) {
      fetchMoveOuts();
    } else {
      console.warn("⚠️ dormId is undefined, waiting...");
    }
  }, [dormId]);

  const fetchMoveOuts = async () => {
    if (!dormId) {
      console.warn("⚠️ dormId is missing");
      setError("ไม่พบรหัสหอพัก");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/contracts/dormitories/${dormId}/moveout-list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.data || !Array.isArray(res.data)) {
        setPendingMoveOuts([]);
        setLoading(false);
        return;
      }

      if (res.data.length === 0) {
        setPendingMoveOuts([]);
        setLoading(false);
        return;
      }

      const data = res.data.map(item => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to midnight
        
        let moveOutDate = '-';
        let daysLeft = '-';
        let status = 'pending';
        
        if (item.moveout_notice_date) {
          const moveOutDateObj = new Date(item.moveout_notice_date);
          if (!isNaN(moveOutDateObj)) {
            // ใช้วันที่จริงใน local timezone แทนการใช้ UTC
            const year = moveOutDateObj.getFullYear();
            const month = String(moveOutDateObj.getMonth() + 1).padStart(2, '0');
            const day = String(moveOutDateObj.getDate()).padStart(2, '0');
            moveOutDate = `${year}-${month}-${day}`;
            
            // Calculate days difference correctly using local date
            const moveOutLocal = new Date(year, moveOutDateObj.getMonth(), moveOutDateObj.getDate());
            const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            daysLeft = Math.ceil((moveOutLocal.getTime() - todayLocal.getTime()) / (1000 * 60 * 60 * 24));
            
            // Set status based on days left
            if (daysLeft < 0) {
              status = 'overdue';
            } else if (daysLeft === 0) {
              status = 'confirmed';
            } else {
              status = 'pending';
            }
          }
        }
        // deposit: ให้แสดง 0 ได้
        let deposit = '-';
        if (item.deposit !== undefined && item.deposit !== null) deposit = item.deposit;

        return {
          id: item.contract_id || '',
          roomNumber: item.room_number || '-',
          tenantName: `${item.first_name || ''} ${item.last_name || ''}`.trim() || '-',
          phone: item.phone_number || '-',
          notificationDate: item.notice_created_at?.split('T')[0] || '-',
          moveOutDate,
          daysLeft,
          status,
          deposit,
          lastPayment: item.last_payment_date?.split('T')[0] || '-',
        };
      });
      setPendingMoveOuts(data);
      setLastFetch(new Date().toLocaleTimeString('th-TH'));
    } catch (err) {
      console.error("❌ โหลดข้อมูลย้ายออกล้มเหลว:", err);
      setError(`เกิดข้อผิดพลาด: ${err.message}`);
      setPendingMoveOuts([]);
    } finally {
      setLoading(false);
    }
  };

  // กรองข้อมูลตามการค้นหาและสถานะ
  const filteredData = useMemo(() => {
    let filtered = pendingMoveOuts.filter(item => {
      const matchesSearch = item.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.phone.includes(searchTerm);
      const matchesFilter = filterStatus === 'all' || item.status === filterStatus; 
      return matchesSearch && matchesFilter;
    });

    // เรียงลำดับข้อมูล
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'notificationDate' || sortBy === 'moveOutDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else if (sortBy === 'daysLeft') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    return filtered;
  }, [pendingMoveOuts, searchTerm, filterStatus, sortBy, sortOrder]);

  // การแบ่งหน้า
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // เตรียมข้อมูลสำหรับ Export Excel
  const exportData = useMemo(() => {
    return filteredData.map((item, index) => {
      let statusText = 'ไม่ระบุ';
      if (item.status === 'pending') statusText = 'รอดำเนินการ';
      else if (item.status === 'confirmed') statusText = 'ย้ายออกวันนี้';
      else if (item.status === 'overdue') statusText = 'เกินกำหนด';

      let daysLeftText = 'ไม่ระบุ';
      if (item.daysLeft !== undefined && item.daysLeft !== null) {
        if (item.daysLeft < 0) {
          daysLeftText = `เกิน ${Math.abs(item.daysLeft)} วัน`;
        } else if (item.daysLeft === 0) {
          daysLeftText = 'วันนี้';
        } else {
          daysLeftText = `${item.daysLeft} วัน`;
        }
      }

      return {
        room: item.roomNumber || 'ไม่ระบุ',
        tenant: item.tenantName || 'ไม่ระบุ',
        phone: item.phone || 'ไม่ระบุ',
        notificationDate: formatThaiDate(item.notificationDate),
        moveOutDate: formatThaiDate(item.moveOutDate),
        daysLeft: daysLeftText,
        status: statusText,
      };
    });
  }, [filteredData]);

  // กำหนดคอลัมน์สำหรับ Excel
  const excelColumns = {
    room: 'ห้อง',
    tenant: 'ชื่อ-นามสกุล',
    phone: 'เบอร์โทร',
    notificationDate: 'วันแจ้ง',
    moveOutDate: 'วันย้ายออก',
    daysLeft: 'เหลือ (วัน)',
    status: 'สถานะ',
  };

  // ฟังก์ชันจัดการการเปลี่ยนหน้า
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // ฟังก์ชันจัดการการเปลี่ยนจำนวนรายการต่อหน้า
  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // รีเซ็ตไปหน้าแรกเมื่อเปลี่ยนจำนวนรายการต่อหน้า
  };

  // Reset หน้าเมื่อค้นหา
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getStatusBadge = (status, daysLeft) => {
    const numDays = typeof daysLeft === 'number' ? daysLeft : Number(daysLeft);
    if (status === 'overdue' || numDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
          <FaExclamationTriangle />
          เกินกำหนด
        </span>
      );
    } else if (status === 'confirmed') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
          <FaCheckCircle />
          ย้ายออกวันนี้
        </span>
      );
    } else if (numDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
          <FaClock />
          ใกล้กำหนด
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          <FaClock />
          รอดำเนินการ
        </span>
      );
    }
  };

  const getDaysLeftColor = (daysLeft) => {
    const numDays = typeof daysLeft === 'number' ? daysLeft : Number(daysLeft);
    if (numDays < 0) return 'text-red-600 font-bold';
    if (numDays <= 5) return 'text-orange-600 font-bold';
    if (numDays <= 10) return 'text-yellow-600 font-medium';
    return 'text-green-600';
  };

  const handleViewDetail = (moveOutId) => {
    navigate('/moveout-detail', { state: { moveOutId } });
  };

  const handleManageContract = (item) => {
    navigate(`/cancel-contract/${dormId}/${item.roomNumber}`, { 
      state: { 
        dormId,
        roomNumber: item.roomNumber,
        roomData: item 
      }
    });
  };

  const handleCancelMoveOut = (moveOut) => {
    setSelectedMoveOut(moveOut);
    setShowCancelPopup(true);
  };

  const confirmCancelMoveOut = async () => {
    try {
      console.log("🔄 กำลังยกเลิกการย้ายออกสำหรับ contract:", selectedMoveOut.id);
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/contracts/${selectedMoveOut.id}/cancel-moveout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("✅ ยกเลิกการย้ายออกสำเร็จ");
      
      setShowCancelPopup(false);
      setSelectedMoveOut(null);
      
      // 🔄 โหลดข้อมูลใหม่
      await fetchMoveOuts();
    } catch (err) {
      console.error('❌ Error cancelling moveout:', err);
      alert(`เกิดข้อผิดพลาดในการยกเลิกการย้ายออก: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <div className="bg-white p-4 border border-gray-300 rounded-t-md flex flex-col md:flex-row md:items-center md:justify-between shadow mb-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
              <BsPersonFillExclamation className="text-gray-700 text-3xl" />
              ห้องที่รอย้ายออก
            </h1>
            <p className="text-gray-700 mt-1">
              จัดการและติดตามห้องที่แจ้งย้ายออก
            </p>
          </div>
          <ExcelExportButton
            data={exportData}
            columns={excelColumns}
            fileName="รายการห้องรอย้ายออก"
            sheetName="ห้องที่รอย้ายออก"
            buttonText="ส่งออก Excel"
            className="mt-4 md:mt-0"
          />
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white p-4 rounded-b-md shadow border border-gray-300 -mt-1 mb-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">ค้นหาและกรองข้อมูล</h3>
          
          {/* สถิติรวม */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-md border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">ทั้งหมด</p>
                  <p className="text-2xl font-bold text-gray-800">{filteredData.length}</p>
                </div>
                <BsPersonFillExclamation className="text-3xl text-gray-400" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-md border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">ใกล้กำหนด</p>
                  <p className="text-2xl font-bold text-yellow-800">
                    {filteredData.filter(item => item.daysLeft <= 3 && item.daysLeft >= 0).length}
                  </p>
                </div>
                <FaClock className="text-3xl text-yellow-400" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-md border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">เกินกำหนด</p>
                  <p className="text-2xl font-bold text-red-800">
                    {filteredData.filter(item => item.status === 'overdue' || item.daysLeft < 0).length}
                  </p>
                </div>
                <FaExclamationTriangle className="text-3xl text-red-400" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-md border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">ย้ายออกวันนี้</p>
                  <p className="text-2xl font-bold text-green-800">
                    {filteredData.filter(item => item.status === 'confirmed').length}
                  </p>
                </div>
                <FaCheckCircle className="text-3xl text-green-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ค้นหา ชื่อ, เบอร์โทร, ห้อง
              </label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ค้นหาห้อง, ชื่อผู้เช่า หรือเบอร์โทร..."
                  className="w-full h-11 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          
            {/* Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                กรองตามสถานะ
              </label>
              <div className="flex items-center gap-2">
                <FaFilter className="text-gray-500" />
                <select
                  className="flex-1 h-11 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white"
                  value={filterStatus}
                  onChange={(e) => {
                    console.log("🔄 เปลี่ยนสถานะกรองจาก:", filterStatus, "เป็น:", e.target.value);
                    setFilterStatus(e.target.value);
                  }}
                >
                  <option value="all">ทุกสถานะ</option>
                  <option value="pending">รอดำเนินการ</option>
                  <option value="confirmed">ย้ายออกวันนี้</option>
                  <option value="overdue">เกินกำหนด</option>
                </select>
              </div>
            </div>

            {/* เรียงลำดับ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เรียงลำดับ
              </label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [column, order] = e.target.value.split('-');
                  setSortBy(column);
                  setSortOrder(order);
                }}
                className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white"
              >
                <option value="moveOutDate-asc">วันย้ายออก (เร็วสุด)</option>
                <option value="moveOutDate-desc">วันย้ายออก (ช้าสุด)</option>
                <option value="daysLeft-asc">เหลือวัน (น้อยสุด)</option>
                <option value="daysLeft-desc">เหลือวัน (มากสุด)</option>
                <option value="tenantName-asc">ชื่อ (A-Z)</option>
                <option value="tenantName-desc">ชื่อ (Z-A)</option>
              </select>
            </div>

            {/* จำนวนรายการต่อหน้า */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                จำนวนรายการ
              </label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-white"
              >
                <option value={5}>5 รายการ/หน้า</option>
                <option value={10}>10 รายการ/หน้า</option>
                <option value={20}>20 รายการ/หน้า</option>
                <option value={50}>50 รายการ/หน้า</option>
              </select>
            </div>
          </div>

          {/* สถิติ */}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-md shadow-sm overflow-hidden mb-6 border border-gray-300">
        {/* Table Header */}
        <div className="bg-white text-gray-700 p-4 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700">รายการห้องที่รอย้ายออก</h2>
          <div className="text-sm text-gray-700">
            แสดง <span className="font-medium">{startIndex + 1}</span>-<span className="font-medium">{Math.min(endIndex, filteredData.length)}</span> จาก <span className="font-medium">{filteredData.length}</span> รายการ
          </div>
        </div>

        <div>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-500 mb-2">กำลังโหลดข้อมูล...</h3>
              <p className="text-gray-400">รอสักครู่</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-400 text-6xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium text-red-500 mb-2">เกิดข้อผิดพลาด</h3>
              <p className="text-red-400 mb-4">{error}</p>
              <button 
                onClick={fetchMoveOuts}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                ลองใหม่
              </button>
            </div>
          ) : filteredData.length === 0 && pendingMoveOuts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-6xl mb-1">🏠</div>
              <h3 className="text-lg font-medium text-gray-500 mb-1">ไม่มีข้อมูลการย้ายออก</h3>
              <p className="text-gray-400 mb-2">ยังไม่มีห้องที่แจ้งย้ายออกในหอพักนี้</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-medium text-gray-500 mb-2">ไม่พบข้อมูลที่ค้นหา</h3>
              <p className="text-gray-400">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ห้อง</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('tenantName')}>
                      ผู้เช่า {sortBy === 'tenantName' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เบอร์โทร</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('notificationDate')}>
                      วันแจ้ง {sortBy === 'notificationDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('moveOutDate')}>
                      วันย้ายออก {sortBy === 'moveOutDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('daysLeft')}>
                      เหลือ (วัน) {sortBy === 'daysLeft' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {currentData.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-600">{startIndex + index + 1}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <FaHome className="text-gray-600" />
                          <span className="font-bold text-gray-900">{item.roomNumber}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <FaUser className="text-gray-500" />
                          <span className="font-medium text-gray-700">{item.tenantName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium">
                          {item.phone}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {item.notificationDate !== '-' ? formatThaiDate(item.notificationDate) : '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {item.moveOutDate !== '-' ? formatThaiDate(item.moveOutDate) : '-'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <span className={getDaysLeftColor(item.daysLeft)}>
                          {item.daysLeft < 0 ? `เกิน ${Math.abs(item.daysLeft)} วัน` : `${item.daysLeft} วัน`}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {getStatusBadge(item.status, item.daysLeft)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <button
                            className="p-2 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                            title="จัดการสัญญา"
                            onClick={() => handleManageContract(item)}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                            title="ยกเลิกการย้ายออก"
                            onClick={() => handleCancelMoveOut(item)}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
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
      </div>

      {/* Confirmation Popup */}
      {showCancelPopup && (
        <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-20 ">
          <div className="bg-white rounded-md p-6 w-96 max-w-md mx-4">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <FaExclamationTriangle className="h-6 w-6 text-red-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ยืนยันการยกเลิกการย้ายออก
              </h3>
              
              <p className="text-sm text-gray-500 mb-6">
                คุณต้องการยกเลิกการย้ายออกของห้อง <span className="font-semibold text-red-600">{selectedMoveOut?.roomNumber}</span> 
                <br />ผู้เช่า: <span className="font-semibold">{selectedMoveOut?.tenantName}</span> ใช่หรือไม่?
              </p>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowCancelPopup(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmCancelMoveOut}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  ยืนยันยกเลิกการย้ายออก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MoveOutPage
