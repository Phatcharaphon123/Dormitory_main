import React, { useState, useEffect } from 'react';
import { FaSearch, FaEye, FaEdit, FaExclamationTriangle, FaClock, FaMoneyBillWave, FaChevronLeft, FaChevronRight, FaWallet, FaReceipt, FaHourglassHalf } from "react-icons/fa";
import { Link, useNavigate, useParams } from "react-router-dom";
import Pagination from "../../../components/common/Pagination";
import ExcelExportButton from "../../../components/common/ExcelExportButton";
import { FaFileInvoiceDollar } from "react-icons/fa6";
import API_URL from '../../../config/api';
import axios from 'axios';

function PendingBills() {
  const navigate = useNavigate();
  const { dormId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [sortBy, setSortBy] = useState('dueDate'); // dueDate, amount, roomNumber
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลบิลค้างชำระจาก API
  useEffect(() => {
    const fetchPendingBills = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_URL}/api/bills/dormitories/${dormId}/invoices/pending`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = response.data;
        
        if (data.success) {
          const formattedBills = data.data.bills.map(bill => {
            return {
              id: bill.invoice_receipt_id, // แก้ไขจาก invoice_id เป็น invoice_receipt_id
              roomNumber: bill.room_number,
              tenantName: bill.tenant_name || 'ไม่มีผู้เช่า',
              month: bill.month,
              totalAmount: parseFloat(bill.total_amount),
              status: bill.bill_status || bill.status, // ใช้ bill_status หรือ status
              dueDate: bill.due_date,
              daysOverdue: parseInt(bill.days_overdue) || 0,
              billNumber: bill.invoice_number
            };
          });
          
          // กรองข้อมูลซ้ำตาม invoice_receipt_id
          const uniqueBills = formattedBills.filter((bill, index, self) => 
            index === self.findIndex(b => b.id === bill.id)
          );
        
          setBills(uniqueBills);
        } else {
          console.error('Error fetching pending bills:', data.message);
          setBills([]);
        }
      } catch (error) {
        console.error('Error fetching pending bills:', error);
        setBills([]);
      } finally {
        setLoading(false);
      }
    };

    if (dormId) {
      fetchPendingBills();
    }
  }, [dormId]);

  // Filter and sort bills
  useEffect(() => {
    let filtered = bills.filter(bill => 
      bill.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Sort bills
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return new Date(a.dueDate) - new Date(b.dueDate);
        case 'amount':
          return b.totalAmount - a.totalAmount;
        case 'roomNumber':
          return a.roomNumber.localeCompare(b.roomNumber);
        case 'daysOverdue':
          return b.daysOverdue - a.daysOverdue;
        default:
          return 0;
      }
    });
    
    setFilteredBills(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [bills, searchTerm, sortBy]);

  const getStatusColor = (status, daysOverdue) => {
    if (status === 'overdue' || daysOverdue > 30) {
      return 'text-red-600 bg-red-100 border-red-200';
    } else if (daysOverdue > 7) {
      return 'text-orange-600 bg-orange-100 border-orange-200';
    }
    return 'text-yellow-600 bg-yellow-100 border-yellow-200';
  };

  const getStatusText = (status, daysOverdue) => {
    if (status === 'overdue' || daysOverdue > 30) {
      return `เกินกำหนด ${daysOverdue} วัน`;
    } else if (daysOverdue > 7) {
      return `ค้างชำระ ${daysOverdue} วัน`;
    }
    return `รอชำระเงิน`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('th-TH');
  };

  const formatMonth = (monthString) => {
    const date = new Date(monthString);
    // แสดงแค่เดือนและปี
    return date.toLocaleDateString('th-TH', { 
      year: 'numeric', 
      month: 'long'
    });
  };

  const totalStats = {
    total: filteredBills.length,
    pending: filteredBills.filter(bill => bill.status === 'pending').length,
    overdue: filteredBills.filter(bill => bill.status === 'overdue').length,
    totalAmount: filteredBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
    overdueAmount: filteredBills.filter(bill => bill.status === 'overdue').reduce((sum, bill) => sum + bill.totalAmount, 0)
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBills = filteredBills.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleSendReminder = (billId) => {
    alert(`ส่งการแจ้งเตือนสำหรับบิล ID: ${billId} เรียบร้อยแล้ว`);
  };

  const handleMarkAsPaid = (billId) => {
    if (window.confirm('ต้องการทำเครื่องหมายเป็นชำระแล้วหรือไม่?')) {
      setBills(prevBills => prevBills.filter(bill => bill.id !== billId));
      alert('อัพเดทสถานะเรียบร้อยแล้ว');
    }
  };

  const handleEditBill = (billId) => {
    console.log('🔍 handleEditBill called with:', { billId, dormId });
    console.log('🔍 Navigation URL:', `/bills-room/${dormId}/${billId}`);
    
    // ตรวจสอบว่า billId มีค่าหรือไม่
    if (!billId) {
      console.error('❌ Bill ID is missing');
      alert('ไม่พบรหัสบิล กรุณาลองใหม่อีกครั้ง');
      return;
    }
    
    try {
      // ไปยังหน้า MonthDetailBills ของบิลนั้นๆ
      navigate(`/bills-room/${dormId}/${billId}`);
    } catch (error) {
      console.error('❌ Navigation error:', error);
      alert('เกิดข้อผิดพลาดในการนำทาง');
    }
  };

  // เตรียมข้อมูลสำหรับ Excel Export
  const exportData = filteredBills.map(bill => ({
    room_number: bill.roomNumber,
    tenant_name: bill.tenantName,
    bill_number: bill.billNumber,
    month: formatMonth(bill.month),
    total_amount: bill.totalAmount,
    due_date: formatDate(bill.dueDate),
    days_overdue: bill.daysOverdue,
    status: getStatusText(bill.status, bill.daysOverdue)
  }));

  // กำหนดคอลัมน์สำหรับ Excel
  const excelColumns = {
    room_number: 'เลขห้อง',
    tenant_name: 'ชื่อผู้เช่า',
    bill_number: 'เลขที่บิล',
    month: 'เดือน',
    total_amount: 'จำนวนเงิน (บาท)',
    due_date: 'วันที่ครบกำหนด',
    days_overdue: 'จำนวนวันค้าง',
    status: 'สถานะ'
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
            <FaFileInvoiceDollar className="text-gray-700 text-3xl" />
            บิลค้างชำระ
          </h1>
          <p className="text-gray-600 mt-1">จัดการบิลที่ยังไม่ได้รับการชำระเงิน</p>
        </div>
        <ExcelExportButton
          data={exportData}
          columns={excelColumns}
          fileName="บิลค้างชำระ"
          sheetName="บิลค้างชำระ"
          buttonText="ส่งออก Excel"
          className=""
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4 mb-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaSearch className="inline w-4 h-4 mr-1" />
              ค้นหาบิลค้างชำระ
            </label>
            <input
              type="text"
              placeholder="ค้นหาเลขห้อง, ชื่อผู้เช่า หรือเลขที่บิล..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div className="md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เรียงตาม
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full h-11 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="daysOverdue">วันค้างชำระมากที่สุด</option>
              <option value="dueDate">วันกำหนดชำระ</option>
              <option value="amount">จำนวนเงินมากที่สุด</option>
              <option value="roomNumber">เลขห้อง</option>
            </select>
          </div>
          <div className="md:w-32">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              แสดง
            </label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="w-full h-11 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value={5}>5 รายการ</option>
              <option value={10}>10 รายการ</option>
              <option value={20}>20 รายการ</option>
              <option value={50}>50 รายการ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-600 mb-1">ยอดค้างชำระรวม</h3>
              <p className="text-2xl font-bold text-blue-900">฿{totalStats.totalAmount.toLocaleString()}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-md">
              <FaWallet className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-red-600 mb-1">บิลค้างชำระทั้งหมด</h3>
              <p className="text-2xl font-bold text-red-900">{totalStats.total}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-md">
              <FaReceipt className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-yellow-600 mb-1">รอชำระ</h3>
              <p className="text-2xl font-bold text-yellow-900">{totalStats.pending}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-md">
              <FaHourglassHalf className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-orange-600 mb-1">เกินกำหนด</h3>
              <p className="text-2xl font-bold text-orange-900">{totalStats.overdue}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-md">
              <FaExclamationTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Bills Table */}
      <div className="bg-white rounded-md shadow border border-gray-300 overflow-hidden">
        <div className="p-4 border-b border-gray-200 ">
          <div className="flex justify-between items-center">
            <h3 className="text-lg text-gray-700 font-semibold flex items-center gap-2">
              รายการบิลค้างชำระ
            </h3>
            <div className="text-sm text-gray-700">
              แสดง {startIndex + 1}-{Math.min(endIndex, filteredBills.length)} จาก {filteredBills.length} รายการ
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-md h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-500">กำลังโหลดข้อมูลบิลค้างชำระ...</p>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-green-500 mb-4">
              <FaMoneyBillWave className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-gray-500 text-lg">ไม่มีบิลค้างชำระ</p>
            <p className="text-gray-400 text-sm">ผู้เช่าทุกคนชำระเงินครบแล้ว</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ห้อง
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เลขที่บิล
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เดือน
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ยอดรวม
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    กำหนดชำระ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentBills.map((bill, index) => (
                  <tr key={`bill-${bill.id}-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-600">ห้อง {bill.roomNumber}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{bill.tenantName}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-600">{bill.billNumber}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{formatMonth(bill.month)}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-semibold text-red-600">
                        ฿{bill.totalAmount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{formatDate(bill.dueDate)}</div>
                      <div className="text-xs text-red-500 flex items-center gap-1">
                        <FaClock className="w-3 h-3" />
                        ค้าง {bill.daysOverdue} วัน
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md border ${getStatusColor(bill.status, bill.daysOverdue)}`}>
                        {getStatusText(bill.status, bill.daysOverdue)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center justify-items-start">
                        <button
                          onClick={() => handleEditBill(bill.id)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50"
                          title="ดูรายละเอียดบิล"
                        >
                          <FaEdit className="w-4 h-4 text-orange-400" />
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
            totalItems={filteredBills.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            startIndex={startIndex}
            endIndex={endIndex}
          />
        </div>
      </div>
    </div>
  );
}

export default PendingBills;
