import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  MapContainer,
  Marker,
  TileLayer,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { TbMapPinSearch, TbCurrentLocation } from "react-icons/tb";

// Import data files
import provincesData from "../../../../assets/data/api_province.json";
import amphuresData from "../../../../assets/data/api_amphure.json";
import tambonsData from "../../../../assets/data/thai_tambons.json";

// ตั้งค่า icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Component สำหรับ Draggable Marker
function DraggableMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const newPosition = e.target.getLatLng();
          setPosition([newPosition.lat, newPosition.lng]);
        },
      }}
    >
      <Popup className="font-sarabun">
        <div className="text-center">
          <span className="font-semibold text-blue-600">ตำแหน่งที่เลือก</span>
          <br />
          <span className="text-xs text-gray-500">
            {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </span>
        </div>
      </Popup>
    </Marker>
  );
}

const MapContent = ({ onAddressChange }) => {
  const [address, setAddress] = useState("");
  
  // ใช้ข้อมูลจากไฟล์ local แทน
  const [provinces, setProvinces] = useState([]);
  const [amphures, setAmphures] = useState([]);
  const [tambons, setTambons] = useState([]);
  const [zipcodes, setZipcodes] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedAmphure, setSelectedAmphure] = useState("");
  const [selectedTambon, setSelectedTambon] = useState("");
  const [selectedZipcode, setSelectedZipcode] = useState("");
  const [map, setMap] = useState(null);
  const [markerPosition, setMarkerPosition] = useState([13.736717, 100.523186]);
  const [inputLat, setInputLat] = useState("13.736717");
  const [inputLng, setInputLng] = useState("100.523186");

  // โหลดข้อมูลจังหวัดจากไฟล์ local
  useEffect(() => {
    const sortedProvinces = provincesData
      .map((p) => p.name_th)
      .sort((a, b) => a.localeCompare(b, "th"));
    setProvinces(sortedProvinces);
  }, []);

  // เมื่อเลือกจังหวัด -> โหลดอำเภอ
  useEffect(() => {
    if (!selectedProvince) {
      setAmphures([]);
      setTambons([]);
      setZipcodes([]);
      setSelectedAmphure("");
      setSelectedTambon("");
      setSelectedZipcode("");
      return;
    }
    
    const province = provincesData.find((p) => p.name_th === selectedProvince);
    if (province) {
      const provinceAmphures = amphuresData
        .filter((a) => a.province_id === province.id)
        .map((a) => a.name_th)
        .sort((a, b) => a.localeCompare(b, "th"));
      setAmphures(provinceAmphures);
    } else {
      setAmphures([]);
    }
    
    setTambons([]);
    setZipcodes([]);
    setSelectedAmphure("");
    setSelectedTambon("");
    setSelectedZipcode("");
  }, [selectedProvince]);

  // เมื่อเลือกอำเภอ -> โหลดตำบล
  useEffect(() => {
    if (!selectedAmphure || !selectedProvince) {
      setTambons([]);
      setZipcodes([]);
      setSelectedTambon("");
      setSelectedZipcode("");
      return;
    }
    
    const province = provincesData.find((p) => p.name_th === selectedProvince);
    const amphure = amphuresData.find((a) => a.name_th === selectedAmphure && a.province_id === province?.id);
    
    if (amphure) {
      const amphureTambons = tambonsData
        .filter((t) => t.amphure_id === amphure.id)
        .map((t) => t.name_th)
        .sort((a, b) => a.localeCompare(b, "th"));
      setTambons(amphureTambons);
    } else {
      setTambons([]);
    }
    
    setZipcodes([]);
    setSelectedTambon("");
    setSelectedZipcode("");
  }, [selectedAmphure, selectedProvince]);

  // เมื่อเลือกตำบล -> โหลดรหัสไปรษณีย์
  useEffect(() => {
    if (!selectedTambon || !selectedAmphure || !selectedProvince) {
      setZipcodes([]);
      setSelectedZipcode("");
      return;
    }
    
    const province = provincesData.find((p) => p.name_th === selectedProvince);
    const amphure = amphuresData.find((a) => a.name_th === selectedAmphure && a.province_id === province?.id);
    const tambon = tambonsData.find((t) => t.name_th === selectedTambon && t.amphure_id === amphure?.id);
    
    if (tambon?.zip_code) {
      setZipcodes([tambon.zip_code.toString()]);
      setSelectedZipcode(tambon.zip_code.toString());
    } else {
      setZipcodes([]);
      setSelectedZipcode("");
    }
  }, [selectedTambon, selectedAmphure, selectedProvince]);

  // เลื่อนแผนที่ตามการเลือกจังหวัด/อำเภอ/ตำบล ด้วย Geoapify
  useEffect(() => {
    if (!map) return;

    const fetchGeoLocation = async () => {
      const fullQuery = `${selectedTambon || ""} ${selectedAmphure || ""} ${selectedProvince || ""}`.trim();
      
      if (fullQuery) {
        const apiKey = import.meta.env.VITE_GEOAPIFY_KEY;
        const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
          fullQuery
        )}&lang=th&apiKey=${apiKey}`;

        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.features && data.features.length > 0) {
              const { lat, lon } = data.features[0].properties;
              
              let zoom = 7;
              if (selectedTambon) zoom = 13;
              else if (selectedAmphure) zoom = 11;
              else if (selectedProvince) zoom = 9;
              
              map.flyTo([lat, lon], zoom, { duration: 1.2 });
              setMarkerPosition([lat, lon]);
              setInputLat(lat.toString());
              setInputLng(lon.toString());
            }
          }
        } catch (error) {
          console.error("Geoapify API Error:", error);
        }
      }
    };

    fetchGeoLocation();
  }, [selectedProvince, selectedAmphure, selectedTambon, map]);

  // ฟังก์ชันค้นหาพิกัดจาก input
  const handleSearchCoordinates = () => {
    const lat = parseFloat(inputLat);
    const lng = parseFloat(inputLng);
    
    if (isNaN(lat) || isNaN(lng)) {
      alert("กรุณาใส่พิกัดที่ถูกต้อง");
      return;
    }
    
    if (map) {
      map.flyTo([lat, lng], 15, { duration: 1.2 });
      setMarkerPosition([lat, lng]);
    }
  };

  // ฟังก์ชันอัพเดตตำแหน่ง marker
  const updateMarkerPosition = (newPosition) => {
    setMarkerPosition(newPosition);
    setInputLat(newPosition[0].toString());
    setInputLng(newPosition[1].toString());
  };

  // ส่งข้อมูลกลับไป parent component
  React.useEffect(() => {
    if (onAddressChange) {
      onAddressChange({
        address: address,
        province: selectedProvince,
        district: selectedAmphure,
        subdistrict: selectedTambon,
        postcode: selectedZipcode,
        lat: markerPosition[0],
        lng: markerPosition[1]
      });
    }
  }, [address, selectedProvince, selectedAmphure, selectedTambon, selectedZipcode, markerPosition, onAddressChange]);

  // สไตล์สำหรับ Input
  const inputStyle = "w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 border transition duration-150 ease-in-out bg-white";
  const labelStyle = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* ส่วนแผนที่ */}
        <div className="w-full lg:w-2/3 flex flex-col gap-2">
            <div className="w-full rounded-xl overflow-hidden border border-gray-300 shadow-sm relative z-0 h-[570px]">
              <MapContainer
                center={[13.736717, 100.523186]}
                zoom={7}
                style={{ height: "100%", width: "100%" }}
                ref={setMap}
              >
                <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <DraggableMarker position={markerPosition} setPosition={updateMarkerPosition} />
              </MapContainer>
              {/* Lat/Lng tag overlay */}
              <div
              className="absolute left-3 bottom-3 bg-white/90 border border-blue-200 rounded-lg shadow px-3 py-1 flex items-center gap-3 text-xs text-gray-700 z-[1000] select-none"
              style={{ pointerEvents: 'none' }}
              >
              <span className="font-medium">Lat:</span>
              <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{Number(markerPosition[0]).toFixed(6)}</span>
              <span className="font-medium">Lng:</span>
              <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{Number(markerPosition[1]).toFixed(6)}</span>
              </div>
            </div>
        </div>
        
        {/* ส่วนฟอร์มกรอกข้อมูล */}
        <div className="w-full lg:w-1/3 flex flex-col space-y-4">
            <div>
                <div className="space-y-4">
                    <div>
                        <label className={labelStyle}>
                        ที่อยู่โดยละเอียด <span className="text-red-500">*</span>
                        </label>
                        <textarea
                        className={`${inputStyle} h-24 resize-none`}
                        placeholder="เช่น 123/4 หมู่ 5 ซอยแสงจันทร์ ถนนประชาอุทิศ"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className={labelStyle}>
                        จังหวัด <span className="text-red-500">*</span>
                        </label>
                        <select
                        value={selectedProvince}
                        onChange={(e) => setSelectedProvince(e.target.value)}
                        className={inputStyle}
                        >
                        <option value="">-- เลือกจังหวัด --</option>
                        {provinces.map((p) => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelStyle}>
                        อำเภอ/เขต <span className="text-red-500">*</span>
                        </label>
                        <select
                        value={selectedAmphure}
                        onChange={(e) => setSelectedAmphure(e.target.value)}
                        className={inputStyle}
                        disabled={!selectedProvince}
                        >
                        <option value="">-- เลือกอำเภอ --</option>
                        {amphures.map((a) => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelStyle}>
                        ตำบล/แขวง <span className="text-red-500">*</span>
                        </label>
                        <select
                        value={selectedTambon}
                        onChange={(e) => setSelectedTambon(e.target.value)}
                        className={inputStyle}
                        disabled={!selectedAmphure}
                        >
                        <option value="">-- เลือกตำบล --</option>
                        {tambons.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                        </select>
                    </div>

                    <div>
                        <label className={labelStyle}>
                        รหัสไปรษณีย์ <span className="text-red-500">*</span>
                        </label>
                        <select
                        value={selectedZipcode}
                        onChange={(e) => setSelectedZipcode(e.target.value)}
                        className={inputStyle}
                        disabled={!selectedTambon}
                        >
                        <option value="">-- เลือกรหัสไปรษณีย์ --</option>
                        {zipcodes.map((z) => (
                            <option key={z} value={z}>{z}</option>
                        ))}
                        </select>
                    </div>

                    <div className="pt-2 border-t border-gray-100 mt-2">
                         <label className=" text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                             <TbMapPinSearch /> ค้นหาตำแหน่งด้วยพิกัด
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input
                                className={inputStyle}
                                placeholder="ละติจูด"
                                value={inputLat}
                                onChange={(e) => setInputLat(e.target.value)}
                                type="number"
                                step="any"
                            />
                            <input
                                className={inputStyle}
                                placeholder="ลองจิจูด"
                                value={inputLng}
                                onChange={(e) => setInputLng(e.target.value)}
                                type="number"
                                step="any"
                            />
                        </div>
                        <button 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center justify-center gap-2"
                            onClick={handleSearchCoordinates}
                        >
                            <TbMapPinSearch size={18} /> ไปที่พิกัดนี้
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MapContent;