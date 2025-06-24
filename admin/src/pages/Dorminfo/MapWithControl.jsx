import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ตั้งค่า icon ให้ถูกต้อง (ไม่งั้น Marker ไม่แสดง)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:
    'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Component ย่อยให้ Marker ลากได้
function DraggableMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng); // คลิกบนแผนที่ = ย้ายหมุด
    },
  });

  return (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          setPosition(e.target.getLatLng()); // ลากหมุดแล้วบันทึกพิกัด
        },
      }}
    />
  );
}

// Component หลัก
function MapWithControl() {
  const [position, setPosition] = useState({ lat: 13.736717, lng: 100.523186 }); // กทม.

  const handleSave = () => {
    alert(`พิกัด: ${position.lat}, ${position.lng}`);
    // จะส่ง position ไปใช้งานที่อื่นได้ตรงนี้
  };

  return (
    <div className="bg-white p-3 rounded-lg  flex-1">
      <div>
        <div className="h-[285px] w-full rounded-lg border border-gray-300 overflow-hidden">
          <MapContainer
            center={position}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <DraggableMarker position={position} setPosition={setPosition} />
          </MapContainer>
        </div>
      </div>

      <div className="mt-4 text-right">
        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          บันทึกตำแหน่ง
        </button>
      </div>
    </div>
  );
}

export default MapWithControl;
