import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FaEdit, FaBuilding, FaMapMarkerAlt, FaSave, FaCloudUploadAlt, FaMoneyBillWave } from "react-icons/fa";
import { BsBuildingFillAdd } from "react-icons/bs";
import axios from "axios";
import Swal from "sweetalert2"; 
import MapContent from "./MapContent";
import API_URL from "../../../../config/api";

const AddDormInfo = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- State Form Data ---
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    floorCount: "8",
    paymentDueDay: "",
    lateFeePerDay: "",
    autoApplyLateFee: false,
  });

  // --- State Address (รับจาก MapContent) ---
  const [addressData, setAddressData] = useState({
    address: "",
    province: "",
    district: "",
    subdistrict: "",
    postcode: "",
    lat: null,
    lng: null,
  });

    const [previewImage, setPreviewImage] = useState(null);
    const [coverFileName, setCoverFileName] = useState("");

  // Handle Changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "floorCount") {
        const floorCountNum = Number(value) || 0;
        setFormData(prev => {
            const newForm = { ...prev, [name]: value };
            Object.keys(newForm).forEach(key => {
                if (key.startsWith("roomsFloor") && Number(key.replace("roomsFloor", "")) > floorCountNum) {
                    delete newForm[key];
                }
            });
            return newForm;
        });
    } else {
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const handleAddressChange = useCallback((data) => {
    setAddressData(prev => (JSON.stringify(prev) !== JSON.stringify(data) ? data : prev));
  }, []);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPreviewImage(null); // No preview
            setCoverFileName(file.name);
        } else {
            setPreviewImage(null);
            setCoverFileName("");
        }
    };

  // Submit Handler
  const handleSubmit = async () => {
    setIsSubmitting(true);
    const errors = [];
    if (!formData.name.trim()) errors.push("กรุณากรอกชื่อหอพัก");
    if (!addressData.address.trim()) errors.push("กรุณากรอกที่อยู่โดยละเอียด");
    if (!addressData.province) errors.push("กรุณาเลือกจังหวัด");
    if (!addressData.lat || !addressData.lng) errors.push("กรุณาเลือกตำแหน่งบนแผนที่");
    
    const floorCount = Number(formData.floorCount) || 0;
    if (floorCount <= 0) errors.push("กรุณากรอกจำนวนชั้นที่ถูกต้อง");
    
    let hasRooms = false;
    for (let i = 1; i <= floorCount; i++) {
        if ((Number(formData[`roomsFloor${i}`]) || 0) > 0) hasRooms = true;
    }
    if (!hasRooms) errors.push("กรุณากรอกจำนวนห้องอย่างน้อย 1 ชั้น");

    if (errors.length > 0) {
        Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', html: errors.join('<br/>') });
        setIsSubmitting(false);
        return;
    }

    const data = new FormData();
    data.append("name", formData.name.trim());
    data.append("phone", formData.phone || "");
    data.append("email", formData.email || "");
    const imageFile = document.querySelector('input[name="coverImage"]').files[0];
    if (imageFile) data.append("image", imageFile);

    data.append("latitude", parseFloat(addressData.lat));
    data.append("longitude", parseFloat(addressData.lng));
    data.append("address", addressData.address.trim());
    data.append("province", addressData.province);
    data.append("district", addressData.district);
    data.append("subdistrict", addressData.subdistrict);
    data.append("postcode", addressData.postcode);

    data.append("floors", floorCount);
    const floorsData = [];
    let totalRooms = 0;
    for (let i = 1; i <= floorCount; i++) {
        const roomCount = Number(formData[`roomsFloor${i}`]) || 0;
        floorsData.push({ floor_number: i, room_count: roomCount });
        totalRooms += roomCount;
    }
    data.append("floors_data", JSON.stringify(floorsData));
    data.append("total_rooms", totalRooms);

    data.append("payment_due_day", formData.paymentDueDay ? parseInt(formData.paymentDueDay) : "");
    data.append("late_fee_per_day", formData.lateFeePerDay ? parseFloat(formData.lateFeePerDay) : 0);
    data.append("auto_apply_late_fee", formData.autoApplyLateFee);

    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(`${API_URL}/api/dormitories`, data, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 200 || response.status === 201) {
            Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'เพิ่มข้อมูลหอพักเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false }).then(() => navigate("/youdorm"));
        }
    } catch (err) {
        const msg = err.response?.data?.error || err.response?.data?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ";
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: msg });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto mb-8 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600"><BsBuildingFillAdd size={24} /></div>
            <h1 className="text-3xl font-bold text-gray-800">เพิ่มข้อมูลหอพัก</h1>
        </div>
        <p className="mt-2 text-sm text-gray-500 sm:ml-14">กรุณากรอกข้อมูลหอพักของคุณให้ครบถ้วนเพื่อความถูกต้องในการบริหารจัดการ</p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Left Column: Basic Info & Payment */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center"><FaEdit className="text-blue-600 text-lg" /></div>
                    <h3 className="text-lg font-semibold text-gray-800">ข้อมูลพื้นฐาน</h3>
                </div>
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อหอพัก <span className="text-red-500">*</span></label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3 border transition" placeholder="ระบุชื่อหอพัก" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรติดต่อ <span className="text-red-500">*</span></label>
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} onInput={e => e.target.value = e.target.value.replace(/[^0-9]/g, '')} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3 border" placeholder="089xxxxxxx" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">อีเมลหอพัก</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3 border" placeholder="dorm@example.com" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">รูปหน้าปกหอพัก <span className="text-gray-400 text-xs ml-1">(ไม่บังคับ)</span></label>
                        <div className="relative group">
                            <div className={`h-40 border-2 border-dashed border-blue-200 rounded-xl hover:bg-blue-50/30 transition-all cursor-pointer bg-white flex flex-col items-center justify-center text-center overflow-hidden`}>
                                <div className="space-y-3 pointer-events-none p-4">
                                    <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center"><FaCloudUploadAlt size={24} /></div>
                                    <div><p className="text-sm font-bold text-blue-600">Click to Upload</p></div>
                                    {coverFileName && (
                                      <div className="mt-2 text-xs text-gray-700 break-all">ไฟล์ที่เลือก: <span className="font-semibold text-sm">{coverFileName}</span></div>
                                    )}
                                </div>
                                <input type="file" name="coverImage" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
                            </div>
                            {/* กากบาทถูกนำออกแล้ว */}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
                    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center"><FaMoneyBillWave className="text-green-600 text-lg" /></div>
                    <h3 className="text-lg font-semibold text-gray-800">ข้อมูลการชำระเงิน</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">วันสุดท้ายของการชำระเงิน</label>
                        <select name="paymentDueDay" value={formData.paymentDueDay} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-green-500 sm:text-sm py-2.5 px-3 border bg-white">
                            <option value="">-- เลือกวันที่ --</option>
                            {[...Array(31)].map((_, i) => <option key={i + 1} value={i + 1}>วันที่ {i + 1} ของทุกเดือน</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ค่าปรับชำระล่าช้า (บาท/วัน)</label>
                        <input type="number" name="lateFeePerDay" value={formData.lateFeePerDay} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-green-500 sm:text-sm py-2.5 px-3 border" placeholder="เช่น 50" min="0" />
                    </div>
                </div>
                <div className="mt-4 flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <input id="autoApplyLateFee" type="checkbox" name="autoApplyLateFee" checked={formData.autoApplyLateFee} onChange={handleChange} className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer" />
                    <label htmlFor="autoApplyLateFee" className="ml-3 block text-sm text-gray-700 cursor-pointer select-none">คำนวณและเพิ่มค่าปรับลงในบิลอัตโนมัติเมื่อเลยกำหนด</label>
                </div>
            </div>
        </div>

        {/* Right Column: Structure */}
        <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center"><FaBuilding className="text-indigo-600 text-lg" /></div>
                    <h3 className="text-lg font-semibold text-gray-800">โครงสร้างอาคาร</h3>
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนชั้นทั้งหมด <span className="text-red-500">*</span></label>
                    <input type="number" name="floorCount" value={formData.floorCount} onChange={handleChange} className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 sm:text-sm py-2.5 px-3 border" min={1} />
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">จำนวนห้องในแต่ละชั้น <span className="text-red-500">*</span></label>
                    <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px] scrollbar-thin scrollbar-thumb-gray-200">
                        {[...Array(Number(formData.floorCount || 0))].map((_, index) => (
                        <div key={index} className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <span className="text-xs font-semibold text-gray-500 w-12 text-center bg-white py-1 rounded shadow-sm border">ชั้น {index + 1}</span>
                            <input type="number" name={`roomsFloor${index + 1}`} value={formData[`roomsFloor${index + 1}`] || ""} onChange={handleChange} className="flex-1 border-gray-300 rounded-md shadow-sm focus:border-indigo-500 text-sm py-1.5 px-3 border bg-white" placeholder="จำนวนห้อง" min={0} />
                        </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-3 text-center">*ใส่ 0 หากเป็นชั้นลอยหรือดาดฟ้า</p>
                </div>
            </div>
        </div>
      </div>

      {/* Map Content (Full Width) */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-6">
            <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center"><FaMapMarkerAlt className="text-teal-600 text-lg" /></div>
            <h3 className="text-lg font-semibold text-gray-800">ตำแหน่งที่ตั้ง</h3>
        </div>
        <MapContent onAddressChange={handleAddressChange} />
      </div>

      {/* Footer Button */}
      <div className="max-w-7xl mx-auto flex justify-end pt-6 border-t border-gray-200">
        <button onClick={handleSubmit} disabled={isSubmitting} className={`flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-medium shadow-md transition-all duration-200 ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg active:scale-95"}`}>
            {isSubmitting ? "กำลังบันทึก..." : <><FaSave className="text-lg" /> บันทึกข้อมูลหอพัก</>}
        </button>
      </div>
    </div>
  );
};

export default AddDormInfo;