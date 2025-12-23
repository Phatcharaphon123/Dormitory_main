import React, { useState,useEffect } from 'react';
import { FaPrint, FaTrash, FaPlus, FaCog, FaCalendarAlt, FaEnvelope, FaPaperPlane, FaChevronDown, FaChevronLeft, FaChevronRight, FaChartBar, FaFileAlt, FaCheckCircle, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';
import MonthDetailBills from './MonthDetailBills';
import CreateBillForm from './CreateBillForm';
import MultiPrintModal from './InvoiceReceipt/MultiPrintModal';
import MultiSendModal from './InvoiceReceipt/MultiSendModal';
import { IoCalendar } from "react-icons/io5";
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function MonthBills() {
  const { dormId } = useParams();
  const navigate = useNavigate();

  // 🔧 ป้องกัน month หล่นเหลือ 1 digit เช่น "2025-7"
const formatBillMonth = (billMonth) => {
  const [year, month] = billMonth.split('-');
  return `${year}-${month.padStart(2, '0')}`;
};


  // ฟังก์ชันแปลงเดือน-ปีเป็นรูปแบบไทย
  const generateBillRoundLabel = (billMonth) => {
    if (!billMonth) return 'ไม่ระบุรอบบิล';
    const [year, month] = billMonth.split('-');
    const thaiYear = parseInt(year) + 543;
    return `${month}/${thaiYear}`;
  };

  // State พื้นฐาน
  const [searchRoom, setSearchRoom] = useState('');
  const [searchType, setSearchType] = useState('ทั้งหมด');
  const [searchStatus, setSearchStatus] = useState('ทั้งหมด');
  const [searchFloor, setSearchFloor] = useState('ทั้งหมด');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBillManager, setShowBillManager] = useState(false);
  const [showMultiPrint, setShowMultiPrint] = useState(false);
  const [showMultiSend, setShowMultiSend] = useState(false);

  const [showCalendar, setShowCalendar] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear() + 543);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [monthlyBills, setMonthlyBills] = useState([]);
  const [billRoundOptions, setBillRoundOptions] = useState([]);
  
  // เพิ่ม state สำหรับข้อมูลพิมพ์ (ไม่ต้องการ invoiceNote ในหน้านี้)
  const [invoiceData, setInvoiceData] = useState({});

  // ดึงรายการรอบบิลที่มีอยู่เมื่อโหลดหน้าแรก
  useEffect(() => {
    const fetchAvailableMonths = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/bills/dormitories/${dormId}/invoices/available-months`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        const months = res.data.map(item => ({
          value: item.bill_month,
          label: generateBillRoundLabel(item.bill_month)
        }));
        
        setBillRoundOptions(months);
        
        if (months.length > 0) {
          setSelectedMonth(months[0].value); // เลือกรอบล่าสุด
        }
      } catch (err) {
        console.error('Error fetching available months:', err);
        toast.error('ไม่สามารถโหลดรายการรอบบิลได้');
        setError('ไม่สามารถโหลดรายการรอบบิลได้');
      } finally {
        setLoading(false);
      }
    };

    const fetchInvoiceSettings = async () => {
      try {
        // โหลดข้อมูลหอพักสำหรับ invoice
        const dormRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/dormitories/${dormId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        const dormData = dormRes.data;
        
        setInvoiceData({
          dormInfo: {
            name: dormData.name || '',
            address: dormData.address || '',
            phone: dormData.phone || '',
            subdistrict: dormData.subdistrict || '',
            district: dormData.district || '',
            province: dormData.province || '',
          },
          tenantInfo: {
            name: '',
            address: '',
            subdistrict: '',
            district: '',
            province: '',
          }
        });
        
      } catch (err) {
        console.error('Error fetching invoice settings:', err);
        toast.error('ไม่สามารถโหลดการตั้งค่าใบแจ้งหนี้ได้');
      }
    };

    if (dormId) {
      fetchAvailableMonths();
      fetchInvoiceSettings();
    }
  }, [dormId]);

  // ดึงข้อมูลบิลเมื่อ selectedMonth เปลี่ยน
  useEffect(() => {
    if (!selectedMonth || !dormId) return;

    const fetchBills = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/bills/dormitories/${dormId}/invoices/by-month`, {
          params: { month: selectedMonth },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        // Debug เฉพาะห้อง 104
        const room104 = res.data.find(bill => bill.room_number === '104');    
        setMonthlyBills(res.data);
        
        // ไม่จำเป็นต้องโหลดหมายเหตุในหน้านี้ เพราะไม่มีการแสดงผล
      } catch (err) {
        console.error(err);
        toast.error('ไม่สามารถโหลดข้อมูลใบแจ้งหนี้ได้');
        setError('ไม่สามารถโหลดข้อมูลใบแจ้งหนี้ได้');
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, [selectedMonth, dormId]);


  // ข้อมูลเดือนแบบภาษาไทย
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  // ปรับปีปฏิทิน
  const changeYear = (direction) => {
    setCurrentYear(currentYear + direction);
    setSelectedYear(selectedYear + direction);
  };

  // เลือกเดือนในปฏิทิน
  const selectMonth = (monthIndex) => {
    const monthStr = String(monthIndex + 1).padStart(2, '0');
    const targetMonth = `${selectedYear}-${monthStr}`;
    
    // ตรวจสอบว่ามีข้อมูลในเดือนนั้นหรือไม่
    const hasData = billRoundOptions.some(option => option.value === targetMonth);
    
    if (hasData) {
      setSelectedMonth(targetMonth);
      setShowCalendar(false);
    }
  };

  const hasDataForMonth = (monthIndex) => {
    const monthStr = String(monthIndex + 1).padStart(2, '0');
    const billMonthValue = `${selectedYear}-${monthStr}`;
    return billRoundOptions.some(option => option.value === billMonthValue);
  };

  const isSelectedMonth = (monthIndex) => {
    const monthStr = String(monthIndex + 1).padStart(2, '0');
    return selectedMonth === `${selectedYear}-${monthStr}`;
  };

  const filteredBills = monthlyBills.filter(bill => {
    const billMonth = bill.bill_month;
    const matchBillRound = billMonth === selectedMonth;
    const matchRoom = (bill.room_number || '').toLowerCase().includes(searchRoom.toLowerCase());
    const matchStatus = searchStatus === 'ทั้งหมด' || bill.status === searchStatus;
    const matchFloor = searchFloor === 'ทั้งหมด' || bill.floor.toString() === searchFloor;
  
    return matchBillRound && matchRoom && matchStatus && matchFloor;
  });

  const groupBillsByFloor = (bills) => {
    return bills.reduce((acc, bill) => {
      const floor = bill.floor;
      if (!acc[floor]) acc[floor] = [];
      acc[floor].push(bill);
      return acc;
    }, {});
  };

  const groupedBills = groupBillsByFloor(filteredBills);
  const availableFloors = [...new Set(monthlyBills.map(bill => bill.floor))].sort();

  const handleSelectBill = (bill) => {
    const invoiceId = bill.id;
    console.log('📄 เลือกใบแจ้งหนี้ ID:', invoiceId);
    navigate(`/bills-room/${dormId}/${invoiceId}`);
  };

  const handleBackFromDetail = () => {
    setShowDetail(false);
    setSelectedBill(null);
  };

  const handleCreateNewBill = () => {
    setShowCreateForm(true);
  };

  const handleBackFromCreate = () => {
    setShowCreateForm(false);
  };

  const handleBillCreated = async () => {
    setShowCreateForm(false);
    toast.success('สร้างใบแจ้งหนี้สำเร็จ');
    
    // รีเฟรชรายการเดือนที่มีบิล
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/bills/dormitories/${dormId}/invoices/available-months`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const months = res.data.map(item => ({
        value: item.bill_month,
        label: generateBillRoundLabel(item.bill_month)
      }));
      
      setBillRoundOptions(months);
      
      // ถ้ามีเดือนใหม่ ให้เลือกเดือนล่าสุด
      let newSelectedMonth = selectedMonth;
      if (months.length > 0) {
        newSelectedMonth = months[0].value;
        setSelectedMonth(newSelectedMonth);
      }

      // รีเฟรชข้อมูลบิลในเดือนปัจจุบัน/ใหม่
      if (newSelectedMonth) {
        const billRes = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/bills/dormitories/${dormId}/invoices/by-month`, {
          params: { month: newSelectedMonth },
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setMonthlyBills(billRes.data);
        
        // ไม่จำเป็นต้องอัปเดตหมายเหตุในหน้านี้
      }
    } catch (err) {
      console.error('Error refreshing available months and bills:', err);
      toast.error('ไม่สามารถรีเฟรชข้อมูลใบแจ้งหนี้ได้');
    }
  };

  const handleBackFromManager = () => {
    setShowBillManager(false);
  };

  const handleBillsUpdate = (updatedBills) => {
    setMonthlyBills(updatedBills);
  };

  const handlePrintSelected = () => {
    if (!selectedMonth) {
      toast.warning('กรุณาเลือกรอบบิลก่อน', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      return;
    }
    if (filteredBills.length === 0) {
      toast.warning('ไม่มีข้อมูลบิลในรอบที่เลือก', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      return;
    }
    setShowMultiPrint(true);
  };

  const handleSendSelected = () => {
    if (!selectedMonth) {
      toast.warning('กรุณาเลือกรอบบิลก่อน', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      return;
    }
    if (filteredBills.length === 0) {
      toast.warning('ไม่มีข้อมูลบิลในรอบที่เลือก', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      return;
    }
    setShowMultiSend(true);
  };

  const handleDeleteUnpaidBills = () => {
    const unpaidBills = filteredBills.filter(bill => bill.status === 'unpaid');
    if (unpaidBills.length === 0) {
      toast.info('ไม่มีใบแจ้งหนี้ที่ค้างชำระ', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      return;
    }
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedMonth) {
      toast.warning('กรุณาเลือกรอบบิลที่ต้องการลบ', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await axios.delete(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/bills/dormitories/${dormId}/invoices/unpaid`, {
        data: { month: selectedMonth },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // อัปเดต state โดยการดึงข้อมูลใหม่
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/bills/dormitories/${dormId}/invoices/by-month`, {
        params: { month: selectedMonth },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMonthlyBills(res.data);
      
      toast.success(`${response.data.message}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      setShowDeleteModal(false);
    } catch (error) {
      console.error('❌ ลบบิลค้างชำระล้มเหลว:', error);
      toast.error(`❌ ${error.response?.data?.error || 'เกิดข้อผิดพลาดในการลบบิลค้างชำระ'}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    return status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ';
  };

  const getStatusColor = (status) => {
    return status === 'paid' 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  // แสดงหน้าสร้างบิลใหม่
  if (showCreateForm) {
    return (
      <CreateBillForm 
        onBack={handleBackFromCreate}
        onBillCreated={handleBillCreated}
      />
    );
  }

  // แสดงหน้าจัดการบิล
  if (showBillManager) {
    return (
      <BillManager 
        onBack={handleBackFromManager}
        bills={monthlyBills}
        onBillsUpdate={handleBillsUpdate}
      />
    );
  }

  // แสดงหน้ารายละเอียดถ้าเลือกใบแจ้งหนี้
  if (showDetail && selectedBill) {
    return <MonthDetailBills bill={selectedBill} onBack={handleBackFromDetail} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-700 flex items-center gap-2">
              <IoCalendar className="text-gray-700 text-3xl" />
              บิลรายเดือน
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              จัดการใบแจ้งหนี้รายเดือนสำหรับห้องเช่ารายเดือน
              {selectedMonth && (
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs">
                  {generateBillRoundLabel(selectedMonth)}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreateNewBill} 
              className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors shadow-sm"
            >
              <FaPlus className="w-4 h-4" />
              สร้างใบแจ้งหนี้รายเดือน
            </button>
          </div>
        </div>

        {/* Bill Round Selector */}
        <div className="mb-4 flex justify-center">
          <div className="relative">
            {/* Display Button */}
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 min-w-64 text-left flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="w-4 h-4 text-gray-500" />
                <span>{selectedMonth ? generateBillRoundLabel(selectedMonth) : 'เลือกรอบบิล'}</span>
              </div>
              <FaChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCalendar ? 'rotate-180' : ''}`} />
            </button>

            {/* Calendar Dropdown */}
            {showCalendar && (
              <div className="absolute top-full left-0 mt-1 bg-white rounded-md border border-gray-300 shadow-lg z-50 min-w-64">
                {/* Calendar Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                  <button
                    onClick={() => changeYear(-1)}
                    className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    title="ปีก่อนหน้า"
                  >
                    <FaChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  
                  <h3 className="text-base font-medium text-gray-800">
                    {currentYear}
                  </h3>
                  
                  <button
                    onClick={() => changeYear(1)}
                    className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    title="ปีถัดไป"
                  >
                    <FaChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="p-3">
                  <div className="grid grid-cols-4 gap-1">
                    {thaiMonths.map((month, index) => {
                      const hasData = hasDataForMonth(index);
                      const isSelected = isSelectedMonth(index);
                      
                      return (
                        <button
                          key={index}
                          onClick={() => selectMonth(index)}
                          disabled={!hasData}
                          className={`
                            p-2 text-xs text-center transition-colors rounded-md
                            ${isSelected 
                              ? 'bg-blue-500 text-white' 
                              : hasData 
                                ? 'text-gray-700 hover:bg-gray-100' 
                                : 'text-gray-300 cursor-not-allowed'
                            }
                          `}
                        >
                          {month}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Overlay to close calendar when clicking outside */}
            {showCalendar && (
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowCalendar(false)}
              />
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-gray-50 p-4 rounded-md border border-gray-300 mb-4 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">ค้นหาและกรองข้อมูล</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">เลขที่ห้อง</label>
              <input
                type="text"
                value={searchRoom}
                onChange={(e) => setSearchRoom(e.target.value)}
                placeholder="เลขที่ห้อง"
                className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ชั้น</label>
              <select
                value={searchFloor}
                onChange={(e) => setSearchFloor(e.target.value)}
                className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              >
                <option value="ทั้งหมด">ทั้งหมด</option>
                {availableFloors.map(floor => (
                  <option key={floor} value={floor.toString()}>ชั้นที่ {floor}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
              <select
                value={searchStatus}
                onChange={(e) => setSearchStatus(e.target.value)}
                className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
              >
                <option value="ทั้งหมด">ทั้งหมด</option>
                <option value="paid">ชำระแล้ว</option>
                <option value="unpaid">ค้างชำระ</option>
              </select>
            </div>
          </div>
          
          {/* สรุปผลการค้นหา */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-md">
                  <FaChartBar className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-700">สรุปผล</h4>
              </div>
              {selectedMonth && (
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-md shadow-sm border border-blue-300">
                  <FaCalendarAlt className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-700">
                    {generateBillRoundLabel(selectedMonth)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* รายการทั้งหมด */}
              <div className="bg-blue-50 p-4 rounded-md shadow-sm border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-800 mb-1">
                      {filteredBills.length}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">รายการทั้งหมด</div>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-md">
                    <FaFileAlt className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* ชำระแล้ว */}
              <div className="bg-emerald-50 p-4 rounded-md shadow-sm border border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-emerald-700 mb-1">
                      {filteredBills.filter(bill => bill.status === 'paid').length}
                    </div>
                    <div className="text-sm text-emerald-600 font-medium">ชำระแล้ว</div>
                  </div>
                  <div className="p-3 bg-emerald-100 rounded-md">
                    <FaCheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>

              {/* ค้างชำระ */}
              <div className="bg-rose-50 p-4 rounded-md shadow-sm border border-rose-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-rose-700 mb-1">
                      {filteredBills.filter(bill => bill.status === 'unpaid').length}
                    </div>
                    <div className="text-sm text-rose-600 font-medium">ค้างชำระ</div>
                  </div>
                  <div className="p-3 bg-rose-100 rounded-md">
                    <FaExclamationCircle className="w-6 h-6 text-rose-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-3">
            <button
              onClick={handlePrintSelected}
              className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            >
              <FaPrint className="w-4 h-4" />
              พิมพ์หลายห้อง
            </button>

            <button
              onClick={handleDeleteUnpaidBills}
              className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            >
              <FaTrash className="w-4 h-4" />
              ลบบิลห้องค้างชำระ
            </button>
          </div>
            <button
              onClick={handleSendSelected}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
            >
              <FaEnvelope className="w-4 h-4" />
              ส่งบิลให้ผู้เช่าทางอีเมล
            </button>
        </div>

        {/* Bills by Floor */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-md h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-500">กำลังโหลดข้อมูล...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">
            <p className="text-lg">{error}</p>
          </div>
        ) : Object.keys(groupedBills).length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">ไม่พบข้อมูลบิลที่ตรงกับเงื่อนไขการค้นหา</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedBills)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([floor, bills]) => (
                <div key={floor} className="bg-white rounded-md shadow-sm border border-gray-300 overflow-hidden">
                  {/* Floor Header */}
                  <div className="bg-slate-600 text-white p-4 border-b border-gray-300">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">ชั้นที่ {floor}</h2>
                      <div className="flex gap-4 text-sm">
                        <span className="bg-white bg-opacity-15 px-3 py-1 rounded-md">
                          <span className='text-gray-800'>รวม {bills.length} ห้อง</span>
                        </span>
                        <span className="bg-emerald-500 bg-opacity-80 px-3 py-1 rounded-md">
                          ชำระแล้ว {bills.filter(bill => bill.status === 'paid').length}
                        </span>
                        <span className="bg-rose-500 bg-opacity-80 px-3 py-1 rounded-md">
                          ค้างชำระ {bills.filter(bill => bill.status === 'unpaid').length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bills Grid for this floor */}
                  <div className="p-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {bills.map((bill) => (
                        <div key={bill.id} className="bg-gray-50 rounded-md shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                          {/* Card Content */}
                          <div className="p-4">
                            {/* Room Number and Amount */}
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="text-lg font-bold text-gray-800">{bill.room_number || bill.roomNumber}</h3>
                                <p className="text-xs text-gray-500">ห้อง</p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-gray-800">
                                  {bill.amount?.toLocaleString() || '0'}
                                </p>
                                <p className="text-xs text-gray-500">บาท</p>
                              </div>
                            </div>

                            {/* Tenant Name */}
                            <div className="mb-3">
                              <p className="text-sm text-gray-600 truncate" title={bill.tenant}>
                                {bill.tenant || 'ไม่ระบุผู้เช่า'}
                              </p>
                            </div>

                            {/* Invoice Number */}
                            <div className="mb-3">
                              <p className="text-xs text-gray-500">
                                เลขที่: {bill.invoice_number || 'ไม่ระบุ'}
                              </p>
                            </div>

                            {/* Status and Action */}
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1 ${
                                  bill.status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm'
                                }`}
                              >
                                <div className={`w-2 h-2 rounded-md ${
                                  bill.status === 'paid' ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}></div>
                                {bill.status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
                              </span>
                              <button
                                onClick={() => handleSelectBill(bill)}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-md hover:shadow-lg transform hover:scale-102 transition-all duration-200 flex items-center gap-1"
                              >
                                <FaInfoCircle className="w-3 h-3" />
                                รายละเอียด
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-20 ">
            <div className="bg-white rounded-md p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">ยืนยันการลบบิลค้างชำระ</h3>
              <p className="text-gray-600 mb-6">
                คุณต้องการลบใบแจ้งหนี้ที่ค้างชำระทั้งหมดในรอบ <strong>{generateBillRoundLabel(selectedMonth)}</strong> หรือไม่?
                <br />
                <span className="text-red-600 text-sm mt-2 block">
                  การดำเนินการนี้ไม่สามารถยกเลิกได้ จำนวนบิลที่จะถูกลบ: {filteredBills.filter(bill => bill.status === 'unpaid').length} ใบ
                </span>
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-rose-500 text-white rounded-md hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'กำลังลบ...' : 'ยืนยันลบ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Multi Print Modal */}
        <MultiPrintModal
          showModal={showMultiPrint}
          onClose={() => setShowMultiPrint(false)}
          selectedMonth={selectedMonth}
        />

        {/* Multi Send Modal */}
        <MultiSendModal
          showModal={showMultiSend}
          onClose={() => setShowMultiSend(false)}
          selectedMonth={selectedMonth}
        />

        <ToastContainer />
      </div>
    </div>
  );
}

export default MonthBills;
