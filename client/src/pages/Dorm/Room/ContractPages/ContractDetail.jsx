import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  FaArrowLeft, FaUser, FaPhone, FaIdCard, FaCalendarAlt, FaHome, FaEnvelope,
  FaCar, FaMotorcycle, FaPhoneAlt, FaFileContract, FaMoneyBillWave, FaEdit,
  FaPlus, FaCircle, FaWrench, FaTools, FaStickyNote, FaCalculator,FaPrint,
  FaTrash, FaTint, FaBolt, FaTag, FaBed, FaDoorClosed, FaFileInvoice
} from 'react-icons/fa';
import axios from 'axios';
import MoveOutPopup from './MoveOutPopup';
import EditTenantPopup from './EditTenantPopup';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


function ContractDetail() {
  const { dormId, contractId } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMoveOutPopup, setShowMoveOutPopup] = useState(false);
  const [showEditTenantPopup, setShowEditTenantPopup] = useState(false);
  const location = useLocation();
  const fromMeterReading = location.state?.fromMeterReading;

  // บริการรายเดือน (จาก API)
  const [services, setServices] = useState([]);
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceQuantity, setServiceQuantity] = useState(1);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [editingServiceData, setEditingServiceData] = useState({ name: '', price: '', quantity: 1 });
  
  // State สำหรับ popup ลบบริการ
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);

  useEffect(() => {
    fetchContractDetail();
    fetchContractServices();
  }, [contractId]);

  const fetchContractDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3001/api/contracts/${contractId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContract(response.data);
      setError(null);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการดึงข้อมูล');
      console.error('Error fetching contract detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchContractServices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3001/api/contracts/${contractId}/services`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setServices(response.data);
    } catch (err) {
      console.error('Error fetching contract services:', err);
      setServices([]);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleGoBack = () => {
    if (fromMeterReading) {
      navigate(`/create-meter-reading/${dormId}`); // ✅ ต้องตรงกับ path ที่ router กำหนด
    } else {
      navigate(`/dorm/${dormId}/room/${contract?.room_number}`);
    }
  };

  const handleEditTenant = () => {
    // เปิด popup แก้ไขข้อมูลผู้เช่า
    setShowEditTenantPopup(true);
  };

  const handleMoveOut = () => {
    setShowMoveOutPopup(true);
  };

  const handleSaveMoveOut = async (updatedContract) => {
    try {
      // เรียก API เพื่อบันทึกข้อมูลสัญญาที่แก้ไข
      const token = localStorage.getItem('token');
      const response = await axios.put(`http://localhost:3001/api/contracts/${contractId}`, updatedContract, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        toast.success('บันทึกการแก้ไขข้อมูลสัญญาเรียบร้อยแล้ว');
        setTimeout(() => {
          setShowMoveOutPopup(false);
          fetchContractDetail(); // รีเฟรชข้อมูล
        }, 1500);
      }
    } catch (error) {
      console.error('Error updating contract:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleSaveEditTenant = async (updatedTenantData) => {
    try {
      // รีเฟรชข้อมูลสัญญาหลังจากแก้ไขข้อมูลผู้เช่า
      fetchContractDetail();
      setShowEditTenantPopup(false);
    } catch (error) {
      console.error('Error after updating tenant:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 text-lg">กำลังโหลดข้อมูล...</span>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-red-500 mb-4">{error || 'ไม่พบข้อมูลสัญญา'}</p>
          <button 
            onClick={() => navigate(-1)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md transition-colors"
          >
            กลับหน้าเดิม
          </button>
        </div>
      </div>
    );
  }

  // เพิ่มบริการใหม่
  const handleAddService = async () => {
    if (!serviceName.trim() || !servicePrice || isNaN(servicePrice) || servicePrice <= 0 || !serviceQuantity || serviceQuantity <= 0) {
      toast.warning('กรุณากรอกชื่อบริการ ราคา และจำนวนที่ถูกต้อง');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`http://localhost:3001/api/contracts/${contractId}/services`, {
        name: serviceName.trim(),
        price: Number(servicePrice),
        quantity: Number(serviceQuantity)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 201) {
        await fetchContractServices(); // รีเฟรชรายการ
        setServiceName('');
        setServicePrice('');
        setServiceQuantity(1);
        toast.success('เพิ่มบริการเรียบร้อย');
      }
    } catch (err) {
      console.error('Error adding service:', err);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มบริการ');
    }
  };

  // ลบบริการ
  const handleRemoveService = async (serviceId, serviceName) => {
    setServiceToDelete({ id: serviceId, name: serviceName });
    setShowDeleteConfirm(true);
  };

  // ยืนยันการลบบริการ
  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`http://localhost:3001/api/contracts/${contractId}/services/${serviceToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.status === 200) {
        await fetchContractServices(); // รีเฟรชรายการ
        toast.success('ลบบริการเรียบร้อย');
      }
    } catch (err) {
      console.error('Error removing service:', err);
      toast.error('เกิดข้อผิดพลาดในการลบบริการ');
    } finally {
      setShowDeleteConfirm(false);
      setServiceToDelete(null);
    }
  };

  // เริ่มแก้ไขบริการ
  const handleEditService = (service) => {
    setEditingServiceId(service.id);
    setEditingServiceData({ name: service.name, price: service.price, quantity: service.quantity || 1 });
  };

  // บันทึกการแก้ไขบริการ
  const handleSaveEditService = async () => {
    if (!editingServiceData.name.trim() || !editingServiceData.price || editingServiceData.price <= 0 || !editingServiceData.quantity || editingServiceData.quantity <= 0) {
      toast.warning('กรุณากรอกชื่อบริการ ราคา และจำนวนที่ถูกต้อง');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`http://localhost:3001/api/contracts/${contractId}/services/${editingServiceId}`, {
        name: editingServiceData.name.trim(),
        price: Number(editingServiceData.price),
        quantity: Number(editingServiceData.quantity)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        await fetchContractServices(); // รีเฟรชรายการ
        setEditingServiceId(null);
        setEditingServiceData({ name: '', price: '', quantity: 1 });
        toast.success('แก้ไขบริการเรียบร้อย');
      }
    } catch (err) {
      console.error('Error updating service:', err);
      toast.error('เกิดข้อผิดพลาดในการแก้ไขบริการ');
    }
  };

  // ยกเลิกการแก้ไข
  const handleCancelEditService = () => {
    setEditingServiceId(null);
    setEditingServiceData({ name: '', price: '', quantity: 1 });
  };

  // รวมราคาทั้งหมด
  const totalServicePrice = services.reduce((sum, s) => sum + (Number(s.price) * Number(s.quantity || 1)), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between py-4">
          {/* ด้านซ้าย: ปุ่มย้อนกลับ + หัวข้อ */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoBack}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FaArrowLeft className="text-lg" />
              <span>กลับ</span>
            </button>
            <div className="flex items-center gap-3">
              <FaFileContract className="text-gray-600 text-xl" />
              <div>
                <h1 className="text-xl font-semibold text-gray-800">
                  รายละเอียดสัญญาเช่า
                </h1>
                <p className="text-sm text-gray-500">
                  {contract.dorm_name} - ห้อง {contract.room_number}
                </p>
              </div>
            </div>
          </div>

          {/* ด้านขวา: แสดงสถานะและปุ่มใบเสร็จ */}
          <div className="ml-auto flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold ${
              contract.status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              <FaCircle className="text-xs" />
              {contract.status === 'active' ? 'เช่าอยู่' : 'เลิกเช่า'}
            </span>
          </div>
        </div>

        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* ข้อมูลผู้เช่า */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* ข้อมูลส่วนตัว */}
            <div className="bg-white border border-gray-300 rounded-md shadow-sm">
              <div className="border-b border-gray-300 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                    <FaUser className="text-gray-500" />
                    ข้อมูลผู้เช่า
                  </h2>
                  <button
                    onClick={handleEditTenant}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md text-sm font-medium transition-colors"
                  >
                    <FaEdit className="text-sm" />
                    แก้ไขข้อมูล
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-6 mb-6">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <FaUser className="text-gray-400 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-gray-800 mb-2">
                      {contract.first_name} {contract.last_name}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <FaPhone className="text-gray-400" />
                        <span className="text-gray-500">เบอร์โทร:</span>
                        <span className="font-medium text-gray-700">{contract.phone_number}</span>
                      </div>
                      {contract.email && (
                        <div className="flex items-center gap-2">
                          <FaEnvelope className="text-gray-400" />
                          <span className="text-gray-500">อีเมล:</span>
                          <span className="font-medium text-gray-700">{contract.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contract.id_card_number && (
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FaIdCard className="text-gray-400" />
                        <span className="font-medium text-gray-600">เลขบัตรประชาชน</span>
                      </div>
                      <p className="text-gray-800 font-mono">{contract.id_card_number}</p>
                    </div>
                  )}
                  
                  {contract.address && (
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FaHome className="text-gray-400" />
                        <span className="font-medium text-gray-600">ที่อยู่</span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-gray-800">{contract.address}</p>
                        {(contract.subdistrict || contract.district || contract.province) && (
                          <div className="flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full w-fit">
                            <span className="text-gray-500">📍</span>
                            <span>
                              {[
                                contract.subdistrict && `ต.${contract.subdistrict}`,
                                contract.district && `อ.${contract.district}`, 
                                contract.province && `จ.${contract.province}`
                              ]
                                .filter(Boolean)
                                .join(' • ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ข้อมูลผู้ติดต่อฉุกเฉินและยานพาหนะ */}
                <div className="mt-4 space-y-4">
                  {/* ผู้ติดต่อฉุกเฉิน */}
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FaPhoneAlt className="text-gray-400" />
                      <span className="font-medium text-gray-600">ผู้ติดต่อฉุกเฉิน</span>
                    </div>
                    <div className="text-gray-800">
                      <p className="font-medium">{(contract.emergency_first_name || contract.emergency_last_name) ? `${contract.emergency_first_name || ''} ${contract.emergency_last_name || ''}`.trim() : '-'}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {contract.emergency_relationship || '-'} | {contract.emergency_phone || '-'}
                      </p>
                    </div>
                  </div>

                  {/* ยานพาหนะ */}
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FaCar className="text-gray-400" />
                      <span className="font-medium text-gray-600">ยานพาหนะ</span>
                    </div>
                    <div className="space-y-2">
                      {contract.vehicles && contract.vehicles.length > 0 ? (
                        contract.vehicles.map((vehicle) => (
                          <div key={vehicle.tenant_vehicle_id} className="flex items-center gap-3">
                            {vehicle.vehicle_type === 'car' ? (
                              <FaCar className="text-gray-400 text-sm" />
                            ) : (
                              <FaMotorcycle className="text-gray-400 text-sm" />
                            )}
                            <span className="font-medium text-gray-800">{vehicle.license_plate}</span>
                            <span className="text-sm text-gray-500">
                              ({vehicle.vehicle_type === 'car' ? 'รถยนต์' : 'มอเตอร์ไซค์'})
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </div>
                  </div>

                  {/* หมายเหตุ */}
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4 flex items-start gap-2">
                    <FaStickyNote className="text-gray-400 mt-1" />
                    <div>
                      <span className="font-medium text-gray-600">หมายเหตุ</span>
                      <p className="text-gray-600 leading-relaxed mt-1">{contract.note ? contract.note : '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* บริการรายเดือน */}
            <div className="bg-white border border-gray-300 rounded-md shadow-sm">
              <div className="border-b border-gray-300 px-6 py-4">
                <h2 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                  <FaTools className="text-gray-500" />
                  บริการรายเดือน
                </h2>
                <p className="text-sm text-gray-500 mt-1">ค่าบริการต่างๆ ที่คิดเพิ่มในแต่ละเดือน</p>
              </div>
              <div className="p-6">
                {/* ฟอร์มเพิ่มบริการ */}
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
                  <label className="block font-medium text-sm mb-2">เพิ่มค่าบริการ</label>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input 
                      type="text" 
                      placeholder="ชื่อบริการ" 
                      value={serviceName}
                      onChange={e => setServiceName(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input 
                      type="number" 
                      placeholder="จำนวน" 
                      value={serviceQuantity}
                      onChange={e => setServiceQuantity(e.target.value)}
                      min="1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <input 
                      type="number" 
                      placeholder="ราคา (บาท)" 
                      value={servicePrice}
                      onChange={e => setServicePrice(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  <button 
                    type="button" 
                    onClick={handleAddService}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex justify-center items-center gap-2 transition-colors"
                  >
                    <FaPlus size={10} />เพิ่ม
                  </button>
                  </div>
                </div>

                {/* ตารางบริการ */}
                <div className="overflow-hidden border border-gray-200 rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="text-center py-3 px-2 font-medium text-gray-700 w-12">#</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">รายการ</th>
                      <th className="text-center py-3 px-2 font-medium text-gray-700 w-24">จำนวนหน่วย</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-700 w-32">ราคาต่อหน่วย</th>
                      <th className="text-right py-3 px-2 font-medium text-gray-700 w-32">ยอดเงิน</th>
                      <th className="text-center py-3 px-2 font-medium text-gray-700 w-20">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.length === 0 ? (
                      <tr><td colSpan={6} className="text-center text-gray-400 py-4">ไม่มีบริการเพิ่มเติม</td></tr>
                    ) : (
                      services.map((s, idx) => (
                        <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="text-center py-3 px-2">{idx + 1}</td>
                          <td className="py-3 px-2 text-gray-800">
                            {editingServiceId === s.id ? (
                              <input 
                                type="text" 
                                value={editingServiceData.name}
                                onChange={(e) => setEditingServiceData(prev => ({...prev, name: e.target.value}))}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm"
                              />
                            ) : (
                              s.name
                            )}
                          </td>
                          <td className="text-center py-3 px-2">
                            {editingServiceId === s.id ? (
                              <input 
                                type="number" 
                                value={editingServiceData.quantity}
                                onChange={(e) => setEditingServiceData(prev => ({...prev, quantity: e.target.value}))}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm text-center"
                                min="1"
                              />
                            ) : (
                              s.quantity || 1
                            )}
                          </td>
                          <td className="text-right py-3 px-2">
                            {editingServiceId === s.id ? (
                              <input 
                                type="number" 
                                value={editingServiceData.price}
                                onChange={(e) => setEditingServiceData(prev => ({...prev, price: e.target.value}))}
                                className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm text-right"
                                min="0"
                                step="0.01"
                              />
                            ) : (
                              `${Number(s.price).toLocaleString()} บาท`
                            )}
                          </td>
                          <td className="text-right py-3 px-2 font-medium text-gray-800">
                            {Number(s.price * (s.quantity || 1)).toLocaleString()} บาท
                          </td>
                          <td className="text-center py-3 px-2">
                            <div className="flex items-center justify-center gap-2">
                              {editingServiceId === s.id ? (
                                <>
                                  <button
                                    onClick={handleSaveEditService}
                                    className="text-green-600 hover:text-green-800 text-sm p-1 rounded-md hover:bg-green-50 transition-colors"
                                    title="บันทึก"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={handleCancelEditService}
                                    className="text-red-600 hover:text-red-800 text-sm p-1 rounded-md hover:bg-red-50 transition-colors"
                                    title="ยกเลิก"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleEditService(s)}
                                    className="text-blue-600 hover:text-blue-800 text-sm p-1 rounded-md hover:bg-blue-50 transition-colors"
                                    title="แก้ไข"
                                  >
                                    <FaEdit />
                                  </button>
                                  <button 
                                    onClick={() => handleRemoveService(s.id, s.name)} 
                                    className="text-red-600 hover:text-red-800 text-sm p-1 rounded-md hover:bg-red-50 transition-colors"
                                    title="ลบ"
                                  >
                                    <FaTrash />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>

                {/* สรุปค่าบริการ */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center text-lg font-medium">
                    <div className="flex items-center gap-2 text-gray-700">
                      <FaCalculator />
                      <span>ค่าบริการรวม/เดือน:</span>
                    </div>
                    <span className="text-blue-600">{totalServicePrice} บาท</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ข้อมูลสัญญา */}
          <div className="space-y-4">
            
            {/* รายละเอียดสัญญา */}
            <div className="bg-white border border-gray-300 rounded-md shadow-sm">
              <div className="border-b border-gray-300 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                    <FaFileContract className="text-gray-500" />
                    รายละเอียดสัญญา
                  </h2>
                  {contract.status === 'active' && (
                  <button
                    onClick={handleMoveOut}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md text-sm font-medium transition-colors"
                  >
                    <FaEdit className="text-sm" />
                    แก้ไขสัญญา
                  </button>
                  )}
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">ประเภทห้อง</label>
                  <p className="text-lg font-medium text-gray-800">{contract.room_type_name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm  text-orange-700 bg-orange-50 px-2 py-1 rounded-md">วันที่เริ่มสัญญา</label>
                    <p className="font-medium text-gray-800 mt-1">{formatDate(contract.contract_start_date)}</p>
                  </div>
                  <div>
                    <label className="text-sm  text-orange-700 bg-orange-50 px-2 py-1 rounded-md">วันสิ้นสุดสัญญา</label>
                    <p className="font-medium text-gray-800 mt-1">{formatDate(contract.contract_end_date)}</p>
                  </div>
                  <div>
                    <label className="text-sm  text-orange-700 bg-orange-50 px-2 py-1 rounded-md">แจ้งย้ายออก</label>
                    <p className="font-medium text-gray-800 mt-1">{formatDate(contract.moveout_notice_date)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ข้อมูลการเงิน */}
            <div className="bg-white border border-gray-300 rounded-md shadow-sm">
              <div className="border-b border-gray-300 px-6 py-4">
                <h2 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                  <FaMoneyBillWave className="text-gray-500" />
                  ข้อมูลการเงิน
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">ค่าเช่ารายเดือน</span>
                    <span className="font-medium text-gray-800">
                      ฿{contract.monthly_rent?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">เงินประกัน</span>
                    <span className="font-medium text-gray-800">
                      ฿{contract.deposit_monthly?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">เงินล่วงหน้า</span>
                    <span className="font-medium text-gray-800">
                      ฿{contract.advance_amount?.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-600 mb-3">เลขมิเตอร์เริ่มต้น</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-center">
                      <FaTint className="text-blue-500 mr-1" />น้ำ
                      <p className="text-lg font-medium text-gray-800">{contract.water_meter_start}</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-center">
                      <FaBolt className="text-yellow-500 mr-1" />ไฟ
                      <p className="text-lg font-medium text-gray-800">{contract.electric_meter_start}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* ใบเสร็จการทำสัญญา */}
            <div className="bg-white border border-gray-300 rounded-md shadow-sm">
              <div className="border-b border-gray-300 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                    <FaFileInvoice className="text-gray-500" />
                    ใบเสร็จการทำสัญญา
                  </h2>
                </div>
              </div>
                <div className="p-4">
                  <button
                  onClick={() => navigate(`/dorm/${dormId}/receipt/${contractId}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors"
                    >
                  <FaPrint />
                  พิมพ์หรือดาวน์โหลด
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contract Edit Popup */}
      <MoveOutPopup
        isOpen={showMoveOutPopup}
        onClose={() => setShowMoveOutPopup(false)}
        onSave={handleSaveMoveOut}
        contract={contract}
      />

      {/* Edit Tenant Popup */}
      <EditTenantPopup
        isOpen={showEditTenantPopup}
        onClose={() => setShowEditTenantPopup(false)}
        onSave={handleSaveEditTenant}
        tenantData={contract}
      />

      {/* Delete Service Confirmation Popup */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-[10vh]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-md bg-red-100 mb-4">
                <FaTrash className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ยืนยันการลบบริการ
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                คุณต้องการลบบริการ "{serviceToDelete?.name}" หรือไม่?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setServiceToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmDeleteService}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                >
                  ลบ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <ToastContainer />
    </div>
  );
}

export default ContractDetail;
