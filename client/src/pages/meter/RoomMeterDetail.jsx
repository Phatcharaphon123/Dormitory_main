import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaWater, FaBolt, FaCalendarAlt, FaSync, FaTint } from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

// ฟังก์ชันแปลงวันที่เป็นรูปแบบไทย
const formatThaiDate = (dateString) => {
  if (!dateString) return 'ไม่มีข้อมูล';
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
  return `${day}/${month}/${year}`;
};

function RoomMeterDetail() {
  const navigate = useNavigate();
  const { dormId, roomId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [roomDetail, setRoomDetail] = useState(null);
  const [meterHistory, setMeterHistory] = useState([]);
  const [error, setError] = useState(null);
  const [influxData, setInfluxData] = useState({ water: 0, power: 0 });
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // ฟังก์ชันดึงข้อมูลห้องจาก API
  const fetchRoomDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      // ดึงข้อมูลห้องทั่วไป
      const roomResponse = await axios.get(`http://localhost:3001/api/rooms/dormitories/${dormId}/rooms/${roomId}/detail`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const roomData = roomResponse.data;
      
      // ดึงข้อมูลมิเตอร์แยกต่างหาก
      const meterResponse = await axios.get(`http://localhost:3001/api/meters/dormitories/${dormId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const meterData = meterResponse.data;
      
      // หาข้อมูลมิเตอร์ของห้องนี้
      let roomMeterInfo = null;
      Object.keys(meterData).forEach(floor => {
        const room = meterData[floor].find(r => r.roomId.toString() === roomId.toString());
        if (room) {
          roomMeterInfo = room;
        }
      });
      
      // แปลงข้อมูลให้เหมาะกับ UI
      const roomDetailFormatted = {
        id: roomData.room_id,
        roomNumber: roomData.room_number,
        tenant: roomData.tenant_name,
        phone: roomData.phone_number || 'ไม่มีเบอร์โทร',
        waterMeter: roomData.meter?.current_water || 0,
        electricMeter: roomData.meter?.current_electric || 0,
        waterPrevious: roomData.meter?.previous_water || 0,
        electricPrevious: roomData.meter?.previous_electric || 0,
        waterUsage: (() => {
          const prevWater = roomData.meter?.previous_water || 0;
          const currWater = roomData.meter?.current_water || 0;
          const calcUsage = roomData.meter?.water_usage || 0;
          
          if (prevWater <= 0 || currWater < prevWater) {
            return currWater;
          } else if (calcUsage > 0) {
            return calcUsage;
          } else {
            return Math.max(0, currWater - prevWater);
          }
        })(),
        electricUsage: (() => {
          const prevElectric = roomData.meter?.previous_electric || 0;
          const currElectric = roomData.meter?.current_electric || 0;
          const calcUsage = roomData.meter?.electric_usage || 0;
          
          if (prevElectric <= 0 || currElectric < prevElectric) {
            return currElectric;
          } else if (calcUsage > 0) {
            return calcUsage;
          } else {
            return Math.max(0, currElectric - prevElectric);
          }
        })(),
        waterRate: roomData.water_rate || 15,
        electricRate: roomData.electricity_rate || 8,
        status: roomData.status,
        lastUpdate: roomData.meter?.last_update ? new Date(roomData.meter.last_update) : new Date(),
        floorNumber: roomData.floor_number,
        monthlyRent: roomData.monthly_rent,
        // ข้อมูลมิเตอร์ดิจิตอลจาก API มิเตอร์
        hasWaterMeter: roomMeterInfo?.meters?.water?.installed || false,
        hasElectricMeter: roomMeterInfo?.meters?.electric?.installed || false,
        waterMeterCode: roomMeterInfo?.meters?.water?.code || '',
        electricMeterCode: roomMeterInfo?.meters?.electric?.code || '',
        hasDigitalMeter: (roomMeterInfo?.meters?.water?.installed || false) || (roomMeterInfo?.meters?.electric?.installed || false)
      };
      
      console.log('Room Detail Data:', roomDetailFormatted); // Debug
      console.log('Room Meter Info:', roomMeterInfo); // Debug
      
      setRoomDetail(roomDetailFormatted);
      
      // ดึงข้อมูลจาก InfluxDB ถ้ามีมิเตอร์ดิจิตอล
      if (roomDetailFormatted.hasDigitalMeter) {
        console.log('Fetching InfluxDB data for digital meter'); // Debug
        await fetchInfluxData(roomDetailFormatted);
      } else {
        console.log('No digital meter found for this room'); // Debug
      }
      
      // TODO: ดึงข้อมูลประวัติการใช้งานมิเตอร์
      setMeterHistory([]);
      
    } catch (err) {
      console.error('Error fetching room detail:', err);
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันดึงข้อมูลจาก InfluxDB
  const fetchInfluxData = async (roomData) => {
    try {
      const token = localStorage.getItem('token');
      
      // ใช้รหัสมิเตอร์เป็น measurement name
      const measurement = roomData.waterMeterCode || roomData.electricMeterCode;
      
      console.log('InfluxDB Debug:', {
        roomNumber: roomData.roomNumber,
        waterMeterCode: roomData.waterMeterCode,
        electricMeterCode: roomData.electricMeterCode,
        measurement: measurement,
        hasDigitalMeter: roomData.hasDigitalMeter
      });
      
      if (!measurement) {
        console.warn('ไม่พบรหัสมิเตอร์สำหรับห้อง', roomData.roomNumber);
        return;
      }
      
      console.log('Calling InfluxDB API with measurement:', measurement);
      
      // ดึงข้อมูลล่าสุดจาก InfluxDB
      const response = await axios.post('http://localhost:3001/api/influx/latest-data', {
        measurement: measurement
      }, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('InfluxDB Response:', response.data);
      
      if (response.data && response.data.data) {
        const data = response.data.data;
        console.log('InfluxDB Data:', data);
        
        setInfluxData({
          water: data.water || 0,
          power: data.power || 0
        });
        
        // อัปเดตข้อมูลในห้อง
        setRoomDetail(prev => {
          const updated = {
            ...prev,
            waterMeter: data.water || prev.waterMeter,
            electricMeter: data.power || prev.electricMeter,
            waterUsage: data.water ? 
              (prev.waterPrevious <= 0 || data.water < prev.waterPrevious ? 
                parseFloat(data.water.toFixed(2)) : 
                parseFloat((data.water - prev.waterPrevious).toFixed(2))
              ) : prev.waterUsage,
            electricUsage: data.power ? 
              (prev.electricPrevious <= 0 || data.power < prev.electricPrevious ? 
                parseFloat(data.power.toFixed(2)) : 
                parseFloat((data.power - prev.electricPrevious).toFixed(2))
              ) : prev.electricUsage,
            lastUpdate: new Date()
          };
          console.log('Updated room detail:', updated);
          return updated;
        });
      } else {
        console.log('No data in InfluxDB response');
      }
    } catch (error) {
      console.error('Error fetching InfluxDB data:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  useEffect(() => {
    if (dormId && roomId) {
      fetchRoomDetail();
    }
  }, [dormId, roomId]);

  // อัปเดตข้อมูลแบบเรียลไทม์จาก InfluxDB
  useEffect(() => {
    if (!roomDetail || !roomDetail.hasDigitalMeter) return;

    const interval = setInterval(async () => {
      await fetchInfluxData(roomDetail);
      setLastUpdate(new Date());
    }, 5000); // อัปเดตทุก 5 วินาที

    return () => clearInterval(interval);
  }, [roomDetail?.hasDigitalMeter]);

  const handleRefresh = async () => {
    await fetchRoomDetail();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-red-500 mb-2">เกิดข้อผิดพลาด</h3>
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={fetchRoomDetail}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  if (!roomDetail) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">🏠</div>
          <h3 className="text-lg font-medium text-gray-500 mb-2">ไม่พบข้อมูลห้อง</h3>
          <p className="text-gray-400 mb-4">ห้องที่ต้องการไม่มีในระบบ</p>
          <button 
            onClick={() => navigate(`/real-time-meter/${dormId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            กลับไปหน้ารายการห้อง
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/real-time-meter/${dormId}`)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors border border-gray-200"
            >
              <FaArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-gray-700">
                รายละเอียดมิเตอร์ห้อง {roomDetail.roomNumber}
              </h1>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-sm text-gray-600">
                  อัปเดตล่าสุด: {lastUpdate.toLocaleTimeString('th-TH')} น.
                </p>
                {roomDetail.hasDigitalMeter && (
                  <>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-500">อัปเดตทุก 5 วินาที</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={handleRefresh}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors shadow-sm"
          >
            <FaSync className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'กำลังอัปเดต...' : 'อัปเดต'}
          </button>
        </div>

        {/* Room Info */}
        <div className="bg-white rounded-md shadow-sm border border-gray-300 p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">ข้อมูลห้อง</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">หมายเลขห้อง</p>
              <p className="font-semibold text-gray-800">{roomDetail.roomNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">ผู้เช่า</p>
              <p className="font-semibold text-gray-800">{roomDetail.tenant}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">เบอร์โทร</p>
              <p className="font-semibold text-gray-800">{roomDetail.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">สถานะ</p>
              <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                roomDetail.status === 'ว่าง' 
                  ? 'bg-gray-100 text-gray-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {roomDetail.status}
              </span>
            </div>
          </div>
        </div>

        {/* Current Meter Readings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Water Meter */}
          <div className="bg-white rounded-md shadow-sm border border-gray-300 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
                <FaTint className="w-5 h-5" />
                มิเตอร์น้ำดิจิตอล
              </h3>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${roomDetail.hasElectricMeter ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`}></div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 rounded-md">
                <p className="text-3xl font-bold text-blue-600">
                  {roomDetail.hasWaterMeter ? roomDetail.waterMeter.toFixed(2) : 'ไม่ติดตั้ง'}
                </p>
                <p className="text-sm text-blue-600">
                  หน่วย {roomDetail.hasWaterMeter ? '(จากมิเตอร์น้ำดิจิตอล)' : '(ยังไม่ติดตั้งมิเตอร์ดิจิตอล)'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-gray-50 rounded-md">
                  <p className="text-gray-600">ครั้งก่อนหน้า</p>
                  <p className="font-semibold text-gray-800">{roomDetail.waterPrevious}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-md">
                  <p className="text-gray-600">หน่วยใช้</p>
                  <p className="font-semibold text-blue-600">{roomDetail.waterUsage.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">อัตราค่าน้ำ</span>
                  <span className="font-medium">{roomDetail.waterRate} บาท/หน่วย</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold text-gray-700">ค่าน้ำประมาณ</span>
                  <span className="font-bold text-blue-600">
                    {(roomDetail.waterUsage * roomDetail.waterRate).toFixed(2)} บาท
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Electric Meter */}
          <div className="bg-white rounded-md shadow-sm border border-gray-300 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-yellow-700 flex items-center gap-2">
                <FaBolt className="w-5 h-5" />
                มิเตอร์ไฟฟ้าดิจิตอล
              </h3>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${roomDetail.hasElectricMeter ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`}></div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="text-center p-4 bg-yellow-50 rounded-md">
                <p className="text-3xl font-bold text-yellow-600">
                  {roomDetail.hasElectricMeter ? roomDetail.electricMeter.toFixed(2) : 'ไม่ติดตั้ง'}
                </p>
                <p className="text-sm text-yellow-600">
                  หน่วย {roomDetail.hasElectricMeter ? '(จากมิเตอร์ไฟฟ้าดิจิตอล)' : '(ยังไม่ติดตั้งมิเตอร์ไฟฟ้าดิจิตอล)'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-gray-50 rounded-md">
                  <p className="text-gray-600">ครั้งก่อนหน้า</p>
                  <p className="font-semibold text-gray-800">{roomDetail.electricPrevious}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-md">
                  <p className="text-gray-600">หน่วยใช้</p>
                  <p className="font-semibold text-yellow-600">{roomDetail.electricUsage.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">อัตราค่าไฟ</span>
                  <span className="font-medium">{roomDetail.electricRate} บาท/หน่วย</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold text-gray-700">ค่าไฟประมาณ</span>
                  <span className="font-bold text-yellow-600">
                    {(roomDetail.electricUsage * roomDetail.electricRate).toFixed(2)} บาท
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-md shadow-sm border border-gray-300 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">สรุปค่าใช้จ่าย (ประมาณการ)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-600">ค่าน้ำ</p>
              <p className="text-xl font-bold text-blue-600">
                {(roomDetail.waterUsage * roomDetail.waterRate).toFixed(2)} บาท
              </p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-md">
              <p className="text-sm text-yellow-600">ค่าไฟ</p>
              <p className="text-xl font-bold text-yellow-600">
                {(roomDetail.electricUsage * roomDetail.electricRate).toFixed(2)} บาท
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-md">
              <p className="text-sm text-green-600">รวมทั้งสิ้น</p>
              <p className="text-xl font-bold text-green-600">
                {((roomDetail.waterUsage * roomDetail.waterRate) + (roomDetail.electricUsage * roomDetail.electricRate)).toFixed(2)} บาท
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomMeterDetail;
