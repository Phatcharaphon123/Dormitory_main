import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import provinces from "../../../../assets/data/api_province.json";
import amphures from "../../../../assets/data/api_amphure.json";
import tambons from "../../../../assets/data/thai_tambons.json";

// ตั้งค่า icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapAutoPan({ position }) {
  const map = useMap();
  useEffect(() => {
    map.setView(position, map.getZoom());
  }, [position]);
  return null;
}

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

function AddMap({ position, setPosition }) {
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [subDistrict, setSubDistrict] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [districtOptions, setDistrictOptions] = useState([]);
  const [subDistrictOptions, setSubDistrictOptions] = useState([]);
  const [latitude, setLatitude] = useState(position.lat);
  const [longitude, setLongitude] = useState(position.lng);
  const [searchLat, setSearchLat] = useState("");  // ค่าละติจูดสำหรับการค้นหา
  const [searchLng, setSearchLng] = useState("");  // ค่าลองจิจูดสำหรับการค้นหา

  // อัปเดตค่า latitude และ longitude เมื่อ position เปลี่ยน
  useEffect(() => {
    setLatitude(position.lat);
    setLongitude(position.lng);
    setSearchLat(position.lat.toString());
    setSearchLng(position.lng.toString());
  }, [position]);

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

  useEffect(() => {
    const provId = provinces.find((p) => p.name_th === province)?.id;
    const amphureId = amphures.find((a) => a.name_th === district && a.province_id === provId)?.id;
    if (amphureId) {
      const tambonsList = tambons.filter((t) => t.amphure_id === amphureId);
      setSubDistrictOptions(tambonsList.map((t) => t.name_th));
      setSubDistrict("");
    }
  }, [district, province]);

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
            setLatitude(lat);
            setLongitude(lon);
            setSearchLat(lat);
            setSearchLng(lon); // Update the search lat/lng fields when a location is found
          }
        } catch (error) {
          console.error("Geoapify API Error:", error);
        }
      }
    };

    fetchGeoLocation();
  }, [province, district, subDistrict]);

  const handleSearchLocation = () => {
    if (searchLat && searchLng) {
      const newPosition = { lat: parseFloat(searchLat), lng: parseFloat(searchLng) };
      setPosition(newPosition);
      setLatitude(newPosition.lat);
      setLongitude(newPosition.lng);
    }
  };

  return (
    <div className="w-full h-full p-4">
      {/* กล่องกรอกที่อยู่โดยละเอียด */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่โดยละเอียด</label>
        <textarea
          rows="2"
          className="w-full border rounded px-2 py-1 text-sm"
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
            className="w-full border rounded px-2 py-1 text-sm"
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
            className="w-full border rounded px-2 py-1 text-sm"
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
            className="w-full border rounded px-2 py-1 text-sm"
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
            className="w-full border rounded px-2 py-1 text-sm"
            value={searchLat}
            onChange={(e) => setSearchLat(e.target.value)}
          />
          <input
            type="text"
            placeholder="ลองจิจูด"
            className="w-full border rounded px-2 py-1 text-sm"
            value={searchLng}
            onChange={(e) => setSearchLng(e.target.value)}
          />
          <button
            onClick={handleSearchLocation}
            className="bg-blue-500 text-white rounded px-3 py-1 text-sm"
          >
            ค้นหา
          </button>
        </div>
      </div>

      {/* แผนที่ */}
      <div className="h-[350px] w-full rounded border overflow-hidden">
        <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <DraggableMarker position={position} setPosition={setPosition} />
          <MapAutoPan position={position} />
        </MapContainer>
      </div>
    </div>
  );
}

export default AddMap;
