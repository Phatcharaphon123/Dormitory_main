import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import PaidInvoiceReceipt from "../Bills/InvoiceReceipt/PaidInvoiceReceipt";
import PrintReceipt from "../Room/ContractPages/ContractReceipt/PrintReceipt";
import MoveOutReceiptPrint from "../TenantManage/MoveOutReceipt/MoveOutReceiptPrint";
import Pagination from "../../../components/common/Pagination";
import ExcelExportButton from "../../../components/common/ExcelExportButton";
import { FaReceipt } from "react-icons/fa";
import axios from 'axios';
import API_URL from "../../../config/api";

function Receipts() {
  const [receipts, setReceipts] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(''); // ค่าว่างหมายถึงแสดงทั้งหมด
  const [selectedReceipts, setSelectedReceipts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { dormId } = useParams();

  // ดึงข้อมูลใบเสร็จจาก API
  const fetchReceipts = async () => {
    try {
      setLoading(true);
      
      let paymentUrl, moveOutUrl;
      
      if (selectedMonth) {
        // แยกปีและเดือนจาก selectedMonth (ถ้ามีการเลือกเดือน)
        const [year, month] = selectedMonth.split('-');
        console.log('Month:', month, 'Year:', year);
        
        // ดึงข้อมูลตามเดือนที่เลือก
        // payment-receipts API รวม payment receipts และ move-in receipts ไว้แล้ว
        paymentUrl = `${API_URL}/api/bills/dormitories/${dormId}/payment-receipts?month=${month}&year=${year}`;
        moveOutUrl = `${API_URL}/api/move-out-receipts/dormitories/${dormId}?month=${month}&year=${year}`;
      } else {
        // ดึงข้อมูลทั้งหมด (ไม่ระบุเดือน)
        // payment-receipts API รวม payment receipts และ move-in receipts ไว้แล้ว
        paymentUrl = `${API_URL}/api/bills/dormitories/${dormId}/payment-receipts`;
        moveOutUrl = `${API_URL}/api/move-out-receipts/dormitories/${dormId}`;
      }
      const paymentResponse = await axios.get(paymentUrl, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const moveOutResponse = await axios.get(moveOutUrl, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      let paymentData = [];
      let moveOutData = [];
      
      if (paymentResponse.status === 200) {
        paymentData = paymentResponse.data; 
      } else {
        console.error('❌ Payment response error:', paymentResponse.status);
      }
      
      if (moveOutResponse.status === 200) {
        moveOutData = moveOutResponse.data;
        // แปลงข้อมูลใบเสร็จการย้ายออกให้เป็นรูปแบบเดียวกัน และทำให้เป็นค่าลบถ้าเป็นการคืนเงิน
        moveOutData = moveOutData.map(receipt => ({
          ...receipt,
          receiptType: 'move_out',
          // แปลง field names ให้เป็น camelCase (API ส่งมาเป็น camelCase แล้ว)
          receiptNo: receipt.receiptNo || receipt.receiptno || '',
          // แปลงจำนวนเงินให้เป็น number และใส่เครื่องหมายลบสำหรับการคืนเงิน
          amount: parseFloat(receipt.isRefund ? -Math.abs(receipt.totalAmount || receipt.totalamount || receipt.amount || 0) : (receipt.totalAmount || receipt.totalamount || receipt.amount || 0)),
          totalAmount: parseFloat(receipt.isRefund ? -Math.abs(receipt.totalAmount || receipt.totalamount || receipt.amount || 0) : (receipt.totalAmount || receipt.totalamount || receipt.amount || 0)),
          paidAmount: parseFloat(receipt.isRefund ? -Math.abs(receipt.paidAmount || receipt.paidamount || receipt.totalAmount || receipt.totalamount || receipt.amount || 0) : (receipt.paidAmount || receipt.paidamount || receipt.totalAmount || receipt.totalamount || receipt.amount || 0))
        }));
      } else {
        const errorText = await moveOutResponse.text();
        console.error('❌ Move-out response error:', moveOutResponse.status, moveOutResponse.statusText);
        console.error('❌ Move-out response body:', errorText);
        console.error('❌ Move-out URL that failed:', moveOutUrl);
      }
      
      // รวมข้อมูลทั้งสองประเภท (payment receipts และ move-out receipts)
      const allReceipts = [...paymentData, ...moveOutData];
      
      // ตรวจสอบและลบข้อมูลซ้ำกัน (ใช้หลายฟิลด์ในการเช็ค)
      const uniqueReceipts = allReceipts.filter((receipt, index, self) => {
        return index === self.findIndex((r) => {
          // ตรวจสอบตาม receiptNo ก่อน (ถ้ามีและไม่เป็นค่าว่าง)
          if (receipt.receiptNo && r.receiptNo && receipt.receiptNo.trim() !== '' && r.receiptNo.trim() !== '') {
            return r.receiptNo === receipt.receiptNo;
          }
          
          // ถ้าไม่มี receiptNo หรือเป็นค่าว่าง ให้ใช้การรวมกันของฟิลด์อื่นๆ
          const receiptKey = `${receipt.receiptType || 'unknown'}_${receipt.payer || 'unknown'}_${receipt.room || 'unknown'}_${receipt.amount || 0}_${receipt.date || receipt.createdAt || receipt.paymentDate || receipt.moveOutDate || 'unknown'}`;
          const rKey = `${r.receiptType || 'unknown'}_${r.payer || 'unknown'}_${r.room || 'unknown'}_${r.amount || 0}_${r.date || r.createdAt || r.paymentDate || r.moveOutDate || 'unknown'}`;
          
          return rKey === receiptKey;
        });
      });
      
      // Log ข้อมูล timestamp ของทุกใบเสร็จเพื่อ debug การเรียงลำดับ
      uniqueReceipts.forEach((receipt, index) => {
        const timestampFields = {
          receiptNo: receipt.receiptNo,
          receiptType: receipt.receiptType, // เพิ่ม debug receiptType
          createdAt: receipt.createdAt,
          created_at: receipt.created_at,
          paymentDate: receipt.paymentDate,
          moveOutDate: receipt.moveOutDate,
          date: receipt.date
        };
      });
      
      // เรียงลำดับตามลำดับที่พึ่งดำเนินการ (ล่าสุดไปเก่าสุด)
      uniqueReceipts.sort((a, b) => {
        // ลำดับความสำคัญของ timestamp fields
        const getTimestamp = (receipt) => {
          // ลองใช้ field ต่างๆ ตามลำดับความสำคัญ
          const timestampFields = [
            receipt.createdAt,
            receipt.created_at, 
            receipt.paymentDate,
            receipt.moveOutDate,
            receipt.date
          ];
          
          for (const field of timestampFields) {
            if (field) {
              let date;
              
              // จัดการ format วันที่ที่อาจมี format แปลกๆ
              if (typeof field === 'string') {
                // ถ้าเป็น format DD/MM/YYYY ให้แปลงเป็น YYYY-MM-DD
                if (field.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                  const [day, month, year] = field.split('/');
                  date = new Date(`${year}-${month}-${day}`);
                } else {
                  date = new Date(field);
                }
              } else {
                date = new Date(field);
              }
              
              if (!isNaN(date.getTime())) {
                return date;
              }
            }
          }
          
          // ถ้าไม่มี timestamp ใดๆ ให้ใช้วันที่ปัจจุบัน
          return new Date(0); // epoch time สำหรับข้อมูลที่ไม่มีวันที่
        };
        
        const timestampA = getTimestamp(a);
        const timestampB = getTimestamp(b);
        
        
        // เรียงจากล่าสุดไปเก่าสุด (ใหม่กว่าอยู่บนสุด)
        const result = timestampB.getTime() - timestampA.getTime();
        
        return result;
      });
      
      setReceipts(uniqueReceipts);
      setFilteredReceipts(uniqueReceipts);
      calculateTotals(uniqueReceipts);
      
    } catch (error) {
      console.error('Error fetching receipts:', error);
      setReceipts([]);
      setFilteredReceipts([]);
      setTotalCount(0);
      setTotalAmount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dormId) {
      fetchReceipts();
    }
  }, [dormId, selectedMonth]);

  // ฟังก์ชันกรองข้อมูลตามคำค้นหา
  useEffect(() => {
    let filteredData = receipts;
    
    if (searchTerm.trim()) {
      filteredData = receipts.filter(receipt => 
        (receipt.receiptNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (receipt.payer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (receipt.room || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (receipt.channel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (receipt.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // เรียงลำดับข้อมูลที่กรองแล้วให้เรียงตามเวลาล่าสุด
    filteredData.sort((a, b) => {
      // ลำดับความสำคัญของ timestamp fields
      const getTimestamp = (receipt) => {
        // ลองใช้ field ต่างๆ ตามลำดับความสำคัญ
        const timestampFields = [
          receipt.createdAt,
          receipt.created_at, 
          receipt.paymentDate,
          receipt.moveOutDate,
          receipt.date
        ];
        
        for (const field of timestampFields) {
          if (field) {
            let date;
            
            // จัดการ format วันที่ที่อาจมี format แปลกๆ
            if (typeof field === 'string') {
              // ถ้าเป็น format DD/MM/YYYY ให้แปลงเป็น YYYY-MM-DD
              if (field.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const [day, month, year] = field.split('/');
                date = new Date(`${year}-${month}-${day}`);
              } else {
                date = new Date(field);
              }
            } else {
              date = new Date(field);
            }
            
            if (!isNaN(date.getTime())) {
              return date;
            }
          }
        }
        
        // ถ้าไม่มี timestamp ใดๆ ให้ใช้วันที่ปัจจุบัน
        return new Date(0); // epoch time สำหรับข้อมูลที่ไม่มีวันที่
      };
      
      const timestampA = getTimestamp(a);
      const timestampB = getTimestamp(b);
      
      // เรียงจากล่าสุดไปเก่าสุด (ใหม่กว่าอยู่บนสุด)
      return timestampB.getTime() - timestampA.getTime();
    });
    
    setFilteredReceipts(filteredData);
    calculateTotals(filteredData);
    setCurrentPage(1); // Reset to first page when filtering
  }, [searchTerm, receipts]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReceipts = filteredReceipts.slice(startIndex, endIndex);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const calculateTotals = (receiptList) => {
    const validReceipts = receiptList.filter(receipt => receipt.status !== "ยกเลิก");
    setTotalCount(validReceipts.length);
    
    const total = validReceipts.reduce((sum, receipt) => {
      const amount = receipt.amount || receipt.totalAmount || receipt.paidAmount || 0;
      return sum + parseFloat(amount);
    }, 0);
    
    setTotalAmount(total);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      // เลือกเฉพาะ receipts ในหน้าปัจจุบัน
      const currentPageReceiptIds = currentReceipts.map(receipt => receipt.id);
      setSelectedReceipts([...new Set([...selectedReceipts, ...currentPageReceiptIds])]);
    } else {
      // ยกเลิกการเลือก receipts ในหน้าปัจจุบัน
      const currentPageReceiptIds = currentReceipts.map(receipt => receipt.id);
      setSelectedReceipts(selectedReceipts.filter(id => !currentPageReceiptIds.includes(id)));
    }
  };

  const handleSelectReceipt = (receiptId, checked) => {
    if (checked) {
      setSelectedReceipts([...selectedReceipts, receiptId]);
    } else {
      setSelectedReceipts(selectedReceipts.filter(id => id !== receiptId));
    }
  };

  const exportToExcel = () => {
    // ฟังก์ชันสำหรับ export ข้อมูลเป็น Excel
    console.log("Exporting to Excel...");
  };

  // ฟังก์ชันจัดรูปแบบวันที่สำหรับ Excel
  const formatDateForExcel = (dateString) => {
    if (!dateString || dateString === 'null' || dateString === 'undefined' || dateString === '-') return '-';
    
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

  // เตรียมข้อมูลสำหรับ Export Excel
  const exportData = filteredReceipts.map((receipt, index) => {
    
    // กำหนดวันที่ที่ถูกต้องตามประเภทใบเสร็จ
    let rawDate = '-';
    if (receipt.receiptType === 'payment' || receipt.receiptType === 'move_in') {
      // สำหรับใบเสร็จการชำระเงินและค่าเข้าพัก ใช้ paymentDate ที่ formatted แล้ว
      rawDate = receipt.paymentDate || receipt.date || receipt.receipt_date || receipt.createdAt || receipt.created_at || '-';
    } else if (receipt.receiptType === 'move_out') {
      // สำหรับใบเสร็จการย้ายออก ใช้ moveOutDate
      rawDate = receipt.moveOutDate || receipt.date || receipt.receipt_date || receipt.createdAt || receipt.created_at || '-';
    } else {
      // กรณีอื่นๆ
      rawDate = receipt.date || receipt.receipt_date || receipt.paymentDate || receipt.createdAt || receipt.created_at || '-';
    }
    
    // ตรวจสอบว่า rawDate เป็นรูปแบบไทยแล้วหรือยัง (DD/MM/YYYY)
    const isAlreadyFormattedThai = /^\d{2}\/\d{2}\/\d{4}$/.test(rawDate);
    
    const exportItem = {
      index: index + 1,
      receiptNumber: receipt.receiptNumber || 
                     receipt.receipt_number || 
                     receipt.receiptNo ||      // <-- เพิ่ม receiptNo จาก move-out API
                     receipt.receiptno ||      // <-- เพิ่ม receiptno (lowercase)
                     receipt.id || 
                     receipt.payment_id ||
                     receipt.receiptId ||
                     `R${String(index + 1).padStart(3, '0')}`,
      date: isAlreadyFormattedThai ? rawDate : formatDateForExcel(rawDate),
      tenant: receipt.tenant || 
              receipt.tenant_name || 
              receipt.tenantName ||
              receipt.payer ||           // <-- เพิ่ม payer จาก payment API
              receipt.name ||
              receipt.customerName ||
              receipt.tenantinfo ||
              '-',
      room: receipt.room || receipt.room_number || receipt.roomNumber || '-',
      type: receipt.receiptType === 'move_in' ? 'ค่าเข้าพัก' : 
            receipt.receiptType === 'move_out' ? 'ค่าย้ายออก' : 
            receipt.type === 'move_in' ? 'ค่าเข้าพัก' :
            receipt.type === 'move_out' ? 'ค่าย้ายออก' :
            'ค่ารายเดือน',
      amount: parseFloat(receipt.amount || receipt.total_amount || receipt.totalAmount || 0)
    };
    
    return exportItem;
  });

  // กำหนดคอลัมน์สำหรับ Excel
  const excelColumns = {
    index: 'ลำดับ',
    receiptNumber: 'เลขที่ใบเสร็จ',
    date: 'วันที่',
    tenant: 'ผู้เช่า',
    room: 'ห้อง',
    type: 'ประเภท',
    amount: 'จำนวนเงิน (บาท)'
  };

  const handlePrintReceipt = async (receipt) => {
    try {
      
      if (receipt.receiptType === 'move_in') {
        // สำหรับใบเสร็จค่าเข้าพัก ใช้ PrintReceipt component
        // ใช้ invoiceId ที่เป็น contractId แทน
        const contractId = receipt.invoiceId; // invoiceId ในกรณีนี้คือ contractId
        
        const response = await axios.get(
          `${API_URL}/api/receipts/contracts/${contractId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        const receiptData = response.data;
        
        // ใช้ PrintReceipt.printSingleReceipt
        const receiptItems = PrintReceipt.generateReceiptItemsFromReceipt(receiptData);
        PrintReceipt.printSingleReceipt(receiptData, {}, '', 'ใบเสร็จรับเงิน', receiptItems);
        
      } else if (receipt.receiptType === 'move_out') {
        // สำหรับใบเสร็จการย้ายออก ใช้ MoveOutReceiptPrint
        const receiptId = receipt.originalId || receipt.id;
        
        const response = await axios.get(
          `${API_URL}/api/move-out-receipts/${receiptId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        const apiResponse = response.data;
        
        // ดึงข้อมูลจาก response.data
        const receiptData = apiResponse.success ? apiResponse.data : apiResponse;
        
        // ตรวจสอบรายการ items - หากไม่มีให้สร้างรายการเปล่า
        if (!receiptData.items || receiptData.items.length === 0) {
          // สร้างรายการเปล่าเพื่อให้สามารถพิมพ์ได้
          receiptData.items = [];
        }
        
        // กำหนดชื่อใบเสร็จ
        const title = receipt.isRefund || receiptData.finalAmount < 0 ? 'ใบเสร็จคืนเงิน' : 'ใบเสร็จการย้ายออก';
        
        // ใช้ MoveOutReceiptPrint.printMoveOutReceipt
        MoveOutReceiptPrint.printMoveOutReceipt(receiptData, {}, '', title, receipt.room);
        
      } else {
        // สำหรับใบเสร็จการชำระบิลรายเดือน ใช้ PaidInvoiceReceipt
        // ใช้ originalId โดยตรง (ไม่ต้องแปลงเป็นตัวเลข) เพราะ API ต้องการ payment ID ที่ถูกต้อง
        const paymentId = receipt.originalId;
        await PaidInvoiceReceipt.printReceiptFromAPI(dormId, receipt.invoiceId, paymentId);
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      alert('เกิดข้อผิดพลาดในการพิมพ์ใบเสร็จ: ' + error.message);
    }
  };

  const formatAmount = (amount) => {
    const formattedAmount = new Intl.NumberFormat('th-TH', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(Math.abs(amount));
    
    return amount < 0 ? `-${formattedAmount}` : formattedAmount;
  };

  const formatTotalAmount = (amount) => {
    return new Intl.NumberFormat('th-TH', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(amount);
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
                <FaReceipt className="text-gray-700 text-3xl" />
                รายงานใบเสร็จรับเงิน
              </h1>
              <p className="text-gray-600 mt-1">
                รายงานสรุปใบเสร็จรับเงินและสถานะการชำระ {(() => {
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
              fileName="รายงานใบเสร็จ"
              sheetName="รายงานใบเสร็จ"
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
                  />
                  <button
                    onClick={() => setSelectedMonth('')}
                    className={`h-11 px-3 py-2 border rounded-md transition-colors ${
                      selectedMonth === '' 
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
                placeholder="ค้นหาใบเสร็จ (เลขใบเสร็จ, ชื่อผู้ชำระ, ห้อง, ช่องทาง, เลขใบแจ้งหนี้)"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-md shadow-sm text-center border border-gray-300">
            <div className="text-3xl font-bold text-gray-800">{totalCount}</div>
            <div className="text-gray-600">ใบเสร็จในเดือน</div>
          </div>
          <div className="bg-white p-6 rounded-md shadow-sm text-center border border-gray-300">
            <div className="text-3xl font-bold text-gray-800">{formatTotalAmount(totalAmount)}</div>
            <div className="text-gray-600">ยอดรวม</div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-md shadow-md p-8">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">กำลังโหลดข้อมูล...</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredReceipts.length === 0 && receipts.length > 0 && (
        <div className="bg-white rounded-md shadow-md p-8">
          <div className="text-center">
            <p className="text-gray-500">ไม่พบใบเสร็จที่ตรงกับคำค้นหา "{searchTerm}"</p>
            <button
              onClick={() => setSearchTerm("")}
              className="mt-2 text-blue-600 hover:text-blue-800 underline"
            >
              ล้างการค้นหา
            </button>
          </div>
        </div>
      )}

      {/* Empty State - No data */}
      {!loading && receipts.length === 0 && (
        <div className="bg-white rounded-md shadow-md p-8">
          <div className="text-center">
            <p className="text-gray-500">ไม่พบข้อมูลใบเสร็จในเดือนที่เลือก</p>
          </div>
        </div>
      )}

        {/* Table */}
        {!loading && filteredReceipts.length > 0 && (
          <div className="bg-white rounded-md shadow-sm overflow-hidden mb-6 border border-gray-300">
            {/* Table Header */}
            <div className="bg-white text-gray-700 p-4 flex justify-between items-center border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-700">ใบเสร็จรับเงิน</h2>
              <div className="text-sm text-gray-700">
                แสดง <span className="font-medium">{startIndex + 1}</span>-<span className="font-medium">{Math.min(endIndex, filteredReceipts.length)}</span> จาก <span className="font-medium">{filteredReceipts.length}</span> รายการ
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เลขใบเสร็จ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้เช่า</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ห้อง</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ช่องทาง</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">ยอดรับเงิน</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ประเภทใบเสร็จ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentReceipts.map((receipt, index) => (
                  <tr key={receipt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-600">{startIndex + index + 1}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{receipt.receiptNo}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{receipt.payer}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {receipt.date || receipt.paymentDate || '-'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{receipt.room || '-'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{receipt.channel || '-'}</td>
                    <td className="px-4 py-4 text-sm text-right font-semibold">
                      <span className={`${
                        receipt.status === "ยกเลิก" 
                          ? "text-red-600" 
                          : receipt.amount < 0 || receipt.totalAmount < 0 || receipt.paidAmount < 0
                            ? "text-red-600" 
                            : "text-gray-900"
                      }`}>
                        {formatAmount(receipt.amount || receipt.totalAmount || receipt.paidAmount || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        receipt.receiptType === "move_in" 
                          ? "bg-green-100 text-green-800" 
                          : receipt.receiptType === "move_out"
                            ? receipt.isRefund || (receipt.amount || receipt.totalAmount || receipt.paidAmount) < 0
                              ? "bg-red-100 text-red-800"
                              : "bg-orange-100 text-orange-800"
                            : "bg-purple-100 text-purple-800"
                      }`}>
                        {receipt.receiptType === "move_in" 
                          ? "ค่าเข้าพัก" 
                          : receipt.receiptType === "move_out"
                            ? receipt.isRefund || (receipt.amount || receipt.totalAmount || receipt.paidAmount) < 0
                              ? "คืนเงินย้ายออก"
                              : "ค่าย้ายออก"
                            : "ค่ารายเดือน"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <button
                        onClick={() => handlePrintReceipt(receipt)}
                        className="text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
                        disabled={receipt.status === "ยกเลิก"}
                      >
                        {receipt.status === "ยกเลิก" ? "ยกเลิกแล้ว" : "พิมพ์ใบเสร็จ"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Pagination */}
            <div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredReceipts.length}
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

export default Receipts;
