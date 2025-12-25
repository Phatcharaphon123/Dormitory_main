import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { TbCalendarDollar } from "react-icons/tb";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FaEdit, FaBuilding, FaMapMarkerAlt, FaSave,FaMoneyBillWave } from "react-icons/fa";
import { BsBuildingFillAdd } from "react-icons/bs";
import provinces from "../../../../assets/data/api_province.json";
import amphures from "../../../../assets/data/api_amphure.json";
import tambons from "../../../../assets/data/thai_tambons.json";
import { toast, ToastContainer } from 'react-toastify';
import API_URL from "../../../../config/api";
import 'react-toastify/dist/ReactToastify.css';

// ตั้งค่า icon สำหรับ leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Component สำหรับจัดกึ่งกลางแผนที่
function MapAutoPan({ position }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position]);
  return null;
}

// Component สำหรับ Marker ที่ลากได้
function DraggableMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const newPosition = e.target.getLatLng();
          setPosition(newPosition);
        },
      }}
    />
  );
}

function AddDormInfo() {
  const navigate = useNavigate();
  const [position, setPosition] = useState({ lat: 13.736717, lng: 100.523186 });

  // State สำหรับฟอร์มหอพัก
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    floorCount: "1", // เริ่มต้นด้วย 1 ชั้น
    paymentDueDay: "", // วันสุดท้ายของการชำระเงิน
    lateFeePerDay: "0", // ค่าปรับรายวัน เริ่มต้นด้วย 0
    autoApplyLateFee: false, // ให้ระบบคิดค่าปรับอัตโนมัติ
  });

  // State สำหรับแผนที่และที่อยู่
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [subDistrict, setSubDistrict] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [districtOptions, setDistrictOptions] = useState([]);
  const [subDistrictOptions, setSubDistrictOptions] = useState([]);
  const [searchLat, setSearchLat] = useState("");
  const [searchLng, setSearchLng] = useState("");

  // อัปเดตค่า search lat/lng เมื่อ position เปลี่ยน
  useEffect(() => {
    setSearchLat(position.lat.toString());
    setSearchLng(position.lng.toString());
  }, [position]);

  // จัดการตัวเลือกอำเภอตามจังหวัด
  useEffect(() => {
    const provId = provinces.find((p) => p.name_th === province)?.id;
    if (provId) {
      const amphuresList = amphures.filter((a) => a.province_id === provId);
      setDistrictOptions(amphuresList.map((a) => a.name_th));
      setDistrict("");
      setSubDistrict("");
      setSubDistrictOptions([]);
    }
  }, [province]);

  // จัดการตัวเลือกตำบลตามอำเภอ
  useEffect(() => {
    const provId = provinces.find((p) => p.name_th === province)?.id;
    const amphureId = amphures.find((a) => a.name_th === district && a.province_id === provId)?.id;
    if (amphureId) {
      const tambonsList = tambons.filter((t) => t.amphure_id === amphureId);
      setSubDistrictOptions(tambonsList.map((t) => t.name_th));
      setSubDistrict("");
    }
  }, [district, province]);

  // ค้นหาตำแหน่งจาก API เมื่อเลือกจังหวัด/อำเภอ/ตำบล
  useEffect(() => {
    const fetchGeoLocation = async () => {
      const fullQuery = `${subDistrict || ""} ${district || ""} ${province || ""}`.trim();
      if (fullQuery) {
        const apiKey = import.meta.env.VITE_GEOAPIFY_KEY;
        const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
          fullQuery
        )}&lang=th&apiKey=${apiKey}`;

        try {
          const res = await axios.get(url);
          const data = res.data;
          if (data.features && data.features.length > 0) {
            const { lat, lon } = data.features[0].properties;
            setPosition({ lat, lng: lon });
          }
        } catch (error) {
          console.error("Geoapify API Error:", error);
        }
      }
    };

    fetchGeoLocation();
  }, [province, district, subDistrict]);

  // ฟังก์ชันค้นหาตำแหน่งด้วยละติจูด/ลองจิจูด
  const handleSearchLocation = () => {
    if (searchLat && searchLng) {
      const newPosition = { lat: parseFloat(searchLat), lng: parseFloat(searchLng) };
      setPosition(newPosition);
    }
  };


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ตรวจสอบข้อมูลที่จำเป็น
    const errors = [];
    
    if (!formData.name.trim()) {
      errors.push("กรุณากรอกชื่อหอพัก");
    }
    
    if (!detailAddress.trim()) {
      errors.push("กรุณากรอกที่อยู่โดยละเอียด");
    }
    
    if (!province) {
      errors.push("กรุณาเลือกจังหวัด");
    }
    
    if (!district) {
      errors.push("กรุณาเลือกอำเภอ");
    }
    
    if (!subDistrict) {
      errors.push("กรุณาเลือกตำบล");
    }
    
    if (!position.lat || !position.lng || position.lat === 0 || position.lng === 0) {
      errors.push("กรุณาเลือกตำแหน่งบนแผนที่");
    }
    
    // ตรวจสอบจำนวนชั้น
    const floorCount = Number(formData.floorCount) || 0;
    if (floorCount <= 0) {
      errors.push("กรุณากรอกจำนวนชั้นที่ถูกต้อง");
    }
    
    // ตรวจสอบจำนวนห้องในแต่ละชั้น
    let hasRooms = false;
    for (let i = 1; i <= floorCount; i++) {
      const roomCount = Number(formData[`roomsFloor${i}`]) || 0;
      if (roomCount > 0) {
        hasRooms = true;
        break;
      }
    }
    
    if (!hasRooms) {
      errors.push("กรุณากรอกจำนวนห้องในแต่ละชั้น");
    }
    
    // แสดงข้อผิดพลาดหากมี
    if (errors.length > 0) {
      toast.error("กรุณาตรวจสอบข้อมูล:\n" + errors.join("\n"));
      return;
    }

    const data = new FormData();
    data.append("name", formData.name.trim());
    data.append("phone", formData.phone || "");
    data.append("email", formData.email || "");

    const imageFile = document.querySelector('input[name="coverImage"]').files[0];
    if (imageFile) {
      data.append("image", imageFile);
    }

    // พิกัดจากแผนที่
    data.append("latitude", parseFloat(position.lat));
    data.append("longitude", parseFloat(position.lng));

    // ที่อยู่
    data.append("address", detailAddress.trim());
    data.append("province", province);
    data.append("district", district);
    data.append("subdistrict", subDistrict);

    // จำนวนชั้น - แปลงเป็นตัวเลขหรือใช้ค่าเริ่มต้น
    data.append("floors", floorCount);

    // ข้อมูลชั้นและจำนวนห้องแต่ละชั้น (สำหรับตาราง dormitory_floors)
    const floorsData = [];
    let totalRooms = 0;
    
    for (let i = 1; i <= floorCount; i++) {
      const roomCount = Number(formData[`roomsFloor${i}`]) || 0;
      floorsData.push({
        floor_number: i,
        room_count: roomCount
      });
      totalRooms += roomCount;
    }
    
    // ส่งข้อมูลชั้นเป็น JSON
    data.append("floors_data", JSON.stringify(floorsData));
    data.append("total_rooms", totalRooms);

    // ข้อมูลการชำระเงิน - แปลงค่าว่างเป็น null หรือค่าเริ่มต้น
    const paymentDueDay = formData.paymentDueDay ? parseInt(formData.paymentDueDay) : null;
    const lateFeePerDay = formData.lateFeePerDay ? parseFloat(formData.lateFeePerDay) : 0;
    
    data.append("payment_due_day", paymentDueDay);
    data.append("late_fee_per_day", lateFeePerDay);
    data.append("auto_apply_late_fee", formData.autoApplyLateFee || false);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/dormitories`, data, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200 || response.status === 201) {
        const result = response.data;
        toast.success("เพิ่มหอพักสำเร็จ ✅");
        console.log("Response:", result);
        
        // Redirect กลับไปหน้า YouDorm หลังจาก toast แสดงเสร็จ
        setTimeout(() => {
          navigate("/youdorm");
        }, 1500);
      } else {
        console.error("Error response:", response.data);
        toast.error("เกิดข้อผิดพลาด ❌: " + (response.data?.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Full error:", err);
      if (err.response && err.response.data) {
        console.error("Error response data:", err.response.data);
        const errorMessage = err.response.data.error || err.response.data.message || "Unknown error";
        toast.error("เกิดข้อผิดพลาด ❌: " + errorMessage);
      } else {
        toast.error("เชื่อมต่อ backend ไม่ได้ ❌");
      }
    }
  };


  return (
    <div className="p-6 px-[10%]">
      <h1 className="text-2xl font-bold text-blue-800 text-center mb-6 flex items-center justify-center gap-3">
        <span className="bg-blue-100 text-blue-600 rounded-full p-2">
          <BsBuildingFillAdd className="text-2xl" />
        </span>
        เพิ่มข้อมูลหอพัก
      </h1>
      <div className="bg-white rounded-md shadow-sm p-6 border border-gray-300">
      <h2 className="text-lg font-semibold mb-6 text-blue-700 ">กำหนดข้อมูลหอพัก</h2>

      <div className="grid grid-cols-2 gap-4 h-auto">
        {/* ฝั่งซ้าย: ฟอร์มกรอกข้อมูล */}
      <div className="flex flex-col gap-4">
        <div className="bg-white rounded-md p-4 space-y-4 border border-gray-300 h-fit">
          <h3 className="text-md font-semibold text-blue-700 mb-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <FaEdit className="text-blue-600" />
            </div>
            ข้อมูลพื้นฐาน
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">ชื่อหอพัก</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
              placeholder="เช่น หอพักรุ่งเรือง"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">เบอร์โทร</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              onInput={e => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
              className="w-full border rounded-md px-3 py-2"
              placeholder="เช่น 089425xxxx"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">อีเมลหอพัก (ใช้สำหรับส่งใบแจ้งหนี้ให้ผู้เช่า)</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full border rounded-md px-3 py-2"
              placeholder="เช่น dorm@example.com"
            />
          </div>
          {/* รูปหน้าปกหอพัก */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              รูปหน้าปกหอพัก <span className="text-gray-400 text-xs">(ไม่บังคับ)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              name="coverImage"
              className="w-full border rounded-md px-3 py-1 text-sm text-gray-700 file:bg-blue-50 file:border-none file:px-4 file:py-1.5 file:rounded-md file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          </div>
          {/* กล่องด้านล่าง: จำนวนชั้น และ จำนวนห้อง */}
          <div className="bg-white rounded-md p-4 border border-gray-300 h-fit">
            <h3 className="text-md font-semibold text-blue-700 mb-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FaMoneyBillWave className="text-blue-600" />
              </div>
              กำหนดวันชำระค่าห้องและค่าปรับ
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">วันสุดท้ายของการชำระเงิน</label>
              <select
                name="paymentDueDay"
                value={formData.paymentDueDay}
                onChange={handleChange}
                className="w-full border rounded-md px-3 py-2 bg-blue-50"
              >
                <option value="">-- เลือกวันที่ --</option>
                {[...Array(31)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    วันที่ {i + 1} ของทุกเดือน
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">ค่าปรับชำระล่าช้าต่อวัน</label>
              <div className="relative">
                <input
                  type="number"
                  name="lateFeePerDay"
                  value={formData.lateFeePerDay}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2 pr-20"
                  placeholder="100"
                  min="0"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                  บาท/วัน
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600">
                กรณีมีการชำระล่าช้ากว่าวันที่ระบุ ต้องการให้ระบบเพิ่มค่าปรับให้อัตโนมัติหรือไม่
              </p>
            </div>

            <div>
              <label className="flex items-center text-sm text-gray-700">
                <input
                  type="checkbox"
                  name="autoApplyLateFee"
                  checked={formData.autoApplyLateFee}
                  onChange={(e) => setFormData({ ...formData, autoApplyLateFee: e.target.checked })}
                  className="mr-2"
                />
                ต้องการให้เพิ่มค่าปรับอัตโนมัติ
              </label>
            </div>

          </div>
          {/* กล่องด้านล่าง: จำนวนชั้น และ จำนวนห้อง */}
          <div className="bg-white rounded-md p-4 border border-gray-300 h-fit">
            <h3 className="text-md font-semibold text-blue-700 mb-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FaBuilding className="text-blue-600" />
              </div>
              จำนวนชั้นและจำนวนห้อง
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-yellow-700">จำนวนชั้น *</label>
              <input
                type="number"
                name="floorCount"
                value={formData.floorCount || ""}
                onChange={handleChange}
                className="w-full border rounded-md px-3 py-2"
                placeholder="กรอกจำนวนชั้น"
                min={1}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-yellow-700 mb-2">
                จำนวนห้อง (หากไม่มีให้ใส่ 0) *
              </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[250px] overflow-y-auto pr-2">
                  {[...Array(Number(formData.floorCount || 0))].map((_, index) => (
                    <div key={index}>
                      <span className="text-sm text-gray-700">ชั้น {index + 1}</span>
                      <input
                        type="number"
                        name={`roomsFloor${index + 1}`}
                        value={formData[`roomsFloor${index + 1}`] || ""}
                        onChange={handleChange}
                        className="w-full border rounded-md px-3 py-2 mt-1"
                        min={0}
                      />
                    </div>
                  ))}
                </div>

            </div>
          </div>
        </div>

        {/* ฝั่งขวา: แผนที่ */}
        <div className="bg-white rounded-md overflow-hidden border border-gray-300 h-fit">
          <div className="bg-blue-600 text-white p-3">
            <h3 className="text-md font-semibold flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <FaMapMarkerAlt className="text-white" />
              </div>
              ตำแหน่งหอพัก
            </h3>
          </div>
          {/* เนื้อหาแผนที่ */}
          <div className="w-full h-full p-4">
            {/* กล่องกรอกที่อยู่โดยละเอียด */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่โดยละเอียด</label>
              <textarea
                rows="2"
                className="w-full border rounded-md px-2 py-1 text-sm"
                placeholder="เช่น 123/4 หมู่ 5 ซอยแสงจันทร์ ถนนประชาอุทิศ"
                value={detailAddress}
                onChange={(e) => setDetailAddress(e.target.value)}
              ></textarea>
            </div>

            {/* จังหวัด / อำเภอ / ตำบล */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">จังหวัด</label>
                <select
                  className="w-full border rounded-md px-2 py-1 text-sm"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
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
                  className="w-full border rounded-md px-2 py-1 text-sm"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  disabled={!province}
                >
                  <option value="">-- เลือกอำเภอ --</option>
                  {districtOptions.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ตำบล</label>
                <select
                  className="w-full border rounded-md px-2 py-1 text-sm"
                  value={subDistrict}
                  onChange={(e) => setSubDistrict(e.target.value)}
                  disabled={!district}
                >
                  <option value="">-- เลือกตำบล --</option>
                  {subDistrictOptions.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* การค้นหาด้วยละติจูดและลองจิจูด */}
            <div className="mt-4 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">ค้นหาตำแหน่งโดยละติจูด/ลองจิจูด</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ละติจูด"
                  className="w-full border rounded-md px-2 py-1 text-sm"
                  value={searchLat}
                  onChange={(e) => setSearchLat(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="ลองจิจูด"
                  className="w-full border rounded-md px-2 py-1 text-sm"
                  value={searchLng}
                  onChange={(e) => setSearchLng(e.target.value)}
                />
                <button
                  onClick={handleSearchLocation}
                  className="bg-blue-500 text-white rounded-md px-3 py-1 text-sm"
                >
                  ค้นหา
                </button>
              </div>
            </div>

            {/* แผนที่ */}
            <div className="h-[350px] w-full rounded-md border overflow-hidden">
              <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <DraggableMarker position={position} setPosition={setPosition} />
                <MapAutoPan position={position} />
              </MapContainer>
            </div>
          </div>
          
          {/* แสดงพิกัดปัจจุบัน */}
          <div className="p-3 bg-gray-50 border-t">
            <p className="text-sm text-gray-600 mb-1">พิกัดปัจจุบัน:</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium text-gray-700">ละติจูด:</span>
                <span className="text-blue-600 ml-1">{position.lat.toFixed(6)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">ลองจิจูด:</span>
                <span className="text-blue-600 ml-1">{position.lng.toFixed(6)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* ปุ่มบันทึก */}
      <div className="mt-6 text-center">
        <button
          onClick={handleSubmit}
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-3 mx-auto"
        >
          <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
            <FaSave className="text-white text-sm" />
          </div>
          บันทึกข้อมูลหอพัก
        </button>
      </div>
    </div>

    {/* Toast Container */}
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
    />
  </div>
  );
}

export default AddDormInfo;
