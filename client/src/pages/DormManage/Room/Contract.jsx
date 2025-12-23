import React, { useState, useEffect } from 'react';
import { FaPhone, FaUser, FaSearch, FaCalendarAlt, FaIdCard, FaEdit, FaSignOutAlt, FaFileContract, FaPlus } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../../../config/api';

function Contract() {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { dormId, roomNumber } = useParams();

  useEffect(() => {
    
    if (dormId && roomNumber) {
      fetchContract();
    } else {
      console.warn('⚠️ Missing parameters:', { dormId, roomNumber });
    }
  }, [dormId, roomNumber]);

  const fetchContract = async () => {
    if (!dormId || !roomNumber) {
      console.error('❌ Missing required parameters:', { dormId, roomNumber });
      setError('ไม่พบข้อมูล dormId หรือ roomNumber');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/contracts/dormitories/${dormId}/rooms/${roomNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContract(response.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 404) {
        // ห้องไม่มีสัญญา active - เป็นพฤติกรรมปกติ
        setContract(null);
        setError(null);
      } else {
        setError('เกิดข้อผิดพลาดในการดึงข้อมูล');
        console.error('Error fetching contract:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoContractDetail = () => {
    if (contract && contract.contract_id) {
      navigate(`/dorm/${dormId}/contracts/${contract.contract_id}/detail`);
    } else {
      console.log('Contract or contract_id missing:', { contract, contract_id: contract?.contract_id });
      alert('ไม่พบ contract id หรือข้อมูลผู้เช่า');
    }
  };

  const handleCreateContract = () => {
    navigate(`/dorm/${dormId}/room/${roomNumber}/monthly-contract`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">กำลังโหลด...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-2 border-red-300 rounded-md p-8 shadow-sm bg-red-50">
        <div className="text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-600 mb-2">เกิดข้อผิดพลาด</h3>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button 
            onClick={fetchContract}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-md p-8 shadow-sm bg-gray-50">
        <div className="text-center">
          <FaUser className="mx-auto text-gray-400 text-4xl mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">ยังไม่มีผู้เช่า</h3>
          <p className="text-sm text-gray-500 mb-4">ห้องนี้ยังไม่มีผู้เช่าในขณะนี้</p>
          <button 
            onClick={handleCreateContract}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2 mx-auto"
          >
            <FaPlus />
            สร้างสัญญาใหม่
          </button>
        </div>
      </div>
    );
  }

  // Format date function
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <FaFileContract className="text-white text-xl" />
          <h3 className="text-xl font-bold text-white">ข้อมูลผู้เช่า - ห้อง {roomNumber}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* ข้อมูลผู้เช่า */}
          <div className="flex-1">
            <div className="flex items-start gap-4">
              {/* รูปโปรไฟล์ */}
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <FaUser className="text-white text-2xl" />
              </div>
              
              {/* ข้อมูลหลัก */}
              <div className="flex-1">
                <h4 className="text-xl font-bold text-gray-800 mb-1">
                  {contract.first_name} {contract.last_name}
                </h4>
                
                {/* ข้อมูลติดต่อ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <FaPhone className="text-blue-600" />
                    <span className="text-gray-600">เบอร์โทร:</span>
                    <span className="font-medium text-blue-600">{contract.phone_number}</span>
                  </div>
                  {contract.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <FaIdCard className="text-green-600" />
                      <span className="text-gray-600">อีเมล:</span>
                      <span className="font-medium">{contract.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <FaCalendarAlt className="text-purple-600" />
                    <span className="text-gray-600">เริ่มสัญญา:</span>
                    <span className="font-medium">{formatDate(contract.contract_start_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FaCalendarAlt className="text-orange-600" />
                    <span className="text-gray-600">สิ้นสุดสัญญา:</span>
                    <span className="font-medium text-orange-600">
                      {formatDate(contract.contract_end_date)}
                    </span>
                  </div>
                   <div className="flex items-center gap-2 text-sm">
                    <FaCalendarAlt className="text-orange-600" />
                    <span className="text-gray-600">แจ้งย้ายออก:</span>
                    <span className="font-medium text-orange-600">
                      {formatDate(contract.moveout_notice_date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ปุ่มจัดการ */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-fit">
            <button 
              onClick={handleGoContractDetail}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-md transition-all duration-200 hover:shadow-lg"
            >
              <FaSearch className="text-sm" />
              <span className="whitespace-nowrap">ดูข้อมูลผู้เช่า</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contract;
