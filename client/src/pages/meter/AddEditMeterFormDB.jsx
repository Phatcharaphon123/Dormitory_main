import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaSave, FaBolt, FaTint, FaTimes, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API_URL from '../../config/api';

function AddEditMeterForm({ room, meterType, onClose, onSave, onDelete }) {
  const [formData, setFormData] = useState({
    roomId: room?.roomId || '',
    roomNumber: room?.roomNumber || '',
    type: meterType || 'electric',
    meterCode: '',
    installationDate: new Date().toISOString().split('T')[0], // วันที่ปัจจุบัน
    installationTime: new Date().toTimeString().split(' ')[0].substring(0, 5) // เวลาปัจจุบัน
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // เติมข้อมูลเดิมถ้าเป็นการแก้ไข
  useEffect(() => {
    if (room && meterType && room.meters[meterType].installed) {
      const meterData = room.meters[meterType];
      const installationDateTime = meterData.installationDate ? new Date(meterData.installationDate) : new Date();
      
      setFormData(prev => ({
        ...prev,
        meterCode: meterData.code || '',
        installationDate: installationDateTime.toISOString().split('T')[0],
        installationTime: installationDateTime.toTimeString().split(' ')[0].substring(0, 5)
      }));
    }
  }, [room, meterType]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // ล้าง error เมื่อผู้ใช้แก้ไข
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.meterCode.trim()) {
      newErrors.meterCode = 'กรุณากรอกรหัสมิเตอร์';
    }

    if (!formData.installationDate) {
      newErrors.installationDate = 'กรุณาเลือกวันที่ติดตั้ง';
    }

    if (!formData.installationTime) {
      newErrors.installationTime = 'กรุณาเลือกเวลาติดตั้ง';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ฟังก์ชันตรวจสอบรหัสมิเตอร์กับ InfluxDB
  const validateMeterCodeWithInflux = async (meterCode) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/influx/validate-measurement`, {
        measurement: meterCode
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return response.data.exists;
    } catch (error) {
      console.error('Error validating meter code with InfluxDB:', error);
      // ถ้า API ล้มเหลว ให้ผ่านการตรวจสอบไปก่อน (fail-safe)
      return true;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.warning('กรุณากรอกข้อมูลให้ครบถ้วน', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // ตรวจสอบรหัสมิเตอร์กับ InfluxDB ก่อนบันทึก
      const isValidMeterCode = await validateMeterCodeWithInflux(formData.meterCode);
      
      if (!isValidMeterCode) {
        toast.warning(`⚠️ ไม่พบรหัสมิเตอร์ "${formData.meterCode}" กรุณาตรวจสอบรหัสมิเตอร์ถูกต้อง`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        });
        setErrors(prev => ({
          ...prev,
          meterCode: 'ไม่พบรหัสมิเตอร์! กรุณาใส่รหัสมิเตอร์ที่ถูกต้อง'
        }));
        return;
      }

      await onSave(formData);
      toast.success(`✅ บันทึกข้อมูล${meterTypeText}เรียบร้อยแล้ว`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    } catch (error) {
      console.error('Error saving meter:', error);
      toast.error(`❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล${meterTypeText}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMeter = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);

    setIsSubmitting(true);
    try {
      const endpoint = formData.type === 'electric' ? 
        `${API_URL}/api/meters/electric/${formData.roomId}` : 
        `${API_URL}/api/meters/water/${formData.roomId}`;
      
      const token = localStorage.getItem('token');
      await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`✅ ${meterTypeText}ถูกลบเรียบร้อยแล้ว`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
      
      // เรียก callback เพื่อรีเฟรชข้อมูลและปิดฟอร์ม
      setTimeout(() => {
        if (onDelete) {
          onDelete();
        }
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error deleting meter:', error);
      toast.error('❌ เกิดข้อผิดพลาดในการลบมิเตอร์', {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditMode = room && meterType && room.meters[meterType].installed;
  const meterTypeText = formData.type === 'electric' ? 'ไฟฟ้า' : 'น้ำ';
  const meterTypeIcon = formData.type === 'electric' ? <FaBolt className="w-5 h-5" /> : <FaTint className="w-5 h-5" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-md shadow-sm border border-gray-300 p-6 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <FaArrowLeft className="w-4 h-4" />
                กลับ
              </button>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
                  formData.type === 'electric' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {meterTypeIcon}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    {isEditMode ? 'แก้ไข' : 'เพิ่ม'}มิเตอร์{meterTypeText}ดิจิตอล
                  </h1>
                  <p className="text-gray-600">ห้อง {formData.roomNumber}</p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-md shadow-sm border border-gray-300 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ข้อมูลพื้นฐาน */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  หมายเลขห้อง <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.roomNumber}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ประเภทมิเตอร์ <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="meterType"
                      value="electric"
                      checked={formData.type === 'electric'}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      disabled
                      className="mr-2"
                    />
                    <FaBolt className="w-4 h-4 text-yellow-500 mr-1" />
                    ไฟฟ้า
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="meterType"
                      value="water"
                      checked={formData.type === 'water'}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                      disabled
                      className="mr-2"
                    />
                    <FaTint className="w-4 h-4 text-blue-500 mr-1" />
                    น้ำ
                  </label>
                </div>
              </div>
            </div>

            {/* รหัสมิเตอร์ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                รหัสมิเตอร์ <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.meterCode}
                  onChange={(e) => handleInputChange('meterCode', e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.meterCode ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="กรอกรหัสมิเตอร์ที่ถูกต้อง"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!formData.meterCode.trim()) {
                      toast.warning('กรุณากรอกรหัสมิเตอร์ก่อน', {
                        position: "top-right",
                        autoClose: 3000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                      });
                      return;
                    }
                    
                    const isValid = await validateMeterCodeWithInflux(formData.meterCode);
                    if (isValid) {
                      toast.success('✅ รหัสมิเตอร์ถูกต้อง', {
                        position: "top-right",
                        autoClose: 3000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                      });
                      setErrors(prev => ({ ...prev, meterCode: '' }));
                    } else {
                      toast.error('❌ ไม่พบรหัสมิเตอร์กรุณาตรวจสอบรหัสมิเตอร์ที่กรอก', {
                        position: "top-right",
                        autoClose: 5000,
                        hideProgressBar: false,
                        closeOnClick: true,
                        pauseOnHover: true,
                      });
                      setErrors(prev => ({ ...prev, meterCode: 'รหัสมิเตอร์ไม่ถูกต้อง! กรุณาตรวจสอบอีกครั้ง' }));
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  ตรวจสอบ
                </button>
              </div>
              {errors.meterCode && (
                <p className="mt-1 text-sm text-red-600">{errors.meterCode}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                รหัสที่ใช้กับตัวมิเตอร์หรือเครื่องตัวจริง กดตรวจสอบก่อนบันทึก
              </p>

            </div>

            {/* วันที่และเวลาติดตั้ง */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  วันที่ติดตั้ง <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.installationDate}
                  onChange={(e) => handleInputChange('installationDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.installationDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.installationDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.installationDate}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เวลาติดตั้ง <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.installationTime}
                  onChange={(e) => handleInputChange('installationTime', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.installationTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.installationTime && (
                  <p className="mt-1 text-sm text-red-600">{errors.installationTime}</p>
                )}
              </div>
            </div>

            {/* ข้อมูลสรุป */}
            <div className="bg-gray-50 rounded-md p-4">
              <h3 className="text-lg font-medium text-gray-800 mb-3">ข้อมูลสรุป</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">ห้อง:</span>
                  <span className="ml-2 font-medium">{formData.roomNumber}</span>
                </div>
                <div>
                  <span className="text-gray-600">ประเภท:</span>
                  <span className="ml-2 font-medium">{meterTypeText}</span>
                </div>
                <div>
                  <span className="text-gray-600">วันที่ติดตั้ง:</span>
                  <span className="ml-2 font-medium">{formData.installationDate || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-600">เวลาติดตั้ง:</span>
                  <span className="ml-2 font-medium">{formData.installationTime || '-'} น.</span>
                </div>
                <div className="md:col-span-2">
                  <span className="text-gray-600">รหัสมิเตอร์:</span>
                  <span className="ml-2 font-medium">{formData.meterCode || '-'}</span>
                </div>
              </div>
            </div>

            {/* ปุ่มดำเนินการ */}
            <div className="flex justify-between pt-6 border-t border-gray-300">
              {/* ปุ่มลบ (แสดงเฉพาะในโหมดแก้ไข) */}
              <div>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={handleDeleteMeter}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <FaTrash className="w-4 h-4" />
                    ลบมิเตอร์
                  </button>
                )}
              </div>
              
              {/* ปุ่มยกเลิกและบันทึก */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2 text-white rounded-md transition-colors disabled:opacity-50 flex items-center gap-2 ${
                    formData.type === 'electric' 
                      ? 'bg-yellow-500 hover:bg-yellow-600' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      บันทึกการแก้ไข
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Popup */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-[10vh]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <FaTrash className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ยืนยันการลบมิเตอร์
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                คุณต้องการลบ{meterTypeText}ของห้อง {formData.roomNumber} หรือไม่?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังลบ...' : 'ลบ'}
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

export default AddEditMeterForm;
