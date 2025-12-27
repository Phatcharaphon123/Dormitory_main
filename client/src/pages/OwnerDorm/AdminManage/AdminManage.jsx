import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaPlus, FaEdit, FaTrash, FaUserTie, FaSearch, FaBuilding } from "react-icons/fa";
import API_URL from "../../../config/api";
import Swal from "sweetalert2";

const AdminManage = () => {
  // --- 1. Mock Data (ข้อมูลสมมติของคุณ) ---
  const [dorms, setDorms] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลหอพัก
  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get(`${API_URL}/api/dormitories`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => setDorms(res.data))
      .catch(err => {
        console.error('Error fetching dorms:', err);
        setDorms([]);
      });
  }, []);

  // ดึงข้อมูล admin
  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/admin`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setAdmins(response.data);
    } catch (err) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูล admin:', err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
      }
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // --- 2. State สำหรับ Modal (เพิ่มมาใหม่) ---
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' หรือ 'edit'
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // State สำหรับเก็บข้อมูลใน Form
  const [currentAdmin, setCurrentAdmin] = useState({
    userId: null,
    username: "",
    email: "",
    password: "",
    phone: "",
    dormId: "",
    enabled: true,
  });

  // --- 3. Functions เปิด-ปิด Modal (เพิ่มมาใหม่) ---
  const openAddModal = () => {
    setModalMode("add");
    setCurrentAdmin({
      userId: null,
      username: "",
      email: "",
      password: "",
      phone: "",
      dormId: "",
      enabled: true,
    });
    setConfirmPassword("");
    setShowModal(true);
  };

  const openEditModal = (admin) => {
    setModalMode("edit");
    // map ข้อมูล admin เข้า state (password ไม่ต้องดึงมาแสดง)
    setCurrentAdmin({ 
        ...admin, 
        password: "" // password ว่างไว้
    });
    setConfirmPassword("");
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (modalMode === "add") {
      // เช็ค password confirmation
      if (currentAdmin.password !== confirmPassword) {
        Swal.fire({ icon: 'warning', title: 'รหัสผ่านไม่ตรงกัน', text: 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน' });
        return;
      }

      const payload = {
        username: currentAdmin.username,
        email: currentAdmin.email,
        password: currentAdmin.password,
        phone: currentAdmin.phone,
        dormId: currentAdmin.dormId
      };

      try {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/api/admin`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        Swal.fire({ icon: 'success', title: 'สร้าง Admin สำเร็จ', timer: 1200, showConfirmButton: false });
        setShowModal(false);
        fetchAdmins(); // รีเฟรชข้อมูล
      } catch (err) {
        console.error('Create admin error:', err);
        if (err.response && err.response.data && err.response.data.error) {
          Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.response.data.error });
        } else {
          Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' });
        }
      }
    } else {
      // Update mode
      const token = localStorage.getItem('token');
      const payload = {
        username: currentAdmin.username,
        email: currentAdmin.email,
        phone: currentAdmin.phone,
        dormId: currentAdmin.dormId,
        enabled: currentAdmin.enabled
      };

      try {
        await axios.put(`${API_URL}/api/admin/${currentAdmin.userId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Swal.fire({ icon: 'success', title: 'อัปเดต Admin สำเร็จ', timer: 1200, showConfirmButton: false });
        setShowModal(false);
        fetchAdmins(); // รีเฟรชข้อมูล
      } catch (err) {
        console.error('Update admin error:', err);
        if (err.response && err.response.data && err.response.data.error) {
          Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.response.data.error });
        } else {
          Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการอัปเดต Admin' });
        }
      }
    }
  };

  // ฟังก์ชันลบ admin
  const handleDelete = async (adminId) => {
    const result = await Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: 'ต้องการลบ Admin นี้หรือไม่? การลบนี้ไม่สามารถย้อนกลับได้',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก'
    });
    if (!result.isConfirmed) return;

    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/api/admin/${adminId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire({ icon: 'success', title: 'ลบ Admin สำเร็จ', timer: 1200, showConfirmButton: false });
      fetchAdmins(); // รีเฟรชข้อมูล
    } catch (err) {
      console.error('Delete admin error:', err);
      if (err.response && err.response.data && err.response.data.error) {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: err.response.data.error });
      } else {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'เกิดข้อผิดพลาดในการลบ Admin' });
      }
    }
  };

  // State สำหรับ UI อื่นๆ (เหมือนเดิม)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDormFilter, setSelectedDormFilter] = useState("all");
  
  // กรองและค้นหา admin
  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDorm = selectedDormFilter === "all" || 
                        (admin.working_dorms && admin.working_dorms.some(wd => wd.dorm_id == selectedDormFilter));
    
    return matchesSearch && matchesDorm;
  });
  
  const currentItems = filteredAdmins;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-4 font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              จัดการผู้ดูแลหอพัก
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              บริหารจัดการบัญชีผู้ดูแล (Admin) ประจำหอพักต่างๆ
            </p>
          </div>
          <button
            onClick={openAddModal} // ✅ ผูกปุ่มกดเปิด Modal เพิ่ม
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition-all active:scale-95 font-medium"
            type="button"
          >
            <FaPlus /> เพิ่มพนักงาน
          </button>
        </div>

        {/* Filters Card */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between">
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

          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-sm text-gray-600 whitespace-nowrap">
              <FaBuilding className="inline mb-1" /> กรองตามหอพัก:
            </span>
            <select
              className="block w-full md:w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-lg"
              value={selectedDormFilter}
              onChange={(e) => setSelectedDormFilter(e.target.value)}
            >
              <option value="all" key="filter-all">ทั้งหมดทุกหอพัก</option>
              {dorms.map((dorm) => (
                <option key={`filter-${dorm.dorm_id || dorm.dormId}`} value={dorm.dorm_id || dorm.dormId}>
                  {dorm.name || dorm.dormName}
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
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อพนักงาน</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ข้อมูลติดต่อ</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ประจำหอพัก</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">สถานะ</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จัดการ</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500">กำลังโหลดข้อมูล...</td></tr>
                ) : currentItems.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500">ไม่พบข้อมูลพนักงาน</td></tr>
                ) : (
                  currentItems.map((staff) => {
                    const dormName = staff.working_dorms?.[0]?.dorm?.name || "ไม่ระบุ";
                    return (
                      <tr key={staff.user_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="shrink-0 h-10 w-10 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center text-xl">
                              <FaUserTie />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{staff.username}</div>
                              <div className="text-xs text-gray-500">Role: {staff.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{staff.email}</div>
                          <div className="text-sm text-gray-500">{staff.phone || "-"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            {dormName}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {staff.is_active ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Inactive</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditModal({
                              userId: staff.user_id,
                              username: staff.username,
                              email: staff.email,
                              phone: staff.phone,
                              dormId: staff.working_dorms?.[0]?.dorm_id || "",
                              enabled: staff.is_active,
                              role: staff.role
                            })}
                            className="text-indigo-600 hover:text-indigo-900 mr-4 bg-indigo-50 p-2 rounded-lg hover:bg-indigo-100 transition-colors"
                            type="button"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(staff.user_id)}
                            className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition-colors"
                            type="button"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* --- 4. Modal Section (เอามาวางตรงนี้) --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-lg relative animate-fade-in-up">
            <form onSubmit={handleSave}>
              <div className="p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {modalMode === "add" ? "เพิ่มพนักงานใหม่" : "แก้ไขข้อมูลพนักงาน"}
                </h3>
                
                <div className="space-y-4">
                  {/* เลือกหอพัก */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ประจำหอพัก <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm border p-2"
                      value={currentAdmin.dormId}
                      onChange={(e) => setCurrentAdmin({ ...currentAdmin, dormId: e.target.value })}
                      required
                    >
                      <option value="" key="modal-placeholder">-- เลือกหอพัก --</option>
                      {dorms.map((dorm) => (
                        <option key={`modal-${dorm.dorm_id || dorm.dormId}`} value={dorm.dorm_id || dorm.dormId}>
                          {dorm.name || dorm.dormName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อผู้ใช้ (Username) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm border p-2"
                      value={currentAdmin.username}
                      onChange={(e) => setCurrentAdmin({ ...currentAdmin, username: e.target.value })}
                      required
                    />
                  </div>

                  {/* Password (แสดงเฉพาะตอนเพิ่ม หรือจะแก้รหัส) */}
                  {modalMode === "add" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          รหัสผ่าน <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm border p-2"
                          value={currentAdmin.password}
                          onChange={(e) => setCurrentAdmin({ ...currentAdmin, password: e.target.value })}
                          required={modalMode === "add"}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm border p-2"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required={modalMode === "add"}
                        />
                      </div>
                    </>
                  )}

                  {/* Toggle เปิด-ปิดใช้งาน (เฉพาะโหมดแก้ไข) */}
                  {modalMode === "edit" && (
                    <div className="flex items-center gap-2">
                      <input
                        id="enabled"
                        type="checkbox"
                        checked={currentAdmin.enabled}
                        onChange={(e) => setCurrentAdmin({ ...currentAdmin, enabled: e.target.checked })}
                        className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                      />
                      <label htmlFor="enabled" className="text-sm text-gray-700 select-none">
                        เปิดใช้งานบัญชีนี้
                      </label>
                      {!currentAdmin.enabled && (
                        <span className="ml-2 text-xs text-red-500">(บัญชีนี้ถูกปิดการใช้งาน)</span>
                      )}
                    </div>
                  )}

                  {/* Email & Phone */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        อีเมล <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm border p-2"
                        value={currentAdmin.email}
                        onChange={(e) => setCurrentAdmin({ ...currentAdmin, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        เบอร์โทรศัพท์
                      </label>
                      <input
                        type="text"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm border p-2"
                        value={currentAdmin.phone}
                        onChange={(e) => setCurrentAdmin({ ...currentAdmin, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-lg">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-teal-600 text-base font-medium text-white hover:bg-teal-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                >
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)} // ปุ่มยกเลิก ปิด Modal
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminManage;