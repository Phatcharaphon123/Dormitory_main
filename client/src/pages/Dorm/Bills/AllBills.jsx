import React, { useState, useEffect } from 'react';
import { FaSearch, FaEye, FaEdit, FaTrash, FaPrint, FaCalendarAlt , FaFilter, FaChevronLeft, FaChevronRight, FaReceipt, FaCheckCircle, FaHourglassHalf, FaExclamationTriangle } from 'react-icons/fa';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Pagination from '../../../components/Pagination';
import ExcelExportButton from '../../../components/ExcelExportButton';
import { IoFileTrayFullSharp } from "react-icons/io5";
import axios from 'axios';

function AllBills() {
  const navigate = useNavigate();
  const { dormId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [sortBy, setSortBy] = useState('date'); // date, amount, roomNumber, status
  const [filterStatus, setFilterStatus] = useState('all'); // all, paid, pending, overdue
  const [filterMonth, setFilterMonth] = useState(''); // filter by month (YYYY-MM format like Receipts)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลบิลทั้งหมดจาก API
  useEffect(() => {
    const fetchAllBills = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:3001/api/bills/dormitories/${dormId}/invoices/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data;
        
        if (data.success) {
          const formattedBills = data.data.bills.map(bill => ({
            id: bill.invoice_receipt_id,
            roomNumber: bill.room_number,
            tenantName: bill.tenant_name && bill.tenant_name.trim() !== '' ? bill.tenant_name : 'ไม่มีผู้เช่า',
            issueDate: bill.issue_date, // ใช้ issue_date แทน month
            month: bill.month, // เก็บ month สำหรับการกรอง
            billMonth: `${new Date(bill.issue_date).getFullYear()}-${String(new Date(bill.issue_date).getMonth() + 1).padStart(2, '0')}`, // แปลงเป็น YYYY-MM สำหรับการกรอง จาก issue_date
            totalAmount: parseFloat(bill.total_amount),
            status: bill.bill_status,
            dueDate: bill.due_date,
            createdDate: bill.created_at,
            paidDate: bill.paid_date,
            billNumber: bill.invoice_number,
            hasActiveTenant: bill.has_active_tenant || false
          }));
          setBills(formattedBills);
        } else {
          console.error('Error fetching all bills:', data.message);
          setBills([]);
        }
      } catch (error) {
        console.error('Error fetching all bills:', error);
        setBills([]);
      } finally {
        setLoading(false);
      }
    };

    if (dormId) {
      fetchAllBills();
    }
  }, [dormId]);

  // Filter and sort bills
  useEffect(() => {
    let filtered = bills.filter(bill => {
      const matchesSearch = 
        bill.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || bill.status === filterStatus;
      
      const matchesMonth = filterMonth === '' || 
        (bill.billMonth && bill.billMonth === filterMonth);
      
      return matchesSearch && matchesStatus && matchesMonth;
    });
    
    // Sort bills
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.createdDate) - new Date(a.createdDate);
        case 'amount':
          return b.totalAmount - a.totalAmount;
        case 'roomNumber':
          return a.roomNumber.localeCompare(b.roomNumber);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
    
    setFilteredBills(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [bills, searchTerm, sortBy, filterStatus, filterMonth]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'overdue':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid':
        return 'ชำระแล้ว';
      case 'pending':
        return 'รอชำระเงิน';
      case 'overdue':
        return 'เกินกำหนด';
      default:
        return 'ไม่ทราบสถานะ';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('th-TH');
  };

  const formatMonthFromIssueDate = (issueDate) => {
    // issueDate format: ISO timestamp
    const issueDateObj = new Date(issueDate);
    const year = issueDateObj.getFullYear();
    const month = issueDateObj.getMonth(); // 0-based (0 = January)
    
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const thaiYear = year + 543; // Convert to Buddhist Era
    const thaiMonth = thaiMonths[month];
    
    return `${thaiMonth} ${thaiYear} (${formatDate(issueDate)})`;
  };

  const formatDueDateWithMonth = (dueDate) => {
    // dueDate format: ISO timestamp
    const dueDateObj = new Date(dueDate);
    const year = dueDateObj.getFullYear();
    const month = dueDateObj.getMonth(); // 0-based (0 = January)
    
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const thaiYear = year + 543; // Convert to Buddhist Era
    const thaiMonth = thaiMonths[month];
    
    return `${thaiMonth} ${thaiYear} (${formatDate(dueDate)})`;
  };

  const totalStats = {
    total: filteredBills.length,
    paid: filteredBills.filter(bill => bill.status === 'paid').length,
    pending: filteredBills.filter(bill => bill.status === 'pending').length,
    overdue: filteredBills.filter(bill => bill.status === 'overdue').length,
    totalAmount: filteredBills.reduce((sum, bill) => sum + bill.totalAmount, 0),
    paidAmount: filteredBills.filter(bill => bill.status === 'paid').reduce((sum, bill) => sum + bill.totalAmount, 0),
    pendingAmount: filteredBills.filter(bill => bill.status !== 'paid').reduce((sum, bill) => sum + bill.totalAmount, 0)
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

  const handleViewBill = (billId) => {
    navigate(`/bills-room/${dormId}/${billId}`);
  };

  const handleEditBill = (billId) => {
    navigate(`/bills-room/${dormId}/${billId}`);
  };

  const handleDeleteBill = (billId) => {
    if (window.confirm('คุณต้องการลบบิลนี้หรือไม่?')) {
      setBills(prevBills => prevBills.filter(bill => bill.id !== billId));
      alert('ลบบิลเรียบร้อยแล้ว');
    }
  };

  const handlePrintBill = (billId) => {
    alert(`พิมพ์บิล ID: ${billId}`);
  };

  // เตรียมข้อมูลสำหรับ Excel Export
  const exportData = filteredBills.map((bill, index) => {
    // Format วันที่สำหรับ Excel
    const formatExcelDate = (dateString) => {
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

    // Format เดือนปี สำหรับ Excel
    const formatExcelMonth = (issueDate) => {
      if (!issueDate || issueDate === 'null' || issueDate === 'undefined') return '-';
      try {
        const date = new Date(issueDate);
        if (isNaN(date.getTime())) {
          console.warn('Invalid issue date:', issueDate);
          return '-';
        }
        
        const thaiMonths = [
          'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
          'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
        
        const thaiYear = date.getFullYear() + 543;
        const thaiMonth = thaiMonths[date.getMonth()];
        
        if (!thaiMonth) {
          console.warn('Invalid month index:', date.getMonth());
          return '-';
        }
        
        return `${thaiMonth} ${thaiYear}`;
      } catch (error) {
        console.error('Error formatting month:', issueDate, error);
        return '-';
      }
    };

    // ตรวจสอบและแปลงยอดเงิน
    const formatAmount = (amount) => {
      if (amount === null || amount === undefined || amount === '') return 0;
      const numAmount = parseFloat(amount);
      return isNaN(numAmount) ? 0 : numAmount;
    };

    const exportItem = {
      index: index + 1,
      room_number: bill.roomNumber || '-',
      tenant_name: bill.tenantName || '-',
      bill_number: bill.billNumber || '-',
      issue_date: formatExcelDate(bill.issueDate),
      month: formatExcelMonth(bill.issueDate),
      due_date: formatExcelDate(bill.dueDate),
      total_amount: formatAmount(bill.totalAmount),
      status: getStatusText(bill.status) || '-',
      paid_date: (bill.paidDate && bill.paidDate !== 'null') ? formatExcelDate(bill.paidDate) : '-'
    };

    return exportItem;
  });

  // กำหนดคอลัมน์สำหรับ Excel
  const excelColumns = {
    index: 'ลำดับ',
    room_number: 'เลขห้อง',
    tenant_name: 'ชื่อผู้เช่า',
    bill_number: 'เลขที่บิล',
    issue_date: 'วันที่ออกบิล',
    month: 'เดือน',
    due_date: 'วันที่ครบกำหนด',
    total_amount: 'จำนวนเงิน (บาท)',
    status: 'สถานะ',
    paid_date: 'วันที่ชำระ'
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
            <IoFileTrayFullSharp className="text-gray-700 text-3xl" />
            บิลทั้งหมด
          </h1>
          <p className="text-gray-600 mt-1">จัดการบิลทั้งหมดในระบบ</p>
        </div>
        <ExcelExportButton
          data={exportData}
          columns={excelColumns}
          fileName="บิลทั้งหมด"
          sheetName="บิลทั้งหมด"
          buttonText="ส่งออก Excel"
          className=""
          onExportStart={() => {
            console.log('🚀 Starting Excel export...');
            console.log('Export Data Sample:', exportData.slice(0, 3));
            console.log('Total Records:', exportData.length);
          }}
          onExportComplete={(fileName) => {
            console.log('✅ Excel export completed:', fileName);
          }}
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4 mb-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaSearch className="inline w-4 h-4 mr-1" />
              ค้นหาบิล
            </label>
            <input
              type="text"
              placeholder="ค้นหาเลขห้อง, ชื่อผู้เช่า หรือเลขที่บิล..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เลือกเดือน
            </label>
            <input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="w-full h-11 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              สถานะ
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-11 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">ทั้งหมด</option>
              <option value="paid">ชำระแล้ว</option>
              <option value="pending">รอชำระเงิน</option>
              <option value="overdue">เกินกำหนด</option>
            </select>
          </div>
          <div className="lg:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              เรียงตาม
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full h-11 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="date">วันที่สร้างล่าสุด</option>
              <option value="amount">จำนวนเงินมากที่สุด</option>
              <option value="roomNumber">เลขห้อง</option>
              <option value="status">สถานะ</option>
            </select>
          </div>
          <div className="lg:w-32">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              แสดง
            </label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="w-full h-11 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={5}>5 รายการ</option>
              <option value={10}>10 รายการ</option>
              <option value={20}>20 รายการ</option>
              <option value={50}>50 รายการ</option>
            </select>
          </div>
          <div className="lg:w-32 flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setFilterMonth('');
                setSortBy('date');
              }}
              className="w-full h-11 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-3 rounded-md border border-gray-300 transition-colors duration-200"
            >
              ล้างฟิลเตอร์
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-600 mb-1">บิลทั้งหมด</h3>
              <p className="text-2xl font-bold text-blue-900">{totalStats.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-md">
              <FaReceipt className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-green-600 mb-1">ชำระแล้ว</h3>
              <p className="text-2xl font-bold text-green-900">{totalStats.paid}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-md">
              <FaCheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-yellow-600 mb-1">รอชำระเงิน</h3>
              <p className="text-2xl font-bold text-yellow-900">{totalStats.pending}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-md">
              <FaHourglassHalf className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-red-600 mb-1">เกินกำหนด</h3>
              <p className="text-2xl font-bold text-red-900">{totalStats.overdue}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-md">
              <FaExclamationTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-md shadow border border-gray-300 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg text-gray-700 font-semibold flex items-center gap-2">
                รายการบิลทั้งหมด
              </h3>
            </div>
            <div className="text-sm text-gray-700">
              แสดง {startIndex + 1}-{Math.min(endIndex, filteredBills.length)} จาก {filteredBills.length} รายการ
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-md h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">กำลังโหลดข้อมูลบิล...</p>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <FaSearch className="w-16 h-16 mx-auto" />
            </div>
            <p className="text-gray-500 text-lg">ไม่พบข้อมูลบิล</p>
            <p className="text-gray-400 text-sm">ลองเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง</p>
          </div>
        ) : (
          <div className="overflow-x-auto ">
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
                    ผู้เช่า
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เลขที่บิล
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เดือน
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันครบกำหนด
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ยอดรวม
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
                      <div className="text-sm text-gray-600">{formatMonthFromIssueDate(bill.issueDate)}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{formatDueDateWithMonth(bill.dueDate)}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">
                        ฿{bill.totalAmount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md border ${getStatusColor(bill.status)}`}>
                        {getStatusText(bill.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center justify-items-start">
                        <button
                          onClick={() => handleEditBill(bill.id)}
                          className="text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-50"
                          title="แก้ไข"
                        >
                          <FaEdit className="w-4 h-4" />
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

export default AllBills;
