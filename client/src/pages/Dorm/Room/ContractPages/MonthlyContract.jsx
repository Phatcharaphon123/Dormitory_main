import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import { FaFileContract, FaPlus, FaSync, FaExclamationTriangle, FaUser, FaCar, FaPhoneAlt, FaStickyNote, FaMoneyBillWave, FaTools } from 'react-icons/fa';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { useEffect } from 'react';
import axios from 'axios';
import provinces from "../../../../assets/data/api_province.json";
import amphures from "../../../../assets/data/api_amphure.json";
import tambons from "../../../../assets/data/thai_tambons.json";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


function MonthlyContract() {
  const navigate = useNavigate();
  const { dormId, roomNumber } = useParams();
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [rent, setRent] = useState(0)
  const [deposit, setDeposit] = useState(0)
  const [advance, setAdvance] = useState(0)
  const [servicePrice, setServicePrice] = useState(0)
  const [serviceQuantity, setServiceQuantity] = useState(1)
  const [showCancelPopup, setShowCancelPopup] = useState(false)
  const [showConfirmPopup, setShowConfirmPopup] = useState(false)
  const [waterMeter, setWaterMeter] = useState('')
  const [electricMeter, setElectricMeter] = useState('')
  const [isLoadingMeter, setIsLoadingMeter] = useState(false)

  const [tenantProvince, setTenantProvince] = useState('');
  const [tenantDistrict, setTenantDistrict] = useState('');
  const [tenantSubDistrict, setTenantSubDistrict] = useState('');
  const [districtOptions, setDistrictOptions] = useState([]);
  const [subDistrictOptions, setSubDistrictOptions] = useState([]);

  useEffect(() => {
  if (tenantProvince) {
    const provId = provinces.find((p) => p.name_th === tenantProvince)?.id;
    if (provId) {
      const filtered = amphures.filter((a) => a.province_id === provId);
      setDistrictOptions(filtered.map((a) => a.name_th));
    }
  } else {
    setDistrictOptions([]);
  }
  }, [tenantProvince]);

  useEffect(() => {
    if (tenantProvince && tenantDistrict) {
      const provId = provinces.find((p) => p.name_th === tenantProvince)?.id;
      const amphureId = amphures.find(
        (a) => a.name_th === tenantDistrict && a.province_id === provId
      )?.id;
      if (amphureId) {
        const filtered = tambons.filter((t) => t.amphure_id === amphureId);
        setSubDistrictOptions(filtered.map((t) => t.name_th));
      }
    } else {
      setSubDistrictOptions([]);
    }
  }, [tenantProvince, tenantDistrict]);

  // โหลดค่ามิเตอร์เริ่มต้นเมื่อเข้าสู่หน้า
  useEffect(() => {
    const loadInitialMeterReading = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // ดึงข้อมูลมิเตอร์ที่ติดตั้งในห้องนี้
        const metersResponse = await axios.get(`http://localhost:3001/api/meters/dormitories/${dormId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // หาข้อมูลห้องปัจจุบัน
        let currentRoomMeter = null;
        Object.keys(metersResponse.data).forEach(floor => {
          const room = metersResponse.data[floor].find(r => r.roomNumber === roomNumber);
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
                setWaterMeter(Math.floor(parseFloat(waterResponse.data.data.water)).toString());
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
                setElectricMeter(Math.floor(parseFloat(electricResponse.data.data.power)).toString());
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

    if (dormId && roomNumber) {
      loadInitialMeterReading();
    }
  }, [dormId, roomNumber]);



  // ข้อมูลผู้เช่า
  const [tenantData, setTenantData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    email: '',
    id_card_number: '',
    address: '',
    subdistrict: '',
    district: '',
    province: ''
  })

  // ข้อมูลผู้ติดต่อฉุกเฉิน
  const [emergencyContact, setEmergencyContact] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    relationship: ''
  })

  // วันที่เข้าพัก
  const [moveInDate, setMoveInDate] = useState('')
  const [contractEndDate, setContractEndDate] = useState('')
  // หมายเหตุ
  const [note, setNote] = useState('')
  
  // หมายเหตุใบเสร็จ
  const [receiptNote, setReceiptNote] = useState('')
  const [isEditingReceiptNote, setIsEditingReceiptNote] = useState(false)
  const [tempReceiptNote, setTempReceiptNote] = useState('')

  // ข้อมูลยานพาหนะ
  const [vehicles, setVehicles] = useState({
    car: { has: false, plates: [''] },
    motorcycle: { has: false, plates: [''] }
  });

  // วิธีการชำระเงิน
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const serviceList = {
    internet: { name: 'อินเทอร์เน็ต', price: 300 },
    cleaning: { name: 'ทำความสะอาด', price: 200 },
    parking: { name: 'ค่าที่จอดรถ', price: 150 },
  }

  const [roomTypes, setRoomTypes] = useState([]);
  const [roomType, setRoomType] = useState(null); // ข้อมูลประเภทห้องของห้องนี้

  useEffect(() => {
    const fetchRoomTypes = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:3001/api/room-types/dormitories/${dormId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRoomTypes(res.data);
      } catch (err) {
        console.error('❌ Error fetching room types:', err);
        console.error('❌ Error details:', err.response?.data);
      }
    };

    if (dormId) {
      fetchRoomTypes();
    }
  }, [dormId]);

    useEffect(() => {
    const fetchRoomInfo = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:3001/api/rooms/dormitories/${dormId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const room = res.data.find(r => r.room_number === roomNumber);
        
        if (room && room.room_type_id) {
          const type = roomTypes.find(rt => rt.room_type_id === room.room_type_id);
          setRoomType(type);
          
          // อัปเดตค่าเช่าล่วงหน้าและเงินประกันจากประเภทห้อง
          if (type) {
            setAdvance(type.prepaid_amount || 0);
            setDeposit(type.security_deposit || 0);
            setRent(type.monthly_rent || 0);
          }
        } else {
          console.log('❌ Room not found or room_type_id missing for room:', roomNumber);
        }
      } catch (err) {
        console.error('❌ Error fetching room info:', err);
        console.error('❌ Error details:', err.response?.data);
      }
    };

    if (roomTypes.length > 0 && dormId && roomNumber) {
      fetchRoomInfo();
    }
  }, [roomTypes, dormId, roomNumber]);

  // โหลด default receipt note
  useEffect(() => {
    const loadDefaultReceiptNote = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:3001/api/receipts/dormitories/${dormId}/default-note?receipt_type=contract`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setReceiptNote(response.data.note_content || '');
      } catch (err) {
        console.error('Error loading default receipt note:', err);
      }
    };

    if (dormId) {
      loadDefaultReceiptNote();
    }
  }, [dormId]);

  const addService = () => {
    if (selectedService && !services.some(s => s.key === selectedService)) {
      const service = serviceList[selectedService]
      setServices([...services, { key: selectedService, ...service }])
    }
  }

  // คำนวณยอดรวมใหม่ที่รองรับจำนวนและราคาต่อหน่วย
  const totalService = services.reduce((sum, s) => {
    const unitPrice = s.unitPrice || s.price || 0;
    const quantity = s.quantity || 1;
    return sum + (Number(unitPrice) * Number(quantity));
  }, 0);
  const totalAll = Number(advance) + Number(deposit) + Number(totalService)

  const removeService = (keyToRemove) => {
    setServices(services.filter(service => service.key !== keyToRemove))
  }

  // ฟังก์ชันอัปเดตจำนวน
  const updateServiceQuantity = (key, newQuantity) => {
    setServices(services.map(service => 
      service.key === key 
        ? { ...service, quantity: Math.max(1, Number(newQuantity) || 1) }
        : service
    ));
  };

  // ฟังก์ชันอัปเดตราคาต่อหน่วย
  const updateServiceUnitPrice = (key, newUnitPrice) => {
    setServices(services.map(service => 
      service.key === key 
        ? { ...service, unitPrice: Math.max(0, Number(newUnitPrice) || 0), price: Math.max(0, Number(newUnitPrice) || 0) }
        : service
    ));
  };

  const addCustomService = () => {
    if (selectedService.trim() !== '' && servicePrice !== 0 && serviceQuantity > 0) {
      const key = `${selectedService}-${Date.now()}`
      setServices([...services, {
        key,
        name: selectedService,
        price: servicePrice,
        unitPrice: servicePrice,
        quantity: serviceQuantity
      }])
      setSelectedService('')
      setServicePrice(0)
      setServiceQuantity(1)
    }
  }

  // Add a ref for the form
  const formRef = React.useRef(null);

  // Modified handleGoToBill to use form validation and show confirmation popup
  const handleGoToBill = async (e) => {
    e.preventDefault();
    if (formRef.current && !formRef.current.reportValidity()) {
      // Browser will show the native validation message
      return;
    }

    // แสดงป๊อปอัพยืนยันการสร้างสัญญา
    openConfirmPopup();
  };

  // ฟังก์ชันสร้างสัญญา (แยกออกจาก handleGoToBill)
  const createContract = async () => {
    try {
      // เตรียมข้อมูลสำหรับส่ง API
      const contractData = {
        // ข้อมูลผู้เช่า
        first_name: tenantData.first_name,
        last_name: tenantData.last_name,
        phone_number: tenantData.phone_number,
        email: tenantData.email,
        id_card_number: tenantData.id_card_number,
        address: tenantData.address,
        province: tenantData.province,
        district: tenantData.district,
        subdistrict: tenantData.subdistrict,
        
        // ข้อมูลติดต่อฉุกเฉิน
        emergency_contact: emergencyContact.first_name ? emergencyContact : null,
        
        // ข้อมูลยานพาหนะ
        vehicles: Object.keys(vehicles).filter(type => vehicles[type].has).flatMap(type => 
          vehicles[type].plates.filter(plate => plate.trim() !== '').map(plate => ({
            vehicle_type: type,
            license_plate: plate
          }))
        ),
        
        // ข้อมูลสัญญา
        contract_start_date: moveInDate,
        contract_end_date: contractEndDate || null,
        deposit_monthly: deposit, // ใช้ค่าจาก state ที่อัปเดตแล้ว
        advance_amount: advance, // ใช้ค่าจาก state ที่อัปเดตแล้ว
        monthly_rent: rent, // เพิ่มค่าเช่ารายเดือน
        water_meter_start: parseInt(waterMeter) || 0,
        electric_meter_start: parseInt(electricMeter) || 0,
        note: note,
        room_type_name: roomType?.room_type_name || null, // เพิ่มชื่อประเภทห้อง
        
        // บริการเพิ่มเติม
        services: services.map(service => ({
          description: service.name,
          price: (service.unitPrice || service.price || 0) * (service.quantity || 1),
          unitPrice: service.unitPrice || service.price || 0,
          quantity: service.quantity || 1
        }))
        // หมายเหตุ: payment_method จะถูกส่งไปยัง receipt API แทน
      };

      console.log('📊 ข้อมูลที่จะส่งไป API:', {
        deposit_monthly: deposit,
        advance_amount: advance,
        monthly_rent: rent,
        totalAll: totalAll
      });

      // ส่งข้อมูลไปยัง API
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:3001/api/contracts/dormitories/${dormId}/rooms/${roomNumber}`, contractData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status === 201) {
        const contractId = response.data.contract_id;
        
        // สร้างใบเสร็จหลังจากสร้างสัญญาสำเร็จ
        try {
          const receiptData = {
            deposit_monthly: deposit,
            advance_amount: advance,
            services: services.map(service => ({
              description: service.name,
              price: (service.unitPrice || service.price || 0) * (service.quantity || 1),
              unitPrice: service.unitPrice || service.price || 0,
              quantity: service.quantity || 1
            })),
            discount: 0,
            payment_method: paymentMethod,
            receipt_date: new Date().toISOString().split('T')[0],
            receipt_note: receiptNote // เพิ่มหมายเหตุใบเสร็จ
          };

          const receiptResponse = await axios.post(`http://localhost:3001/api/receipts/contracts/${contractId}`, receiptData, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (receiptResponse.status === 201) {
            // นำไปยังหน้าใบเสร็จสำหรับพิมพ์
            toast.success('✅ สร้างสัญญาและใบเสร็จสำเร็จ!\n🖨️ กำลังพาไปยังหน้าพิมพ์ใบเสร็จ...');
            setTimeout(() => {
              navigate(`/dorm/${dormId}/receipt-print/${contractId}`, { state: { fromMonthlyContract: true } });
            }, 1500);
            return; // ป้องกันการ navigate ไปยัง room detail
          } else {
            toast.warning('✅ สร้างสัญญาสำเร็จ\n⚠️ แต่เกิดปัญหาในการสร้างใบเสร็จ');
          }
        } catch (receiptError) {
          console.error('Error creating receipt:', receiptError);
          toast.warning('✅ สร้างสัญญาสำเร็จ\n⚠️ แต่เกิดปัญหาในการสร้างใบเสร็จ');
        }
        
        setTimeout(() => {
          navigate(`/dorm/${dormId}/room/${roomNumber}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating contract:', error);
      toast.error('❌ เกิดข้อผิดพลาดในการสร้างสัญญา: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCancelContract = () => {
    setShowCancelPopup(true);
  };

  const confirmCancel = () => {
    setShowCancelPopup(false);
    navigate(`/dorm/${dormId}/room/${roomNumber}`);
  };

  const closeCancelPopup = () => {
    setShowCancelPopup(false);
  };

  // ฟังก์ชันจัดการป๊อปอัพยืนยันการสร้างสัญญา
  const openConfirmPopup = () => {
    setShowConfirmPopup(true);
  };

  const closeConfirmPopup = () => {
    setShowConfirmPopup(false);
  };

  const confirmCreateContract = async () => {
    setShowConfirmPopup(false);
    await createContract(); // เรียกฟังก์ชันสร้างสัญญา
  };

  // ฟังก์ชันจัดการการแก้ไขหมายเหตุใบเสร็จ
  const handleEditReceiptNote = () => {
    setTempReceiptNote(receiptNote);
    setIsEditingReceiptNote(true);
  };

  const handleSaveReceiptNote = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:3001/api/receipts/dormitories/${dormId}/default-note`, {
        note_content: tempReceiptNote,
        receipt_type: 'contract'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setReceiptNote(tempReceiptNote);
      setIsEditingReceiptNote(false);
      
      toast.success('บันทึกหมายเหตุเริ่มต้นสำหรับใบเสร็จสัญญาสำเร็จ');
    } catch (err) {
      console.error('Error saving receipt note:', err);
      toast.error('❌ เกิดข้อผิดพลาดในการบันทึกหมายเหตุ');
    }
  };

  const handleCancelEditReceiptNote = () => {
    setTempReceiptNote('');
    setIsEditingReceiptNote(false);
  };

  // ฟังก์ชันดึงเลขมิเตอร์ล่าสุดจากระบบ
  const fetchCurrentMeterReading = async () => {
    setIsLoadingMeter(true);
    try {
      const token = localStorage.getItem('token');
      
      // ดึงข้อมูลมิเตอร์ที่ติดตั้งในห้องนี้
      const metersResponse = await axios.get(`http://localhost:3001/api/meters/dormitories/${dormId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // หาข้อมูลห้องปัจจุบัน
      let currentRoomMeter = null;
      Object.keys(metersResponse.data).forEach(floor => {
        const room = metersResponse.data[floor].find(r => r.roomNumber === roomNumber);
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
            waterMeterValue = Math.floor(parseFloat(waterResponse.data.data.water));
          }
        } catch (influxError) {
          console.warn('Could not fetch water meter from InfluxDB:', influxError.message);
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
            electricMeterValue = Math.floor(parseFloat(electricResponse.data.data.power));
          }
        } catch (influxError) {
          console.warn('Could not fetch electric meter from InfluxDB:', influxError.message);
        }
      }
      
      // อัปเดตค่ามิเตอร์
      setWaterMeter(waterMeterValue.toString());
      setElectricMeter(electricMeterValue.toString());
      
      // แสดงข้อความสำเร็จ
      const message = `ดึงเลขมิเตอร์สำเร็จ!\n\n🏠 ห้อง: ${roomNumber}\nมิเตอร์น้ำ: ${waterMeterValue}${hasWaterMeter ? ' (ดิจิทัล)' : ' (ไม่พบมิเตอร์)'}\nมิเตอร์ไฟ: ${electricMeterValue}${hasElectricMeter ? ' (ดิจิทัล)' : ' (ไม่พบมิเตอร์)'}\n⏰ อัปเดตล่าสุด: ${new Date().toLocaleString('th-TH')}`;
      toast.success(message);
      
    } catch (error) {
      console.error('Error fetching meter reading:', error);
      toast.error('❌ เกิดข้อผิดพลาดในการดึงเลขมิเตอร์\n' + (error.response?.data?.message || error.message));
    } finally {
      setIsLoadingMeter(false);
    }
  };

  const handleVehicleToggle = (type) => {
    setVehicles(prev => ({
      ...prev,
      [type]: { ...prev[type], has: !prev[type].has }
    }));
  };

const handlePlateChange = (type, index, value) => {
  const updatedPlates = [...vehicles[type].plates];
  updatedPlates[index] = value;
  setVehicles(prev => ({
    ...prev,
    [type]: { ...prev[type], plates: updatedPlates }
  }));
};

const addPlate = (type) => {
  setVehicles(prev => ({
    ...prev,
    [type]: { ...prev[type], plates: [...prev[type].plates, ''] }
  }));
};

const removePlate = (type, indexToRemove) => {
  setVehicles(prev => {
    const updatedPlates = prev[type].plates.filter((_, i) => i !== indexToRemove);
    return {
      ...prev,
      [type]: { ...prev[type], plates: updatedPlates.length ? updatedPlates : [''] }
    };
  });
};
  return (
    <>
      <form ref={formRef} onSubmit={handleGoToBill} className="m-6">
      {/* Navbar */}
      <div className="bg-white shadow rounded-md p-6 mb-4 border border-gray-300">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleCancelContract}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            >
              ยกเลิกการทำสัญญา
            </button>
            <div className="flex items-center gap-2">
              <FaFileContract className="text-blue-600 text-xl" />
              <h1 className="text-2xl font-bold text-gray-800">สัญญารายเดือน - ห้อง {roomNumber || 'ไม่ระบุ'}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white shadow rounded-md p-6 space-y-6 border border-gray-300">
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><FaFileContract className="text-blue-600" /> รายละเอียดสัญญา</h2>
            
            {roomType ? (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4 shadow-sm space-y-2">
                <h3 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
                  ประเภทห้อง: <span className="text-blue-800">{roomType.room_type_name}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-700">
                  <p>ค่าเช่าต่อเดือน: <span className="font-medium">{Number(roomType.monthly_rent || 0).toLocaleString()} บาท</span></p>
                  <p>เงินประกัน: <span className="font-medium">{Number(roomType.security_deposit || 0).toLocaleString()} บาท</span></p>
                  <p>จ่ายล่วงหน้า: <span className="font-medium">{Number(roomType.prepaid_amount || 0).toLocaleString()} บาท</span></p>
                </div>
              </div>
            ) : (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4 shadow-sm">
                <p className="text-yellow-800">🔄 กำลังโหลดข้อมูลประเภทห้อง...</p>
                <p className="text-sm text-yellow-600 mt-1">Room: {roomNumber}, Dorm: {dormId}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block font-medium text-sm mb-1">วันที่เริ่ม <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  className="w-full border border-gray-300 bg-blue-50 rounded-md px-3 py-2" 
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-sm mb-1">วันที่สิ้นสุด</label>
                <input 
                  type="date" 
                  className="w-full border border-gray-300 rounded-md px-3 py-2" 
                  value={contractEndDate}
                  onChange={(e) => setContractEndDate(e.target.value)}
                  min={moveInDate}
                />
              </div>
            </div>


          </section>

          <section>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><FaUser className="text-green-600" /> ข้อมูลผู้เช่า</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-sm mb-1">ชื่อผู้เช่า <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 bg-blue-50 rounded-md px-3 py-2" 
                  value={tenantData.first_name}
                  onChange={(e) => setTenantData({...tenantData, first_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-sm mb-1">นามสกุล</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-md px-3 py-2" 
                  value={tenantData.last_name}
                  onChange={(e) => setTenantData({...tenantData, last_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block font-medium text-sm mb-1">เบอร์ติดต่อ <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 bg-blue-50 rounded-md px-3 py-2" 
                  value={tenantData.phone_number}
                  onChange={(e) => setTenantData({...tenantData, phone_number: e.target.value})}
                  onInput={e => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-sm mb-1">เลขบัตรประชาชน/พาสปอร์ต <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 bg-blue-50 rounded-md px-3 py-2" 
                  value={tenantData.id_card_number}
                  onChange={(e) => setTenantData({...tenantData, id_card_number: e.target.value})}
                  onInput={e => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block font-medium text-sm">ที่อยู่</label> 
                <span className="text-gray-500 text-sm">(สำหรับแสดงบนใบแจ้งหนี้/ใบเสร็จ)</span>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mb-2" 
                  value={tenantData.address}
                  onChange={(e) => setTenantData({...tenantData, address: e.target.value})}
                />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">จังหวัด</label>
                  <select
                    value={tenantProvince}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTenantProvince(value);
                      setTenantData({ ...tenantData, province: value, district: '', subdistrict: '' });
                      setTenantDistrict('');
                      setTenantSubDistrict('');
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">-- เลือกจังหวัด --</option>
                    {[...provinces]
                      .sort((a, b) => a.name_th.localeCompare(b.name_th, "th"))
                      .map((prov) => (
                        <option key={prov.id} value={prov.name_th}>
                          {prov.name_th}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">อำเภอ</label>
                  <select
                    value={tenantDistrict}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTenantDistrict(value);
                      setTenantData({ ...tenantData, district: value, subdistrict: '' });
                      setTenantSubDistrict('');
                    }}
                    disabled={!tenantProvince}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">-- เลือกอำเภอ --</option>
                    {districtOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ตำบล</label>
                  <select
                    value={tenantSubDistrict}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTenantSubDistrict(value);
                      setTenantData({ ...tenantData, subdistrict: value });
                    }}
                    disabled={!tenantDistrict}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">-- เลือกตำบล --</option>
                    {subDistrictOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              </div>

              <div className="col-span-2">
                <label className="block font-medium text-sm">อีเมล</label>
                 <span className="text-gray-500 text-sm">(สำหรับส่งจดหมายใบแจ้งหนี้/ใบเสร็จ)</span>
                <input 
                  type="email" 
                  className="w-full border border-gray-300 rounded-md px-3 py-2" 
                  placeholder="example@email.com" 
                  value={tenantData.email}
                  onChange={(e) => setTenantData({...tenantData, email: e.target.value})}
                />
              </div>
            </div>

              <section className="mt-6">
                <label className="font-medium text-sm mb-1 flex items-center gap-2"><FaCar className="text-yellow-600" /> ข้อมูลรถ :</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-1">
                    <input type="checkbox" checked={vehicles.car.has} onChange={() => handleVehicleToggle('car')} />
                    รถยนต์
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input type="checkbox" checked={vehicles.motorcycle.has} onChange={() => handleVehicleToggle('motorcycle')} />
                    มอเตอร์ไซค์
                  </label>
                </div>

                {['car', 'motorcycle'].map(type => (
                  vehicles[type].has && (
                    <div key={type} className="mt-4">
                      <label className="block font-medium text-sm mb-1">
                        ทะเบียน{type === 'car' ? 'รถยนต์' : 'มอเตอร์ไซค์'}
                      </label>
                      {vehicles[type].plates.map((plate, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                            placeholder={`ทะเบียน${type === 'car' ? 'รถยนต์' : 'มอเตอร์ไซค์'} คันที่ ${index + 1}`}
                            value={plate}
                            onChange={(e) => handlePlateChange(type, index, e.target.value)}
                          />
                          <button
                            type="button"
                            className="text-red-500 hover:text-red-700 text-sm"
                            onClick={() => removePlate(type, index)}
                          >
                            ลบ
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="text-sm text-blue-500 underline"
                        onClick={() => addPlate(type)}
                      >
                        + เพิ่มทะเบียน{type === 'car' ? 'รถยนต์' : 'มอเตอร์ไซค์'}
                      </button>
                    </div>
                  )
                ))}
              </section>

          </section>

          <section>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><FaPhoneAlt className="text-red-600" /> บุคคลติดต่อฉุกเฉิน</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-sm mb-1">ชื่อ</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-md px-3 py-2" 
                  value={emergencyContact.first_name}
                  onChange={(e) => setEmergencyContact({...emergencyContact, first_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block font-medium text-sm mb-1">นามสกุล</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-md px-3 py-2" 
                  value={emergencyContact.last_name}
                  onChange={(e) => setEmergencyContact({...emergencyContact, last_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block font-medium text-sm mb-1">ความสัมพันธ์</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-md px-3 py-2" 
                  placeholder="เช่น พ่อ แม่" 
                  value={emergencyContact.relationship}
                  onChange={(e) => setEmergencyContact({...emergencyContact, relationship: e.target.value})}
                />
              </div>
              <div>
                <label className="block font-medium text-sm mb-1">เบอร์ติดต่อ</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-md px-3 py-2" 
                  value={emergencyContact.phone_number}
                  onChange={(e) => setEmergencyContact({...emergencyContact, phone_number: e.target.value})}
                  onInput={e => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><FaStickyNote className="text-gray-600" /> อื่นๆ</h3>
            <label className="block font-medium text-sm mb-1">Note</label>
            <textarea 
              rows="3" 
              className="w-full border border-gray-300 rounded-md px-3 py-2" 
              placeholder="เพิ่มเติม..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            ></textarea>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          
          <div className="bg-white shadow rounded-md p-6 h-fit border border-gray-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2"><FaTools className="text-indigo-600" /> เลขมิเตอร์ตอนเข้าพัก</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setWaterMeter('');
                    setElectricMeter('');
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
                >
                  ล้างค่า
                </button>
                <button
                  onClick={fetchCurrentMeterReading}
                  disabled={isLoadingMeter}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isLoadingMeter 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow hover:shadow-md'
                  }`}
                >
                  {isLoadingMeter ? (
                    <>
                      <AiOutlineLoading3Quarters className="animate-spin h-4 w-4" />
                      กำลังดึงข้อมูล...
                    </>
                  ) : (
                    <>
                      <FaSync className="h-4 w-4" />
                      ดึงมิเตอร์ล่าสุด
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  เลขมิเตอร์ค่าน้ำ <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={waterMeter}
                  onChange={(e) => {
                    const value = Math.max(0, Math.floor(parseFloat(e.target.value) || 0));
                    setWaterMeter(value.toString());
                  }}
                  onBlur={(e) => {
                    const value = Math.max(0, Math.floor(parseFloat(e.target.value) || 0));
                    setWaterMeter(value.toString());
                  }}
                  className="w-full border border-gray-300 bg-blue-50 rounded-md px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  เลขมิเตอร์ค่าไฟ <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={electricMeter}
                  onChange={(e) => {
                    const value = Math.max(0, Math.floor(parseFloat(e.target.value) || 0));
                    setElectricMeter(value.toString());
                  }}
                  onBlur={(e) => {
                    const value = Math.max(0, Math.floor(parseFloat(e.target.value) || 0));
                    setElectricMeter(value.toString());
                  }}
                  className="w-full border border-gray-300 bg-blue-50 rounded-md px-3 py-2"
                  required
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              💡 คลิก "ดึงเลขมิเตอร์ล่าสุด" เพื่อนำเข้าข้อมูลจากระบบมิเตอร์
            </p>
          </div>

          <div className="bg-white shadow rounded-md p-6 h-fit border border-gray-300">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FaMoneyBillWave className="text-green-700" /> ค่าบริการเพิ่มเติมหรือส่วนลด</h3>
            <div className="bg-gray-50 border border-gray-300 rounded-md p-4 mb-4">
              <label className="block font-medium text-sm mb-3">เพิ่มรายการ</label>
              
              {/* ฟอร์มแนวนอน */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-3">
                {/* ชื่อบริการ */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อบริการ</label>
                  <input 
                    type="text" 
                    placeholder="เช่น ค่าบริการ,คีการ์ด, ส่วนลด" 
                    className="w-full border bg-white border-gray-300 rounded-md px-3 py-2" 
                    value={selectedService} 
                    onChange={e => setSelectedService(e.target.value)} 
                  />
                </div>

                {/* จำนวน */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">จำนวน</label>
                  <input 
                    type="number" 
                    placeholder="1" 
                    min="1"
                    className="w-full border bg-white border-gray-300 rounded-md px-3 py-2" 
                    value={serviceQuantity} 
                    onChange={e => setServiceQuantity(Math.max(1, parseInt(e.target.value) || 1))} 
                  />
                </div>

                {/* ราคาต่อหน่วย */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ราคาต่อหน่วย (บาท)</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    step="0.01"
                    className="w-full border bg-white border-gray-300 rounded-md px-3 py-2" 
                    value={servicePrice} 
                    onChange={e => setServicePrice(parseFloat(e.target.value) || 0)} 
                  />
                </div>

                {/* ปุ่มเพิ่ม */}
                <div className="flex flex-col">
                  <label className="block text-xs font-medium text-gray-600 mb-1">&nbsp;</label>
                  <button 
                    type="button" 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2" 
                    onClick={addCustomService}
                  >
                    <FaPlus className="text-sm" />
                    เพิ่ม
                  </button>
                </div>
              </div>

              {/* แสดงจำนวนรวม */}
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                <span className="text-sm font-medium text-blue-800">
                  จำนวนรวม: {Number(servicePrice * serviceQuantity).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
                </span>
              </div>
            </div>

            <div className="border border-gray-300 rounded-md overflow-hidden">
              <table className="w-full text-sm table-auto">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">รายการค่าบริการ</th>
                    <th className="text-center py-3 px-4 font-semibold">จำนวน</th>
                    <th className="text-right py-3 px-4 font-semibold">ราคาต่อหน่วย (บาท)</th>
                    <th className="text-right py-3 px-4 font-semibold">จำนวนเงิน (บาท)</th>
                    <th className="text-center py-3 px-4 font-semibold">จัดการ</th>
                  </tr>
                </thead>
              <tbody>
                {services.length === 0 ? (
                  <tr className="border-b border-gray-200">
                    <td className="py-4 px-4 text-center text-gray-500" colSpan="5">ไม่มีค่าบริการเพิ่มเติม</td>
                  </tr>
                ) : (
                  services.map((service, index) => (
                    <tr key={service.key} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-4">{service.name}</td>
                      <td className="text-center py-3 px-4">
                        <input
                          type="number"
                          min="1"
                          value={service.quantity || 1}
                          onChange={(e) => updateServiceQuantity(service.key, e.target.value)}
                          className="w-16 text-center border border-gray-300 rounded-md px-2 py-1"
                        />
                      </td>
                      <td className="text-right py-3 px-4">
                        <input
                          type="number"
                          step="0.01"
                          value={service.unitPrice || service.price || 0}
                          onChange={(e) => updateServiceUnitPrice(service.key, e.target.value)}
                          className="w-24 text-right border border-gray-300 rounded-md px-2 py-1"
                          placeholder="ใส่ค่าลบสำหรับส่วนลด"
                        />
                      </td>
                      <td className={`text-right py-3 px-4 font-medium ${
                        (service.unitPrice || service.price || 0) * (service.quantity || 1) < 0 
                          ? 'text-red-600' 
                          : 'text-gray-900'
                      }`}>
                        {Number((service.unitPrice || service.price || 0) * (service.quantity || 1)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-center py-3 px-4">
                        <button 
                          className="text-red-600 hover:text-red-800 text-sm bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md transition-colors" 
                          onClick={() => removeService(service.key)}
                          type="button"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
                {/* แสดงยอดรวมค่าบริการ */}
                {services.length > 0 && (
                  <tr className="bg-blue-50 border-t-2 border-blue-300">
                    <td className="py-3 px-4 font-bold">รวมค่าบริการทั้งหมด</td>
                    <td className="text-center py-3 px-4 font-semibold"></td>
                    <td className="text-right py-3 px-4 font-semibold"></td>
                    <td className={`text-right py-3 px-4 font-semibold ${
                      totalService < 0 ? 'text-red-600' : 'text-blue-700'
                    }`}>
                      {Number(totalService || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-center py-3 px-4"></td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white shadow rounded-md p-6 h-fit border border-gray-300">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FaMoneyBillWave className="text-yellow-700" /> สรุปค่าใช้จ่าย (Receipt Summary)</h3>
            
            {/* ตารางสำหรับใบเสร็จ */}
            <div className="border border-gray-300 rounded-md overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">รายการ</th>
                    <th className="text-center py-3 px-4 font-semibold">จำนวน</th>
                    <th className="text-right py-3 px-4 font-semibold">ราคาต่อหน่วย (บาท)</th>
                    <th className="text-right py-3 px-4 font-semibold">จำนวนเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ค่าเช่าล่วงหน้า */}
                  <tr className="border-b border-gray-200">
                    <td className="py-3 px-4">ค่าเช่าล่วงหน้า</td>
                    <td className="text-center py-3 px-4">1</td>
                    <td className="text-right py-3 px-4">{Number(advance || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    <td className="text-right py-3 px-4">{Number(advance || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  
                  {/* เงินประกัน */}
                  <tr className="border-b border-gray-200">
                    <td className="py-3 px-4">เงินประกัน</td>
                    <td className="text-center py-3 px-4">1</td>
                    <td className="text-right py-3 px-4">{Number(deposit || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    <td className="text-right py-3 px-4">{Number(deposit || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  
                  {/* ค่าบริการเพิ่มเติม */}
                  {services.map((service, index) => (
                    <tr key={service.key} className="border-b border-gray-200">
                      <td className="py-3 px-4">{service.name}</td>
                      <td className="text-center py-3 px-4">{service.quantity || 1}</td>
                      <td className="text-right py-3 px-4">{Number(service.unitPrice || service.price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      <td className={`text-right py-3 px-4 ${
                        (service.unitPrice || service.price || 0) * (service.quantity || 1) < 0 
                          ? 'text-red-600' 
                          : 'text-gray-900'
                      }`}>
                        {Number((service.unitPrice || service.price || 0) * (service.quantity || 1)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  
                  {/* ยอดรวม */}
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td className="py-2 px-4 font-bold">รวมทั้งหมดที่ต้องชำระ</td>
                    <td className="text-center py-2 px-4 font-bold"></td>
                    <td className="text-right py-2 px-4 font-bold"></td>
                    <td className={`text-right py-2 px-4 font-bold text-lg ${
                      totalAll < 0 ? 'text-red-600' : 'text-blue-700'
                    }`}>
                      {Number(totalAll || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ข้อมูลเพิ่มเติมสำหรับใบเสร็จ */}
            <div className="bg-gray-50 border border-gray-300 rounded-md p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">วันที่ออกใบเสร็จ:</span>
                  <p className="text-gray-900">{new Date().toLocaleDateString('th-TH', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">ห้อง:</span>
                  <p className="text-gray-900">ห้องพัก {roomNumber}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">ผู้ชำระ:</span>
                  <p className="text-gray-900">{tenantData.first_name} {tenantData.last_name || '(ไม่ระบุนามสกุล)'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">วิธีชำระ:</span>
                  <p className="text-gray-900">
                    {paymentMethod === 'cash' ? 'เงินสด' : 
                     paymentMethod === 'bank_transfer' ? 'โอนเงิน' : 
                     paymentMethod === 'promptpay' ? 'พร้อมเพย์' : 
                     paymentMethod === 'credit_card' ? 'บัตรเครดิต' : paymentMethod}
                  </p>
                </div>
              </div>
            </div>

            {/* หมายเหตุใบเสร็จ */}
            <div className="mt-6 p-4 bg-gray-50 border border-gray-300 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-black">
                  📝 หมายเหตุใบเสร็จ (เริ่มต้น)
                </label>
                <div className="flex gap-2">
                  {!isEditingReceiptNote ? (
                    <button
                      type="button"
                      onClick={handleEditReceiptNote}
                      className="px-3 py-1 text-xs bg-blue-100 text-black rounded-md hover:bg-blue-200 transition-colors"
                    >
                      ✏️ แก้ไข
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveReceiptNote}
                        className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                      >
                        💾 บันทึก
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEditReceiptNote}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        ❌ ยกเลิก
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {!isEditingReceiptNote ? (
                <div className="min-h-[60px] p-3 bg-white border border-gray-300 rounded-md text-sm text-black whitespace-pre-wrap">
                  {receiptNote || "ยังไม่มีหมายเหตุเริ่มต้น คลิก 'แก้ไข' เพื่อเพิ่มหมายเหตุ"}
                </div>
              ) : (
                <div>
                  <textarea
                    value={tempReceiptNote}
                    onChange={(e) => {
                      if (e.target.value.length <= 500) {
                        setTempReceiptNote(e.target.value);
                      }
                    }}
                    placeholder="เช่น เงื่อนไขพิเศษ, วันที่ครบกำหนดชำระ, ข้อมูลเพิ่มเติม..."
                    className="w-full border border-blue-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                    rows="3"
                  />
                  <span className="text-xs text-gray-500 mt-1 block">{tempReceiptNote.length}/500 ตัวอักษร</span>
                </div>
              )}
              
              <p className="text-xs text-black mt-2">
                💡 หมายเหตุนี้จะถูกบันทึกเป็นค่าเริ่มต้นสำหรับสัญญาใหม่ในหอพักนี้
              </p>
            </div>
            <div className="mt-4 space-y-1">
              <p className="text-xs text-red-600 font-medium">📄 ใบเสร็จจะถูกสร้างหลังจากยืนยันสัญญา</p>
              <p className="text-xs text-yellow-700 flex items-center gap-1 mt-2" style={{whiteSpace: 'normal', overflowWrap: 'anywhere'}}>
                <FaExclamationTriangle className="inline mr-1" />
                เมื่อสร้างสัญญาแล้ว จะไม่สามารถแก้ไขได้ หากต้องการเปลี่ยนแปลงข้อมูล กรุณาตรวจสอบรายละเอียดให้ครบถ้วนก่อนกดยืนยัน
              </p>
            </div>
          </div>


          {/* วิธีการชำระเงิน */}
          <div className="bg-white shadow rounded-md p-4 h-fit border border-gray-300">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FaMoneyBillWave className="text-blue-700" /> วิธีการชำระเงิน <span className="text-red-500">*</span></h3>
            <label className="block font-medium text-sm mb-2">เลือกวิธีการชำระเงิน <span className="text-red-500">*</span></label>
            <select
              className="border border-gray-300 bg-blue-50 rounded-md px-3 py-2"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              required
            >
              <option value="cash">เงินสด</option>
              <option value="bank_transfer">โอนเงิน</option>
              <option value="promptpay">พร้อมเพย์</option>
              <option value="credit_card">บัตรเครดิต</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">* กรุณาเลือกวิธีการชำระเงินที่ต้องการ</p>
          </div>

          <div className="flex justify-end items-center">
            {/* ปุ่มสร้างสัญญา */}
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-md text-sm font-semibold flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <FaPlus className="text-white text-base" />
              สร้างสัญญา
            </button>
          </div>

        </div>
      </div>
      </form>

      {/* Create Contract Confirmation Popup */}
      {showConfirmPopup && (
      <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-[10vh]">
        <div className="bg-white rounded-md p-6 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-center">
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-md bg-blue-100">
                <FaFileContract className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              📝 ยืนยันการสร้างสัญญาเช่า
            </h3>
            <div className="text-sm text-gray-600 mb-6 text-left">
              <p className="mb-2">🏠 <strong>ห้อง:</strong> {roomNumber}</p>
              <p className="mb-2">👤 <strong>ผู้เช่า:</strong> {tenantData.first_name} {tenantData.last_name}</p>
              <p className="mb-2">💰 <strong>ค่าเช่า:</strong> {Number(rent || 0).toLocaleString('th-TH')} บาท/เดือน</p>
              <p className="mb-2">🏦 <strong>เงินมัดจำ:</strong> {Number(deposit || 0).toLocaleString('th-TH')} บาท</p>
              <p className="mb-2">💳 <strong>เงินล่วงหน้า:</strong> {Number(advance || 0).toLocaleString('th-TH')} บาท</p>
              {services.length > 0 && (
                <p className="mb-2">🛠 <strong>ค่าบริการเพิ่มเติม:</strong> {Number(services.reduce((sum, service) => sum + ((service.unitPrice || service.price || 0) * (service.quantity || 1)), 0)).toLocaleString('th-TH')} บาท</p>
              )}
              <div className="border-t pt-2 mb-4">
                <p className="font-semibold text-green-600">💵 <strong>ยอดรวมทั้งหมด:</strong> {Number(totalAll || 0).toLocaleString('th-TH')} บาท</p>
              </div>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                <p className="text-yellow-800 text-xs">
                  ⚠️ <strong>คำเตือน:</strong> เมื่อสร้างสัญญาแล้ว จะไม่สามารถแก้ไขข้อมูลได้
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <button
                onClick={closeConfirmPopup}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmCreateContract}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-2"
              >
                <FaFileContract className="w-4 h-4" />
                ยืนยันสร้างสัญญา
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Cancel Confirmation Popup */}
      {showCancelPopup && (
      <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-[10vh]">
        <div className="bg-white rounded-md p-6 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-center">
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-md bg-red-100">
                <FaExclamationTriangle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ยืนยันการยกเลิกสัญญา
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              การยกเลิกการทำสัญญาห้อง
              ข้อมูลทั้งหมดที่กรอกจะหายไป
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={closeCancelPopup}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                ไม่ยกเลิก
              </button>
              <button
                onClick={confirmCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              >
                ยืนยันยกเลิก
              </button>
            </div>
          </div>
        </div>
      </div>
      )}
      <ToastContainer />
    </>
  );
}

export default MonthlyContract;
