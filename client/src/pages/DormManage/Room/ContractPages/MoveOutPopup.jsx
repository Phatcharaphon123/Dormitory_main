import React, { useState, useEffect } from 'react';
import { FaFileContract, FaCalendarAlt, FaSignOutAlt, FaEdit, FaTrash } from 'react-icons/fa';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function MoveOutPopup({ 
  isOpen, 
  onClose, 
  onSave, 
  contract
}) {
  const [contractStartDate, setContractStartDate] = useState('');
  const [contractEndDate, setContractEndDate] = useState('');
  const [moveOutDate, setMoveOutDate] = useState('');
  const { dormId } = useParams();
  const navigate = useNavigate();
  

  const handleTerminateContract = async () => {
    const roomNumber = contract?.room_number || contract?.roomNumber;
    navigate(`/cancel-contract/${dormId}/${roomNumber}`, { 
      state: { 
        dormId,
        roomNumber,
        contractData: contract 
      }
    });
  };

  useEffect(() => {
    if (contract) {
      // แปลงวันที่จาก database เป็นรูปแบบ YYYY-MM-DD สำหรับ input date
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        
        try {
          // ถ้าเป็น format YYYY-MM-DD อยู่แล้ว ให้ใช้เลย
          if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateString;
          }
          
          // แปลงเป็น Date object และใช้ local date เพื่อหลีกเลี่ยงปัญหา timezone
          const date = new Date(dateString);
          if (isNaN(date.getTime())) {
            console.warn('Invalid date:', dateString);
            return '';
          }
          
          // ใช้ local date แทน UTC เพื่อหลีกเลี่ยงปัญหา timezone
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          
          return `${year}-${month}-${day}`;
        } catch (error) {
          console.error('Error formatting date:', error, 'for dateString:', dateString);
          return '';
        }
      };

      setContractStartDate(formatDateForInput(contract.contract_start_date));
      setContractEndDate(formatDateForInput(contract.contract_end_date));
      setMoveOutDate(formatDateForInput(contract.moveout_notice_date));
    }
  }, [contract]);

  if (!isOpen) return null;

  const handleSave = () => {
    // ตรวจสอบว่าวันสิ้นสุดไม่ควรมาก่อนวันเริ่มต้น (เฉพาะเมื่อมีทั้ง 2 วันที่)
    if (contractStartDate && contractEndDate && new Date(contractEndDate) <= new Date(contractStartDate)) {
      toast.error('วันสิ้นสุดสัญญาต้องมาหลังวันเริ่มสัญญา');
      return;
    }

    const updatedContract = {
      contract_start_date: contractStartDate === '' ? null : contractStartDate,
      contract_end_date: contractEndDate === '' ? null : contractEndDate,
      moveout_notice_date: moveOutDate === '' ? null : moveOutDate
    };
    
    toast.success('บันทึกข้อมูลสัญญาสำเร็จ!');
    setTimeout(() => {
      onSave(updatedContract);
    }, 1500);
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-20 ">
      <div className="bg-white rounded-md shadow-2xl p-6 w-full max-w-lg mx-4 transform animate-fadeIn">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-md flex items-center justify-center mx-auto mb-4">
            <FaFileContract className="text-blue-600 text-2xl" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">แก้ไขข้อมูลสัญญา</h3>
          <p className="text-gray-600 text-sm">ปรับปรุงข้อมูลวันที่ในสัญญาเช่า</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ห้อง: <span className="text-blue-600 font-semibold">{contract?.room_number}</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaCalendarAlt className="inline mr-2 text-gray-500" />
              วันที่เริ่มสัญญา <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={contractStartDate}
              onChange={(e) => setContractStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaCalendarAlt className="inline mr-2 text-gray-500" />
              วันสิ้นสุดสัญญา <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={contractEndDate}
              onChange={(e) => setContractEndDate(e.target.value)}
              min={contractStartDate}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FaSignOutAlt className="inline mr-2 text-gray-500" />
              แจ้งย้ายออก
            </label>
            <input
              type="date"
              value={moveOutDate}
              onChange={(e) => setMoveOutDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              ระบุเฉพาะเมื่อผู้เช่าแจ้งความประสงค์ย้ายออก
            </p>
          </div>
          {/* ปุ่มยกเลิกสัญญา/ย้ายออก */}
          <button
            type="button"
            onClick={handleTerminateContract}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium text-base mt-4"
            style={{ transition: 'background 0.2s' }}
          >
            <FaTrash className="text-white text-lg" />
            ยกเลิกสัญญา / ย้ายออก
          </button>

        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
          >
            <FaEdit className="text-sm" />
            บันทึกการแก้ไข
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default MoveOutPopup;
