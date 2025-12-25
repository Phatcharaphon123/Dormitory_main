import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { FaRegImage } from "react-icons/fa6";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import { FaMoneyBillWave } from "react-icons/fa";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FaEdit, FaMapMarkerAlt, FaSave } from "react-icons/fa";
import provinces from "../../../assets/data/api_province.json";
import amphures from "../../../assets/data/api_amphure.json";
import tambons from "../../../assets/data/thai_tambons.json";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API_URL from "../../../config/api";

// ตั้งค่า icon สำหรับ leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
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
function DraggableMarker({ position, setPosition, setIsPositionManuallySet }) {
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
          setIsPositionManuallySet(true);
        },
      }}
    />
  );
}

function SettingDormInfo() {
  const [position, setPosition] = useState({ lat: 13.736717, lng: 100.523186 });
  const [isPositionManuallySet, setIsPositionManuallySet] = useState(false);
  const [hasUserChangedLocationDropdown, setHasUserChangedLocationDropdown] =
    useState(false);
  const { dormId } = useParams();

  // 🟦 ย้ายขึ้นมาก่อน
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [subDistrict, setSubDistrict] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [districtOptions, setDistrictOptions] = useState([]);
  const [subDistrictOptions, setSubDistrictOptions] = useState([]);
  const [searchLat, setSearchLat] = useState("");
  const [searchLng, setSearchLng] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    payment_due_day: "",
    late_fee_per_day: "",
    auto_apply_late_fee: false,
  });

  // ⬇️ ทุก useEffect ที่ใช้ province หรือ district อยู่ต่อจากนี้ปลอดภัยแล้ว
  useEffect(() => {
    const fetchDorm = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/dormitories/${dormId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = response.data;
        setFormData({
          name: data.name || "",
          phone: data.phone || "",
          email: data.email || "",
          image_filename: data.image_filename || "",
          floors: data.floors || 0,
          total_rooms: data.total_rooms || 0,
          district: data.district || "",
          subdistrict: data.subdistrict || "",
          payment_due_day: data.payment_due_day || "",
          late_fee_per_day: data.late_fee_per_day || "",
          auto_apply_late_fee: data.auto_apply_late_fee || false,
        });
        setDetailAddress(data.address || "");
        setProvince(data.province || "");
        setDistrict(data.district || "");
        setSubDistrict(data.subdistrict || "");
        setPosition({
          lat: parseFloat(data.latitude) || 13.736717,
          lng: parseFloat(data.longitude) || 100.523186,
        });
        setIsPositionManuallySet(false);
        setHasUserChangedLocationDropdown(false);
      } catch (err) {
        console.error("โหลดข้อมูลหอผิดพลาด:", err);
        toast.error("ไม่สามารถโหลดข้อมูลหอพักได้");
      }
    };

    if (dormId) fetchDorm();
  }, [dormId]);

  // โหลดรายการอำเภอเมื่อมีการเลือกจังหวัด
  useEffect(() => {
    if (province) {
      const provId = provinces.find((p) => p.name_th === province)?.id;
      if (provId) {
        const amphuresList = amphures.filter((a) => a.province_id === provId);
        setDistrictOptions(amphuresList.map((a) => a.name_th));
      }
    } else {
      setDistrictOptions([]);
    }
  }, [province]);

  // โหลดรายการตำบลเมื่อมีการเลือกอำเภอ
  useEffect(() => {
    if (district && province) {
      const provId = provinces.find((p) => p.name_th === province)?.id;
      const amphureId = amphures.find(
        (a) => a.name_th === district && a.province_id === provId
      )?.id;
      if (amphureId) {
        const tambonsList = tambons.filter((t) => t.amphure_id === amphureId);
        setSubDistrictOptions(tambonsList.map((t) => t.name_th));
      }
    } else {
      setSubDistrictOptions([]);
    }
  }, [district, province]);

  // อัปเดตค่า search lat/lng เมื่อ position เปลี่ยน
  useEffect(() => {
    setSearchLat(position.lat.toString());
    setSearchLng(position.lng.toString());
  }, [position]);

  // ค้นหาตำแหน่งจาก API เมื่อเลือกจังหวัด/อำเภอ/ตำบล
  useEffect(() => {
    const fetchGeoLocation = async () => {
      if (!hasUserChangedLocationDropdown || isPositionManuallySet) return;

      const fullQuery = `${subDistrict || ""} ${district || ""} ${
        province || ""
      }`.trim();
      if (fullQuery) {
        const apiKey = import.meta.env.VITE_GEOAPIFY_KEY;
        const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
          fullQuery
        )}&lang=th&apiKey=${apiKey}`;

        try {
          const res = await fetch(url);
          const data = await res.json();
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
  }, [
    province,
    district,
    subDistrict,
    isPositionManuallySet,
    hasUserChangedLocationDropdown,
  ]);

  // ฟังก์ชันค้นหาตำแหน่งด้วยละติจูด/ลองจิจูด
  const handleSearchLocation = () => {
    if (searchLat && searchLng) {
      const newPosition = {
        lat: parseFloat(searchLat),
        lng: parseFloat(searchLng),
      };
      setPosition(newPosition);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      // กรองเฉพาะตัวเลขเท่านั้น
      const onlyNums = value.replace(/[^0-9]/g, "");
      setFormData({ ...formData, [name]: onlyNums });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ตรวจสอบข้อมูลก่อนส่ง
    if (!formData.name || !formData.phone || !formData.email) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    console.log("เริ่มการอัพเดต...");

    const data = new FormData();

    data.append("name", formData.name);
    data.append("phone", formData.phone);
    data.append("email", formData.email);

    const imageFile = document.querySelector('input[name="coverImage"]')
      .files[0];
    if (imageFile) {
      data.append("image", imageFile);
      console.log("อัพโหลดรูปใหม่:", imageFile.name);
    } else if (formData.image_filename) {
      data.append("image_filename", formData.image_filename);
      console.log("ใช้รูปเดิม:", formData.image_filename);
    }

    // ✅ เงื่อนไขส่ง floors และ total_rooms (ไม่บังคับ)
    if (formData.floors !== undefined && formData.floors !== "") {
      data.append("floors", formData.floors);
    } else {
      data.append("floors", ""); // ส่ง string ว่าง เพื่อให้ backend ตัดสินใจ
    }

    if (formData.total_rooms !== undefined && formData.total_rooms !== "") {
      data.append("total_rooms", formData.total_rooms);
    } else {
      data.append("total_rooms", ""); // เช่นกัน
    }

    // พิกัดจากแผนที่
    data.append("latitude", position.lat);
    data.append("longitude", position.lng);

    // ที่อยู่
    data.append("address", detailAddress);
    data.append("province", province);
    data.append("district", district);
    data.append("subdistrict", subDistrict);

    // ข้อมูลการกำหนดวันชำระและค่าปรับ
    data.append("payment_due_day", formData.payment_due_day || "");
    data.append("late_fee_per_day", formData.late_fee_per_day || "");
    data.append("auto_apply_late_fee", formData.auto_apply_late_fee);

    console.log("ข้อมูลที่จะส่ง:", {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      latitude: position.lat,
      longitude: position.lng,
      address: detailAddress,
      province: province,
      district: district,
      subdistrict: subDistrict,
    });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/api/dormitories/${dormId}`, data, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log("Response status:", response.status);

      if (response.status === 200) {
        const result = response.data;
        toast.success("อัปเดตข้อมูลหอพักสำเร็จ");
        console.log("Response:", result);

        // ไม่ต้อง reload หน้า แต่ให้โหลดข้อมูลใหม่
        // window.location.reload();
      } else {
        console.error("Error response:", response.data);
        toast.error("เกิดข้อผิดพลาด: " + (response.data?.error || JSON.stringify(response.data)));
      }
    } catch (err) {
      console.error("Axios error:", err);
      if (err.response) {
        toast.error("เกิดข้อผิดพลาด: " + (err.response.data?.error || err.message));
      } else {
        toast.error("เชื่อมต่อ backend ไม่ได้");
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-lg font-bold mb-4 text-blue-700">ข้อมูลหอพัก</h2>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4 h-auto">
          {/* ฝั่งซ้าย: ฟอร์มกรอกข้อมูล */}
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-md p-4 space-y-4 border border-gray-300 h-fit shadow-sm">
              <h3 className="text-md font-semibold text-blue-700 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FaEdit className="text-blue-600" />
                </div>
                ข้อมูลพื้นฐาน
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ชื่อหอพัก
                </label>
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
                <label className="block text-sm font-medium text-gray-700">
                  เบอร์โทร
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="เช่น 089425xxxx"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={15}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  อีเมลหอพัก (ใช้สำหรับส่งใบแจ้งหนี้ให้ผู้เช่า)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="เช่น dorm@example.com"
                />
              </div>
              <h3 className="text-md font-semibold text-blue-700 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FaMoneyBillWave className="text-blue-600" />
                </div>
                กำหนดวันชำระค่าห้องและค่าปรับ
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  วันสุดท้ายของการชำระเงิน
                </label>
                <select
                  name="payment_due_day"
                  value={formData.payment_due_day}
                  onChange={handleChange}
                  className="w-full border rounded-md px-3 py-2 bg-white"
                >
                  <option value="">-- เลือกวันที่ --</option>
                  {[...Array(31)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      วันที่ {i + 1} ของทุกเดือน
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ค่าปรับชำระล่าช้าต่อวัน
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="late_fee_per_day"
                    value={formData.late_fee_per_day}
                    onChange={handleChange}
                    className="w-full border rounded-md px-3 py-2 pr-20"
                    placeholder="100"
                    min="0"
                    step="0.01"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
                    บาท/วัน
                  </span>
                </div>
              </div>
              <div>
                <div>
                  <p className="text-sm text-gray-600">
                    กรณีมีการชำระล่าช้ากว่าวันที่ระบุ
                    ต้องการให้ระบบเพิ่มค่าปรับให้อัตโนมัติหรือไม่
                  </p>
                </div>
                <div>
                  <label className="flex items-center text-sm text-gray-700">
                    <input
                      type="checkbox"
                      name="auto_apply_late_fee"
                      checked={formData.auto_apply_late_fee}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          auto_apply_late_fee: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    ต้องการให้เพิ่มค่าปรับอัตโนมัติ
                  </label>
                </div>
              </div>
              <h3 className="text-md font-semibold text-blue-700 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FaRegImage className="text-blue-600" />
                </div>
                รูปหอพัก
              </h3>
              {/* รูปหน้าปกหอพัก */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  รูปหน้าปกหอพัก{" "}
                  <span className="text-gray-400 text-xs">(ไม่บังคับ)</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  name="coverImage"
                  className="w-full border rounded-md px-3 py-1 text-sm text-gray-700 file:bg-blue-50 file:border-none file:px-4 file:py-1.5 file:rounded-md file:text-blue-700 hover:file:bg-blue-100"
                />
                {formData.image_filename && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600">รูปเดิม:</p>
                    <img
                      src={`${API_URL}/uploads/${formData.image_filename}`}
                      alt="รูปเดิม"
                      className="w-full max-w-[250px] h-40 object-cover rounded-md border"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ฝั่งขวา: แผนที่ */}
          <div className="bg-white rounded-md overflow-hidden border border-gray-300 h-fit shadow-sm">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ที่อยู่โดยละเอียด
                </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    จังหวัด
                  </label>
                  <select
                    className="w-full border rounded-md px-2 py-1 text-sm"
                    value={province}
                    onChange={(e) => {
                      setProvince(e.target.value);
                      setHasUserChangedLocationDropdown(true);
                    }}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    อำเภอ
                  </label>
                  <select
                    className="w-full border rounded-md px-2 py-1 text-sm"
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setHasUserChangedLocationDropdown(true);
                    }}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ตำบล
                  </label>
                  <select
                    className="w-full border rounded-md px-2 py-1 text-sm"
                    value={subDistrict}
                    onChange={(e) => {
                      setSubDistrict(e.target.value);
                      setHasUserChangedLocationDropdown(true);
                    }}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ค้นหาตำแหน่งโดยละติจูด/ลองจิจูด
                </label>
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
                <MapContainer
                  center={position}
                  zoom={15}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <DraggableMarker
                    position={position}
                    setPosition={setPosition}
                    setIsPositionManuallySet={setIsPositionManuallySet}
                  />
                  <MapAutoPan position={position} />
                </MapContainer>
              </div>
            </div>

            {/* แสดงพิกัดปัจจุบัน */}
            <div className="p-3 bg-gray-50 border-t border-gray-300">
              <p className="text-sm text-gray-600 mb-1">พิกัดปัจจุบัน:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">ละติจูด:</span>
                  <span className="text-blue-600 ml-1">
                    {position.lat.toFixed(6)}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">ลองจิจูด:</span>
                  <span className="text-blue-600 ml-1">
                    {position.lng.toFixed(6)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ปุ่มบันทึก */}
        <div className="mt-4 text-center">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md transition-colors duration-200 flex items-center gap-3 mx-auto"
          >
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <FaSave className="text-white text-sm" />
            </div>
            บันทึกข้อมูล
          </button>
        </div>
      </form>
      
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
      />
    </div>
  );
}

export default SettingDormInfo;
