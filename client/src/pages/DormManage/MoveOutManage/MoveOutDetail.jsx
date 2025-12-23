// pages/MoveOutDetail.jsx
import React, { useState, useEffect } from 'react';
import { FaPrint, FaTrash, FaPlus, FaEdit, FaEye, FaFileInvoice, FaFileAlt, FaUser, FaCar, FaPhone, FaIdCard, FaEnvelope, FaCalendarAlt, FaMoneyBillWave, FaCog, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { GoDotFill } from "react-icons/go";
import axios from 'axios';
import API_URL from '../../../config/api';

function MoveOutDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dormId, receiptNumber } = useParams();
  
  // State สำหรับข้อมูลที่ดึงจาก API
  const [moveOutData, setMoveOutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ดึงข้อมูลจาก API
  useEffect(() => {
    const fetchMoveOutDetail = async () => {
      try {
        setLoading(true);
        // ใช้ contract ID แทน receiptNumber เพื่อดึงข้อมูล terminated contract
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/contracts/${receiptNumber}/terminated`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data) {
          setMoveOutData(response.data);
        } else {
          setError('ไม่สามารถดึงข้อมูลได้');
        }
      } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูล:', error);
        setError('เกิดข้อผิดพลาดในการดึงข้อมูล');
      } finally {
        setLoading(false);
      }
    };

    if (dormId && receiptNumber) {
      fetchMoveOutDetail();
    }
  }, [dormId, receiptNumber]);

  // Helper functions
  const formatThaiDate = (dateString) => {
    if (!dateString) return 'ไม่ระบุ';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateStayDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 'ไม่สามารถคำนวณได้';
    
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const months = Math.floor(daysDiff / 30);
    const remainingDays = daysDiff % 30;
    
    if (months > 0) {
      return remainingDays > 0 ? `${months} เดือน ${remainingDays} วัน` : `${months} เดือน`;
    } else {
      return `${daysDiff} วัน`;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white shadow rounded-md p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white shadow rounded-md p-12 text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => navigate(`/moveout/completed/${dormId}`)}
            className="mt-4 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md"
          >
            กลับไปหน้าประวัติการย้ายออก
          </button>
        </div>
      </div>
    );
  }

  // ถ้าไม่มีข้อมูล
  if (!moveOutData) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white shadow rounded-md p-12 text-center">
          <p className="text-gray-600">ไม่พบข้อมูลที่ต้องการ</p>
          <button 
            onClick={() => navigate(`/moveout/completed/${dormId}`)}
            className="mt-4 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md"
          >
            กลับไปหน้าประวัติการย้ายออก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white shadow rounded-md p-6 mb-4 border border-gray-300">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(`/moveout/completed/${dormId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            >
              <FaArrowLeft />
              กลับไปหน้าประวัติการย้ายออก
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-800">
                รายละเอียดการย้ายออก - ห้อง {moveOutData?.room?.number || 'ไม่ระบุ'}
              </h1>
            </div>
          </div>
          {/* สถานะย้ายออกแล้ว */}
          <div className="flex items-center gap-1 bg-red-100 text-red-800 px-4 py-2 rounded-md">
            <GoDotFill size={20}/>
            <span className="font-semibold">ย้ายออกแล้ว</span>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Column 1 - ข้อมูลสัญญาและมิเตอร์ */}
        <div className="space-y-4">
          
          {/* รายละเอียดสัญญา */}
          <section className="bg-white shadow rounded-md p-6 border border-gray-300">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaFileAlt className="text-blue-600" />
              ข้อมูลสัญญาและการเงิน
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">วันที่เข้าพัก:</span>
                <span className="font-medium text-blue-600">{formatThaiDate(moveOutData?.contract?.checkInDate)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">วันที่ย้ายออก:</span>
                <span className="font-medium text-red-600">{formatThaiDate(moveOutData?.contract?.checkOutDate)}</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">ค่าเช่ารายเดือน:</span>
                <span className="font-medium text-green-600">{moveOutData?.contract?.monthlyRent?.toLocaleString() || '0'} บาท</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">เงินประกัน:</span>
                <span className="font-medium text-orange-600">{moveOutData?.contract?.deposit?.toLocaleString() || '0'} บาท</span>
              </div>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">เงินล่วงหน้า:</span>
                <span className="font-medium text-purple-600">{moveOutData?.contract?.advance?.toLocaleString() || '0'} บาท</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">ระยะเวลาเช่า:</span>
                <span className="font-medium text-blue-600">
                  {calculateStayDuration(moveOutData?.contract?.checkInDate, moveOutData?.contract?.checkOutDate)}
                </span>
              </div>
            </div>
            
            {/* เลขมิเตอร์ */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-4">ข้อมูลมิเตอร์</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* มิเตอร์น้ำ */}
                <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    💧 มิเตอร์น้ำ
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>เข้าพัก:</span>
                      <div className="font-bold text-blue-800">{moveOutData?.meters?.water?.start?.toLocaleString() || '0'}</div>
                    </div>
                    <div className="flex justify-between">
                      <span>ย้ายออก:</span>
                      <div className="font-bold text-blue-800">{moveOutData?.meters?.water?.end?.toLocaleString() || '0'}</div>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-300">
                      <span className="font-semibold">ใช้ไป:</span>
                      <div className="font-bold text-blue-900">{moveOutData?.meters?.water?.usage?.toLocaleString() || '0'} หน่วย</div>
                    </div>
                  </div>
                </div>

                {/* มิเตอร์ไฟ */}
                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                  <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                    ⚡ มิเตอร์ไฟ
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>เข้าพัก:</span>
                      <div className="font-bold text-yellow-800">{moveOutData?.meters?.electric?.start?.toLocaleString() || '0'}</div>
                    </div>
                    <div className="flex justify-between">
                      <span>ย้ายออก:</span>
                      <div className="font-bold text-yellow-800">{moveOutData?.meters?.electric?.end?.toLocaleString() || '0'}</div>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-yellow-300">
                      <span className="font-semibold">ใช้ไป:</span>
                      <div className="font-bold text-yellow-900">{moveOutData?.meters?.electric?.usage?.toLocaleString() || '0'} หน่วย</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className="bg-white shadow rounded-md p-6 border border-gray-300">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaFileInvoice className="text-blue-600" />
              ใบเสร็จการย้ายออก
            </h2>
            
            <div>
              <button
                onClick={() => {
                  
                  // ตรวจสอบข้อมูลที่จำเป็น
                  if (!moveOutData || !moveOutData.room || !moveOutData.tenant) {
                    alert('ข้อมูลไม่ครบถ้วน กรุณาลองใหม่อีกครั้ง');
                    return;
                  }
                  
                  // ส่งข้อมูลใบเสร็จไปใน state และ URL parameter เพื่อให้ MoveOutReceipt แสดงใบเสร็จที่ถูกต้อง
                  // ใช้ move_out_receipt_id (PK) แทน receiptNumber หรือใช้ receiptNumber แทนถ้าไม่มี move_out_receipt_id
                  const moveOutReceiptId = moveOutData.move_out_receipt_id || receiptNumber;
                  
                  console.log('📄 Navigating to MoveOutReceipt with:', {
                    moveOutReceiptId,
                    roomNumber: moveOutData.room.number,
                    moveOutData
                  });
                  
                  navigate(`/dorm/${dormId}/room/${moveOutData.room.number}/move-out-receipt/${moveOutReceiptId}`, {
                    state: {
                      moveOutData: moveOutData,
                      receiptNumber: receiptNumber,
                      moveOutReceiptId: moveOutReceiptId,
                      fromDetail: true
                    }
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors shadow-lg"
              >
                <FaPrint />
                พิมพ์หรือดาวน์โหลดใบเสร็จ
              </button>
            </div>
          </section>
        </div>

        {/* Column 2 - ข้อมูลผู้เช่า */}
        <div className="space-y-4">
          
          {/* ข้อมูลผู้เช่า */}
          <section className="bg-white shadow rounded-md p-6 border border-gray-300">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaUser className="text-green-600" />
              ข้อมูลผู้เช่า
            </h2>
            
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-md p-6 border border-green-200">
              
              {/* ผู้เช่าหลัก */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-green-200">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    <FaUser />
                  </div>
                  <div>
                    <div className="font-bold text-lg text-gray-800">
                      {moveOutData?.tenant?.fullName || 'ไม่ระบุ'} 
                    </div>
                    <div className="text-sm text-gray-600">ผู้เช่าหลัก</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3">
                    <FaPhone className="text-blue-500" />
                    <div>
                      <div className="text-xs text-gray-500">เบอร์โทร</div>
                      <span>{moveOutData?.tenant?.phone || 'ไม่ระบุ'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <FaIdCard className="text-purple-500" />
                    <div>
                      <div className="text-xs text-gray-500">เลขบัตรประชาชน</div>
                      <span>{moveOutData?.tenant?.idNumber || 'ไม่ระบุ'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <FaEnvelope className="text-red-500" />
                    <div>
                      <div className="text-xs text-gray-500">อีเมล</div>
                      <span>{moveOutData?.tenant?.email || 'ไม่ระบุ'}</span>
                    </div>
                  </div>
                </div>

                {/* ข้อมูลผู้ติดต่อฉุกเฉิน */}
                <div className="mt-4 pt-4 border-t border-green-200">
                  <h4 className="font-semibold text-gray-700 mb-2">ผู้ติดต่อฉุกเฉิน</h4>
                  <p className="text-sm font-medium text-gray-800">
                    {moveOutData?.tenant?.emergencyContact?.name || 'ไม่ระบุ'} ({moveOutData?.tenant?.emergencyContact?.relationship || 'ไม่ระบุ'})
                  </p>
                  <p className="text-sm text-gray-600">{moveOutData?.tenant?.emergencyContact?.phone || 'ไม่ระบุ'}</p>
                </div>

                {/* ข้อมูลยานพาหนะ */}
                <div className="mt-4 pt-4 border-t border-green-200">
                  <h4 className="font-semibold text-gray-700 mb-3">ยานพาหนะ</h4>
                  <div className="space-y-3">
                    
                    {/* แสดงรถยนต์ */}
                    <div className="flex items-center gap-2">
                      <FaCar className="text-blue-600" />
                      <span className="text-sm font-medium">รถยนต์:</span>
                      <span className="text-sm">
                        {moveOutData?.tenant?.vehicleData?.car?.has && moveOutData?.tenant?.vehicleData?.car?.plates?.length > 0
                          ? `${moveOutData?.tenant?.vehicleData?.car?.plates?.length || 0} คัน`
                          : 'ไม่มี'
                        }
                      </span>
                    </div>
                    
                    {moveOutData?.tenant?.vehicleData?.car?.has && moveOutData?.tenant?.vehicleData?.car?.plates?.length > 0 && (
            <div className="text-sm text-gray-600 ml-6">
              {moveOutData?.tenant?.vehicleData?.car?.plates?.join(', ') || 'ไม่มี'}
            </div>
          )}

          {/* แสดงมอเตอร์ไซค์ */}
          <div className="flex items-center gap-2">
            <FaCar className="text-red-600" />
            <span className="text-sm font-medium">มอเตอร์ไซค์:</span>
            <span className="text-sm">
              {moveOutData?.tenant?.vehicleData?.motorcycle?.has && moveOutData?.tenant?.vehicleData?.motorcycle?.plates?.length > 0
                ? `${moveOutData?.tenant?.vehicleData?.motorcycle?.plates?.length || 0} คัน`
                : 'ไม่มี'
              }
            </span>
          </div>
          {moveOutData?.tenant?.vehicleData?.motorcycle?.has && moveOutData?.tenant?.vehicleData?.motorcycle?.plates?.length > 0 && (
            <div className="text-sm text-gray-600 ml-6">
              {moveOutData?.tenant?.vehicleData?.motorcycle?.plates?.join(', ') || 'ไม่มี'}
            </div>
          )}
        </div>
      </div>

      {/* หมายเหตุ */}
      {moveOutData?.termination?.notes && (
        <div className="mt-4 pt-4 border-t border-green-200">
          <h4 className="font-semibold text-gray-700 mb-2">หมายเหตุ</h4>
          <p className="text-sm text-gray-700">{moveOutData?.termination?.notes}</p>
        </div>
      )}
    </div>
  </div>
  </section>

  {/* ข้อมูลเพิ่มเติม */}
  <section className="bg-white shadow rounded-md p-6 border border-gray-300">
    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
      <FaCalendarAlt className="text-purple-600" />
      ข้อมูลเพิ่มเติม
    </h2>
    <div className="space-y-3">
      <div className="flex justify-between items-center py-2 border-b border-gray-100">
        <span className="text-gray-600">สถานะ:</span>
        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
          <FaCheckCircle />
          {moveOutData?.termination?.status || 'ไม่ระบุ'}
        </span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-gray-100">
        <span className="text-gray-600">ประเภทห้อง:</span>
        <span className="font-medium text-gray-800">{moveOutData?.room?.type || 'ไม่ระบุ'}</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-gray-100">
        <span className="text-gray-600">วันที่บันทึก:</span>
        <span className="font-medium text-gray-800">{formatThaiDate(moveOutData?.termination?.createdAt)}</span>
      </div>
    </div>
  </section>

  </div>
  </div>
  </div>
);
}

export default MoveOutDetail;
