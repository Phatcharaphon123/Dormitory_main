import React, { useState, useEffect } from 'react';
import { FaFileInvoiceDollar, FaMoneyBillWave, FaCalculator, FaCalendarAlt, FaExclamationTriangle, FaPlus, FaTrash, FaCheck, FaArrowLeft, FaSyncAlt, FaEdit } from 'react-icons/fa';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function CancelContract() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dormId, roomNumber } = useParams();
  
  // ข้อมูลพื้นฐานจาก URL params เป็นหลัก fallback ไป state
  const finalDormId = dormId || location.state?.dormId || '1';
  const finalRoomNumber = roomNumber || location.state?.roomNumber;

  // ตรวจสอบว่ามีข้อมูลที่จำเป็นหรือไม่
  if (!finalRoomNumber) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaExclamationTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">ไม่พบข้อมูลห้อง กรุณาเข้าถึงหน้านี้จากรายการห้องพัก</p>
          <button 
            onClick={() => navigate(-1)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            กลับ
          </button>
        </div>
      </div>
    );
  }
  
  // State สำหรับข้อมูลที่ดึงจาก API
  const [contractData, setContractData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State สำหรับ input มิเตอร์ปัจจุบัน (tab meter)
  const [currentWaterMeter, setCurrentWaterMeter] = useState('');
  const [currentElectricMeter, setCurrentElectricMeter] = useState('');
  const [isLoadingMeter, setIsLoadingMeter] = useState(false); // สำหรับการโหลดข้อมูลมิเตอร์
  
  // State สำหรับการจัดการข้อมูล
  const [checkoutDate, setCheckoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('เงินสด'); // เพิ่มประเภทการชำระเงิน
  const [note, setNote] = useState(''); // เพิ่ม state สำหรับหมายเหตุ
  const [isEditingNote, setIsEditingNote] = useState(false); // สำหรับจัดการการแก้ไขหมายเหตุ
  
  // State สำหรับ confirmation popup
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [tempNote, setTempNote] = useState(''); // สำหรับเก็บหมายเหตุชั่วคราวขณะแก้ไข
  const [defaultNote, setDefaultNote] = useState(''); // สำหรับเก็บหมายเหตุเริ่มต้น
  const [isDepositRefund, setIsDepositRefund] = useState(true); // สำหรับ checkbox คืนเงินประกัน (เริ่มต้นเป็น true)
  const [additionalCharges, setAdditionalCharges] = useState([]);
  
  // State สำหรับ tab ค่าบริการ
  const [newServiceDescription, setNewServiceDescription] = useState('');
  const [newServiceUnit, setNewServiceUnit] = useState('');
  const [newServicePricePerUnit, setNewServicePricePerUnit] = useState('');
  
  // State สำหรับ tab ส่วนลด/คืนเงิน
  const [newDiscountDescription, setNewDiscountDescription] = useState('');
  const [newDiscountUnit, setNewDiscountUnit] = useState('');
  const [newDiscountPricePerUnit, setNewDiscountPricePerUnit] = useState('');
  
  const [activeTab, setActiveTab] = useState('service'); // 'service', 'discount', 'penalty', 'meter'
  const [meterCharges, setMeterCharges] = useState([]);
  const [newMeterDescription, setNewMeterDescription] = useState('');
  const [newMeterAmount, setNewMeterAmount] = useState('');
  const [newMeterUnit, setNewMeterUnit] = useState(''); // เพิ่มสำหรับจำนวนหน่วยมิเตอร์
  const [newMeterPricePerUnit, setNewMeterPricePerUnit] = useState(''); // เพิ่มสำหรับราคาต่อหน่วยมิเตอร์
  
  // State สำหรับค่าน้ำ/ไฟที่สามารถแก้ไขได้
  const [utilityCharges, setUtilityCharges] = useState([]);
  
  // State สำหรับค่าปรับ/เสียหาย
  const [penaltyCharges, setPenaltyCharges] = useState([]);
  const [newPenaltyDescription, setNewPenaltyDescription] = useState('');
  const [newPenaltyUnit, setNewPenaltyUnit] = useState('');
  const [newPenaltyPricePerUnit, setNewPenaltyPricePerUnit] = useState('');

  // ฟังก์ชันดึงข้อมูลจาก API
  const fetchTerminationData = async () => {
    setLoading(true);
    try {
      if (!finalRoomNumber || !finalDormId) {
        throw new Error('ไม่พบข้อมูลห้องหรือหอพัก');
      }
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3001/api/contracts/dormitories/${finalDormId}/rooms/${finalRoomNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const result = response.data;
      
      // ตรวจสอบว่าเป็น error response หรือไม่
      if (result.error) {
        throw new Error(result.error);
      }
      
      // หากเป็นข้อมูลจริง ให้ set เลย (ไม่ต้องมี .success)
      if (result) {
        console.log('🔍 Debug: contractData received:', result);
        console.log('🔍 Debug: first_name:', result.first_name);
        console.log('🔍 Debug: last_name:', result.last_name);
        console.log('🔍 Debug: deposit_monthly:', result.deposit_monthly);
        
        // ดึงข้อมูลบิลค้างชำระ
        if (result.contract_id) {
          try {
            const billsResponse = await axios.get(`http://localhost:3001/api/bills/contracts/${result.contract_id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const billsData = billsResponse.data;
            console.log('🔍 Debug: bills received:', billsData);
            result.outstandingBills = billsData.map(bill => ({
              id: bill.invoice_receipt_id,
              invoiceNumber: bill.invoice_number, // แก้ไขเป็น camelCase
              amount: parseFloat(bill.total_amount),
              dueDate: bill.due_date,
              billMonth: bill.bill_month,
              items: bill.items || []
            }));
          } catch (billError) {
            console.warn('Error fetching bills:', billError);
            result.outstandingBills = [];
          }
        } else {
          result.outstandingBills = [];
        }
        
        setContractData(result);
        setCurrentWaterMeter('0');
        setCurrentElectricMeter('0');
        setError(null);
      } else {
        throw new Error('ไม่พบข้อมูลสัญญา');
      }
    } catch (error) {
      console.error('Error fetching termination data:', error);
      setError(error.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerminationData();
  }, [finalDormId, finalRoomNumber]);

  // โหลดรายการที่บันทึกไว้แล้วเมื่อได้ข้อมูล
  useEffect(() => {
    if (contractData?.savedAdjustments) {
      const saved = contractData.savedAdjustments;
      
      // แยกรายการตามประเภท และเพิ่ม move_out_adjustment_id เป็น id
      const charges = saved.filter(item => item.type === 'charge').map(item => ({
        ...item,
        id: item.id, // ใช้ move_out_adjustment_id จากฐานข้อมูล
        move_out_adjustment_id: item.id
      }));
      
      const refunds = saved.filter(item => item.type === 'refund').map(item => ({
        ...item,
        id: item.id,
        move_out_adjustment_id: item.id
      }));
      
      const meters = saved.filter(item => item.type === 'meter').map(item => ({
        ...item,
        id: item.id,
        move_out_adjustment_id: item.id
      }));
      
      const utilities = saved.filter(item => item.type === 'utility').map(item => ({
        ...item,
        id: item.id,
        move_out_adjustment_id: item.id
      }));
      
      const penalties = saved.filter(item => item.type === 'penalty').map(item => ({
        ...item,
        id: item.id,
        move_out_adjustment_id: item.id
      }));

      // ตั้งค่า state ตามรายการที่บันทึกไว้
      if (charges.length > 0 || refunds.length > 0) {
        setAdditionalCharges([...charges, ...refunds]);
      }
      if (meters.length > 0) {
        setMeterCharges(meters);
      }
      if (utilities.length > 0) {
        setUtilityCharges(utilities);
      }
      if (penalties.length > 0) {
        setPenaltyCharges(penalties);
      }
    }
  }, [contractData]);

  // โหลดค่ามิเตอร์เริ่มต้นเมื่อเข้าสู่หน้า
  useEffect(() => {
    const loadInitialMeterReading = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // ดึงข้อมูลมิเตอร์ที่ติดตั้งในห้องนี้
        const metersResponse = await axios.get(`http://localhost:3001/api/meters/dormitories/${finalDormId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // หาข้อมูลห้องปัจจุบัน
        let currentRoomMeter = null;
        Object.keys(metersResponse.data).forEach(floor => {
          const room = metersResponse.data[floor].find(r => r.roomNumber === finalRoomNumber);
          if (room) {
            currentRoomMeter = room;
          }
        });
        
        if (currentRoomMeter) {
          const hasWaterMeter = currentRoomMeter.meters?.water?.installed;
          const hasElectricMeter = currentRoomMeter.meters?.electric?.installed;
          const waterMeterCode = currentRoomMeter.meters?.water?.code;
          const electricMeterCode = currentRoomMeter.meters?.electric?.code;
          
          // ดึงข้อมูลจาก InfluxDB ถ้ามีมิเตอร์ดิจิทัล
          if (hasWaterMeter && waterMeterCode) {
            try {
              const waterResponse = await axios.post('http://localhost:3001/api/influx/latest-data', {
                measurement: waterMeterCode
              }, {
                headers: { 
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (waterResponse.data && waterResponse.data.data && waterResponse.data.data.water) {
                setCurrentWaterMeter(parseFloat(waterResponse.data.data.water).toFixed(2));
              }
            } catch (error) {
              console.warn('Could not fetch initial water meter data:', error.message);
            }
          }
          
          if (hasElectricMeter && electricMeterCode) {
            try {
              const electricResponse = await axios.post('http://localhost:3001/api/influx/latest-data', {
                measurement: electricMeterCode
              }, {
                headers: { 
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (electricResponse.data && electricResponse.data.data && electricResponse.data.data.power) {
                setCurrentElectricMeter(parseFloat(electricResponse.data.data.power).toFixed(2));
              }
            } catch (error) {
              console.warn('Could not fetch initial electric meter data:', error.message);
            }
          }
        }
      } catch (error) {
        console.warn('Could not load initial meter reading:', error.message);
      }
    };

    if (finalDormId && finalRoomNumber && contractData) {
      loadInitialMeterReading();
    }
  }, [finalDormId, finalRoomNumber, contractData]);

  // แสดงค่ามิเตอร์พื้นฐานในตารางรายการตั้งแต่เปิดเข้ามา
  useEffect(() => {
    // ปิดการแสดงค่าน้ำไฟอัตโนมัติ - ให้แสดงเฉพาะเมื่อกดปุ่มเพิ่มเท่านั้น
    if (false) {
      const baseWaterUsage = contractData?.currentMeterReading?.water && contractData?.initialMeterReading?.water 
        ? contractData.currentMeterReading.water - contractData.initialMeterReading.water 
        : 0;
      const baseElectricUsage = contractData?.currentMeterReading?.electric && contractData?.initialMeterReading?.electric 
        ? contractData.currentMeterReading.electric - contractData.initialMeterReading.electric 
        : 0;
      const baseWaterCost = contractData?.rates?.water ? baseWaterUsage * contractData.rates.water : 0;
      const baseElectricCost = contractData?.rates?.electric ? baseElectricUsage * contractData.rates.electric : 0;

      const utilityItems = [];
      
      // แสดงค่าน้ำไม่ว่าจะเป็นค่าใดก็ตาม (รวมทั้ง 0)
      if (contractData?.rates?.water !== undefined) {
        utilityItems.push({
          id: `water-${Date.now()}`,
          description: `ค่าน้ำ: ${baseWaterUsage} หน่วย (${contractData.currentMeterReading?.water || 0} - ${contractData.initialMeterReading?.water || 0})`,
          amount: baseWaterCost,
          type: 'utility',
          unit: baseWaterUsage,
          pricePerUnit: contractData.rates.water
        });
      }

      // แสดงค่าไฟไม่ว่าจะเป็นค่าใดก็ตาม (รวมทั้ง 0)
      if (contractData?.rates?.electric !== undefined) {
        utilityItems.push({
          id: `electric-${Date.now() + 1}`,
          description: `ค่าไฟ: ${baseElectricUsage} หน่วย (${contractData.currentMeterReading?.electric || 0} - ${contractData.initialMeterReading?.electric || 0})`,
          amount: baseElectricCost,
          type: 'utility',
          unit: baseElectricUsage,
          pricePerUnit: contractData.rates.electric
        });
      }

      if (utilityItems.length > 0) {
        setUtilityCharges(utilityItems);
      }
    }
  }, [contractData]);

  // โหลดหมายเหตุเริ่มต้น
  useEffect(() => {
    const loadDefaultNote = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:3001/api/receipts/dormitories/${finalDormId}/default-note?receipt_type=move_out`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = response.data;
        const noteContent = data.note_content || '';
        setDefaultNote(noteContent);
        setNote(noteContent);
      } catch (error) {
        console.error('Error loading default note:', error);
      }
    };

    if (finalDormId) {
      loadDefaultNote();
    }
  }, [finalDormId]);

  // บันทึกหมายเหตุเริ่มต้น
  const saveDefaultNote = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:3001/api/receipts/dormitories/${finalDormId}/default-note`, {
        note_content: tempNote,
        receipt_type: 'move_out'
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setDefaultNote(tempNote);
      setNote(tempNote);
      setIsEditingNote(false);
      toast.success('บันทึกหมายเหตุเริ่มต้นเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error saving default note:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกหมายเหตุ');
    }
  };

  // เริ่มการแก้ไขหมายเหตุ
  const startEditingNote = () => {
    setTempNote(note);
    setIsEditingNote(true);
  };

  // ยกเลิกการแก้ไขหมายเหตุ
  const cancelEditingNote = () => {
    setTempNote('');
    setIsEditingNote(false);
  };

  // handler สำหรับปุ่มดึงค่ามิเตอร์ล่าสุดจาก InfluxDB (ทั้งน้ำและไฟพร้อมกัน)
  const handleFetchLatestMetersBoth = async () => {
    setIsLoadingMeter(true);
    try {
      const token = localStorage.getItem('token');
      
      // ดึงข้อมูลมิเตอร์ที่ติดตั้งในห้องนี้
      const metersResponse = await axios.get(`http://localhost:3001/api/meters/dormitories/${finalDormId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // หาข้อมูลห้องปัจจุบัน
      let currentRoomMeter = null;
      Object.keys(metersResponse.data).forEach(floor => {
        const room = metersResponse.data[floor].find(r => r.roomNumber === finalRoomNumber);
        if (room) {
          currentRoomMeter = room;
        }
      });
      
      if (!currentRoomMeter) {
        throw new Error('ไม่พบข้อมูลมิเตอร์สำหรับห้องนี้');
      }
      
      const hasWaterMeter = currentRoomMeter.meters?.water?.installed;
      const hasElectricMeter = currentRoomMeter.meters?.electric?.installed;
      const waterMeterCode = currentRoomMeter.meters?.water?.code;
      const electricMeterCode = currentRoomMeter.meters?.electric?.code;
      
      let waterMeterValue = 0;
      let electricMeterValue = 0;
      let waterStatus = '';
      let electricStatus = '';
      
      // ดึงข้อมูลจาก InfluxDB ถ้ามีมิเตอร์น้ำดิจิทัล
      if (hasWaterMeter && waterMeterCode) {
        try {
          const waterResponse = await axios.post('http://localhost:3001/api/influx/latest-data', {
            measurement: waterMeterCode
          }, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (waterResponse.data && waterResponse.data.data && waterResponse.data.data.water) {
            waterMeterValue = parseFloat(waterResponse.data.data.water).toFixed(2);
            waterStatus = '(ดิจิทัล)';
          } else {
            waterStatus = '(ไม่มีข้อมูล)';
          }
        } catch (influxError) {
          console.warn('Could not fetch water meter from InfluxDB:', influxError.message);
          waterStatus = '(ผิดพลาด)';
        }
      } else {
        waterStatus = '(ไม่มีมิเตอร์)';
      }
      
      // ดึงข้อมูลจาก InfluxDB ถ้ามีมิเตอร์ไฟดิจิทัล
      if (hasElectricMeter && electricMeterCode) {
        try {
          const electricResponse = await axios.post('http://localhost:3001/api/influx/latest-data', {
            measurement: electricMeterCode
          }, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (electricResponse.data && electricResponse.data.data && electricResponse.data.data.power) {
            electricMeterValue = parseFloat(electricResponse.data.data.power).toFixed(2);
            electricStatus = '(ดิจิทัล)';
          } else {
            electricStatus = '(ไม่มีข้อมูล)';
          }
        } catch (influxError) {
          console.warn('Could not fetch electric meter from InfluxDB:', influxError.message);
          electricStatus = '(ผิดพลาด)';
        }
      } else {
        electricStatus = '(ไม่มีมิเตอร์)';
      }
      
      // อัปเดตค่ามิเตอร์ทั้งคู่
      setCurrentWaterMeter(waterMeterValue.toString());
      setCurrentElectricMeter(electricMeterValue.toString());
      
      // แสดงข้อความสำเร็จรวมทั้งน้ำและไฟ
      toast.success(
        `ดึงเลขมิเตอร์สำเร็จ! ห้อง: ${finalRoomNumber}\nมิเตอร์น้ำ: ${waterMeterValue} ${waterStatus}\nมิเตอร์ไฟ: ${electricMeterValue} ${electricStatus}`,
        { autoClose: 5000 }
      );
      
    } catch (error) {
      console.error('Error fetching meter readings:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงเลขมิเตอร์: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoadingMeter(false);
    }
  };

  // handler สำหรับปุ่มดึงค่ามิเตอร์ล่าสุดจาก InfluxDB (เก็บไว้สำหรับใช้แยก ถ้าต้องการ)
  const handleFetchLatestWaterMeter = async () => {
    setIsLoadingMeter(true);
    try {
      const token = localStorage.getItem('token');
      
      // ดึงข้อมูลมิเตอร์ที่ติดตั้งในห้องนี้
      const metersResponse = await axios.get(`http://localhost:3001/api/meters/dormitories/${finalDormId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // หาข้อมูลห้องปัจจุบัน
      let currentRoomMeter = null;
      Object.keys(metersResponse.data).forEach(floor => {
        const room = metersResponse.data[floor].find(r => r.roomNumber === finalRoomNumber);
        if (room) {
          currentRoomMeter = room;
        }
      });
      
      if (!currentRoomMeter) {
        throw new Error('ไม่พบข้อมูลมิเตอร์สำหรับห้องนี้');
      }
      
      const hasWaterMeter = currentRoomMeter.meters?.water?.installed;
      const waterMeterCode = currentRoomMeter.meters?.water?.code;
      
      let waterMeterValue = 0;
      
      // ดึงข้อมูลจาก InfluxDB ถ้ามีมิเตอร์น้ำดิจิทัล
      if (hasWaterMeter && waterMeterCode) {
        try {
          const waterResponse = await axios.post('http://localhost:3001/api/influx/latest-data', {
            measurement: waterMeterCode
          }, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (waterResponse.data && waterResponse.data.data && waterResponse.data.data.water) {
            waterMeterValue = parseFloat(waterResponse.data.data.water).toFixed(2);
          }
        } catch (influxError) {
          console.warn('Could not fetch water meter from InfluxDB:', influxError.message);
          throw new Error('ไม่สามารถดึงข้อมูลมิเตอร์น้ำจาก InfluxDB ได้');
        }
      } else {
        throw new Error('ห้องนี้ไม่มีมิเตอร์น้ำดิจิทัล');
      }
      
      // อัปเดตค่ามิเตอร์
      setCurrentWaterMeter(waterMeterValue.toString());
      
      // แสดงข้อความสำเร็จ
      toast.success(
        `ดึงเลขมิเตอร์น้ำสำเร็จ! ห้อง: ${finalRoomNumber}\nมิเตอร์น้ำ: ${waterMeterValue} (ดิจิทัล)`,
        { autoClose: 4000 }
      );
      
    } catch (error) {
      console.error('Error fetching water meter reading:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงเลขมิเตอร์น้ำ: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoadingMeter(false);
    }
  };
  
  const handleFetchLatestElectricMeter = async () => {
    setIsLoadingMeter(true);
    try {
      const token = localStorage.getItem('token');
      
      // ดึงข้อมูลมิเตอร์ที่ติดตั้งในห้องนี้
      const metersResponse = await axios.get(`http://localhost:3001/api/meters/dormitories/${finalDormId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // หาข้อมูลห้องปัจจุบัน
      let currentRoomMeter = null;
      Object.keys(metersResponse.data).forEach(floor => {
        const room = metersResponse.data[floor].find(r => r.roomNumber === finalRoomNumber);
        if (room) {
          currentRoomMeter = room;
        }
      });
      
      if (!currentRoomMeter) {
        throw new Error('ไม่พบข้อมูลมิเตอร์สำหรับห้องนี้');
      }
      
      const hasElectricMeter = currentRoomMeter.meters?.electric?.installed;
      const electricMeterCode = currentRoomMeter.meters?.electric?.code;
      
      let electricMeterValue = 0;
      
      // ดึงข้อมูลจาก InfluxDB ถ้ามีมิเตอร์ไฟดิจิทัล
      if (hasElectricMeter && electricMeterCode) {
        try {
          const electricResponse = await axios.post('http://localhost:3001/api/influx/latest-data', {
            measurement: electricMeterCode
          }, {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (electricResponse.data && electricResponse.data.data && electricResponse.data.data.power) {
            electricMeterValue = parseFloat(electricResponse.data.data.power).toFixed(2);
          }
        } catch (influxError) {
          console.warn('Could not fetch electric meter from InfluxDB:', influxError.message);
          throw new Error('ไม่สามารถดึงข้อมูลมิเตอร์ไฟจาก InfluxDB ได้');
        }
      } else {
        throw new Error('ห้องนี้ไม่มีมิเตอร์ไฟดิจิทัล');
      }
      
      // อัปเดตค่ามิเตอร์
      setCurrentElectricMeter(electricMeterValue.toString());
      
      // แสดงข้อความสำเร็จ
      toast.success(
        `ดึงเลขมิเตอร์ไฟสำเร็จ! ห้อง: ${finalRoomNumber}\nมิเตอร์ไฟ: ${electricMeterValue} (ดิจิทัล)`,
        { autoClose: 4000 }
      );
      
    } catch (error) {
      console.error('Error fetching electric meter reading:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงเลขมิเตอร์ไฟ: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoadingMeter(false);
    }
  };

  // แสดง loading หรือ error
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaExclamationTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">เกิดข้อผิดพลาด: {error}</p>
          <button 
            onClick={fetchTerminationData}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  if (!contractData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">ไม่พบข้อมูลสัญญา</p>
        </div>
      </div>
    );
  }

  // คำนวณค่ามิเตอร์รวม (จาก utilityCharges + meterCharges)
  const totalUtilityCharges = utilityCharges.reduce((sum, item) => sum + item.amount, 0);
  const totalMeterCharges = meterCharges.reduce((sum, item) => sum + item.amount, 0);
  
  // รวมค่าน้ำ/ไฟจากรายการเพิ่มเติม (จาก tab ค่ามิเตอร์)
  const additionalWaterCost = meterCharges.filter(item => item.description.includes('น้ำ')).reduce((sum, item) => sum + item.amount, 0);
  const additionalElectricCost = meterCharges.filter(item => item.description.includes('ไฟ')).reduce((sum, item) => sum + item.amount, 0);
  
  // ค่าน้ำ/ไฟรวม (จาก utilityCharges + meterCharges)
  const baseWaterCost = utilityCharges.filter(item => item.description.includes('น้ำ')).reduce((sum, item) => sum + item.amount, 0);
  const baseElectricCost = utilityCharges.filter(item => item.description.includes('ไฟ')).reduce((sum, item) => sum + item.amount, 0);
  const waterCost = baseWaterCost + additionalWaterCost;
  const electricCost = baseElectricCost + additionalElectricCost;
  const totalUtilityCost = totalUtilityCharges + totalMeterCharges;

  // คำนวณยอดรวมการเรียกเก็บและเงินคืน
  const totalOutstanding = contractData?.outstandingBills ? 
    contractData.outstandingBills.reduce((sum, bill) => sum + bill.amount, 0) : 0;
  const totalAdditionalCharges = additionalCharges.filter(item => item.type === 'charge').reduce((sum, item) => sum + item.amount, 0);
  const totalRefunds = additionalCharges.filter(item => item.type === 'refund').reduce((sum, item) => sum + item.amount, 0);
  const totalPenaltyCharges = penaltyCharges.reduce((sum, item) => sum + item.amount, 0);
  
  // คำนวณสรุปสุดท้าย (ไม่รวม totalMeterCharges เพราะรวมไปกับ waterCost/electricCost แล้ว)
  const totalDeductions = totalOutstanding + totalUtilityCost + totalAdditionalCharges + totalPenaltyCharges;
  // ปรับปรุงการคำนวณ finalAmount ให้คำนึงถึง checkbox การคืนเงินประกัน
  const depositAmount = isDepositRefund ? (contractData?.deposit_monthly || 0) : 0;
  // การคำนวณที่ถูกต้อง: net_amount = ค่าใช้จ่ายทั้งหมด - เงินประกันคืน - เงินคืนอื่นๆ
  // ถ้าเป็นบวก = ต้องจ่ายเพิ่ม, ถ้าเป็นลบ = ได้เงินคืน
  const finalAmount = totalDeductions - depositAmount - totalRefunds;

  const handleAddServiceCharge = () => {
    if (newServiceDescription && newServiceUnit && newServicePricePerUnit) {
      const unit = parseFloat(newServiceUnit);
      const pricePerUnit = parseFloat(newServicePricePerUnit);
      const amount = !isNaN(unit) && !isNaN(pricePerUnit) ? unit * pricePerUnit : 0;
      const newCharge = {
        id: Date.now(),
        description: newServiceDescription,
        amount: amount,
        type: 'charge',
        unit: newServiceUnit,
        pricePerUnit: newServicePricePerUnit
      };
      setAdditionalCharges([...additionalCharges, newCharge]);
      setNewServiceDescription('');
      setNewServiceUnit('');
      setNewServicePricePerUnit('');
    }
  };

  const handleAddDiscountCharge = () => {
    if (newDiscountDescription && newDiscountUnit && newDiscountPricePerUnit) {
      const unit = parseFloat(newDiscountUnit);
      const pricePerUnit = parseFloat(newDiscountPricePerUnit);
      const amount = !isNaN(unit) && !isNaN(pricePerUnit) ? unit * pricePerUnit : 0;
      const newCharge = {
        id: Date.now(),
        description: newDiscountDescription,
        amount: amount,
        type: 'refund',
        unit: newDiscountUnit,
        pricePerUnit: newDiscountPricePerUnit
      };
      setAdditionalCharges([...additionalCharges, newCharge]);
      setNewDiscountDescription('');
      setNewDiscountUnit('');
      setNewDiscountPricePerUnit('');
    }
  };

  // ปรับให้รับ object parameter เพื่อเพิ่มรายการได้ทันที
  const handleAddMeterCharge = (newCharge) => {
    setMeterCharges([...meterCharges, { id: Date.now(), ...newCharge }]);
  };

  const handleAddPenaltyCharge = () => {
    if (newPenaltyDescription && newPenaltyUnit && newPenaltyPricePerUnit) {
      const unit = parseFloat(newPenaltyUnit);
      const pricePerUnit = parseFloat(newPenaltyPricePerUnit);
      const amount = !isNaN(unit) && !isNaN(pricePerUnit) ? unit * pricePerUnit : 0;
      const newCharge = {
        id: Date.now(),
        description: newPenaltyDescription,
        amount: amount,
        type: 'penalty',
        unit: newPenaltyUnit,
        pricePerUnit: newPenaltyPricePerUnit
      };
      setPenaltyCharges([...penaltyCharges, newCharge]);
      setNewPenaltyDescription('');
      setNewPenaltyUnit('');
      setNewPenaltyPricePerUnit('');
    }
  };

  const handleRemoveCharge = async (id) => {
    const item = additionalCharges.find(charge => charge.id === id);
    
    // ถ้ารายการนี้บันทึกไว้ในฐานข้อมูลแล้ว ต้องลบจากฐานข้อมูลด้วย
    if (item && item.move_out_adjustment_id) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(`http://localhost:3001/api/contract-terminations/adjustments/${item.move_out_adjustment_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const result = response.data;
        
        if (!result.success) {
          alert('ไม่สามารถลบรายการจากฐานข้อมูลได้: ' + result.message);
          return;
        }
        
        console.log('✅ ลบรายการจากฐานข้อมูลสำเร็จ');
      } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการลบรายการ:', error);
        alert('เกิดข้อผิดพลาดในการลบรายการ: ' + error.message);
        return;
      }
    }
    
    // ลบจาก state
    setAdditionalCharges(additionalCharges.filter(item => item.id !== id));
  };

  const handleRemoveMeterCharge = async (id) => {
    const item = meterCharges.find(charge => charge.id === id);
    
    // ถ้ารายการนี้บันทึกไว้ในฐานข้อมูลแล้ว ต้องลบจากฐานข้อมูลด้วย
    if (item && item.move_out_adjustment_id) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(`http://localhost:3001/api/contract-terminations/adjustments/${item.move_out_adjustment_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const result = response.data;
        
        if (!result.success) {
          alert('ไม่สามารถลบรายการจากฐานข้อมูลได้: ' + result.message);
          return;
        }
        
        console.log('✅ ลบรายการจากฐานข้อมูลสำเร็จ');
      } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการลบรายการ:', error);
        alert('เกิดข้อผิดพลาดในการลบรายการ: ' + error.message);
        return;
      }
    }
    
    // ลบจาก state
    setMeterCharges(meterCharges.filter(item => item.id !== id));
  };

  const handleRemovePenaltyCharge = async (id) => {
    const item = penaltyCharges.find(charge => charge.id === id);
    
    // ถ้ารายการนี้บันทึกไว้ในฐานข้อมูลแล้ว ต้องลบจากฐานข้อมูลด้วย
    if (item && item.move_out_adjustment_id) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(`http://localhost:3001/api/contract-terminations/adjustments/${item.move_out_adjustment_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const result = response.data;
        
        if (!result.success) {
          alert('ไม่สามารถลบรายการจากฐานข้อมูลได้: ' + result.message);
          return;
        }
        
        console.log('✅ ลบรายการจากฐานข้อมูลสำเร็จ');
      } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการลบรายการ:', error);
        alert('เกิดข้อผิดพลาดในการลบรายการ: ' + error.message);
        return;
      }
    }
    
    // ลบจาก state
    setPenaltyCharges(penaltyCharges.filter(item => item.id !== id));
  };

  const handleRemoveUtilityCharge = async (id) => {
    const item = utilityCharges.find(charge => charge.id === id);
    
    // ถ้ารายการนี้บันทึกไว้ในฐานข้อมูลแล้ว ต้องลบจากฐานข้อมูลด้วย
    if (item && item.move_out_adjustment_id) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(`http://localhost:3001/api/contract-terminations/adjustments/${item.move_out_adjustment_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const result = response.data;
        
        if (!result.success) {
          alert('ไม่สามารถลบรายการจากฐานข้อมูลได้: ' + result.message);
          return;
        }
        
        console.log('✅ ลบรายการจากฐานข้อมูลสำเร็จ');
      } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการลบรายการ:', error);
        alert('เกิดข้อผิดพลาดในการลบรายการ: ' + error.message);
        return;
      }
    }
    
    // ลบจาก state
    setUtilityCharges(utilityCharges.filter(item => item.id !== id));
  };

  const handleUpdateUtilityCharge = (id, newAmount) => {
    setUtilityCharges(utilityCharges.map(item => 
      item.id === id ? { ...item, amount: parseFloat(newAmount) || 0 } : item
    ));
  };

  // ฟังก์ชันสำหรับแสดง popup ยืนยัน
  const handleInitiateCancel = () => {
    // ตรวจสอบข้อมูลพื้นฐานก่อน
    if (!checkoutDate) {
      toast.warning('กรุณาระบุวันที่ย้ายออก', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      return;
    }
    
    if (!paymentMethod) {
      toast.warning('กรุณาเลือกประเภทการชำระเงิน', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      return;
    }
    
    if (totalOutstanding > 0) {
      toast.error(
        `ไม่สามารถย้ายออกได้ กรุณาชำระใบแจ้งหนี้ค้างชำระจำนวน ${totalOutstanding.toLocaleString()} บาทให้เรียบร้อยก่อน`,
        { 
          position: "top-right",
          autoClose: 6000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        }
      );
      return;
    }
    
    // แสดง popup ยืนยัน
    setShowConfirmPopup(true);
  };

  // ฟังก์ชันสำหรับยืนยันยกเลิกสัญญา (หลังจากกด confirm ใน popup)
  const handleConfirmCancel = async () => {
    console.log('🚀 เริ่มต้น handleConfirmCancel');
    
    // ปิด popup ยืนยัน
    setShowConfirmPopup(false);
    setIsProcessing(true);
    
    // ไม่ต้องแสดง Toast เพิ่ม เพราะแสดงไปแล้วใน popup click
    console.log('📱 เริ่มประมวลผลข้อมูล...');
    
    // Validation: ตรวจสอบว่ามีการระบุค่าน้ำค่าไฟหรือไม่
    const hasWaterCharge = meterCharges.some(item => item.meterType === 'water' || item.description.includes('ค่าน้ำ:'));
    const hasElectricCharge = meterCharges.some(item => item.meterType === 'electric' || item.description.includes('ค่าไฟ:'));
    
    
    setLoading(true);
    
    try {
      // Validate ข้อมูลก่อนส่ง
      if (!finalDormId || !finalRoomNumber) {
        throw new Error('ไม่พบข้อมูลหอพักหรือห้อง กรุณาลองใหม่');
      }
      
      if (!contractData) {
        throw new Error('ไม่พบข้อมูลสัญญา กรุณารีเฟรชหน้าและลองใหม่');
      }
      
      // รวบรวมรายการทั้งหมดที่ต้องบันทึก
      const allAdjustments = [
        ...additionalCharges.map(item => ({
          type: item.type,
          description: item.description,
          amount: item.amount,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit
        })),
        ...meterCharges.map(item => ({
          type: 'meter',
          description: item.description,
          amount: item.amount,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit,
          meterType: item.meterType,
          meterEnd: item.meterEnd,
          meterStart: item.meterStart
        })),
        // แก้ไข: เปลี่ยนจาก type: 'utility' เป็น type: 'meter' เพื่อให้ backend รองรับ
        ...utilityCharges.map(item => ({
          type: 'meter',
          description: item.description,
          amount: item.amount,
          unit: item.unit || 0,
          pricePerUnit: item.pricePerUnit || 0
        })),
        ...penaltyCharges.map(item => ({
          type: 'penalty',
          description: item.description,
          amount: item.amount,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit
        }))
      ];

      // ใส่รายการเงินประกันคืนลงใน allAdjustments ถ้า checkbox checked
      if (isDepositRefund && contractData?.deposit_monthly > 0) {
        allAdjustments.unshift({
          type: 'refund',
          description: 'คืนเงินมัดจำ',
          amount: contractData.deposit_monthly,
          unit: 1,
          pricePerUnit: contractData.deposit_monthly
        });
      }

      console.log('📤 ส่งข้อมูลไป Backend:', {
        endpoint: `http://localhost:3001/api/contracts/${contractData?.contract_id}/terminate`,
        payload: {
          checkoutDate: checkoutDate,
          paymentMethod: paymentMethod,
          finalAmount: finalAmount,
          note: note,
          adjustments: allAdjustments
        }
      });

      // Debug: แสดงข้อมูลค่าน้ำ/ไฟและเงินประกันที่จะส่งไป
      console.log('🚰 Meter Charges:', meterCharges);
      console.log('⚡ Utility Charges:', utilityCharges);
      console.log('📋 All Adjustments:', allAdjustments);
      console.log('💰 Deposit Refund Checkbox:', isDepositRefund);
      console.log('💵 Deposit Amount:', contractData?.deposit_monthly);

      // ทดสอบการเชื่อมต่อก่อน
      try {
        const token = localStorage.getItem('token');
        const testResponse = await axios.get(`http://localhost:3001/api/dormitories/${finalDormId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('🔗 Connection test: OK');
      } catch (connectionError) {
        console.error('🔗 Connection test failed:', connectionError);
        toast.error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์กำลังทำงาน', {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        });
        throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์กำลังทำงาน');
      }

      // บันทึกการยกเลิกสัญญาจริง (รวมรายการ adjustments ไปด้วย)
      const token = localStorage.getItem('token');
      const terminateResponse = await axios.post(`http://localhost:3001/api/contracts/${contractData?.contract_id}/terminate`, {
        termination_date: checkoutDate,
        water_meter_end: parseInt(currentWaterMeter) || 0,
        electric_meter_end: parseInt(currentElectricMeter) || 0,
        paymentMethod: paymentMethod,
        finalAmount: finalAmount,
        note: note,
        adjustments: allAdjustments,
        depositRefund: isDepositRefund ? (contractData?.deposit_monthly || 0) : 0,
        isDepositRefund: isDepositRefund
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🌐 Response status:', terminateResponse.status);
      console.log('🌐 Response data:', terminateResponse.data);

      const terminateResult = terminateResponse.data;
      
      console.log('📥 ผลลัพธ์จาก Backend:', terminateResult);
      
      if (!terminateResult.success) {
        throw new Error(terminateResult.message || 'ไม่สามารถยกเลิกสัญญาได้');
      }

      // แสดงผลลัพธ์
      console.log('✅ แสดง Toast สำเร็จ');
      toast.success('✅ ยกเลิกสัญญาเรียบร้อยแล้ว!', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        toastId: 'success-toast',
      });
      
      // แสดง toast เตือนว่ากำลังไปหน้าใบเสร็จ
      setTimeout(() => {
        toast.success('✅ ยกเลิกสัญญาเรียบร้อยแล้ว!\n🧾 กำลังไปยังหน้าใบเสร็จการย้ายออก...', {
          position: "top-right",
          autoClose: 2500,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          toastId: 'navigate-toast',
        });
      }, 1500);
      
      // เตรียมข้อมูลสำหรับส่งไปหน้าใบเสร็จ
      const moveOutReceiptData = {
        receiptNumber: terminateResult.data?.receiptNumber || `MO${Date.now()}`,
        terminationId: terminateResult.data?.terminationId || Date.now(), // เพิ่ม terminationId
        roomNumber: finalRoomNumber,
        dormId: contractData?.dorm_id || finalDormId, // ใช้ dorm_id ที่ถูกต้องจาก contractData
        tenantName: contractData?.tenantName || 'ไม่ระบุ',
        tenantPhone: contractData?.tenantPhone || 'ไม่ระบุ',
        tenantAddress: contractData?.tenantAddress || 'ไม่ระบุ',
        roomType: contractData?.roomType || 'ไม่ระบุ',
        checkoutDate: checkoutDate,
        paymentMethod: paymentMethod,
        finalAmount: finalAmount,
        depositRefund: 0, // เสมอเป็น 0 เพราะข้อมูลเงินประกันอยู่ใน allAdjustments แล้ว
        isDepositRefund: isDepositRefund, // เพิ่มสถานะ checkbox
        adjustments: allAdjustments,
        additionalCharges: additionalCharges,
        penaltyCharges: penaltyCharges, // เพิ่มข้อมูลค่าปรับ/เสียหาย
        meterCharges: meterCharges, // เพิ่มข้อมูลค่ามิเตอร์ (ค่าน้ำ/ไฟจากมิเตอร์)
        utilityCharges: utilityCharges, // เพิ่มข้อมูลค่าสาธารณูปโภค
        dormName: contractData?.dormName || 'หอพักไม่ระบุ',
        dormAddress: contractData?.dormAddress || '',
        dormPhone: contractData?.dormPhone || ''
      };
      
      // นำไปยังหน้าใบเสร็จการย้ายออก - ใช้ dorm_id ที่ถูกต้องจาก contractData
      const correctDormId = contractData?.dorm_id || finalDormId;
      
      // เปลี่ยน state เป็นกำลังนำทาง
      setTimeout(() => {
        setIsNavigating(true);
        console.log('🔄 กำลัง navigate ไปหน้าใบเสร็จ...');
      }, 3500);
      
      setTimeout(() => {
        navigate(`/dorm/${correctDormId}/room/${finalRoomNumber}/move-out-receipt`, {
          state: moveOutReceiptData
        });
      }, 4000); // เพิ่มเป็น 4 วินาที เพื่อให้ผู้ใช้เห็น Toast ได้ชัดเจน
      
    } catch (error) {
      console.error('❌ เกิดข้อผิดพลาด:', error);
      
      let errorMessage = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      
      if (error.message) {
        errorMessage += ':\n' + error.message;
      }
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
      }
      
      console.log('❌ แสดง Toast ข้อผิดพลาด:', errorMessage);
      toast.error(errorMessage, { 
        position: "top-right",
        autoClose: 7000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        toastId: 'error-toast',
      });
      
      // Reset navigation state ในกรณีเกิดข้อผิดพลาด
      setIsNavigating(false);
    } finally {
      setLoading(false);
      setIsProcessing(false);
      // ไม่ reset isNavigating เพราะหากสำเร็จแล้วจะ navigate ไปหน้าใหม่อยู่แล้ว
    }
  };

  // Confirmation Popup Component
  const ConfirmationPopup = () => {
    if (!showConfirmPopup) return null;
    
    return (
      <div className="fixed inset-0 z-[9997] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-[10vh]">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-md bg-red-100 mb-4">
              <FaExclamationTriangle className="h-6 w-6 text-red-600" />
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ยืนยันการย้ายออก
            </h3>
            
            <div className="text-sm text-gray-600 mb-6 text-left space-y-2">
              <p><strong>ห้อง:</strong> {finalRoomNumber}</p>
              <p><strong>ผู้เช่า:</strong> {contractData ? `${contractData.first_name || ''} ${contractData.last_name || ''}`.trim() : 'กำลังโหลด...'}</p>
              <p><strong>วันที่ย้ายออก:</strong> {new Date(checkoutDate).toLocaleDateString('th-TH')}</p>
              <p><strong>วิธีการชำระ:</strong> {paymentMethod}</p>
              <p><strong>จำนวนเงิน:</strong> 
                <span className={finalAmount >= 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                  {finalAmount >= 0 ? ' เก็บเพิ่ม ' : ' คืนให้ '}
                  {Math.abs(finalAmount).toLocaleString()} บาท
                </span>
              </p>
            </div>
            
            <p className="text-sm text-red-600 mb-6">
              หากยืนยันแล้วจะไม่สามารถแก้ไขข้อมูลได้ คุณแน่ใจหรือไม่?
            </p>
            
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-400 transition-colors"
                onClick={() => setShowConfirmPopup(false)}
                disabled={isProcessing}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                onClick={() => {
                  console.log('🔘 กดปุ่มยืนยันใน popup');
                  
                  // แสดง Toast ก่อนปิด popup
                  toast.info('กำลังประมวลผลการย้ายออก...', {
                    position: "top-right",
                    autoClose: 3000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    toastId: 'processing-moveout'
                  });
                  
                  // รอ 300ms แล้วค่อยเรียก function หลัก
                  setTimeout(() => {
                    handleConfirmCancel();
                  }, 300);
                }}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    กำลังประมวลผล...
                  </>
                ) : (
                  <>
                    <FaCheck />
                    ยืนยันย้ายออก
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-md shadow-sm p-4 mb-4 border border-gray-300">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
            >
              <FaArrowLeft className="text-lg" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
                <FaFileInvoiceDollar className="text-blue-600" />
                ยกเลิกสัญญา / ย้ายออก
              </h1>
              <p className="text-gray-600 mt-1">
                ห้อง {contractData?.room_number || finalRoomNumber} - {contractData ? `${contractData.first_name || ''} ${contractData.last_name || ''}`.trim() : 'กำลังโหลด...'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column - Bills and Additional Charges */}
          <div className="lg:col-span-2 space-y-4">
            {/* ใบแจ้งหนี้ค้างชำระ */}
            <div className="bg-white rounded-md shadow-sm overflow-hidden border border-gray-300">
              <div className="bg-red-50 border-b border-gray-300 p-4">
                <h3 className="text-red-800 font-medium text-lg flex items-center gap-2">
                  <FaFileInvoiceDollar />
                  ใบแจ้งหนี้ค้างชำระ
                </h3>
              </div>
              
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 rounded-tl-md border-b border-gray-300">เลขที่</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700 border-b border-gray-300">ยอดเงิน</th>
                       <th className="text-center py-3 px-4 font-semibold text-gray-700 rounded-tr-md border-b border-gray-300 w-20">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {contractData?.outstandingBills && contractData.outstandingBills.length > 0 ? (
                        contractData.outstandingBills.map((bill, index) => (
                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 text-sm font-medium">{bill.invoiceNumber || `INV-${index + 1}`}</td>
                            <td className={`py-3 px-4 text-sm text-right font-semibold ${bill.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {bill.amount.toFixed(2)}
                            </td>
                              <td className="py-3 px-4 text-center w-20">
                                <button
                                  onClick={() => {
                                    const invoiceId = bill.invoiceId || bill.id || bill.invoice_id;
                                    if (invoiceId) {
                                      navigate(`/bills-room/${finalDormId}/${invoiceId}`, {
                                        state: { bill }
                                      });
                                    } else {
                                      toast.error('ไม่พบรหัสใบแจ้งหนี้');
                                    }
                                  }}
                                  className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                  title="แก้ไขใบแจ้งหนี้"
                                >
                                  <FaEdit className="text-sm" />
                                </button>
                              </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-sm text-gray-500 text-center" colSpan="3">
                            ไม่มีใบแจ้งหนี้ค้างชำระ
                          </td>
                        </tr>
                      )}
                      <tr className="bg-green-50 border-t-2 border-gray-300">
                        <td className="py-3 px-4 text-sm font-bold text-gray-800 rounded-bl-md">รวม</td>
                        <td className={`py-3 px-4 text-lg font-bold text-right ${totalOutstanding >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {totalOutstanding.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 rounded-br-md"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              
              </div>
            </div>
              {/* กล่องใหม่แสดงเงินประกัน */}
              <div className="bg-white rounded-md shadow-sm overflow-hidden border border-gray-300 mt-4">
                <div className="bg-blue-50 border-b border-gray-300 p-4">
                  <h3 className="text-blue-800 font-medium text-lg flex items-center gap-2">
                    <FaMoneyBillWave className="text-blue-600" />
                    เงินประกัน: ที่ผู้เช่าชำระตอนเข้าพัก
                  </h3>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      {/* Checkbox สำหรับการคืนเงินประกัน */}
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isDepositRefund}
                          onChange={(e) => setIsDepositRefund(e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-md"
                        />
                        <span className="font-medium text-gray-700">คืนเงินประกัน</span>
                      </label>
                      <span className="text-sm text-gray-500">
                        {isDepositRefund ? '(จะดำเนินการคืนเงินประกัน)' : '(ไม่คืนเงินประกัน)'}
                      </span>
                    </div>
                    <span className="text-blue-700 text-xl font-semibold">
                      เงินประกัน {(contractData?.deposit_monthly || 0).toLocaleString()} บาท
                    </span>
                  </div>
                </div>
              </div>

            {/* รายการเก็บเงิน/คืนเงินเพิ่มเติม */}
            <div className="bg-white rounded-md shadow-sm overflow-hidden border border-gray-300">
              <div className="bg-purple-50 border-b border-gray-300 p-4">
                <h3 className="text-purple-800 font-medium text-lg flex items-center gap-2">
                  <FaCalculator />
                  รายการเก็บเงิน/คืนเงินเพิ่มเติม
                </h3>
                <p className="text-purple-600 text-sm mt-1">รายการเรียกเก็บเพิ่มเติมหรือเงินคืน เช่น ค่า keycard, ค่าปรับ</p>
              </div>
              
              <div className="p-6">
                {/* แสดงข้อความเมื่อมีรายการที่บันทึกไว้แล้ว */}
                {contractData?.savedAdjustments && contractData.savedAdjustments.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-md"></div>
                      <span className="font-medium text-blue-800">พบรายการที่บันทึกไว้แล้ว</span>
                    </div>
                    <p className="text-blue-700 text-sm">
                      มีรายการเก็บเงิน/คืนเงินเพิ่มเติม {contractData.savedAdjustments.length} รายการที่บันทึกไว้แล้ว
                      สามารถแก้ไขหรือเพิ่มรายการใหม่ได้
                    </p>
                  </div>
                )}
                
                {/* Header รายการ */}
                <div className="bg-gray-50 border-b border-gray-300 p-4 mb-2 rounded-t-md">
                  <div className="grid grid-cols-5 gap-4 text-sm text-gray-600 font-medium">
                    <span className="pl-2">รายการ</span>
                    <span className="text-center">จำนวนหน่วย</span>
                    <span className="text-center">ราคาต่อหน่วย</span>
                    <span className="text-right pr-2">ยอดเงิน</span>
                    <span className="text-center">จัดการ</span>
                  </div>
                </div>

                {/* รายการทั้งหมด */}
                <div className="space-y-2">
                  {/* ค่าน้ำ/ไฟ - รายการแสดงราคาอย่างเดียว */}
                  {utilityCharges.map((item) => (
                    <div key={item.id} className="grid grid-cols-5 gap-4 items-center py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100">
                      <span className="font-medium pl-6">{item.description}</span>
                      <span className="text-center">-</span>
                      <span className="text-right font-bold pr-8">-</span>
                      <span className="text-right font-bold pr-5">{item.amount.toFixed(2)}</span>
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => handleRemoveUtilityCharge(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* รายการค่ามิเตอร์ (น้ำ/ไฟ) */}
                  {meterCharges.map((item) => (
                    <div key={item.id} className="grid grid-cols-5 gap-4 items-center py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100">
                      <span className="font-medium pl-6">{item.description}</span>
                      <span className="text-center">{item.unit || '-'}</span>
                      <span className="text-right font-bold pr-8">{item.pricePerUnit || '-'}</span>
                      <span className="text-right font-bold pr-5">{item.amount.toFixed(2)}</span>
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => handleRemoveMeterCharge(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* รายการค่าบริการเพิ่ม */}
                  {additionalCharges.filter(item => item.type === 'charge').map((item) => (
                    <div key={item.id} className="grid grid-cols-5 gap-4 items-center py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100">
                      <span className="font-medium pl-6">{item.description}</span>
                      <span className="text-center">{item.unit || '-'}</span>
                      <span className="text-right font-bold pr-8">{item.pricePerUnit || '-'}</span>
                      <span className="text-right font-bold pr-5">{item.amount.toFixed(2)}</span>
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => handleRemoveCharge(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* รายการส่วนลด/คืนเงิน */}
                  {additionalCharges.filter(item => item.type === 'refund').map((item) => (
                    <div key={item.id} className="grid grid-cols-5 gap-4 items-center py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100">
                      <span className="font-medium pl-6">{item.description}</span>
                      <span className="text-center">{item.unit || '-'}</span>
                      <span className="text-right font-bold pr-8">{item.pricePerUnit || '-'}</span>
                      <span className="text-right font-bold pr-5">-{item.amount.toFixed(2)}</span>
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => handleRemoveCharge(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* รายการค่าปรับ/เสียหาย */}
                  {penaltyCharges.map((item) => (
                    <div key={item.id} className="grid grid-cols-5 gap-4 items-center py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100">
                      <span className="font-medium pl-6">{item.description}</span>
                      <span className="text-center">{item.unit || '-'}</span>
                      <span className="text-right font-bold pr-8">{item.pricePerUnit || '-'}</span>
                      <span className="text-right font-bold pr-5">{item.amount.toFixed(2)}</span>
                      <div className="flex items-center justify-center">
                        <button 
                          onClick={() => handleRemovePenaltyCharge(item.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tabs สำหรับเพิ่มรายการ */}
                <div className="border-t border-gray-300 mt-6 pt-6">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">เพิ่มรายการใหม่</h4>
                  <div className="flex gap-2 mb-4">
                    <button 
                      onClick={() => setActiveTab('service')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'service' 
                          ? 'bg-orange-100 text-orange-700 border border-orange-200' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      ค่าบริการ
                    </button>
                    <button 
                      onClick={() => setActiveTab('discount')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'discount' 
                          ? 'bg-green-100 text-green-700 border border-green-200' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      ส่วนลด / คืนเงิน
                    </button>
                    <button 
                      onClick={() => setActiveTab('penalty')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'penalty' 
                          ? 'bg-red-100 text-red-700 border border-red-200' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      ค่าปรับ / เสียหาย
                    </button>
                    <button 
                      onClick={() => setActiveTab('meter')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'meter' 
                          ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      ค่ามิเตอร์
                    </button>
                  </div>

                  {/* ฟอร์มเพิ่มรายการตาม Tab */}
                  {activeTab === 'service' && (
                    <div className="bg-orange-50 p-4 rounded-md border border-orange-200">
                      <div className="text-sm text-orange-700 mb-3 font-medium">เพิ่มค่าบริการที่เก็บเพิ่มกับผู้เช่า</div>
                      <div className="flex gap-3 flex-wrap">
                        <input 
                          type="text" 
                          placeholder="รายการ" 
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          value={newServiceDescription}
                          onChange={(e) => setNewServiceDescription(e.target.value)}
                        />
                        <input 
                          type="number" 
                          placeholder="จำนวนหน่วย"
                          min="0"
                          className="w-28 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          value={newServiceUnit}
                          onChange={(e) => setNewServiceUnit(e.target.value)}
                        />
                        <input 
                          type="number" 
                          placeholder="ราคาต่อหน่วย"
                          min="0"
                          className="w-28 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          value={newServicePricePerUnit}
                          onChange={(e) => setNewServicePricePerUnit(e.target.value)}
                        />
                        <button 
                          onClick={handleAddServiceCharge}
                          className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 transition-colors"
                        >
                          เพิ่ม
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'discount' && (
                    <div className="bg-green-50 p-4 rounded-md border border-green-200">
                      <div className="text-sm text-green-700 mb-3 font-medium">เพิ่มส่วนลดหรือเงินคืนให้กับผู้เช่า</div>
                      <div className="flex gap-3 flex-wrap">
                        <input 
                          type="text" 
                          placeholder="รายการ" 
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={newDiscountDescription}
                          onChange={(e) => setNewDiscountDescription(e.target.value)}
                        />
                        <input 
                          type="number" 
                          placeholder="จำนวนหน่วย"
                          min="0"
                          className="w-28 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={newDiscountUnit}
                          onChange={(e) => setNewDiscountUnit(e.target.value)}
                        />
                        <input 
                          type="number" 
                          placeholder="ราคาต่อหน่วย"
                          min="0"
                          className="w-28 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={newDiscountPricePerUnit}
                          onChange={(e) => setNewDiscountPricePerUnit(e.target.value)}
                        />
                        <button 
                          onClick={handleAddDiscountCharge}
                          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                          เพิ่ม
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'penalty' && (
                    <div className="bg-red-50 p-4 rounded-md border border-red-200">
                      <div className="text-sm text-red-700 mb-3 font-medium">เพิ่มค่าปรับหรือค่าเสียหายที่เรียกเก็บจากผู้เช่า</div>
                      <div className="flex gap-3 flex-wrap">
                        <input 
                          type="text" 
                          placeholder="รายการ" 
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          value={newPenaltyDescription}
                          onChange={(e) => setNewPenaltyDescription(e.target.value)}
                        />
                        <input 
                          type="number" 
                          placeholder="จำนวนหน่วย"
                          min="0"
                          className="w-28 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          value={newPenaltyUnit}
                          onChange={(e) => setNewPenaltyUnit(e.target.value)}
                        />
                        <input 
                          type="number" 
                          placeholder="ราคาต่อหน่วย"
                          min="0"
                          className="w-28 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          value={newPenaltyPricePerUnit}
                          onChange={(e) => setNewPenaltyPricePerUnit(e.target.value)}
                        />
                        <button 
                          onClick={handleAddPenaltyCharge}
                          className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                        >
                          เพิ่ม
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'meter' && (
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-200 relative">
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-sm text-blue-700 font-medium">เพิ่มค่าน้ำ/ไฟตามเลขมิเตอร์สุดท้าย</div>
                        <button
                          type="button"
                          onClick={handleFetchLatestMetersBoth}
                          disabled={isLoadingMeter}
                          className={`px-4 py-2 ${
                            isLoadingMeter 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-blue-600 hover:bg-blue-700'
                          } text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2`}
                        >
                          {isLoadingMeter ? (
                            <AiOutlineLoading3Quarters className="text-xs animate-spin" />
                          ) : (
                            <FaSyncAlt className="text-xs" />
                          )}
                          {isLoadingMeter ? 'กำลังดึงข้อมูล...' : 'ดึงมิเตอร์ล่าสุด'}
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        {/* ค่าน้ำ */}
                        <div className="flex items-center">
                          <label className="w-16 text-sm font-medium text-gray-700 mt-7">ค่าน้ำ:</label>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                              <span className="w-32 text-center font-medium">มิเตอร์ที่จดล่าสุด</span>
                              <span className="w-32 text-center font-medium">มิเตอร์ปัจจุบัน</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <input 
                                type="number" 
                                value={contractData?.water_meter_start || 0}
                                className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 text-center font-medium"
                                readOnly
                                placeholder="รอบที่แล้ว"
                              />
                              <input 
                                type="number" 
                                placeholder="0"
                                min="0"
                                className="w-32 border border-blue-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                                value={currentWaterMeter}
                                onChange={e => setCurrentWaterMeter(e.target.value)}
                              />
                              <button 
                                onClick={() => {
                                  const latestWater = contractData?.water_meter_start || 0;
                                  const currentWater = parseInt(currentWaterMeter) || 0;
                                  
                                  // Validation ที่ครอบคลุม
                                  if (!currentWaterMeter || currentWaterMeter.trim() === '') {
                                    toast.warning('กรุณาระบุเลขมิเตอร์น้ำปัจจุบัน');
                                    return;
                                  }
                                  
                                  if (isNaN(currentWater) || currentWater < 0) {
                                    toast.error('กรุณาระบุเลขมิเตอร์น้ำเป็นตัวเลขที่ถูกต้อง');
                                    return;
                                  }
                                  
                                  // ป้องกันค่าลบและแจ้งเตือน
                                  if (currentWater < latestWater) {
                                    toast.error(`เลขมิเตอร์น้ำปัจจุบัน (${currentWater}) ต้องมากกว่าหรือเท่ากับเลขมิเตอร์ที่จดล่าสุด (${latestWater})`);
                                    return;
                                  }
                                  
                                  const usage = currentWater - latestWater;
                                  const rate = contractData?.rates?.water;
                                  
                                  if (!rate) {
                                    toast.error('ไม่พบข้อมูลราคาค่าน้ำจากระบบ กรุณาติดต่อผู้ดูแลระบบ');
                                    return;
                                  }
                                  
                                  // ตรวจสอบว่ามีรายการค่าน้ำอยู่แล้วหรือไม่
                                  const existingWater = meterCharges.find(item => item.description.includes('ค่าน้ำ:'));
                                  if (existingWater) {
                                    if (!confirm('มีรายการค่าน้ำอยู่แล้ว ต้องการแทนที่ข้อมูลเก่าหรือไม่?')) {
                                      return;
                                    }
                                    // ลบรายการเก่า
                                    setMeterCharges(meterCharges.filter(item => !item.description.includes('ค่าน้ำ:')));
                                  }
                                  
                                  handleAddMeterCharge({
                                    description: `ค่าน้ำ: ${usage} หน่วย`,
                                    amount: usage * rate,
                                    unit: usage,
                                    pricePerUnit: rate,
                                    type: 'meter',
                                    meterType: 'water',
                                    meterEnd: currentWater,
                                    meterStart: latestWater
                                  });
                                  
                                }}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                                disabled={!currentWaterMeter || loading}
                              >
                                เพิ่ม
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* ค่าไฟ */}
                        <div className="flex items-center">
                          <label className="w-16 text-sm font-medium text-gray-700 mt-7">ค่าไฟ:</label>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                              <span className="w-32 text-center font-medium">มิเตอร์ที่จดล่าสุด</span>
                              <span className="w-32 text-center font-medium">มิเตอร์ปัจจุบัน</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <input 
                                type="number" 
                                value={contractData?.electric_meter_start || 0}
                                className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm bg-gray-50 text-center font-medium"
                                readOnly
                                placeholder="รอบที่แล้ว"
                              />
                              <input 
                                type="number" 
                                placeholder="0"
                                min="0"
                                className="w-32 border border-blue-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                                value={currentElectricMeter}
                                onChange={e => setCurrentElectricMeter(e.target.value)}
                              />
                              <button 
                                onClick={() => {
                                  const latestElectric = contractData?.electric_meter_start || 0;
                                  const currentElectric = parseInt(currentElectricMeter) || 0;
                                  
                                  // Validation ที่ครอบคลุม
                                  if (!currentElectricMeter || currentElectricMeter.trim() === '') {
                                    toast.warning('กรุณาระบุเลขมิเตอร์ไฟปัจจุบัน');
                                    return;
                                  }
                                  
                                  if (isNaN(currentElectric) || currentElectric < 0) {
                                    toast.error('กรุณาระบุเลขมิเตอร์ไฟเป็นตัวเลขที่ถูกต้อง');
                                    return;
                                  }
                                  
                                  // ป้องกันค่าลบและแจ้งเตือน
                                  if (currentElectric < latestElectric) {
                                    toast.error(`เลขมิเตอร์ไฟปัจจุบัน (${currentElectric}) ต้องมากกว่าหรือเท่ากับเลขมิเตอร์ที่จดล่าสุด (${latestElectric})`);
                                    return;
                                  }
                                  
                                  const usage = currentElectric - latestElectric;
                                  const rate = contractData?.rates?.electric;
                                  
                                  if (!rate) {
                                    toast.error('ไม่พบข้อมูลราคาค่าไฟจากระบบ กรุณาติดต่อผู้ดูแลระบบ');
                                    return;
                                  }
                                  
                                  // ตรวจสอบว่ามีรายการค่าไฟอยู่แล้วหรือไม่
                                  const existingElectric = meterCharges.find(item => item.description.includes('ค่าไฟ:'));
                                  if (existingElectric) {
                                    if (!confirm('มีรายการค่าไฟอยู่แล้ว ต้องการแทนที่ข้อมูลเก่าหรือไม่?')) {
                                      return;
                                    }
                                    // ลบรายการเก่า
                                    setMeterCharges(meterCharges.filter(item => !item.description.includes('ค่าไฟ:')));
                                  }
                                  
                                  handleAddMeterCharge({
                                    description: `ค่าไฟ: ${usage} หน่วย`,
                                    amount: usage * rate,
                                    unit: usage,
                                    pricePerUnit: rate,
                                    type: 'meter',
                                    meterType: 'electric',
                                    meterEnd: currentElectric,
                                    meterStart: latestElectric
                                  });
                      
                                }}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                                disabled={!currentElectricMeter || loading}
                              >
                                เพิ่ม
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* สรุปยอดเงินรวมทั้งหมด */}
                <div className="bg-blue-50 p-4 border-t border-gray-100 rounded-md mt-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-600 mb-1">รวมเป็นเงิน</div>
                    <span className="text-blue-700 text-xl font-semibold">
                      {(totalAdditionalCharges + totalUtilityCost + totalPenaltyCharges - totalRefunds).toFixed(2)} บาท
                    </span>
                    {/* Debug info - จะลบออกภายหลัง */}
                    <div className="text-xs text-gray-500 mt-1">
                      ค่าบริการ({totalAdditionalCharges}) + สาธารณูปโภค({totalUtilityCost}) + ค่าปรับ({totalPenaltyCharges}) - ส่วนลด({totalRefunds})
                    </div>
                  </div>
                </div>
                
                {/* หมายเหตุในใบเสร็จ */}
                <h4 className="text-lg font-medium text-gray-700 mt-4">หมายเหตุในใบเสร็จ</h4>
                <div className="bg-white rounded-md border border-gray-200 p-4 mt-4">
                  {!isEditingNote ? (
                    <div className="min-h-[100px] p-3 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700 whitespace-pre-wrap">
                      {note || "ยังไม่มีหมายเหตุเริ่มต้น คลิก 'แก้ไข' เพื่อเพิ่มหมายเหตุ"}
                    </div>
                  ) : (
                    <textarea
                      value={tempNote}
                      onChange={(e) => {
                        if (e.target.value.length <= 500) {
                          setTempNote(e.target.value);
                        }
                      }}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none break-words"
                      placeholder="กรอกหมายเหตุที่จะแสดงในใบเสร็จการย้ายออก..."
                      rows="4"
                      style={{ 
                        wordWrap: 'break-word',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }}
                    />
                  )}
                  <div className="flex justify-between items-center mt-2">
                    {isEditingNote && (
                      <span className="text-xs text-gray-500">
                        {tempNote.length}/500 ตัวอักษร
                      </span>
                    )}
                    {!isEditingNote && <div></div>}
                    <div className="flex gap-2">
                      {!isEditingNote ? (
                        <button
                          onClick={startEditingNote}
                          className="text-xs px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-1"
                        >
                          <FaEdit className="text-xs" />
                          แก้ไข
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={cancelEditingNote}
                            className="text-xs text-gray-600 hover:text-gray-700 transition-colors px-2 py-1"
                          >
                            ยกเลิก
                          </button>
                          <button
                            onClick={saveDefaultNote}
                            className="text-xs px-3 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white transition-colors"
                          >
                            บันทึก
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-md shadow-sm overflow-hidden sticky top-6 border border-gray-300">
              <div className="bg-green-50 border-b border-gray-300 p-4">
                <h3 className="text-green-800 font-medium text-lg flex items-center gap-2">
                  <FaCalculator />
                  สรุปค่าใช้จ่าย
                </h3>
              </div>
              
              <div className="p-6">
                {/* ตารางแสดงรายละเอียดการคำนวณ */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">รายละเอียดการคำนวณ</h4>
                  <div className="bg-gray-50 rounded-md p-4 text-sm ">
                    <div className="space-y-2">
                      {/* แสดงเงินประกันเฉพาะเมื่อ checkbox checked */}
                      {isDepositRefund && (
                        <div className="flex justify-between">
                          <span>เงินประกันคืน</span>
                          <span className="text-green-600">-{(contractData?.deposit_monthly || 0).toLocaleString()}</span>
                        </div>
                      )}
                      <div className={`flex justify-between ${totalOutstanding > 0 ? 'bg-red-100 -mx-2 px-2 py-1 rounded-md' : ''}`}>
                        <span className={totalOutstanding > 0 ? 'font-semibold text-red-800' : ''}>
                          ใบแจ้งหนี้ค้างชำระ
                          {totalOutstanding > 0 && <span className="text-xs ml-1">(ต้องชำระก่อน)</span>}
                        </span>
                        <span className={`text-red-600 ${totalOutstanding > 0 ? 'font-bold' : ''}`}>
                          {totalOutstanding.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>ค่าน้ำ (ตามมิเตอร์สุดท้าย)</span>
                        <span className="text-red-600">{waterCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ค่าไฟ (ตามมิเตอร์สุดท้าย)</span>
                        <span className="text-red-600">{electricCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ค่าบริการเพิ่มเติม</span>
                        <span className="text-red-600">{totalAdditionalCharges.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ค่าปรับ/เสียหาย</span>
                        <span className="text-red-600">{totalPenaltyCharges.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ส่วนลด</span>
                        <span className="text-green-600">+{totalRefunds.toLocaleString()}</span>
                      </div>
                      <div className="border-t border-gray-300 pt-2 flex justify-between font-medium">
                        <span>รวมสุทธิ</span>
                        <span className={finalAmount >= 0 ? 'text-red-600' : 'text-green-600'}>
                          {finalAmount >= 0 ? '+' : ''}{finalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center mb-6">
                  {totalOutstanding > 0 ? (
                    <div className="border rounded-md p-4 mb-4 bg-red-50 border-red-200">
                      <p className="text-2xl font-semibold text-red-700 mb-2">
                        ค้างชำระ {totalOutstanding.toLocaleString()} บาท
                      </p>
                      <p className="text-sm text-red-600">
                        กรุณาชำระใบแจ้งหนี้ให้เรียบร้อยก่อน
                      </p>
                    </div>
                  ) : (
                    <div className={`border rounded-md p-4 mb-4 ${finalAmount >= 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      <h4 className={`text-lg font-medium mb-2 ${finalAmount >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {finalAmount >= 0 ? 'เก็บเงินผู้เช่าเพิ่ม' : 'คืนเงินให้ผู้เช่า'}
                      </h4>
                      <p className={`text-3xl font-semibold ${finalAmount >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                        {Math.abs(finalAmount).toLocaleString()} บาท
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                                    <div>
                    <label className="flex text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                      <FaMoneyBillWave className="text-gray-500" />
                      ประเภทการชำระเงิน *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      <option value="เงินสด">เงินสด</option>
                      <option value="โอนเงิน">โอนเงิน</option>
                      <option value="พร้อมเพย์">พร้อมเพย์</option>
                      <option value="บัตรเครดิต">บัตรเครดิต</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                      <FaCalendarAlt className="text-gray-500" />
                      วันที่ออกจริง
                    </label>
                    <input
                      type="date"
                      value={checkoutDate}
                      onChange={(e) => setCheckoutDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  
                  {/* แสดงข้อความแจ้งเตือนเมื่อมีใบแจ้งหนี้ค้างชำระ */}
                  {totalOutstanding > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                      <div className="flex items-center gap-2 text-red-700">
                        <FaExclamationTriangle className="text-red-500" />
                        <span className="font-medium">ไม่สามารถย้ายออกได้</span>
                      </div>
                      <p className="text-red-600 text-sm mt-1">
                        กรุณาชำระใบแจ้งหนี้ค้างชำระจำนวน {totalOutstanding.toLocaleString()} บาทให้เรียบร้อยก่อน
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={handleInitiateCancel}
                    disabled={!checkoutDate || !paymentMethod || totalOutstanding > 0 || loading || isProcessing}
                    className="w-full py-3 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 disabled:bg-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-2">
                      {(loading || isProcessing) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          {isProcessing ? 'กำลังประมวลผล...' : 'กำลังบันทึก...'}
                        </>
                      ) : (
                        <>
                          <FaCheck />
                          {totalOutstanding > 0 ? 'ชำระหนี้ก่อนย้ายออก' : 'ยืนยันการย้ายออก'}
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Confirmation Popup */}
      <ConfirmationPopup />
      

      
      {/* Toast Container with better styling */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{ 
          zIndex: 99999,
          position: 'fixed',
          top: '20px',
          right: '20px'
        }}
        toastStyle={{
          zIndex: 99999
        }}
      />
    </div>
  );
}

export default CancelContract;
