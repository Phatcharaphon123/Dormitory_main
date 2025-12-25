import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Pagination from "../../../components/common/Pagination";
import ExcelExportButton from "../../../components/common/ExcelExportButton";
import { HiNewspaper } from "react-icons/hi2";
import axios from 'axios';
import API_URL from '../../../config/api';

function MonthlyBillsReport() {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(''); // ค่าว่างหมายถึงแสดงทั้งหมด
  const [searchTerm, setSearchTerm] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalServiceFees, setTotalServiceFees] = useState(0);
  const [totalDiscountAmount, setTotalDiscountAmount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { dormId } = useParams();
  const navigate = useNavigate();

  // ดึงข้อมูลใบแจ้งหนี้จาก API
  useEffect(() => {
    fetchBills();
  }, [dormId, selectedMonth]);

  // ฟังก์ชันกรองข้อมูลตามคำค้นหา
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBills(bills);
      calculateTotals(bills);
    } else {
      const filtered = bills.filter(bill => 
        bill.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.tenant.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.room.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bill.date.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatAmount(bill.serviceFees).includes(searchTerm) ||
        formatAmount(bill.discountAmount).includes(searchTerm)
      );
      setFilteredBills(filtered);
      calculateTotals(filtered);
    }
    setCurrentPage(1); // Reset to first page when filtering
  }, [bills, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBills = filteredBills.slice(startIndex, endIndex);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const fetchBills = async () => {
    setLoading(true);
    try {
      let url;
      if (selectedMonth) {
        // ดึงข้อมูลตามเดือนที่เลือก
        url = `${API_URL}/api/bills/dormitories/${dormId}/invoices/by-month?month=${selectedMonth}`;
      } else {
        // ดึงข้อมูลทั้งหมด (ไม่ส่ง parameter month)
        url = `${API_URL}/api/bills/dormitories/${dormId}/invoices/by-month`;
      }
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.status === 200) {
        const data = response.data;
        
        // แปลงข้อมูลจาก API ให้ตรงกับ format ที่ต้องการ
        const formattedBills = data.map((invoice, index) => {
          
          // คำนวณรายการต่างๆ จาก invoice_items
          let roomRate = 0;
          let waterUnit = 0;
          let waterRate = 0;
          let electricUnit = 0;
          let electricRate = 0;
          let serviceFees = 0;
          let discountAmount = 0;

          if (invoice.invoice_items && Array.isArray(invoice.invoice_items)) {
            
            invoice.invoice_items.forEach(item => {
              if (!item) return;
              
              if (item.item_type === 'room_rent' || item.item_type === 'rent') {
                roomRate = parseFloat(item.amount) || 0;
              } else if (item.item_type === 'water') {
                waterUnit = parseFloat(item.unit_count) || 0;
                // ใช้ amount ที่คำนวณแล้วจากฐานข้อมูล (price × unit_count)
                waterRate = parseFloat(item.amount) || 0;
              } else if (item.item_type === 'electricity' || item.item_type === 'electric') {
                electricUnit = parseFloat(item.unit_count) || 0;
                // ใช้ amount ที่คำนวณแล้วจากฐานข้อมูล (price × unit_count)
                electricRate = parseFloat(item.amount) || 0;
              } else if (item.item_type === 'service' || item.item_type === 'other') {
                serviceFees += parseFloat(item.amount) || 0;
              } else if (item.item_type === 'discount' || item.is_discount === 1) {
                discountAmount += Math.abs(parseFloat(item.amount) || 0);
              }
            });
            
          } else {
            console.log(`⚠️ No invoice_items found for ${invoice.room_number}`);
          }

          return {
            id: invoice.id,
            billNo: invoice.invoice_number || `INV${String(index + 1).padStart(6, '0')}`,
            date: invoice.bill_month ? new Date(invoice.bill_month + '-01').toLocaleDateString('th-TH', { 
              year: 'numeric', 
              month: 'long' 
            }) : '-',
            room: invoice.room_number,
            tenant: invoice.tenant_name || 'ไม่มีผู้เช่า',
            roomRate: roomRate,
            waterUnit: waterUnit,
            waterRate: waterRate,
            electricUnit: electricUnit,
            electricRate: electricRate,
            serviceFees: serviceFees,
            discountAmount: discountAmount,
            totalAmount: parseFloat(invoice.amount) || 0,
            dueDate: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('th-TH') : '-',
            status: invoice.status === 'paid' ? 'ชำระแล้ว' : 
                    invoice.status === 'unpaid' ? 'ค้างชำระ' :
                    invoice.status === 'overdue' ? 'เกินกำหนด' : 'ค้างชำระ',
            originalStatus: invoice.status // เก็บสถานะต้นฉบับไว้สำหรับการใช้งานอื่น
          };
        });

        setBills(formattedBills);
        setFilteredBills(formattedBills);
        calculateTotals(formattedBills);

      } else {
        console.error('❌ API Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('❌ Error details:', errorText);
        
        // แสดง error ใน UI
        alert(`เกิดข้อผิดพลาดในการโหลดข้อมูล: ${response.status} - ${response.statusText}\nกรุณาตรวจสอบ console สำหรับรายละเอียด`);
        
        setBills([]);
        setFilteredBills([]);
        calculateTotals([]);
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
      
      // แสดง error ใน UI
      alert(`เกิดข้อผิดพลาดในการเชื่อมต่อ API: ${error.message}`);
      
      setBills([]);
      setFilteredBills([]);
      calculateTotals([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (billList) => {
    setTotalCount(billList.length);
    setTotalAmount(billList.reduce((sum, bill) => sum + bill.totalAmount, 0));
    setTotalServiceFees(billList.reduce((sum, bill) => sum + bill.serviceFees, 0));
    setTotalDiscountAmount(billList.reduce((sum, bill) => sum + bill.discountAmount, 0));
  };

  const exportToExcel = () => {
    console.log("Exporting bills to Excel...");
  };

  // เตรียมข้อมูลสำหรับ Export Excel
  const exportData = filteredBills.map((bill, index) => {
    
    const exportItem = {
      billNo: bill.billNo || bill.bill_no || bill.invoiceNo || bill.invoice_no || '-',
      date: bill.date || bill.bill_date || bill.created_at || bill.createdAt || '-',
      tenant: bill.tenant || bill.tenant_name || bill.tenantName || bill.payer || '-',
      room: bill.room || bill.room_number || bill.roomNumber || '-',
      roomRate: bill.roomRate || bill.room_rate || 0,
      waterUnit: bill.waterUnit || bill.water_unit || bill.waterUnits || 0,
      waterCost: bill.waterCost || bill.water_cost || bill.waterAmount || bill.waterRate || 0,
      electricUnit: bill.electricUnit || bill.electric_unit || bill.electricUnits || 0,
      electricCost: bill.electricCost || bill.electric_cost || bill.electricAmount || bill.electricRate || 0,
      serviceFees: bill.serviceFees || bill.service_fees || bill.serviceAmount || 0,
      discountAmount: bill.discountAmount || bill.discount_amount || bill.discount || 0,
      totalAmount: bill.totalAmount || bill.total_amount || bill.amount || 0,
      status: bill.status || '-' // ใช้สถานะที่แปลงเป็นภาษาไทยแล้วตรงๆ
    };
    
    return exportItem;
  });

  // กำหนดคอลัมน์สำหรับ Excel
  const excelColumns = {
    billNo: 'เลขที่ใบแจ้งหนี้',
    date: 'วันที่',
    tenant: 'ผู้เช่า',
    room: 'ห้อง',
    roomRate: 'ค่าห้อง',
    waterUnit: 'หน่วยน้ำ',
    waterCost: 'ค่าน้ำ',
    electricUnit: 'หน่วยไฟ',
    electricCost: 'ค่าไฟ',
    serviceFees: 'ค่าบริการ',
    discountAmount: 'ส่วนลด',
    totalAmount: 'ยอดรวม',
    status: 'สถานะ'
  };

  const handleViewDetail = (invoiceId) => {
    // นำทางไปยังหน้า MonthDetailBills พร้อมกับ invoiceId
    navigate(`/bills-room/${dormId}/${invoiceId}`);
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('th-TH', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    if (status === "ชำระแล้ว") {
      return "bg-green-100 text-green-800";
    }
    if (status === "ค้างชำระ") {
      return "bg-red-100 text-red-800";
    }
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">

        
        {/* Filter and Search Container */}
        <div className="bg-white p-4 rounded-md shadow-sm border border-gray-300 mb-4">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h1 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
                <HiNewspaper className="text-gray-700 text-3xl" />
                รายงานใบแจ้งหนี้รายเดือน
              </h1>
              <p className="text-gray-600 mt-1">
                รายงานสรุปใบแจ้งหนี้และสถานะการชำระเงิน {(() => {
                  if (!selectedMonth) {
                    return "ทั้งหมด";
                  }
                  const [year, month] = selectedMonth.split('-');
                  return `เดือน ${month}/${year}`;
                })()}
              </p>
            </div>
            <ExcelExportButton
              data={exportData}
              columns={excelColumns}
              fileName="รายงานใบแจ้งหนี้"
              sheetName="รายงานใบแจ้งหนี้"
              buttonText="ส่งออก Excel"
              className=""
            />
          </div>
          {/* Date Filter and Items Per Page */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เลือกเดือน
                </label>
                <div className="flex gap-2">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <button
                    onClick={() => setSelectedMonth('')}
                    className={`h-11 px-3 py-2 border rounded-md transition-colors ${
                      selectedMonth === '' 
                        ? 'bg-blue-500 text-white border-blue-500' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    title="แสดงทั้งหมด"
                    disabled={loading}
                  >
                    ดูทั้งหมด
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  แสดง
                </label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5 รายการ</option>
                  <option value={10}>10 รายการ</option>
                  <option value={20}>20 รายการ</option>
                  <option value={50}>50 รายการ</option>
                  <option value={100}>100 รายการ</option>
                </select>
              </div>
            </div>
            {loading && (
              <div className="flex items-end">
                <span className="text-blue-600">
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                  กำลังโหลด...
                </span>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div>
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาใบแจ้งหนี้ (เลขใบแจ้งหนี้, ชื่อผู้เช่า, ห้อง, สถานะ, เดือน, ค่าบริการ, ส่วนลด)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-white p-6 rounded-md shadow-sm text-center border border-gray-300">
            <div className="text-3xl font-bold text-gray-800">{totalCount}</div>
            <div className="text-gray-600">ใบแจ้งหนี้ทั้งหมด</div>
          </div>
          <div className="bg-white p-6 rounded-md shadow-sm text-center border border-gray-300">
            <div className="text-3xl font-bold text-gray-800">{formatAmount(totalAmount)}</div>
            <div className="text-gray-600">ยอดรวมทั้งหมด</div>
          </div>
          <div className="bg-white p-6 rounded-md shadow-sm text-center border border-gray-300">
            <div className="text-3xl font-bold text-blue-600">{formatAmount(totalServiceFees)}</div>
            <div className="text-gray-600">ค่าบริการรวม</div>
          </div>
          <div className="bg-white p-6 rounded-md shadow-sm text-center border border-gray-300">
            <div className="text-3xl font-bold text-red-600">{formatAmount(totalDiscountAmount)}</div>
            <div className="text-gray-600">ส่วนลดรวม</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-md shadow-sm overflow-hidden mb-6 border border-gray-300">
        {/* Table Header */}
        <div className="bg-white text-gray-700 p-4 flex justify-between items-center border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-700">ใบแจ้งหนี้รายเดือน</h2>
          <div className="text-sm text-gray-700">
            แสดง <span className="font-medium">{startIndex + 1}</span>-<span className="font-medium">{Math.min(endIndex, filteredBills.length)}</span> จาก <span className="font-medium">{filteredBills.length}</span> รายการ
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full ">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เลขที่ใบแจ้งหนี้</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เดือน</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ห้อง</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้เช่า</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ค่าห้อง</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ค่าน้ำ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ค่าไฟ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ค่าบริการ</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ส่วนลด</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ยอดรวม</th>
                
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentBills.map((bill, index) => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-600">{index + 1}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 truncate max-w-32" title={bill.billNo}>{bill.billNo}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {bill.date.replace('พ.ศ. ', '')}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600 text-center font-medium">{bill.room}</td>
                  <td className="px-3 py-3 text-sm text-gray-600 truncate max-w-32" title={bill.tenant}>{bill.tenant}</td>
                  <td className="px-3 py-3 text-sm text-right text-gray-600 whitespace-nowrap">{formatAmount(bill.roomRate)}</td>
                  <td className="px-3 py-3 text-sm text-right text-gray-600">
                    {formatAmount(bill.waterRate)}
                    <div className="text-xs text-gray-500">({bill.waterUnit} หน่วย)</div>
                  </td>
                  <td className="px-3 py-3 text-sm text-right text-gray-600">
                    {formatAmount(bill.electricRate)}
                    <div className="text-xs text-gray-500">({bill.electricUnit} หน่วย)</div>
                  </td>
                  <td className="px-3 py-3 text-sm text-right text-gray-6600 whitespace-nowrap">{formatAmount(bill.serviceFees)}</td>
                  <td className="px-3 py-3 text-sm text-right text-red-600 whitespace-nowrap">
                    {bill.discountAmount > 0 ? `-${formatAmount(bill.discountAmount)}` : '0.00'}
                  </td>
                  <td className="px-3 py-3 text-sm text-right font-semibold text-gray-900 whitespace-nowrap">{formatAmount(bill.totalAmount)}</td>
                  
                  <td className="px-3 py-3 text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${getStatusBadge(bill.status)}`}>
                      {bill.status === 'ชำระแล้ว' ? 'ชำระแล้ว' : 'ค้างชำระ'}
                    </span>
                  </td>
                  <td 
                    className="px-3 py-3 text-sm text-blue-600 cursor-pointer hover:underline hover:bg-blue-50 transition-colors whitespace-nowrap text-center"
                    onClick={() => handleViewDetail(bill.id)}
                    title="คลิกเพื่อดูรายละเอียดใบแจ้งหนี้"
                  >
                    รายละเอียด
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Footer Row สำหรับยอดรวม */}
            {currentBills.length > 0 && (
              <tfoot className="bg-gray-100 font-semibold">
                <tr>
                  <td className="px-2 py-3 text-sm"></td>
                  <td className="px-3 py-3 text-sm text-gray-900">รวมหน้านี้:</td>
                  <td className="px-3 py-3 text-sm"></td>
                  <td className="px-3 py-3 text-sm"></td>
                  <td className="px-3 py-3 text-sm"></td>
                  <td className="px-3 py-3 text-sm text-right text-gray-900 whitespace-nowrap">
                    {formatAmount(currentBills.reduce((sum, bill) => sum + bill.roomRate, 0))}
                  </td>
                  <td className="px-3 py-3 text-sm text-right text-gray-900 whitespace-nowrap">
                    {formatAmount(currentBills.reduce((sum, bill) => sum + bill.waterRate, 0))}
                  </td>
                  <td className="px-3 py-3 text-sm text-right text-gray-900 whitespace-nowrap">
                    {formatAmount(currentBills.reduce((sum, bill) => sum + bill.electricRate, 0))}
                  </td>
                  <td className="px-3 py-3 text-sm text-right text-blue-600 whitespace-nowrap">
                    {formatAmount(currentBills.reduce((sum, bill) => sum + bill.serviceFees, 0))}
                  </td>
                  <td className="px-3 py-3 text-sm text-right text-red-600 whitespace-nowrap">
                    -{formatAmount(currentBills.reduce((sum, bill) => sum + bill.discountAmount, 0))}
                  </td>
                  <td className="px-3 py-3 text-sm text-right font-bold text-gray-900 whitespace-nowrap">
                    {formatAmount(currentBills.reduce((sum, bill) => sum + bill.totalAmount, 0))}
                  </td>
                  <td className="px-3 py-3 text-sm"></td>
                  <td className="px-3 py-3 text-sm"></td>
                </tr>
              </tfoot>
            )}
          </table>
          
          {/* แสดงข้อความเมื่อไม่มีข้อมูล */}
          {filteredBills.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? `ไม่พบใบแจ้งหนี้ที่ค้นหา "${searchTerm}"` : 'ไม่พบข้อมูลใบแจ้งหนี้สำหรับเดือนที่เลือก'}
            </div>
          )}
        </div>

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

export default MonthlyBillsReport;
