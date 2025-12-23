import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaPrint, FaEdit, FaTrash, FaPlus, FaTimes, FaEnvelope, FaExclamationTriangle, FaInfoCircle, FaCreditCard, FaMoneyBillWave } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import InvoiceReceipt from './InvoiceReceipt/InvoiceReceipt';
import PaidInvoiceReceipt from './InvoiceReceipt/PaidInvoiceReceipt';
import API_URL from '../../../config/api';

function MonthDetailBills() {
  const { dormId, invoiceId } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const location = useLocation();
  const bill = location.state?.bill;
  const [editData, setEditData] = useState({
    waterUnits: 0,
    electricUnits: 0,
    additionalCharges: []
  });

  // เพิ่ม state ที่จำเป็น
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showPaidReceipt, setShowPaidReceipt] = useState(false);
  const [paymentId, setPaymentId] = useState(null);

  // เพิ่ม state สำหรับ Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmData, setConfirmData] = useState({
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    type: 'normal' // 'normal' หรือ 'warning'
  });

  // เพิ่ม state สำหรับ Delete Payment Modal
  const [showDeletePaymentModal, setShowDeletePaymentModal] = useState(false);
  const [deletePaymentData, setDeletePaymentData] = useState({
    paymentId: null,
    onConfirm: null
  });

  // เพิ่ม state สำหรับ Delete Bill Modal
  const [showDeleteBillModal, setShowDeleteBillModal] = useState(false);
  const [deleteBillData, setDeleteBillData] = useState({
    roomNumber: '',
    onConfirm: null
  });

  // เพิ่ม state สำหรับ Send Email Modal
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [sendEmailData, setSendEmailData] = useState({
    onConfirm: null
  });

  // เพิ่มการตรวจสอบ parameters
  console.log('🔍 MonthDetailBills Parameters:', { dormId, invoiceId });

  // ตรวจสอบว่า invoiceId เป็นตัวเลขที่ถูกต้อง
  if (!invoiceId || invoiceId === 'undefined' || invoiceId.includes(':')) {
    console.error('❌ Invalid invoiceId:', invoiceId);
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-600 mb-4">ไม่พบหมายเลขใบแจ้งหนี้ที่ถูกต้อง</p>
          <button
            onClick={() => navigate(`/bills/${dormId}`)}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            กลับไปหน้ารายการใบแจ้งหนี้
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const fetchBillData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 กำลังดึงข้อมูลใบแจ้งหนี้:', { dormId, invoiceId });
        
        const res = await axios.get(`${API_URL}/api/bills/dormitories/${dormId}/invoices/${invoiceId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const data = res.data;
        console.log('✅ ข้อมูลใบแจ้งหนี้ (อัพเดท):', data);

        // ตรวจสอบว่ามีข้อมูล
        if (!data || !data.invoice) {
          console.error('❌ ไม่พบข้อมูลใบแจ้งหนี้');
          setError('ไม่พบข้อมูลใบแจ้งหนี้');
          setBillData(null);
          return;
        }

        const bill = data.invoice;
        const invoiceItems = data.invoice_items || [];

        console.log('📋 Invoice status from API:', {
          status: bill.status,
          total_paid: bill.total_paid,
          balance: bill.balance,
          total: bill.total
        });

        const formattedItems = invoiceItems.map((item, index) => {
          // ดึงจำนวนหน่วยจาก API - ✅ รองรับค่า 0
          let units = item.unit_count !== undefined && item.unit_count !== null ? item.unit_count : 1;
          if (item.type === 'water' || item.type === 'electric') {
            units = item.unit_count !== undefined && item.unit_count !== null ? item.unit_count : 1;
          }

          // ✅ ถ้าเป็นน้ำหรือไฟและมีหน่วย = 0 ให้ amount = 0
          let amount = parseFloat(item.amount) || 0;
          if ((item.type === 'water' || item.type === 'electric') && units === 0) {
            amount = 0;
          }

          return {
            id: item.invoice_receipt_item_id || index + 1,
            description: item.description || 'ไม่ระบุ',
            rate: parseFloat(item.rate) || 0,
            amount: amount,
            editable: item.type === 'service' || item.type === 'discount',
            type: item.type || 'service',
            units,
          };
        });

      setBillData(bill);

      // ใช้ total จาก API หรือคำนวณเป็น fallback
      const apiTotal = parseFloat(bill.total) || 0;
      const apiPaid = parseFloat(bill.total_paid) || 0;
      const apiBalance = parseFloat(bill.balance) || 0;
      
      const calculatedTotal = formattedItems.reduce((sum, item) => {
        if (item.type === 'discount' || item.is_discount === 1) {
          return sum - Math.abs(item.amount);
        }
        return sum + Math.abs(item.amount);
      }, 0);
      
      const finalTotal = apiTotal > 0 ? apiTotal : calculatedTotal;
      const finalBalance = apiBalance !== undefined ? apiBalance : (finalTotal - apiPaid);
      
      // ตรวจสอบสถานะการชำระเงิน
      const isPaid = bill.status === 'paid' || finalBalance <= 0;
      
      console.log('💰 Payment calculation:', {
        apiTotal,
        apiPaid,
        apiBalance,
        calculatedTotal,
        finalTotal,
        finalBalance,
        isPaid,
        status: bill.status
      });

      setInvoiceData({
        dormInfo: {
          name: bill.dorm_name,
          address: bill.dorm_address,
          phone: bill.dorm_phone || "N/A",
          subdistrict: bill.dorm_subdistrict || "ไม่ระบุ",
          district: bill.dorm_district || "ไม่ระบุ",
          province: bill.dorm_province || "ไม่ระบุ",
        },
        tenantInfo: {
          name: bill.tenant_name,
          address: bill.tenant_address || "ไม่ระบุ",
          subdistrict: bill.tenant_subdistrict || "ไม่ระบุ",
          district: bill.tenant_district || "ไม่ระบุ",
          province: bill.tenant_province || "ไม่ระบุ",
        },
        invoiceNumber: bill.invoice_number || bill.monthly_invoice_id,
        roomNumber: bill.room_number,
        date: new Date().toLocaleDateString('th-TH'),
        dueDate: bill.due_date ? new Date(bill.due_date).toLocaleDateString('th-TH') : 'ไม่ระบุ',
        chargePerDay: parseFloat(bill.charge_per_day) || 0,
        lateFee: parseFloat(bill.late_fee) || 0,
        lateDays: parseInt(bill.late_days) || 0,
        status: isPaid ? 'paid' : 'unpaid',
        items: formattedItems,
        total: finalTotal,
        receipt: {
          number: `R${bill.monthly_invoice_id}`,
          date: new Date().toLocaleDateString('th-TH'),
          amount: apiPaid,
          balance: finalBalance,
        }
      });

      // โหลดหมายเหตุจากตาราง default_receipt_notes
      await loadDefaultNote();

      // โหลดหมายเหตุการชำระเงินจากตาราง default_receipt_notes
      await loadDefaultPaymentNote();

      // โหลดประวัติการชำระเงิน
      await fetchPaymentHistory();

    } catch (err) {
      console.error('⚠️ โหลดข้อมูลใบแจ้งหนี้ล้มเหลว:', err);
      
      // แสดง error message ที่เหมาะสม
      let errorMessage = 'ไม่สามารถโหลดข้อมูลใบแจ้งหนี้ได้';
      
      if (err.response?.status === 400) {
        errorMessage = 'ข้อมูลไม่ถูกต้อง หรือหมายเลขใบแจ้งหนี้ไม่ถูกต้อง';
        toast.error(errorMessage);
      } else if (err.response?.status === 404) {
        errorMessage = 'ไม่พบใบแจ้งหนี้ที่ท่านค้นหา';
        toast.error(errorMessage);
      } else if (err.response?.status === 401) {
        errorMessage = 'กรุณาล็อกอินใหม่อีกครั้ง';
        toast.error(errorMessage);
        // อาจจะ redirect ไป login page
      } else if (err.response?.status >= 500) {
        errorMessage = 'เซิร์ฟเวอร์มีปัญหา กรุณาลองใหม่อีกครั้ง';
        toast.error(errorMessage);
      } else {
        errorMessage = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
        toast.error(errorMessage);
      }
      
      setError(errorMessage);
      setBillData(null);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันดึงประวัติการชำระเงิน
  const fetchPaymentHistory = async () => {
    try {
      
      const response = await axios.get(`${API_URL}/api/bills/dormitories/${dormId}/invoices/${invoiceId}/payments`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.status === 200) {
        const data = response.data;
        console.log('✅ ข้อมูลประวัติการชำระเงิน:', data);
        setPaymentHistory(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('❌ ดึงประวัติการชำระเงินล้มเหลว:', error);
      
      // แสดง error message ใน toast
      if (error.response?.status === 400) {
        toast.error('ข้อมูลไม่ถูกต้อง ไม่สามารถดึงประวัติการชำระเงินได้');
      } else if (error.response?.status === 404) {
        toast.warning('ไม่พบประวัติการชำระเงินสำหรับใบแจ้งหนี้นี้');
      } else if (error.response?.status >= 500) {
        toast.error('เซิร์ฟเวอร์มีปัญหา กรุณาลองใหม่อีกครั้ง');
      } else {
        toast.error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
      }
      
      // ตั้งค่า paymentHistory เป็น array ว่าง
      setPaymentHistory([]);
    }
  };

  fetchBillData();
}, [dormId, invoiceId]);

// ฟังก์ชันสำหรับแสดง Confirmation Modal
const showConfirmation = (title, message, onConfirm, type = 'normal') => {
  setConfirmData({
    title,
    message,
    onConfirm,
    onCancel: () => setShowConfirmModal(false),
    type
  });
  setShowConfirmModal(true);
};



  // State สำหรับเพิ่มรายการใหม่
  const [newService, setNewService] = useState({
    description: "",
    units: 1,
    ratePerUnit: 0
  });
  const [serviceType, setServiceType] = useState('service'); // 'service' หรือ 'discount'

  // State สำหรับรับเงิน
  const [paymentData, setPaymentData] = useState({
    type: "เงินสด",
    date: new Date().toISOString().split('T')[0],
    note: ""
  });

  // State สำหรับการแก้ไขหมายเหตุการชำระเงิน
  const [paymentNoteTemp, setPaymentNoteTemp] = useState("");
  const [isEditingPaymentNote, setIsEditingPaymentNote] = useState(false);

  // State สำหรับหมายเหตุกลาง (สำหรับทุกบิล)
  const [invoiceNote, setInvoiceNote] = useState("");
  const [isLoadingNote, setIsLoadingNote] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);

  // State สำหรับรายการใบแจ้งหนี้
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showPrintModal, setShowPrintModal] = useState(false);
  
  // State สำหรับแก้ไขรายการ
  const [editingItem, setEditingItem] = useState({
    id: null,
    description: '',
    rate: 0,
    amount: 0,
    units: 1
  });

  // ข้อมูลจะมาจาก API ใน useEffect แรก

  // ข้อมูลใบแจ้งหนี้จะมาจาก API
  const [invoiceData, setInvoiceData] = useState({
    dormInfo: {
      name: "",
      address: "",
      subdistrict: "",
      district: "",
      province: "",
      phone: ""
    },
    invoiceNumber: "",
    roomNumber: "",
    date: "",
    status: "",
    items: [],
    total: 0,
    receipt: {
      number: "",
      date: "",
      amount: 0,
      balance: 0
    }
  });

  // เพิ่ม state สำหรับการส่งอีเมล
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // โหลดข้อมูลเมื่อ invoiceData เปลี่ยน
  useEffect(() => {
    if (invoiceData && invoiceItems.length > 0) {
      console.log('🔄 Invoice data updated:', {
        status: invoiceData.status,
        balance: invoiceData.receipt?.balance,
        total: invoiceData.total,
        itemsCount: invoiceItems.length,
        paymentHistoryCount: paymentHistory.length
      });
    }
  }, [invoiceData, invoiceItems, paymentHistory]);

  // useEffect สำหรับติดตามการเปลี่ยนแปลงของ payment status
  useEffect(() => {
    if (invoiceData?.status) {
      console.log('📊 Current invoice status:', {
        status: invoiceData.status,
        isPaid: invoiceData.status === 'paid',
        balance: invoiceData.receipt?.balance,
        currentBalance: calculateCurrentBalance()
      });
    }
  }, [invoiceData?.status, paymentHistory]);

  // โหลดรายการใบแจ้งหนี้เมื่อ invoiceData เปลี่ยน
  useEffect(() => {
    if (invoiceData?.items) {
      setInvoiceItems(invoiceData.items);
    }
  }, [invoiceData?.items]);

  // คำนวณยอดรวมใหม่ - คำนึงถึงประเภทรายการ
  const calculateTotal = (items) => {
    return items.reduce((sum, item) => {
      if (item.type === 'discount' || item.is_discount === 1) {
        // ส่วนลดจะลบออกจากยอดรวม
        return sum - Math.abs(item.amount);
      }
      return sum + Math.abs(item.amount);
    }, 0);
  };

  // คำนวณยอดคงเหลือแบบ real-time
  const calculateCurrentBalance = () => {
    const currentTotal = calculateTotal(invoiceItems);
    const totalPaid = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
    return currentTotal - totalPaid;
  };

  // อัพเดทยอดรวมและยอดคงเหลือ - โหลดข้อมูลจาก API
  const updateTotals = async (items, payments = paymentHistory) => {
    try {
      // โหลด total ใหม่จาก API
      const res = await axios.get(`${API_URL}/api/bills/dormitories/${dormId}/invoices/${invoiceId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = res.data;
      
      const apiTotal = parseFloat(data.invoice?.total) || 0;
      const calculatedTotal = calculateTotal(items);
      const finalTotal = apiTotal > 0 ? apiTotal : calculatedTotal;
      
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const balance = finalTotal - totalPaid;
      
      setInvoiceData(prev => ({
        ...prev,
        total: finalTotal,
        receipt: {
          ...prev.receipt,
          balance: balance
        }
      }));
    } catch (error) {
      console.error('❌ อัพเดท total ล้มเหลว:', error);
      // fallback ใช้การคำนวณ
      const newTotal = calculateTotal(items);
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const balance = newTotal - totalPaid;
      
      setInvoiceData(prev => ({
        ...prev,
        total: newTotal,
        receipt: {
          ...prev.receipt,
          balance: balance
        }
      }));
    }
  };

  const handlePrint = () => {
    setShowPrintModal(true);
  };

  // ฟังก์ชันลบบิลพร้อม modal แยก
  const handleDeleteBill = async () => {
    const roomNumber = invoiceData?.roomNumber || 'ไม่ระบุ';
    
    setDeleteBillData({
      roomNumber,
      onConfirm: async () => {
        setShowDeleteBillModal(false);
        try {
          const response = await axios.delete(`${API_URL}/api/bills/dormitories/${dormId}/invoices/${invoiceId}`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });

          if (response.status === 200) {
            toast.success('ลบบิลใบแจ้งหนี้สำเร็จ');
            setTimeout(() => {
              navigate(`/bills/${dormId}`); // กลับไปหน้า MonthBills
            }, 1500);
          } else {
            const errorData = response.data;
            toast.error(`เกิดข้อผิดพลาดในการลบใบแจ้งหนี้: ${errorData.error || 'ไม่ทราบสาเหตุ'}`);
          }
        } catch (error) {
          console.error('❌ เกิดข้อผิดพลาดในการลบใบแจ้งหนี้:', error);
          toast.error('ไม่สามารถลบใบแจ้งหนี้ได้ กรุณาลองใหม่อีกครั้ง');
        }
      }
    });
    
    setShowDeleteBillModal(true);
  };

  // ฟังก์ชันแก้ไขรายการ
  const handleEditItem = (item) => {
    // Extract units from description or default to 1
    let units = 1;
    if (item.type === 'water' || item.type === 'electric') {
      const unitMatch = item.description.match(/:\s*(\d+)\s*หน่วย/);
      units = unitMatch ? parseInt(unitMatch[1]) : 1;
    }
    
    setEditingItem({
      id: item.id,
      description: item.description,
      rate: item.rate,
      amount: item.amount,
      units: units,
      type: item.type
    });
    setEditingItemId(item.id);
  };

  const handleSaveEditItem = async () => {
    try {
      const response = await axios.put(`${API_URL}/api/bills/dormitories/${dormId}/invoices/${invoiceId}/items/${editingItem.id}`, {
        description: editingItem.description,
        rate: editingItem.rate,
        unit_count: editingItem.units
      }, {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = response.data;
      if (response.status === 200) {
        // อัปเดต UI
        const updatedItems = invoiceItems.map(item => {
          if (item.id === editingItem.id) {
            // Update the description with the new unit count if it's water or electric
            let updatedDescription = editingItem.description;
            if (editingItem.type === 'water' || editingItem.type === 'electric') {
              // Replace the unit count in the description
              updatedDescription = updatedDescription.replace(
                /:\s*\d+\s*หน่วย/, 
                `: ${editingItem.units} หน่วย`
              );
            }
            
            // Calculate the new amount based on rate and units
            const newAmount = editingItem.rate * editingItem.units;
            
            return { 
              ...item, 
              description: updatedDescription,
              rate: editingItem.rate,
              amount: newAmount,
              units: editingItem.units
            };
          }
          return item;
        });
        
        setInvoiceItems(updatedItems);
        await updateTotals(updatedItems);
        setEditingItemId(null);
        setEditingItem({ id: null, description: '', rate: 0, amount: 0, units: 1 });
        toast.success('แก้ไขรายการสำเร็จ');
      } else {
        toast.error(data.error || 'เกิดข้อผิดพลาดในการแก้ไข');
      }
    } catch (err) {
      console.error('❌ แก้ไขรายการล้มเหลว:', err);
      toast.error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const handleCancelEditItem = () => {
    setEditingItemId(null);
    setEditingItem({ id: null, description: '', rate: 0, amount: 0, units: 1 });
  };

  // ฟังก์ชันลบรายการ
  const handleDeleteItem = async (itemId) => {
    showConfirmation(
      'ต้องการลบรายการนี้หรือไม่?',
      'การดำเนินการนี้ไม่สามารถยกเลิกได้',
      async () => {
        setShowConfirmModal(false);
        try {
          const response = await axios.delete(`${API_URL}/api/bills/dormitories/${dormId}/invoices/${invoiceId}/items/${itemId}`, {
            headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = response.data;
      if (response.status === 200) {
        // อัปเดต UI
        const updatedItems = invoiceItems.filter(item => item.id !== itemId);
        setInvoiceItems(updatedItems);
        await updateTotals(updatedItems);
        toast.success('ลบรายการสำเร็จ');
      } else {
        toast.error(data.error || 'เกิดข้อผิดพลาดในการลบ');
      }
    } catch (err) {
      console.error('❌ ลบรายการล้มเหลว:', err);
      toast.error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
    },
    'warning'
    );
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    toast.success('บันทึกการแก้ไขเรียบร้อย');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  // ฟังก์ชันเพิ่มรายการใหม่
  const handleAddService = async () => {
    if (!newService.description.trim()) return toast.error('กรุณากรอกรายการ');
    if (newService.units <= 0) return toast.error('จำนวนหน่วยต้องมากกว่า 0');
    if (newService.ratePerUnit <= 0) return toast.error('ราคาต่อหน่วยต้องมากกว่า 0');

    const calculatedAmount = newService.units * newService.ratePerUnit;

    try {
      const response = await axios.post(`${API_URL}/api/bills/dormitories/${dormId}/invoices/${invoiceId}/items`, {
        description: newService.description,
        type: serviceType,
        rate: newService.ratePerUnit, // ส่งราคาต่อหน่วย
        unit_count: newService.units
      }, {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = response.data;
      if (response.status === 200 || response.status === 201) {
        console.log('✅ เพิ่มรายการสำเร็จ:', data);
        
        // เพิ่มลง invoiceItems ใน UI
        const itemAmount = serviceType === 'discount' 
          ? -Math.abs(calculatedAmount) 
          : calculatedAmount;
        
        const newItem = {
          id: data.item.invoice_receipt_item_id,
          description: data.item.description,
          rate: newService.ratePerUnit,
          amount: itemAmount,
          editable: true,
          type: serviceType,
          units: newService.units
        };

        const updatedItems = [...invoiceItems, newItem];
        setInvoiceItems(updatedItems);
        
        // ✅ คำนวณ total ใหม่โดยไม่ fetch จาก API
        const newTotal = calculateTotal(updatedItems);
        const totalPaid = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
        const balance = newTotal - totalPaid;
        
        setInvoiceData(prev => ({
          ...prev,
          total: newTotal,
          receipt: {
            ...prev.receipt,
            balance: balance
          }
        }));
        
        setNewService({ description: "", units: 1, ratePerUnit: 0 });
        toast.success(`เพิ่มรายการ "${newService.description}" สำเร็จ`);
      } else {
        console.error('❌ Response status ไม่ถูกต้อง:', response.status);
        toast.error(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      console.error('❌ เพิ่มรายการล้มเหลว:', err);
      toast.error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };


  // ฟังก์ชันบันทึกรับเงิน
  const handleSavePayment = async () => {
    try {
      // ตรวจสอบข้อมูลที่จำเป็น
      if (!paymentData.type || !paymentData.date) {
        toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
      }

      // ตรวจสอบว่ามีข้อมูลใบแจ้งหนี้หรือไม่
      if (!invoiceData || !dormId || !invoiceId) {
        toast.error('ไม่พบข้อมูลใบแจ้งหนี้ กรุณาลองใหม่อีกครั้ง');
        return;
      }

      // คำนวณยอดคงเหลือ real-time
      const currentBalance = calculateCurrentBalance();
      const currentTotal = calculateTotal(invoiceItems);
      const totalPaid = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
      
      console.log('💰 Frontend Payment Debug:', {
        dormId,
        invoiceId,
        currentTotal,
        totalPaid,
        currentBalance,
        invoiceDataTotal: invoiceData.total,
        invoiceDataBalance: invoiceData?.receipt?.balance,
        paymentData
      });
      
      // ตรวจสอบว่ายังมียอดค้างชำระหรือไม่
      if (currentBalance <= 0) {
        toast.warning('ใบแจ้งหนี้นี้ได้รับการชำระเงินครบแล้ว');
        return;
      }

      // ยืนยันการชำระเงิน - ใช้ยอดคงเหลือที่คำนวณใหม่
      showConfirmation(
        'ยืนยันการชำระเงิน',
        `ใบแจ้งหนี้เลขที่ ${invoiceData.invoiceNumber}\nจำนวน ${currentBalance.toFixed(2)} บาท\nประเภท: ${paymentData.type}`,
        async () => {
          setShowConfirmModal(false);
          try {
            const requestData = {
              payment_method: paymentData.type,
              payment_date: paymentData.date,
              payment_note: paymentData.note || ''
            };

            const apiUrl = `${API_URL}/api/bills/dormitories/${dormId}/invoices/${invoiceId}/payments`;
            
            console.log('📤 ส่งข้อมูลการชำระเงิน:', {
              url: apiUrl,
              dormId,
              invoiceId,
              requestData,
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token') ? 'Token exists' : 'No token'}`
              }
            });

            const response = await axios.post(apiUrl, requestData, {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`
              }
            });

            console.log('✅ Response จาก API:', response.data);

            if (response.status === 200 || response.status === 201) {
              const result = response.data;
              
              console.log('✅ Payment successful, refreshing data...');
              
              // Reset payment form
              setPaymentData({
                type: "เงินสด",
                date: new Date().toISOString().split('T')[0],
                note: paymentData.note || ""
              });

              toast.success(`บันทึกการชำระเงินสำเร็จ\nเลขที่ใบเสร็จ: ${result.payment?.receipt_number || 'ไม่ระบุ'}`);
              
              // รีเฟรชข้อมูลทั้งหมด
              try {
                console.log('🔄 Refreshing bill data and payment history...');
                
                // เรียกทั้งสองฟังก์ชันพร้อมกันและรอให้เสร็จ
                await Promise.all([
                  fetchBillData(),
                  fetchPaymentHistory()
                ]);
                
                console.log('✅ Data refresh completed');
                
                // หน่วงเวลาเล็กน้อยเพื่อให้ state อัพเดท
                setTimeout(() => {
                  console.log('🎯 Checking updated invoice status:', {
                    status: invoiceData?.status,
                    balance: invoiceData?.receipt?.balance,
                    paymentHistoryLength: paymentHistory.length
                  });
                }, 500);
                
              } catch (refreshError) {
                console.error('❌ Error refreshing data:', refreshError);
               
                
                // หาก refresh ล้มเหลว ให้ reload หน้าเว็บ
                setTimeout(() => {
                  window.location.reload();
                }, 2000);
              }
              
            } else {
              console.error('❌ Response status ไม่ถูกต้อง:', response.status, response.data);
              toast.error(`เกิดข้อผิดพลาด: ${response.data?.error || 'ไม่ทราบสาเหตุ'}`);
            }
          } catch (error) {
            console.error('❌ บันทึกการชำระเงินล้มเหลว:', error);
            
            if (error.response) {
              const status = error.response.status;
              const errorData = error.response.data;
              const errorMessage = errorData?.error || errorData?.message || 'เกิดข้อผิดพลาด';
              
              console.error('❌ API Error Details:', {
                status,
                data: errorData,
                headers: error.response.headers
              });
              
              switch (status) {
                case 400:
                  toast.error(`ข้อมูลไม่ถูกต้อง: ${errorMessage}`);
                  break;
                case 401:
                  toast.error('ไม่มีสิทธิ์เข้าถึง กรุณาเข้าสู่ระบบใหม่');
                  break;
                case 403:
                  toast.error('ไม่มีสิทธิ์เข้าถึงใบแจ้งหนี้นี้');
                  break;
                case 404:
                  toast.error(`ไม่พบข้อมูลใบแจ้งหนี้ (ID: ${invoiceId})\nกรุณาตรวจสอบและลองใหม่`);
                  break;
                case 500:
                  toast.error('เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่อีกครั้ง');
                  break;
                default:
                  toast.error(`เกิดข้อผิดพลาด (${status}): ${errorMessage}`);
              }
            } else if (error.request) {
              console.error('❌ Network Error:', error.request);
              toast.error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้\nกรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
            } else {
              console.error('❌ Unexpected Error:', error.message);
              toast.error(`เกิดข้อผิดพลาดไม่ทราบสาเหตุ: ${error.message}`);
            }
          }
        });
    } catch (error) {
      console.error('❌ บันทึกการชำระเงินล้มเหลว:', error);
      toast.error('เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง');
    }
  };

  // ฟังก์ชันลบรายการรับเงิน
  const handleDeletePayment = async (paymentId) => {
    setDeletePaymentData({
      paymentId,
      onConfirm: async () => {
        setShowDeletePaymentModal(false);
        try {
          const response = await axios.delete(`${API_URL}/api/bills/dormitories/${dormId}/invoices/${invoiceId}/payments/${paymentId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });

          if (response.status === 200) {
            // Refresh ข้อมูลใบแจ้งหนี้และประวัติการชำระเงิน
            toast.success('ยกเลิกการชำระเงินสำเร็จ');
            setTimeout(() => {
              window.location.reload(); // รีเฟรชหน้าเพื่อให้ข้อมูลอัพเดท
            }, 1500);
          }
        } catch (error) {
          console.error('❌ ยกเลิกการชำระเงินล้มเหลว:', error);
          toast.error(`เกิดข้อผิดพลาด: ${error.response?.data?.error || error.message}`);
        }
      }
    });
    
    setShowDeletePaymentModal(true);
  };

  // ฟังก์ชันโหลดหมายเหตุเริ่มต้นจากตาราง default_receipt_notes
  const loadDefaultNote = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/receipts/dormitories/${dormId}/default-note?receipt_type=monthly`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.status === 200) {
        const data = response.data;
        const noteContent = data.note_content || "ข้อความนี้จะแสดงในทุกใบแจ้งหนี้\nเมื่อพิมพ์หรือดาวน์โหลด";
        setInvoiceNote(noteContent);
      }
    } catch (error) {
      console.error('❌ โหลดหมายเหตุเริ่มต้นล้มเหลว:', error);
      // ถ้าไม่มีหมายเหตุเริ่มต้น ใช้ข้อความมาตรฐาน
      setInvoiceNote("ข้อความนี้จะแสดงในทุกใบแจ้งหนี้\nเมื่อพิมพ์หรือดาวน์โหลด");
    }
  };

  // ฟังก์ชันโหลดหมายเหตุการชำระเงินเริ่มต้นจากตาราง default_receipt_notes
  const loadDefaultPaymentNote = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/receipts/dormitories/${dormId}/default-note?receipt_type=payment`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.status === 200) {
        const data = response.data;
        const noteContent = data.note_content || "";
        setPaymentData(prev => ({
          ...prev,
          note: noteContent
        }));
        setPaymentNoteTemp(noteContent);
      }
    } catch (error) {
      console.error('❌ โหลดหมายเหตุการชำระเงินเริ่มต้นล้มเหลว:', error);
    }
  };

  // ฟังก์ชันบันทึกหมายเหตุ
  const handleSaveNote = async () => {
    if (isSavingNote) return;
    
    setIsSavingNote(true);
    try {
      // บันทึกลงตาราง default_receipt_notes แทน
      const response = await axios.post(`${API_URL}/api/receipts/dormitories/${dormId}/default-note`, { 
        note_content: invoiceNote,
        receipt_type: 'monthly'
      }, {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = response.data;
      if (response.status === 200) {
        toast.success('บันทึกหมายเหตุเริ่มต้นเรียบร้อยแล้ว');
        console.log('✅ บันทึกหมายเหตุเริ่มต้นสำเร็จ:', data);
      }
    } catch (err) {
      console.error('❌ บันทึกหมายเหตุล้มเหลว:', err);
      toast.error(err.response?.data?.error || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSavingNote(false);
    }
  };

  // ฟังก์ชันจัดการการแก้ไขหมายเหตุการชำระเงิน
  const handleEditPaymentNote = () => {
    setPaymentNoteTemp(paymentData.note);
    setIsEditingPaymentNote(true);
  };

  // ฟังก์ชันบันทึกหมายเหตุการชำระเงิน
  const handleSavePaymentNote = async () => {
    try {
      const response = await axios.post(`${API_URL}/api/receipts/dormitories/${dormId}/default-note`, { 
        note_content: paymentNoteTemp,
        receipt_type: 'payment'
      }, {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = response.data;
      if (response.status === 200) {
        setPaymentData(prev => ({
          ...prev,
          note: paymentNoteTemp
        }));
        setIsEditingPaymentNote(false);
        toast.success('บันทึกหมายเหตุการชำระเงินเรียบร้อยแล้ว');
        console.log('✅ บันทึกหมายเหตุการชำระเงินสำเร็จ:', data);
      }
    } catch (err) {
      console.error('❌ บันทึกหมายเหตุการชำระเงินล้มเหลว:', err);
      toast.error(err.response?.data?.error || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  // ฟังก์ชันยกเลิกการแก้ไขหมายเหตุการชำระเงิน
  const handleCancelEditPaymentNote = () => {
    setPaymentNoteTemp(paymentData.note);
    setIsEditingPaymentNote(false);
  };

  // ฟังก์ชันส่งบิลทางอีเมล
  const handleSendBillByEmail = async () => {
    if (!invoiceId || !dormId) {
      toast.error('ข้อมูลไม่ครบถ้วน');
      return;
    }

    // ตรวจสอบว่าบิลยังค้างชำระ
    if (!billData || billData.status === 'paid' || billData.balance <= 0) {
      toast.warning('บิลนี้ชำระเงินแล้ว ไม่จำเป็นต้องส่งอีเมล');
      return;
    }

    setSendEmailData({
      onConfirm: async () => {
        setShowSendEmailModal(false);
        setIsSendingEmail(true);
        try {
          const response = await axios.post(`${API_URL}/api/bills/dormitories/${dormId}/invoices/send-email`, {
            month: billData.bill_month,
            bills: [parseInt(invoiceId)]
          }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const { message, report } = response.data;
      
      // แสดงรายงานผลลัพธ์
      let alertMessage = message;
      if (report && report.results && report.results.length > 0) {
        const result = report.results[0];
        if (result.success) {
          alertMessage = `✅ ส่งบิลสำเร็จ!\n\nส่งไปยัง: ${result.tenant_email}`;
        } else {
              alertMessage =
              `❌ ส่งบิลไม่สำเร็จ\n\n` +
              `สาเหตุที่เป็นไปได้:\n` +
              `- อีเมลผู้เช่าไม่ถูกต้อง หรือไม่มีอยู่จริง (${result.tenant_email})\n` +
              `- กล่องจดหมายผู้รับเต็ม หรือถูกระบบ Gmail ปฏิเสธ\n\n` +
              `รายละเอียดระบบ: ${result.error}`;
        }
      }
      
      if (alertMessage.includes('✅')) {
        toast.success(alertMessage);
      } else {
        toast.error(alertMessage);
      }
      
    } catch (error) {
      console.error('❌ ส่งบิลทางอีเมลล้มเหลว:', error);
      let errorMessage = 'เกิดข้อผิดพลาดในการส่งบิลทางอีเมล';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        if (error.response.data.details) {
          errorMessage += `\n\nรายละเอียด: ${error.response.data.details}`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSendingEmail(false);
    }
        }
    });
    
    setShowSendEmailModal(true);
  };

  // ฟังก์ชันพิมพ์ใบเสร็จ - เปิด print dialog ของ PaidInvoiceReceipt
  const handlePrintReceipt = async (payment) => {
    try {

      // ใช้ PaidInvoiceReceipt.printReceiptFromAPI เพื่อดึงข้อมูลและเปิด print dialog
      await PaidInvoiceReceipt.printReceiptFromAPI(dormId, invoiceId, payment.id);
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาดในการพิมพ์ใบเสร็จ:', error);
      toast.error('ไม่สามารถพิมพ์ใบเสร็จได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/bills/${dormId}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <FaArrowLeft className="w-4 h-4" />
              กลับ
            </button>
            <h1 className="text-2xl font-bold text-gray-800">รายละเอียดใบแจ้งหนี้</h1>
          </div>
          
          {/* ปุ่มต่างๆ - แสดงเมื่อมีข้อมูลบิล */}
          {!loading && !error && billData && invoiceData && (
            <div className="flex gap-3">
              {/* ปุ่มส่งบิลทางอีเมล - แสดงเฉพาะเมื่อบิลยังไม่ชำระเงิน */}
              {(invoiceData.status !== 'paid' && invoiceData.receipt.balance > 0) && (
                <button
                  onClick={handleSendBillByEmail}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                  disabled={isSendingEmail}
                  title={isSendingEmail ? "กำลังส่งอีเมล..." : "ส่งบิลทางอีเมลให้ผู้เช่า"}
                >
                  <FaEnvelope className="w-4 h-4" />
                  {isSendingEmail ? "กำลังส่ง..." : "ส่งบิลให้ผู้เช่าทางอีเมล"}
                </button>
              )}
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
              >
                <FaPrint className="w-4 h-4" />
                พิมพ์หรือดาวน์โหลดใบแจ้งหนี้
              </button>
              
              {/* ปุ่มลบ - แสดงเฉพาะเมื่อบิลยังไม่ชำระเงิน */}
              {(invoiceData.status !== 'paid' && invoiceData.receipt.balance > 0) && (
                <button
                  onClick={handleDeleteBill}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  <FaTrash className="w-4 h-4" />
                  ลบใบแจ้งหนี้
                </button>
              )}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-6 text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">เกิดข้อผิดพลาด</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {/* Content - แสดงเมื่อไม่ loading และไม่มี error */}
        {!loading && !error && billData && (
          <>
        {/* ตรวจสอบว่าพบข้อมูลบิลหรือไม่ */}
        {!billData ? (
          <div className="bg-white rounded-md shadow-sm border border-gray-300 p-8 text-center">
            <p className="text-gray-500 text-lg">ไม่พบข้อมูลบิล</p>
            <p className="text-gray-400 text-sm">กรุณาตรวจสอบ ID ของบิลอีกครั้ง</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* ใบแจ้งหนี้หลัก */}
            <div className="lg:col-span-2">
            <div className="bg-white rounded-md shadow-sm border border-gray-300">
              {/* Invoice Content */}
              <div className="p-4 invoice-content ">
                {/* Header ใบแจ้งหนี้ */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">ใบแจ้งหนี้ / Invoice</h2>
                  <div className="flex justify-between items-start">
                    <div className="text-left">
                      <h3 className="text-xl font-bold text-gray-800">{invoiceData.dormInfo.name}</h3>
                      <p className="text-gray-600 ">ที่อยู่ <span className='font-bold'>{invoiceData.dormInfo.address}</span></p>
                      <p className="text-gray-600 font-bold">ต.{invoiceData.dormInfo.subdistrict} อ.{invoiceData.dormInfo.district} จ.{invoiceData.dormInfo.province}</p>
                      <p className="text-gray-600">โทร: <span className='font-bold'>{invoiceData.dormInfo.phone}</span></p>
                      <p className="text-gray-600">ผู้เช่า: <span className='font-bold text-gray-600'>{invoiceData.tenantInfo.name}</span></p>
                    </div>
                    <div className="text-right">
                      <div className="mb-2">
                        <span className="text-sm text-gray-600">สถานะ: </span>
                        <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                          invoiceData.status === 'paid' || invoiceData.receipt.balance <= 0
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {invoiceData.status === 'paid' || invoiceData.receipt.balance <= 0 ? 'ชำระแล้ว' : 'ค้างชำระ'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">เลขที่: <span className="font-bold">{invoiceData.invoiceNumber}</span></p>
                      <p className="text-sm text-gray-600">ห้อง: <span className="font-bold">{invoiceData.roomNumber}</span></p>
                      <p className="text-sm text-gray-600">วันที่: <span className="font-bold">{invoiceData.date}</span></p>
                      <p className="text-sm text-gray-600">ครบกำหนด: <span className="font-bold">{invoiceData.dueDate}</span></p>
                    </div>
                  </div>
                </div>

                {/* ตารางรายการ */}
                <div className="mb-8">
                  <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gray-100 grid grid-cols-12 py-3 px-4 text-sm font-medium text-gray-700">
                      <div className="col-span-1 text-center">#</div>
                      <div className="col-span-4">รายการ</div>
                      <div className="col-span-2 text-center">จำนวนหน่วย</div>
                      <div className="col-span-2 text-center">ราคาต่อหน่วย</div>
                      <div className="col-span-2 text-center">ยอดเงิน</div>
                      <div className="col-span-1 text-center">จัดการ</div>
                    </div>
                    
                    {/* Body */}
                    <div className="divide-y divide-gray-200">
                      {invoiceItems.map((item, index) => (
                        <div key={item.id} className={`grid grid-cols-12 py-4 px-4 hover:bg-gray-50 transition-colors gap-1 ${
                          item.type === 'late_fee' ? 'bg-orange-50 ' : ''
                        }`}>
                          <div className="col-span-1 text-center text-sm font-medium text-gray-900">
                            {index + 1}
                          </div>
                          <div className="col-span-4">
                            {editingItemId === item.id ? (
                              <input
                                type="text"
                                value={editingItem.description}
                                onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                              />
                            ) : (
                              <div className={`text-sm ${
                                item.type === 'late_fee' ? 'text-orange-800 font-medium' : 'text-gray-900'
                              }`}>
                                {item.description}
                                {item.type === 'late_fee' && (
                                  <span className="text-xs text-orange-600 block">ค่าปรับอัตโนมัติ</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="col-span-2 text-center">
                            {editingItemId === item.id ? (
                              <input
                                type="number"
                                value={editingItem.units}
                                onChange={(e) => {
                                  const newUnits = parseInt(e.target.value) || 1;
                                  setEditingItem({
                                    ...editingItem, 
                                    units: newUnits,
                                    amount: editingItem.rate * newUnits
                                  });
                                }}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-center text-sm"
                                min="1"
                              />
                            ) : (
                              <div className="text-sm font-medium text-gray-900">
                                {item.units !== undefined && item.units !== null ? item.units : 1}
                              </div>
                            )}
                          </div>
                          <div className="col-span-2 text-center">
                            {editingItemId === item.id ? (
                              <input
                                type="number"
                                value={editingItem.rate}
                                onChange={(e) => setEditingItem({...editingItem, rate: parseFloat(e.target.value) || 0})}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-right text-sm"
                              />
                            ) : (
                              <div className={`text-sm font-medium ${item.type === 'discount' || item.is_discount === 1 ? 'text-red-500' : 'text-gray-900'}`}>
                                {item.type === 'discount' || item.is_discount === 1 ? `-${Math.abs(item.rate ?? 0).toFixed(2)}` : (item.rate ?? 0).toFixed(2)}
                              </div>
                            )}
                          </div>
                          <div className="col-span-2 text-center">
                            {editingItemId === item.id ? (
                              <input
                                type="number"
                                value={editingItem.amount}
                                onChange={(e) => setEditingItem({...editingItem, amount: parseFloat(e.target.value) || 0})}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-right text-sm"
                              />
                            ) : (
                              <div className={`text-sm font-bold ${
                                item.type === 'discount' || item.is_discount === 1 || item.amount < 0
                                  ? 'text-red-600' 
                                  : item.type === 'late_fee' 
                                    ? 'text-orange-600' 
                                    : 'text-gray-900'
                              }`}>
                                {item.type === 'discount' || item.is_discount === 1 
                                  ? `-${Math.abs(item.amount ?? 0).toFixed(2)}`
                                  : (item.amount ?? 0).toFixed(2)
                                }
                              </div>
                            )}
                          </div>
                          <div className="col-span-1 text-center">
                            {editingItemId === item.id ? (
                              <div className="flex justify-center gap-1">
                                <button 
                                  onClick={handleSaveEditItem}
                                  className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-md transition-colors"
                                  title="บันทึก"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button 
                                  onClick={handleCancelEditItem}
                                  className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-md transition-colors"
                                  title="ยกเลิก"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <div className="flex justify-center gap-2">
                                {item.editable && item.type !== 'rent' && item.type !== 'water' && item.type !== 'electric' && item.type !== 'late_fee' && invoiceData.status !== 'paid' && invoiceData.receipt.balance > 0 && (
                                  <>
                                    <button 
                                      onClick={() => handleEditItem(item)}
                                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-2 rounded-md transition-colors"
                                      title="แก้ไข"
                                    >
                                      <FaEdit className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteItem(item.id)}
                                      className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-md transition-colors"
                                      title="ลบ"
                                    >
                                      <FaTrash className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                                {(!item.editable || item.type === 'rent' || item.type === 'water' || item.type === 'electric' || item.type === 'late_fee' || invoiceData.status === 'paid' || invoiceData.receipt.balance <= 0) && (
                                  <span className="text-xs text-gray-400">
                                    {item.type === 'late_fee' ? 'ค่าปรับอัตโนมัติ' : invoiceData.status === 'paid' || invoiceData.receipt.balance <= 0 ? 'ชำระแล้ว' : 'ค่าพื้นฐาน'}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Footer - Total */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-t-2 border-blue-200">
                    <div className="grid grid-cols-12 py-4 px-4">
                      <div className="col-span-4 text-center"></div>
                      <div className="col-span-3 text-center"></div>
                      <div className="col-span-2 text-center">
                        {/* คอลัมน์ราคาต่อหน่วย */}
                        <div className="text-lg font-bold text-gray-800">รวม</div>
                      </div>
                      <div className="col-span-2 text-center">
                        {/* คอลัมน์ยอดเงิน */}
                        <div className="text-xl font-bold text-blue-600">
                          {calculateTotal(invoiceItems).toFixed(2)} ฿
                        </div>
                      </div>
                      <div className="col-span-1 text-center"></div>
                    </div>
                    </div>
                  </div>
                </div>
                
                {/* หมายเหตุในใบแจ้งหนี้ */}
                {invoiceNote && invoiceNote.trim() && (
                  <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">หมายเหตุ:</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap break-words" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>
                      {invoiceNote}
                    </p>
                  </div>
                )}
              </div>

              {/* เพิ่มรายการ */}
              {invoiceData.status !== 'paid' && invoiceData.receipt.balance > 0 && (
                <div className="bg-blue-50 border-t border-gray-300 p-6">
                  <h4 className="font-medium text-gray-800 mb-4">เพิ่มรายการ</h4>
                  <div className="bg-white rounded-md p-4 border border-gray-200">
                    <div className="flex gap-2 mb-4">
                      <button 
                        onClick={() => setServiceType('service')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          serviceType === 'service' 
                            ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-500' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        ค่าบริการ
                      </button>
                      <button 
                        onClick={() => setServiceType('discount')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          serviceType === 'discount' 
                            ? 'bg-red-100 text-red-700 border-b-2 border-red-500' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        ส่วนลด / คืนเงิน
                      </button>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-700">
                        {serviceType === 'service' ? (
                          <>ค่าบริการที่ <span className="text-red-500 font-medium">เก็บเพิ่ม</span> กับผู้เช่า</>
                        ) : (
                          <>ส่วนลดหรือเงินที่ <span className="text-green-500 font-medium">คืนให้</span> ผู้เช่า</>
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          รายการ <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          value={newService.description}
                          onChange={(e) => setNewService({...newService, description: e.target.value})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 bg-yellow-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={serviceType === 'service' ? 'กรอกรายการค่าบริการ' : 'กรอกรายการส่วนลด/คืนเงิน'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          จำนวนหน่วย <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="number" 
                          value={newService.units}
                          onChange={(e) => setNewService({...newService, units: parseInt(e.target.value) || 1})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 bg-yellow-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="1"
                          min="1"
                          step="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-1">
                          ราคาต่อหน่วย <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="number" 
                          value={newService.ratePerUnit}
                          onChange={(e) => setNewService({...newService, ratePerUnit: parseFloat(e.target.value) || 0})}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 bg-yellow-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                        <div className="text-xs text-gray-500 mt-1">
                          รวม: {(newService.units * newService.ratePerUnit).toFixed(2)} บาท
                        </div>
                      </div>
                      <div className="flex items-center pt-1">
                        <button 
                          onClick={handleAddService}
                          className={`px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
                            serviceType === 'service'
                              ? 'bg-blue-600 hover:bg-blue-700 text-white'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                        >
                          <FaPlus className="w-3 h-3" />
                          เพิ่ม
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* หมายเหตุกลาง */}
              {invoiceData.status !== 'paid' && invoiceData.receipt.balance > 0 && (
                <div className="bg-blue-50 border-t border-gray-300 p-6 rounded-b-md">
                  <h4 className="font-medium text-gray-800 mb-4">หมายเหตุใบแจ้งหนี้</h4>
                  <div className="bg-white rounded-md p-4 border border-gray-300">
                    <textarea
                      value={invoiceNote}
                      onChange={(e) => setInvoiceNote(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none break-words"
                      placeholder="ส่งใบแจ้งหรือรายละเอียดเพิ่มเติม..."
                      rows="4"
                      maxLength={500}
                      style={{ 
                        wordWrap: 'break-word',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">
                        {invoiceNote.length}/500 ตัวอักษร
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setInvoiceNote("")}
                          className="text-xs text-red-600 hover:text-red-700 transition-colors px-2 py-1"
                        >
                          ล้าง
                        </button>
                        <button
                          onClick={handleSaveNote}
                          disabled={isSavingNote}
                          className={`text-xs px-3 py-1 rounded-md transition-colors ${
                            isSavingNote 
                              ? 'bg-gray-400 text-white cursor-not-allowed' 
                              : 'bg-orange-600 hover:bg-orange-700 text-white'
                          }`}
                        >
                          {isSavingNote ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* แผงด้านข้าง */}
          <div className="space-y-4">
            {/* ยอดคงเหลือ */}
            {invoiceData.status !== 'paid' && calculateCurrentBalance() > 0 && (
              <div className="bg-white rounded-md shadow border border-gray-300 p-4">
                <div className="text-center">
                  <div className={`border rounded-md px-4 py-3 border-red-500 bg-red-50`}>
                    <p className="text-sm text-gray-800 font-medium mb-1">ค้างชำระ:</p>
                    <p className="text-2xl font-bold text-red-600">
                      {Math.abs(calculateCurrentBalance()).toFixed(2)} 
                      <span className="text-sm font-normal text-gray-600 ml-1">บาท</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* รับเงิน */}
            {invoiceData.status !== 'paid' && calculateCurrentBalance() > 0 && (
              <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">บันทึกการชำระเงิน</h3>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-gray-700 mb-1">เลขที่ใบแจ้งหนี้:</p>
                    <p className="text-lg font-bold text-blue-600">
                      {invoiceData.invoiceNumber}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-700 mb-1">วันที่ครบกำหนด:</p>
                    <p className={`text-sm font-bold ${
                      invoiceData.lateDays > 0 ? 'text-red-600' : 'text-gray-800'
                    }`}>
                      {invoiceData.dueDate}
                    </p>
                    {invoiceData.lateDays > 0 && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-xs text-red-700">
                          <span className="font-semibold">เกินกำหนด {invoiceData.lateDays} วัน</span>
                        </p>
                        {invoiceData.chargePerDay > 0 && (
                          <p className="text-xs text-red-600 mt-1">
                            ค่าปรับ: {(parseFloat(invoiceData.chargePerDay) || 0).toFixed(2)} บาท/วัน
                          </p>
                        )}
                        {invoiceData.lateFee > 0 && (
                          <p className="text-xs text-red-600 font-semibold">
                            รวมค่าปรับ: {(parseFloat(invoiceData.lateFee) || 0).toFixed(2)} บาท
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      ประเภทการชำระ <span className="text-red-500">*</span>
                    </label>
                    <select 
                      value={paymentData.type}
                      onChange={(e) => setPaymentData({...paymentData, type: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option>เงินสด</option>
                      <option>โอนเงิน</option>
                      <option>พร้อมเพย์</option>
                      <option>บัตรเครดิต</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 mb-1">
                      วันที่ชำระ <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center">
                      <span className="mr-2">📅</span>
                      <input 
                        type="date" 
                        value={paymentData.date}
                        onChange={(e) => setPaymentData({...paymentData, date: e.target.value})}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm text-gray-700">หมายเหตุการชำระเงิน</label>
                      {!isEditingPaymentNote && (
                        <button
                          onClick={handleEditPaymentNote}
                          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                        >
                          <FaEdit className="mr-1" /> แก้ไข
                        </button>
                      )}
                    </div>
                    
                    {isEditingPaymentNote ? (
                      <div className="space-y-2">
                        <textarea 
                          rows="3"
                          value={paymentNoteTemp}
                          onChange={(e) => setPaymentNoteTemp(e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="หมายเหตุการชำระเงิน (จะแสดงในทุกฟอร์มการชำระเงิน)"
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSavePaymentNote}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm flex items-center"
                          >
                            <span>บันทึก</span>
                          </button>
                          <button
                            onClick={handleCancelEditPaymentNote}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded-md text-sm flex items-center"
                          >
                            <FaTimes className="mr-1" /> ยกเลิก
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <textarea 
                          rows="3"
                          value={paymentData.note}
                          readOnly
                          className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-700 cursor-default"
                          placeholder="หมายเหตุการชำระเงิน (คลิกแก้ไขเพื่อแก้ไข)"
                        />
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleSavePayment}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-md font-bold text-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <FaCreditCard className="w-5 h-5" />
                    บันทึกการชำระเงิน
                  </button>
                </div>
              </div>
            )}

            {/* แสดงข้อความเมื่อชำระครบแล้ว */}
            {(invoiceData.status === 'paid' || invoiceData.receipt.balance <= 0) && (
              <div className="bg-white rounded-md shadow border border-green-200 p-4">
                <div className="text-center">
                  <div className="bg-green-50 border-2 border-green-200 rounded-md p-4">
                    <div className="text-green-600 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-green-800 mb-1">ชำระเงินครบแล้ว</h3>
                    <p className="text-sm text-green-700">ใบแจ้งหนี้นี้ได้รับการชำระเงินครบถ้วนแล้ว</p>
                  </div>
                </div>
              </div>
            )}

            {/* รายการรับเงิน */}
            <div className="bg-white rounded-md shadow-sm border border-gray-300 p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">ประวัติการชำระเงิน</h3>
              
              {paymentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">ยังไม่มีการชำระเงิน</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="border border-gray-200 rounded-md p-3 bg-green-50">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">
                            เลขที่บิล: {payment.billNumber}
                          </p>
                          <p className="text-sm text-green-600 font-semibold">
                            ชำระ: {payment.amount.toLocaleString()} บาท
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                              {payment.type}
                            </span>
                            <span>•</span>
                            <span>{new Date(payment.date).toLocaleDateString('th-TH')}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {/* ปุ่มดูใบเสร็จ (FaEye) ถูกลบตามคำขอ */}
                          <button
                            onClick={() => handlePrintReceipt(payment)}
                            className="text-blue-500 hover:text-blue-700 p-2 rounded-md hover:bg-blue-50"
                            title="พิมพ์ใบเสร็จ"
                          >
                            <FaPrint className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50"
                            title="ลบรายการชำระเงิน"
                          >
                            <FaTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">
                        ใบเสร็จ: {payment.receiptNumber}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Modal แก้ไข */}
        {isEditing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-md p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">แก้ไขใบแจ้งหนี้</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">หน่วยน้ำ</label>
                    <input
                      type="number"
                      value={editData.waterUnits}
                      onChange={(e) => setEditData({...editData, waterUnits: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">หน่วยไฟ</label>
                    <input
                      type="number"
                      value={editData.electricUnits}
                      onChange={(e) => setEditData({...editData, electricUnits: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก 
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Receipt Modal - แสดงเสมอ */}
        <InvoiceReceipt
          showModal={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          invoiceId={billData?.invoice_receipt_id}
        />

        {/* Warning Confirmation Modal */}
        {showConfirmModal && confirmData.type === 'warning' && (
          <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-[10vh]">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-md flex items-center justify-center">
                  <FaExclamationTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-red-900">
                  {confirmData.title}
                </h3>
              </div>
              
              <p className="text-center mb-4 whitespace-pre-line text-red-700">
                {confirmData.message}
              </p>
              
              <div className="flex justify-center space-x-3">
                <button
                  onClick={confirmData.onCancel}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmData.onConfirm}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Normal Confirmation Modal */}
        {showConfirmModal && confirmData.type === 'normal' && (
          <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-[10vh]">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-md flex items-center justify-center">
                  <FaMoneyBillWave className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">
                  {confirmData.title}
                </h3>
              </div>
              
              <p className="text-center mb-4 whitespace-pre-line text-gray-600">
                {confirmData.message}
              </p>
              
              <div className="flex justify-center space-x-3">
                <button
                  onClick={confirmData.onCancel}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmData.onConfirm}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                >
                  ยืนยัน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Payment Modal */}
        {showDeletePaymentModal && (
          <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-[10vh]">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-md flex items-center justify-center">
                  <FaExclamationTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-red-900">
                  ยืนยันการยกเลิกชำระเงิน
                </h3>
              </div>
              
              <p className="text-center mb-4 text-red-700">
                คุณต้องการยกเลิกประวัติการชำระเงินนี้หรือไม่?
              </p>
              
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeletePaymentModal(false)}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                >
                  ไม่ยกเลิก
                </button>
                <button
                  onClick={deletePaymentData.onConfirm}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  ยืนยันการยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Bill Modal */}
        {showDeleteBillModal && (
          <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-[10vh]">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-md flex items-center justify-center">
                  <FaExclamationTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-red-900">
                  ยืนยันการลบใบแจ้งหนี้
                </h3>
              </div>
              
              <p className="text-center mb-4 text-red-700">
                คุณต้องการลบใบแจ้งหนี้ห้อง <strong>{deleteBillData.roomNumber}</strong> หรือไม่?
                <br />
                <span className="text-sm">การดำเนินการนี้ไม่สามารถยกเลิกได้</span>
              </p>
              
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowDeleteBillModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-400 transition-colors font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={deleteBillData.onConfirm}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                >
                  ยืนยันการลบ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Send Email Modal */}
        {showSendEmailModal && (
          <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-[10vh]">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="text-center mb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-md flex items-center justify-center">
                  <FaEnvelope className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-blue-900">
                  ส่งบิลทางอีเมล
                </h3>
              </div>
              
              <p className="text-center mb-4 text-blue-700">
                ต้องการส่งบิลนี้ทางอีเมลไปยังผู้เช่าหรือไม่?
                <br />
                <span className="text-sm text-gray-600">ระบบจะส่งใบแจ้งหนี้ไปยังอีเมลที่ลงทะเบียนไว้</span>
              </p>
              
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => setShowSendEmailModal(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={sendEmailData.onConfirm}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  ส่งอีเมล
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        </>
        )}
      </div>
    </div>
  );
}

export default MonthDetailBills;
