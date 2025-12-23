import { BiMessageSquareDetail } from "react-icons/bi";
import { FaSearch, FaFilter, FaChevronLeft, FaChevronRight, FaUser, FaPhone, FaCalendarAlt, FaDoorOpen, FaHashtag } from "react-icons/fa";
import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Pagination from '../../../components/Pagination';
import ExcelExportButton from '../../../components/ExcelExportButton';

function MoveOutContract() {
  const navigate = useNavigate();
  const { dormId, roomNumber } = useParams();
  
  // State สำหรับข้อมูล
  const [moveOutData, setMoveOutData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State สำหรับการค้นหาและกรอง
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('checkOutDate');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // ดึงข้อมูล move-outs จาก API
  useEffect(() => {
    fetchMoveOutData();
  }, [dormId, roomNumber]);

  // ฟังก์ชันจัดรูปแบบวันที่ให้สวยงาม
  const formatDate = (dateString) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined') return '-';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return '-';
      }
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
      
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return '-';
    }
  };

  const fetchMoveOutData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ใช้ dormId จาก URL params หรือ default เป็น 1
      const currentDormId = dormId || 1;
      
      console.log('📡 กำลังดึงข้อมูลสัญญาผู้เช่าที่ย้ายออกสำหรับหอพัก:', currentDormId, 'ห้อง:', roomNumber);
      
      // เปลี่ยนจาก move-outs เป็น contracts เพื่อให้ได้ข้อมูลครบ
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3001/api/contracts/dormitories/${currentDormId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('✅ ข้อมูลสัญญาที่ได้รับ:', response.data.length, 'รายการ');
      
      if (response.data && Array.isArray(response.data)) {
        // กรองเฉพาะสัญญาที่ terminated (ย้ายออกแล้ว)
        let contractsData = response.data.filter(contract => 
          contract.status === 'terminated'
        );
        
        // จัดรูปแบบข้อมูลให้ตรงกับ component
        let formattedData = contractsData.map(contract => ({
          id: contract.contract_id,
          receiptNumber: contract.contract_id, // ใช้ contract_id แทน receipt_number
          checkInDate: contract.contract_start_date,
          checkOutDate: contract.contract_end_date,
          type: contract.room_type_name || 'รายเดือน',
          customer: `${contract.first_name} ${contract.last_name}`,
          phone: contract.phone_number,
          room: contract.room_number
        }));
        
        // กรองข้อมูลให้แสดงเฉพาะห้องที่เลือกจากหน้า room plan
        if (roomNumber) {
          formattedData = formattedData.filter(item => 
            item.room && item.room.toString() === roomNumber.toString()
          );
          console.log('🔍 กรองข้อมูลสำหรับห้อง', roomNumber, ':', formattedData.length, 'รายการ');
        }
        
        setMoveOutData(formattedData);
      } else {
        setMoveOutData([]);
      }
    } catch (error) {
      console.error('❌ Error fetching move out data:', error);
      setError('ไม่สามารถดึงข้อมูลการย้ายออกได้');
      setMoveOutData([]);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันกรองและค้นหาข้อมูล
  const filteredData = useMemo(() => {
    if (!moveOutData || moveOutData.length === 0) return [];
    
    let filtered = moveOutData.filter(item => 
      item.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone?.includes(searchTerm) ||
      item.room?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // เรียงลำดับข้อมูล
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'checkInDate' || sortBy === 'checkOutDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [moveOutData, searchTerm, sortBy, sortOrder]);

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

  // Reset หน้าเมื่อค้นหา
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // ฟังก์ชัน callback สำหรับ Excel Export
  const handleExportStart = () => {
    console.log('🔄 เริ่มส่งออก Excel...');
  };

  const handleExportComplete = (fileName) => {
    console.log(`✅ ส่งออก Excel สำเร็จ: ${fileName}`);
  };

  // เตรียมข้อมูลสำหรับ Excel Export โดยจัดรูปแบบวันที่
  const excelData = filteredData.map((item, index) => ({
    index: index + 1,
    customer: item.customer || '-',
    phone: item.phone || '-',
    room: item.room || '-',
    checkInDate: formatDate(item.checkInDate),
    checkOutDate: formatDate(item.checkOutDate),
    type: item.type || '-'
  }));

  // กำหนด columns mapping สำหรับ Excel Export
  const excelColumns = {
    index: 'ลำดับ',
    customer: 'ชื่อ-นามสกุล',
    phone: 'เบอร์โทร',
    room: 'ห้อง',
    checkInDate: 'วันเข้าพัก',
    checkOutDate: 'วันที่ย้ายออก',
    type: 'ประเภทห้อง'
  };

  const handleViewDetail = (moveOutItem) => {
    const currentDormId = dormId || 1;
    // ใช้ receiptNumber จาก API ที่เป็น receipt_number
    const receiptNumber = moveOutItem.receiptNumber;
    const targetPath = `/dorm/${currentDormId}/move-out/detail/${receiptNumber}`;
    console.log('🔍 นำทางไปยัง MoveOutDetail:', { 
      moveOutItem, 
      receiptNumber, 
      currentDormId, 
      targetPath,
      fullApiUrl: `http://localhost:3001/api/contract-terminations/dormitories/${currentDormId}/move-outs/${receiptNumber}`
    });
    navigate(targetPath);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">การย้ายออก</h1>
            <p className="text-gray-600">จัดการและติดตามประวัติการย้ายออกของผู้เช่า</p>
          </div>
          <ExcelExportButton
            data={excelData}
            columns={excelColumns}
            fileName={`ประวัติการย้ายออก${roomNumber ? `_ห้อง${roomNumber}` : ''}`}
            sheetName="ประวัติการย้ายออก"
            buttonText="ส่งออก Excel"
            onExportStart={handleExportStart}
            onExportComplete={handleExportComplete}
            disabled={loading}
          />
        </div>
      </div>

      {/* ช่องค้นหาและกรอง */}
      <div className="bg-white rounded-md shadow-sm border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* ช่องค้นหา */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหา ชื่อ, เบอร์โทร, ห้อง..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            />
          </div>

          {/* เรียงลำดับ */}
          <div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [column, order] = e.target.value.split('-');
                setSortBy(column);
                setSortOrder(order);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            >
              <option value="checkOutDate-desc">วันที่ย้ายออก (ล่าสุด)</option>
              <option value="checkOutDate-asc">วันที่ย้ายออก (เก่าสุด)</option>
              <option value="checkInDate-desc">วันเข้าพัก (ล่าสุด)</option>
              <option value="checkInDate-asc">วันเข้าพัก (เก่าสุด)</option>
              <option value="customer-asc">ชื่อ (A-Z)</option>
              <option value="customer-desc">ชื่อ (Z-A)</option>
            </select>
          </div>

          {/* จำนวนรายการต่อหน้า */}
          <div>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            >
              <option value={5}>5 รายการ/หน้า</option>
              <option value={10}>10 รายการ/หน้า</option>
              <option value={20}>20 รายการ/หน้า</option>
              <option value={50}>50 รายการ/หน้า</option>
            </select>
          </div>

          {/* สถิติ */}
          <div className="flex items-center justify-center bg-gray-50 rounded-md px-4 py-2">
            <span className="text-gray-600 font-medium">
              พบ {filteredData.length} จาก {moveOutData.length} รายการ
            </span>
          </div>
        </div>
      </div>

      {/* ตารางข้อมูล */}
      <div className="bg-white rounded-md shadow border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-4">
          <h3 className="text-white font-semibold text-lg flex items-center gap-3">
            {roomNumber ? `ประวัติการย้ายออก - ห้อง ${roomNumber}` : 'ประวัติการย้ายออก'}
            <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm ml-auto">
              <span className='text-gray-600'>{loading ? '...' : filteredData.length} รายการ</span>
            </span>
          </h3>
        </div>

        <div>
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mb-4"></div>
                <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <p className="text-red-600 font-semibold mb-2">เกิดข้อผิดพลาด</p>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={fetchMoveOutData}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  ลองใหม่อีกครั้ง
                </button>
              </div>
            </div>
          )}

          {/* ตารางข้อมูล - แสดงเฉพาะเมื่อไม่ loading และไม่มี error */}
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-900">
                    <th className="px-4 py-3 text-center font-semibold first:rounded-tl-md">ลำดับ</th>
                    <th className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('customer')}>
                      ชื่อ-นามสกุล {sortBy === 'customer' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold">เบอร์โทร</th>
                    <th className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('checkInDate')}>
                      วันเข้าพัก {sortBy === 'checkInDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleSort('checkOutDate')}>
                      วันที่ย้ายออก {sortBy === 'checkOutDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold last:rounded-tr-md">รายละเอียด</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {currentData.length > 0 ? (
                    currentData.map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="px-4 py-3 text-center text-gray-900 font-bold">
                          <div className="flex items-center justify-center gap-2">
                            <FaHashtag className="text-gray-400 text-xs" />
                            {startIndex + index + 1}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700 font-medium">
                          <div className="flex items-center justify-center gap-2">
                            <FaUser className="text-blue-500 text-sm" />
                            {item.customer}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-2 px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs font-medium">
                            <FaPhone className="text-xs" />
                            {item.phone}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2 text-gray-600 font-medium">
                            <FaCalendarAlt className="text-purple-500 text-sm" />
                            {formatDate(item.checkInDate)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center justify-center gap-2 font-medium bg-red-50 text-red-700 px-3 py-1 rounded-full text-sm">
                            <FaDoorOpen className="text-xs" />
                            {formatDate(item.checkOutDate)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
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
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <FaSearch className="text-4xl text-gray-300" />
                          <p>ไม่พบข้อมูลที่ค้นหา</p>
                          <p className="text-sm">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              
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
      </div>
    </div>
  );
}

export default MoveOutContract;
