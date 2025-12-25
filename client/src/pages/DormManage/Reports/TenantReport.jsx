import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Pagination from "../../../components/common/Pagination";
import { FaUsers } from "react-icons/fa";
import ExcelExportButton from "../../../components/common/ExcelExportButton";
import axios from 'axios';
import API_URL from "../../../config/api";

function TenantReport() {
  const [tenantData, setTenantData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [summary, setSummary] = useState({
    totalTenants: 0,
    activeTenants: 0,
    terminatedTenants: 0,
    expiringSoon: 0
  });
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, terminated, expiring
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { dormId } = useParams();

  useEffect(() => {
    fetchTenantData();
  }, [dormId]);

  // ฟังก์ชันกรองข้อมูลตามสถานะและคำค้นหา
  useEffect(() => {
    let filtered = tenantData;
    
    // กรองตามสถานะ
    if (filterStatus !== 'all') {
      filtered = filtered.filter(tenant => tenant.status === filterStatus);
    }

    // กรองตามคำค้นหา
    if (searchTerm) {
      filtered = filtered.filter(tenant => 
        (tenant.first_name && tenant.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tenant.last_name && tenant.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tenant.phone_number && tenant.phone_number.includes(searchTerm)) ||
        (tenant.email && tenant.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tenant.room_number && tenant.room_number.includes(searchTerm))
      );
    }

    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [tenantData, filterStatus, searchTerm]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTenants = filteredData.slice(startIndex, endIndex);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const fetchTenantData = async () => {
    try {
      // ดึงข้อมูลสัญญาและผู้เช่า
      const contractsRes = await axios.get(`${API_URL}/api/contracts/dormitories/${dormId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const contractsData = contractsRes.data;

      // ดึงข้อมูลส่วนตัวของผู้เช่าแต่ละคน
      const uniqueTenantIds = [...new Set(contractsData.map(c => c.tenant_id))];
      const tenantPersonalDataMap = {};
      
      for (const tenantId of uniqueTenantIds) {
        try {
          const tenantRes = await axios.get(`${API_URL}/api/tenants/${tenantId}/full`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`
            }
          });
          const tenantData = tenantRes.data;
          tenantPersonalDataMap[tenantId] = tenantData;
        } catch (err) {
          console.warn(`❌ ไม่สามารถดึงข้อมูลส่วนตัวของผู้เช่า ${tenantId}:`, err.message);
          tenantPersonalDataMap[tenantId] = {};
        }
      }

      // ประมวลผลข้อมูลผู้เช่า
      const processedData = contractsData.map(contract => {
        let contractEndDate = null;
        let daysUntilExpiry = null;
        
        if (contract.contract_end_date) {
          contractEndDate = new Date(contract.contract_end_date);
          const today = new Date();
          daysUntilExpiry = Math.ceil((contractEndDate - today) / (1000 * 60 * 60 * 24));
        }
        
        let status = 'active';
        if (contract.status === 'terminated') {
          status = 'terminated';
        } else if (daysUntilExpiry !== null) {
          if (daysUntilExpiry <= 0) {
            status = 'expired';
          } else if (daysUntilExpiry <= 30) {
            status = 'expiring';
          }
        }

        // รวมข้อมูลส่วนตัว
        const personalData = tenantPersonalDataMap[contract.tenant_id] || {};
        const fullAddress = [
          personalData.address,
          personalData.subdistrict,
          personalData.district,
          personalData.province
        ].filter(part => part && part !== '').join(' ');

        return {
          ...contract,
          room_number: contract.room_number || 'N/A',
          floor_number: contract.floor_number || 'N/A',
          days_until_expiry: daysUntilExpiry,
          status: status,
          contract_duration: contractEndDate && contract.contract_start_date ? 
            Math.ceil((contractEndDate - new Date(contract.contract_start_date)) / (1000 * 60 * 60 * 24)) : null,
          age: contract.date_of_birth ? 
            Math.floor((new Date() - new Date(contract.date_of_birth)) / (1000 * 60 * 60 * 24 * 365.25)) : null,
          // เพิ่มข้อมูลส่วนตัว
          id_card_number: personalData.id_card_number || null,
          address: fullAddress || null,
          note: personalData.note || null
        };
      });

      setTenantData(processedData);

      // คำนวณสรุป
      const totalTenants = processedData.length;
      const activeTenants = processedData.filter(t => t.status === 'active').length;
      const terminatedTenants = processedData.filter(t => t.status === 'terminated').length;
      const expiringSoon = processedData.filter(t => t.status === 'expiring').length;

      setSummary({
        totalTenants,
        activeTenants,
        terminatedTenants,
        expiringSoon
      });

    } catch (error) {
      console.error('Error fetching tenant data:', error);
    }
  };

  // เตรียมข้อมูลสำหรับ Export Excel
  const exportData = filteredData.map(tenant => {
    
    return {
      room: tenant.room_number || '-',
      fullName: `${tenant.first_name} ${tenant.last_name}`,
      idCard: tenant.id_card_number || '-',
      address: tenant.address || '-',
      phone: tenant.phone_number,
      email: tenant.email || '-',
      contractStart: tenant.contract_start_date ? 
        new Date(tenant.contract_start_date).toLocaleDateString('th-TH') : '-',
      contractEnd: tenant.contract_end_date ? 
        new Date(tenant.contract_end_date).toLocaleDateString('th-TH') : '-',
      contractDuration: tenant.contract_duration || '-',
      daysLeft: tenant.status === 'terminated' ? '-' : 
                (tenant.days_until_expiry !== null ? tenant.days_until_expiry : '-'),
      status: tenant.status === 'active' ? 'เช่าอยู่' : 
               tenant.status === 'expiring' ? 'ใกล้หมดอายุ' :
               tenant.status === 'expired' ? 'หมดอายุ' : 'เลิกเช่า',
      monthlyRent: tenant.monthly_rent || '-',
      deposit: tenant.deposit_monthly || '-'
    };
  });

  // กำหนดคอลัมน์สำหรับ Excel
  const excelColumns = {
    room: 'ห้อง',
    fullName: 'ชื่อ-นามสกุล',
    idCard: 'เลขบัตรประชาชน',
    address: 'ที่อยู่',
    phone: 'เบอร์โทร',
    email: 'อีเมล',
    contractStart: 'วันที่เริ่มสัญญา',
    contractEnd: 'วันที่สิ้นสุดสัญญา',
    contractDuration: 'ระยะเวลาสัญญา (วัน)',
    daysLeft: 'วันที่เหลือ',
    status: 'สถานะ',
    monthlyRent: 'ค่าเช่า/เดือน',
    deposit: 'เงินประกัน'
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expiring': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'terminated': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'เช่าอยู่';
      case 'expiring': return 'ใกล้หมดอายุ';
      case 'expired': return 'หมดอายุ';
      case 'terminated': return 'เลิกเช่า';
      default: return 'ไม่ระบุ';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-md shadow-sm p-4 mb-4 border border-gray-300">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h1 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
                <FaUsers className="text-gray-700 text-3xl" />
                รายงานผู้เช่า
              </h1>
              <p className="text-gray-600 mt-1">
                รายงานสรุปข้อมูลผู้เช่าและสถานะการเช่า {(() => {
                  if (filterStatus === 'all') {
                    return "ทั้งหมด";
                  } else if (filterStatus === 'active') {
                    return "ผู้เช่าปัจจุบัน";
                  } else if (filterStatus === 'terminated') {
                    return "ผู้เช่าที่ยกเลิกสัญญา";
                  } else if (filterStatus === 'expiring') {
                    return "สัญญาใกล้หมดอายุ";
                  }
                  return "ทั้งหมด";
                })()}
              </p>
            </div>
            <ExcelExportButton
              data={exportData}
              columns={excelColumns}
              fileName="รายงานผู้เช่า"
              sheetName="รายงานผู้เช่า"
              buttonText="ส่งออก Excel"
              className=""
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-11 border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="active">เช่าอยู่</option>
                  <option value="terminated">เลิกเช่า</option>
                  <option value="expiring">ใกล้หมดอายุ</option>
                  <option value="expired">หมดอายุ</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">แสดง</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className=" h-11 border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value={5}>5 รายการ</option>
                  <option value={10}>10 รายการ</option>
                  <option value={20}>20 รายการ</option>
                  <option value={50}>50 รายการ</option>
                  <option value={100}>100 รายการ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ชื่อ, เบอร์โทร, หรือห้อง"
                className="w-full h-11 px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <div className="text-blue-600 text-sm font-medium">ผู้เช่าทั้งหมด</div>
              <div className="text-2xl font-bold text-blue-800">{summary.totalTenants}</div>
              <div className="text-xs text-blue-600">แสดง {filteredData.length} รายการ</div>
            </div>
            <div className="bg-green-50 p-4 rounded-md border border-green-200">
              <div className="text-green-600 text-sm font-medium">เช่าอยู่</div>
              <div className="text-2xl font-bold text-green-800">{summary.activeTenants}</div>
            </div>
            <div className="bg-red-50 p-4 rounded-md border border-red-200">
              <div className="text-red-600 text-sm font-medium">เลิกเช่า</div>
              <div className="text-2xl font-bold text-red-800">{summary.terminatedTenants}</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
              <div className="text-yellow-600 text-sm font-medium">ใกล้หมดอายุ</div>
              <div className="text-2xl font-bold text-yellow-800">{summary.expiringSoon}</div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-md shadow-sm overflow-hidden border border-gray-300">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-700">รายละเอียดผู้เช่า</h3>
            <div className="text-sm text-gray-700">
              แสดง <span className="font-medium">{startIndex + 1}</span>-<span className="font-medium">{Math.min(startIndex + itemsPerPage, filteredData.length)}</span> จาก <span className="font-medium">{filteredData.length}</span> รายการ
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ห้อง</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ผู้เช่า</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">เบอร์โทร</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">อีเมล</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่เริ่มสัญญา</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่สิ้นสุด</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">วันที่เหลือ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentTenants.map((tenant, index) => (
                  <tr key={tenant.contract_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-600">
                        ห้อง {tenant.room_number}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-600">
                        {tenant.first_name} {tenant.last_name}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tenant.phone_number}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tenant.email || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(tenant.contract_start_date).toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {tenant.contract_end_date ? 
                        new Date(tenant.contract_end_date).toLocaleDateString('th-TH') : 
                        '-'
                      }
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      <span className={`${
                        tenant.status === 'terminated' ? 'text-gray-500' :
                        tenant.days_until_expiry <= 0 ? 'text-red-600' :
                        tenant.days_until_expiry <= 30 ? 'text-yellow-600' :
                        'text-green-600'
                      } font-medium`}>
                        {tenant.status === 'terminated' ? '-' :
                         !tenant.contract_end_date ? '-' :
                         tenant.days_until_expiry <= 0 ? 
                          `เกิน ${Math.abs(tenant.days_until_expiry)} วัน` :
                          `${tenant.days_until_expiry} วัน`
                        }
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tenant.status)}`}>
                        {getStatusText(tenant.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              ไม่พบข้อมูลผู้เช่า
            </div>
          )}

          {/* Pagination */}
          <div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredData.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
              startIndex={startIndex}
              endIndex={endIndex}
            />
          </div>
        </div>

        {/* Contract Duration and Status Analysis */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Contract Duration Distribution */}
          <div className="bg-white rounded-md shadow-sm p-6 border border-gray-300">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">การกระจายระยะเวลาสัญญา</h3>
            <div className="space-y-3">
              {[
                { range: '1-6 เดือน', count: tenantData.filter(t => t.contract_duration && t.contract_duration <= 180).length },
                { range: '7-12 เดือน', count: tenantData.filter(t => t.contract_duration && t.contract_duration > 180 && t.contract_duration <= 365).length },
                { range: '13-24 เดือน', count: tenantData.filter(t => t.contract_duration && t.contract_duration > 365 && t.contract_duration <= 730).length },
                { range: '25+ เดือน', count: tenantData.filter(t => t.contract_duration && t.contract_duration > 730).length },
                { range: 'ไม่ระบุ', count: tenantData.filter(t => !t.contract_duration).length }
              ].map(item => (
                <div key={item.range} className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">{item.range}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.count} สัญญา</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ 
                          width: `${tenantData.length > 0 ? (item.count / tenantData.length) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {tenantData.length > 0 ? Math.round((item.count / tenantData.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expiry Status Analysis */}
          <div className="bg-white rounded-md shadow-sm p-6 border border-gray-300">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">การวิเคราะห์สถานะสัญญา</h3>
            <div className="space-y-3">
              {[
                { 
                  status: 'ใกล้หมดอายุ (30 วัน)', 
                  count: tenantData.filter(t => t.status === 'expiring').length,
                  color: 'text-yellow-600',
                  bgColor: 'bg-yellow-100'
                },
                { 
                  status: 'หมดอายุแล้ว', 
                  count: tenantData.filter(t => t.status === 'expired').length,
                  color: 'text-red-600',
                  bgColor: 'bg-red-100'
                },
                { 
                  status: 'เลิกเช่าแล้ว', 
                  count: tenantData.filter(t => t.status === 'terminated').length,
                  color: 'text-gray-600',
                  bgColor: 'bg-gray-100'
                },
                { 
                  status: 'ยังใช้งานอยู่', 
                  count: tenantData.filter(t => t.status === 'active').length,
                  color: 'text-green-600',
                  bgColor: 'bg-green-100'
                }
              ].map(item => (
                <div key={item.status} className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">{item.status}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${item.color} px-2 py-1 rounded-full text-xs ${item.bgColor}`}>
                      {item.count} คน
                    </span>
                    <span className="text-xs text-gray-500">
                      {tenantData.length > 0 ? Math.round((item.count / tenantData.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Average days until expiry for active contracts */}
            {tenantData.filter(t => t.status === 'active' && t.days_until_expiry).length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">วันเฉลี่ยที่เหลือ (สัญญาที่ใช้งาน)</span>
                  <span className="font-medium text-blue-600">
                    {Math.round(
                      tenantData.filter(t => t.status === 'active' && t.days_until_expiry)
                        .reduce((sum, t) => sum + t.days_until_expiry, 0) / 
                      tenantData.filter(t => t.status === 'active' && t.days_until_expiry).length
                    )} วัน
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TenantReport;
