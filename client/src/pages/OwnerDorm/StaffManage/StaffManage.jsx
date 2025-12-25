import React from "react";
import { FaPlus, FaEdit, FaTrash, FaUserTie, FaSearch, FaBuilding } from "react-icons/fa";


const StaffManage = () => {
  // mock data
  const dorms = [
    { dormId: 1, dormName: "หอพัก A" },
    { dormId: 2, dormName: "หอพัก B" },
  ];
  const staffs = [
    { userId: 1, username: "admin1", email: "admin1@email.com", phone: "0812345678", dormName: "หอพัก A", role: "ADMIN", enabled: true },
    { userId: 2, username: "admin2", email: "admin2@email.com", phone: "0898765432", dormName: "หอพัก B", role: "ADMIN", enabled: false },
  ];
  const currentItems = staffs;
  const showModal = false;
  const modalMode = "add";
  const currentStaff = {};
  const confirmPassword = "";
  
  // mock state variables
  const searchTerm = "";
  const selectedDormFilter = "all";
  const setSearchTerm = () => {};
  const setSelectedDormFilter = () => {};

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              จัดการพนักงาน
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              บริหารจัดการบัญชีผู้ดูแล (Admin) ประจำหอพักต่างๆ
            </p>
          </div>
          <button
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 font-medium"
            type="button"
          >
            <FaPlus /> เพิ่มพนักงาน
          </button>
        </div>

        {/* Filters Card */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-1/3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="ค้นหาชื่อ หรือ อีเมล..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Dorm Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-sm text-gray-600 whitespace-nowrap">
              <FaBuilding className="inline mb-1" /> กรองตามหอพัก:
            </span>
            <select
              className="block w-full md:w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-lg"
              value={selectedDormFilter}
              onChange={(e) => setSelectedDormFilter(e.target.value)}
            >
              <option value="all">ทั้งหมดทุกหอพัก</option>
              {dorms.map((dorm) => (
                <option key={dorm.dormId} value={dorm.dormId}>
                  {dorm.dormName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Staff Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    ชื่อพนักงาน
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    ข้อมูลติดต่อ
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    ประจำหอพัก
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    สถานะ
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    จัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      ไม่พบข้อมูลพนักงาน
                    </td>
                  </tr>
                ) : (
                  currentItems.map((staff) => (
                    <tr
                      key={staff.userId}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="shrink-0 h-10 w-10 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-xl">
                            <FaUserTie />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {staff.username}
                            </div>
                            <div className="text-xs text-gray-500">
                              Role: {staff.role}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {staff.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          {staff.phone || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                          {staff.dormName || "ไม่ระบุ"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {staff.enabled ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-indigo-600 hover:text-indigo-900 mr-4 bg-indigo-50 p-2 rounded-lg hover:bg-indigo-100 transition-colors"
                          type="button"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition-colors"
                          type="button"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Section - Removed for mockup */}
        </div>
      </div>

      {/* --- Modal (Add/Edit) --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-lg relative">
            <div className="p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Modal Content (Mockup)
              </h3>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManage;
