import React, { useState, useEffect } from 'react';
import { FaUser, FaPhone, FaIdCard, FaMapMarkerAlt, FaUserFriends, FaSave, FaTimes, FaCar, FaMotorcycle } from 'react-icons/fa';
import axios from 'axios';
import provinces from "../../../../assets/data/api_province.json";
import amphures from "../../../../assets/data/api_amphure.json";
import tambons from "../../../../assets/data/thai_tambons.json";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function EditTenantPopup({ isOpen, onClose, onSave, tenantData: initialTenantData }) {
  // ข้อมูลผู้เช่า
  const [tenantData, setTenantData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    idNumber: '',
    address: '',
    province: '',
    district: '',
    subdistrict: ''
  });

  // บุคคลติดต่อฉุกเฉิน
  const [emergencyContact, setEmergencyContact] = useState({
    firstName: '',
    lastName: '',
    relationship: '',
    phone: '',
    emergency_contacts_id: null
  });

  // ข้อมูลรถ
  const [vehicleData, setVehicleData] = useState({
    car: { has: false, plates: [{ plate: '', id: null }] },
    motorcycle: { has: false, plates: [{ plate: '', id: null }] }
  });

  // เก็บรายการรถที่ถูกลบด้วยการกดกากบาท
  const [deletedVehicleIds, setDeletedVehicleIds] = useState([]);

  // ข้อมูลที่อยู่สำหรับ dropdown
  const [districtOptions, setDistrictOptions] = useState([]);
  const [subDistrictOptions, setSubDistrictOptions] = useState([]);

  // อื่นๆ
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // useEffect สำหรับจัดการ dropdown ที่อยู่
  useEffect(() => {
    if (tenantData.province) {
      const provId = provinces.find((p) => p.name_th === tenantData.province)?.id;
      if (provId) {
        const filtered = amphures.filter((a) => a.province_id === provId);
        setDistrictOptions(filtered.map((a) => a.name_th));
      }
    } else {
      setDistrictOptions([]);
    }
  }, [tenantData.province]);

  useEffect(() => {
    if (tenantData.province && tenantData.district) {
      const provId = provinces.find((p) => p.name_th === tenantData.province)?.id;
      const amphureId = amphures.find(
        (a) => a.name_th === tenantData.district && a.province_id === provId
      )?.id;
      if (amphureId) {
        const filtered = tambons.filter((t) => t.amphure_id === amphureId);
        setSubDistrictOptions(filtered.map((t) => t.name_th));
      }
    } else {
      setSubDistrictOptions([]);
    }
  }, [tenantData.province, tenantData.district]);

  // โหลดข้อมูลเมื่อเปิด popup
  useEffect(() => {
    if (isOpen && initialTenantData) {
      setTenantData({
        firstName: initialTenantData.first_name || '',
        lastName: initialTenantData.last_name || '',
        phone: initialTenantData.phone_number || '',
        email: initialTenantData.email || '',
        idNumber: initialTenantData.id_card_number || '',
        address: initialTenantData.address || '',
        province: initialTenantData.province || '',
        district: initialTenantData.district || '',
        subdistrict: initialTenantData.subdistrict || ''
      });

      setEmergencyContact({
        firstName: initialTenantData.emergency_first_name || '',
        lastName: initialTenantData.emergency_last_name || '',
        relationship: initialTenantData.emergency_relationship || '',
        phone: initialTenantData.emergency_phone || '',
        emergency_contacts_id: initialTenantData.emergency_contacts_id || null
      });

      // จัดการข้อมูลยานพาหนะ
      if (initialTenantData.vehicles && initialTenantData.vehicles.length > 0) {
        const cars = initialTenantData.vehicles.filter(v => v.vehicle_type === 'car');
        const motorcycles = initialTenantData.vehicles.filter(v => v.vehicle_type === 'motorcycle');

        setVehicleData({
          car: {
            has: cars.length > 0,
            plates: cars.length > 0 ? cars.map(c => ({ plate: c.license_plate, id: c.tenant_vehicle_id })) : [{ plate: '', id: null }]
          },
          motorcycle: {
            has: motorcycles.length > 0,
            plates: motorcycles.length > 0 ? motorcycles.map(m => ({ plate: m.license_plate, id: m.tenant_vehicle_id })) : [{ plate: '', id: null }]
          }
        });
      } else {
        // กรณีไม่มียานพาหนะ ให้ set ค่าเริ่มต้น
        setVehicleData({
          car: { has: false, plates: [{ plate: '', id: null }] },
          motorcycle: { has: false, plates: [{ plate: '', id: null }] }
        });
      }

      // รีเซ็ตรายการรถที่ลบ
      setDeletedVehicleIds([]);
      setNotes(initialTenantData.note || '');
    }
  }, [isOpen, initialTenantData]);

  const handleTenantChange = (field, value) => {
    setTenantData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmergencyChange = (field, value) => {
    setEmergencyContact(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVehicleToggle = (type) => {
    setVehicleData(prev => {
      const newHasValue = !prev[type].has;
      
      // ถ้าปิดใช้งาน ให้เก็บทะเบียนที่มี id ไว้ใน deletedVehicleIds
      if (!newHasValue) {
        const existingIds = prev[type].plates
          .filter(p => p.id)
          .map(p => p.id);
        
        if (existingIds.length > 0) {
          setDeletedVehicleIds(prevDeleted => [...prevDeleted, ...existingIds]);
        }
        
        return {
          ...prev,
          [type]: { 
            has: false, 
            plates: [{ plate: '', id: null }] 
          }
        };
      }
      
      return {
        ...prev,
        [type]: { ...prev[type], has: newHasValue }
      };
    });
  };

  const handlePlateChange = (type, index, value) => {
    const updatedPlates = [...vehicleData[type].plates];
    updatedPlates[index] = {
      ...updatedPlates[index],
      plate: value
    };
    setVehicleData(prev => ({
      ...prev,
      [type]: { ...prev[type], plates: updatedPlates }
    }));
  };
  const addPlate = (type) => {
    setVehicleData(prev => ({
      ...prev,
      [type]: { ...prev[type], plates: [...prev[type].plates, { plate: '', id: null }] }
    }));
  };

  const removePlate = (type, indexToRemove) => {
    const plateToRemove = vehicleData[type].plates[indexToRemove];
    const plateText = plateToRemove.plate || 'ช่องทะเบียนนี้';
    
    const confirmed = window.confirm(
      `คุณต้องการลบ ${plateText} ใช่หรือไม่?\n\n` +
      `หากเป็นรถที่มีอยู่แล้วในระบบ จะถูกลบออกจากฐานข้อมูลเมื่อกดบันทึก`
    );
    
    if (confirmed) {
      // ถ้ารถนี้มี id (เป็นรถที่มีอยู่ในฐานข้อมูล) ให้เพิ่มเข้าไปในรายการที่ต้องลบ
      if (plateToRemove.id) {
        setDeletedVehicleIds(prev => [...prev, plateToRemove.id]);
      }
      
      setVehicleData(prev => {
        const updatedPlates = prev[type].plates.filter((_, i) => i !== indexToRemove);
        
        // ถ้าไม่เหลือทะเบียนเลย ให้เพิ่มช่องว่างหนึ่งช่องและยกเลิกการเลือกประเภทรถ
        if (updatedPlates.length === 0) {
          return {
            ...prev,
            [type]: { 
              has: false, 
              plates: [{ plate: '', id: null }] 
            }
          };
        }
        
        return {
          ...prev,
          [type]: { ...prev[type], plates: updatedPlates }
        };
      });
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // เตรียมข้อมูลยานพาหนะ - ส่งทั้งรถที่มีและรถที่จะลบ
      const vehicles = [];
      const vehiclesToDelete = []; // รถที่ต้องลบ

      // ประมวลผลรถยนต์
      if (vehicleData.car.has) {
        vehicleData.car.plates
          .filter(p => p.plate && p.plate.trim())
          .forEach(p => {
            vehicles.push({
              vehicle_type: 'car',
              license_plate: p.plate.trim(),
              ...(p.id && { tenant_vehicle_id: p.id })
            });
          });
      } else {
        // ถ้าไม่เลือกรถยนต์ แต่เดิมมีรถยนต์ -> ต้องลบ
        if (initialTenantData.vehicles) {
          const existingCars = initialTenantData.vehicles.filter(v => v.vehicle_type === 'car');
          vehiclesToDelete.push(...existingCars.map(c => c.tenant_vehicle_id).filter(id => id));
        }
      }

      // ประมวลผลมอเตอร์ไซค์
      if (vehicleData.motorcycle.has) {
        vehicleData.motorcycle.plates
          .filter(p => p.plate && p.plate.trim())
          .forEach(p => {
            vehicles.push({
              vehicle_type: 'motorcycle',
              license_plate: p.plate.trim(),
              ...(p.id && { tenant_vehicle_id: p.id })
            });
          });
      } else {
        // ถ้าไม่เลือกมอเตอร์ไซค์ แต่เดิมมีมอเตอร์ไซค์ -> ต้องลบ
        if (initialTenantData.vehicles) {
          const existingMotorcycles = initialTenantData.vehicles.filter(v => v.vehicle_type === 'motorcycle');
          vehiclesToDelete.push(...existingMotorcycles.map(m => m.tenant_vehicle_id).filter(id => id));
        }
      }

      // เพิ่มรถที่ถูกลบด้วยการกดกากบาท
      vehiclesToDelete.push(...deletedVehicleIds);

      const updatedData = {
        first_name: tenantData.firstName,
        last_name: tenantData.lastName,
        phone_number: tenantData.phone,
        email: tenantData.email,
        id_card_number: tenantData.idNumber,
        address: tenantData.address,
        province: tenantData.province,
        district: tenantData.district,
        subdistrict: tenantData.subdistrict,
        note: notes,
        emergency_contact: {
          first_name: emergencyContact.firstName,
          last_name: emergencyContact.lastName,
          relationship: emergencyContact.relationship,
          phone_number: emergencyContact.phone,
          emergency_contacts_id: emergencyContact.emergency_contacts_id
        },
        vehicles: vehicles,
        vehicles_to_delete: vehiclesToDelete.filter(id => id) // ลบ undefined/null ออก
      };

      console.log('🚗 Frontend sending data:', {
        tenant_id: initialTenantData.tenant_id,
        vehicles,
        vehicles_to_delete: vehiclesToDelete.filter(id => id),
        deletedVehicleIds
      });
      
      console.log('🔍 API URL:', `http://localhost:3001/api/tenants/${initialTenantData.tenant_id}`);

      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:3001/api/tenants/${initialTenantData.tenant_id}`, updatedData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('บันทึกข้อมูลสำเร็จ!');
      setTimeout(() => {
        onSave(updatedData);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error updating tenant:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white rounded-md shadow-xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaUser className="text-blue-600 text-xl" />
              <div>
                <h2 className="text-xl font-semibold text-gray-800">แก้ไขข้อมูลผู้เช่า</h2>
                <p className="text-sm text-gray-500">
                  {tenantData.firstName} {tenantData.lastName}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <FaTimes /> ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <FaSave /> {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1 - ข้อมูลส่วนตัว */}
            <div className="lg:col-span-1">
              <section className="bg-gray-50 border border-gray-200 p-4 rounded-md">
                <div className="border-b border-gray-200 pb-3 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FaUser className="text-blue-600" />
                    ข้อมูลส่วนตัว
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {/* ชื่อจริง */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อจริง <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={tenantData.firstName}
                      onChange={(e) => handleTenantChange('firstName', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="กรุณากรอกชื่อจริง"
                    />
                  </div>

                  {/* นามสกุล */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      นามสกุล
                    </label>
                    <input
                      type="text"
                      value={tenantData.lastName}
                      onChange={(e) => handleTenantChange('lastName', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="กรุณากรอกนามสกุล"
                    />
                  </div>

                  {/* อีเมล */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      อีเมล
                    </label>
                    <input
                      type="email"
                      value={tenantData.email}
                      onChange={(e) => handleTenantChange('email', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="example@email.com"
                    />
                  </div>

                  {/* เบอร์ติดต่อ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เบอร์ติดต่อ <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaPhone className="text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        value={tenantData.phone}
                        onChange={(e) => handleTenantChange('phone', e.target.value)}
                        className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0xx-xxx-xxxx"
                      />
                    </div>
                  </div>

                  {/* เลขบัตรประชาชน */}  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เลขบัตรประชาชน/เลขที่พาสปอร์ต
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaIdCard className="text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={tenantData.idNumber}
                        onChange={(e) => handleTenantChange('idNumber', e.target.value)}
                        className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="1-2345-67890-12-3"
                      />
                    </div>
                  </div>

                  {/* ที่อยู่ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ที่อยู่
                    </label>
                    <div className="relative">
                      <div className="absolute top-3 left-3 pointer-events-none">
                        <FaMapMarkerAlt className="text-gray-400" />
                      </div>
                      <textarea
                        rows="3"
                        value={tenantData.address}
                        onChange={(e) => handleTenantChange('address', e.target.value)}
                        className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="บ้านเลขที่ ซอย ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                      />
                    </div>
                  </div>

                  {/* จังหวัด อำเภอ ตำบล */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">จังหวัด</label>
                      <select
                        value={tenantData.province}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleTenantChange('province', value);
                          handleTenantChange('district', '');
                          handleTenantChange('subdistrict', '');
                        }}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">อำเภอ</label>
                      <select
                        value={tenantData.district}
                        onChange={(e) => {
                          const value = e.target.value;
                          handleTenantChange('district', value);
                          handleTenantChange('subdistrict', '');
                        }}
                        disabled={!tenantData.province}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">ตำบล</label>
                      <select
                        value={tenantData.subdistrict}
                        onChange={(e) => handleTenantChange('subdistrict', e.target.value)}
                        disabled={!tenantData.district}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
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
              </section>
            </div>

            {/* Column 2 - ข้อมูลรถ */}
            <div className="lg:col-span-1">
              <section className="bg-gray-50 border border-gray-200 p-4 rounded-md">
                <div className="border-b border-gray-200 pb-3 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FaCar className="text-green-600" />
                    ข้อมูลรถ
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {/* เลือกประเภทรถ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      ประเภทรถที่มี
                    </label>
                    <div className="flex gap-6">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={vehicleData.car.has} 
                          onChange={() => handleVehicleToggle('car')}
                          className="form-checkbox h-4 w-4 text-blue-600 rounded-md focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="text-sm text-gray-700">🚗 รถยนต์</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={vehicleData.motorcycle.has} 
                          onChange={() => handleVehicleToggle('motorcycle')}
                          className="form-checkbox h-4 w-4 text-blue-600 rounded-md focus:ring-blue-500 focus:ring-2"
                        />
                        <span className="text-sm text-gray-700">🏍️ มอเตอร์ไซค์</span>
                      </label>
                    </div>
                  </div>

                  {/* ฟอร์มทะเบียนรถ */}
                  {['car', 'motorcycle'].map(type => (
                    vehicleData[type].has && (
                      <div key={type} className="bg-white rounded-md p-4 border border-gray-200">
                        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                          {type === 'car' ? '🚗' : '🏍️'} 
                          ทะเบียน{type === 'car' ? 'รถยนต์' : 'มอเตอร์ไซค์'}
                        </h4>
                        
                        <div className="space-y-3">
                          {vehicleData[type].plates.map((p, index) => (
                            <div key={index} className="flex gap-2 items-center">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={p.plate}
                                  onChange={(e) => handlePlateChange(type, index, e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder={`ทะเบียน${type === 'car' ? 'รถยนต์' : 'มอเตอร์ไซค์'} คันที่ ${index + 1} (เช่น กข 1234 กรุงเทพฯ)`}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removePlate(type, index)}
                                className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors"
                                title="ลบทะเบียนนี้"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          ))}
                          
                          <button
                            type="button"
                            onClick={() => addPlate(type)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1 hover:underline"
                          >
                            + เพิ่มทะเบียน{type === 'car' ? 'รถยนต์' : 'มอเตอร์ไซค์'}
                          </button>
                        </div>
                      </div>
                    )
                  ))}

                  {!vehicleData.car.has && !vehicleData.motorcycle.has && (
                    <div className="text-center py-8 text-gray-500">
                      <FaCar className="mx-auto text-3xl text-gray-300 mb-2" />
                      <p className="text-sm">ยังไม่ได้เลือกประเภทรถ</p>
                      <p className="text-xs text-gray-400 mt-1">เลือกช่องด้านบนเพื่อเพิ่มข้อมูลรถ</p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Column 3 - บุคคลติดต่อฉุกเฉินและหมายเหตุ */}
            <div className="lg:col-span-1 space-y-6">
              {/* บุคคลติดต่อฉุกเฉิน */}
              <section className="bg-gray-50 border border-gray-200 p-4 rounded-md">
                <div className="border-b border-gray-200 pb-3 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FaUserFriends className="text-red-600" />
                    บุคคลติดต่อฉุกเฉิน
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {/* ชื่อบุคคลติดต่อฉุกเฉิน */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อจริง
                    </label>
                    <input
                      type="text"
                      value={emergencyContact.firstName}
                      onChange={(e) => handleEmergencyChange('firstName', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="ชื่อจริง"
                    />
                  </div>

                  {/* นามสกุล */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      นามสกุล
                    </label>
                    <input
                      type="text"
                      value={emergencyContact.lastName}
                      onChange={(e) => handleEmergencyChange('lastName', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="นามสกุล"
                    />
                  </div>

                  {/* ความสัมพันธ์ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ความสัมพันธ์
                    </label>
                    <input
                      type="text"
                      value={emergencyContact.relationship}
                      onChange={(e) => handleEmergencyChange('relationship', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="ระบุความสัมพันธ์ เช่น พ่อ, แม่, เพื่อน ฯลฯ"
                    />
                  </div>

                  {/* เบอร์ติดต่อฉุกเฉิน */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เบอร์ติดต่อ
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaPhone className="text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        value={emergencyContact.phone}
                        onChange={(e) => handleEmergencyChange('phone', e.target.value)}
                        className="w-full border border-gray-300 rounded-md pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0xx-xxx-xxxx"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* หมายเหตุ */}
              <section className="bg-gray-50 border border-gray-200 p-4 rounded-md">
                <div className="border-b border-gray-200 pb-3 mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    หมายเหตุ
                  </h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    หมายเหตุเพิ่มเติม
                  </label>
                  <textarea
                    rows="4"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="หมายเหตุเพิ่มเติม เช่น ลักษณะพิเศษ, การติดต่อ, ข้อมูลสำคัญอื่นๆ..."
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default EditTenantPopup;
