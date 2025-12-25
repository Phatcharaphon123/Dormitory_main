import React, { useState, useEffect } from 'react';
import { FaHome, FaBed, FaFileContract, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { HiOutlineUserGroup, HiOutlineLogout } from 'react-icons/hi';
import Contract from './Contract';
import MoveOutContract from './MoveOutContract';
import { useNavigate, useParams } from 'react-router-dom';
import { FaRegImage } from "react-icons/fa";
import axios from 'axios';
import API_URL from '../../../config/api';

function RoomDetail() {
  const [contractType, setContractType] = useState('contract');
  const [roomData, setRoomData] = useState(null);
  const [roomType, setRoomType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigate = useNavigate();
  const { dormId, roomNumber } = useParams();

  useEffect(() => {
    const fetchRoomData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        // ดึงข้อมูลห้องพักทั้งหมดตามชั้น
        const roomsResponse = await axios.get(`${API_URL}/api/rooms/dormitories/${dormId}/by-floor`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // หาห้องที่ตรงกับ roomNumber
        let foundRoom = null;
        
        for (const floor of roomsResponse.data) {
          foundRoom = floor.rooms.find(room => room.number === roomNumber);
          if (foundRoom) {
            foundRoom.floor_number = floor.floorNumber;
            break;
          }
        }

        if (!foundRoom) {
          setError('ไม่พบข้อมูลห้องที่ระบุ');
          return;
        }
        setRoomData(foundRoom);

        // ดึงข้อมูลประเภทห้อง ถ้ามี room_type_id
        if (foundRoom.room_type_id) {
          try {
            const roomTypeResponse = await axios.get(`${API_URL}/api/room-types/dormitories/${dormId}/${foundRoom.room_type_id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const roomTypeData = roomTypeResponse.data;

            // ปรับ logic ให้ robust ขึ้น
            let amenitiesArr = [];
            if (roomTypeData.amenities) {
              if (Array.isArray(roomTypeData.amenities)) {
                amenitiesArr = roomTypeData.amenities.filter(item => item && String(item).trim() !== '');
              } else if (typeof roomTypeData.amenities === 'string') {
                try {
                  const parsed = JSON.parse(roomTypeData.amenities);
                  if (Array.isArray(parsed)) {
                    amenitiesArr = parsed.filter(item => item && String(item).trim() !== '');
                  } else if (typeof parsed === 'object' && parsed !== null) {
                    amenitiesArr = Object.values(parsed).filter(item => typeof item === 'string' && item.trim() !== '');
                  } else if (typeof parsed === 'string' && parsed.trim() !== '') {
                    amenitiesArr = [parsed];
                  }
                } catch {
                  if (roomTypeData.amenities.trim() !== '') {
                    amenitiesArr = [roomTypeData.amenities];
                  }
                }
              } else if (typeof roomTypeData.amenities === 'object' && roomTypeData.amenities !== null) {
                amenitiesArr = Object.values(roomTypeData.amenities).filter(item => typeof item === 'string' && item.trim() !== '');
              }
            }
            roomTypeData.amenities = amenitiesArr;
            setRoomType(roomTypeData);
          } catch (roomTypeError) {
            console.error('❌ Error fetching room type:', roomTypeError);
            console.log('⚠️ Failed to fetch room type, continuing without it');
            // ไม่ throw error ให้หน้าแสดงผลได้แม้ไม่มีข้อมูล room type
          }
        } else {
          console.log('ℹ️ Room has no room_type_id');
        }

      } catch (err) {
        console.error('Error fetching room data:', err);
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status
        });
        setError(`เกิดข้อผิดพลาดในการโหลดข้อมูลห้อง: ${err.response?.data?.error || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (dormId && roomNumber) {
      fetchRoomData();
    }
  }, [dormId, roomNumber]);

  const handleContractClick = (type) => {
    setContractType(type);
  };

  // ฟังก์ชันสำหรับการเลื่อนรูปภาพ
  const nextImage = () => {
    if (roomType?.images && roomType.images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === roomType.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (roomType?.images && roomType.images.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? roomType.images.length - 1 : prev - 1
      );
    }
  };

  // Reset currentImageIndex เมื่อ roomType เปลี่ยน
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [roomType]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูลห้อง...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            กลับไปหน้าก่อนหน้า
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6  max-w-7xl">
        {/* Room Details Section */}
        <section className="mb-4 bg-white border border-gray-300 shadow rounded-md overflow-hidden">
          <div className="bg-blue-100 border-b border-gray-300 px-6 py-4">
            <h2 className="text-xl font-semibold text-blue-800">ข้อมูลห้องพัก</h2>
          </div>
          
          <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* คอลัมน์ซ้าย - ข้อมูลห้องพัก */}
            <div className="lg:col-span-1">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-md h-full">
                <h3 className="text-lg font-medium text-blue-700 flex items-center gap-2 mb-4">
                  <FaBed className="text-blue-600" /> ข้อมูลพื้นฐาน
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-b-0">
                    <span className="text-gray-600">หมายเลขห้อง:</span>
                    <span className="font-medium text-gray-800">{roomData?.number || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-b-0">
                    <span className="text-gray-600">ชั้น:</span>
                    <span className="font-medium text-gray-800">ชั้น {roomData?.floor_number || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-b-0">
                    <span className="text-gray-600">สถานะ:</span>
                    <span className={`font-medium px-2 py-1 rounded-md text-xs ${
                      roomData?.available 
                        ? 'bg-green-200 text-green-800' 
                        : 'bg-red-200 text-red-800'
                    }`}>
                      {roomData?.available ? '✅ ว่าง' : '❌ ไม่ว่าง'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-b-0">
                    <span className="text-gray-600">ประเภทห้อง:</span>
                    <span className="font-medium text-gray-800">
                      {roomType?.room_type_name || 'ไม่ได้กำหนดประเภท'}
                    </span>
                  </div>
                  {/* รายเดือนและเงินประกัน */}
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-b-0">
                    <span className="text-gray-600">ราคารายเดือน:</span>
                    <span className="font-medium text-blue-600">
                      {roomType?.monthly_rent ? `${parseInt(roomType.monthly_rent).toLocaleString()} บาท/เดือน` : 'ไม่ระบุ'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-b-0">
                    <span className="text-gray-600">เงินประกัน:</span>
                    <span className="font-medium text-blue-600">
                      {roomType?.security_deposit ? `${parseInt(roomType.security_deposit).toLocaleString()} บาท` : 'ไม่ระบุ'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-b-0">
                    <span className="text-gray-600">ค่าล่วงหน้า:</span>
                    <span className="font-medium text-blue-600">
                      {roomType?.prepaid_amount ? `${parseInt(roomType.prepaid_amount).toLocaleString()} บาท` : 'ไม่ระบุ'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* คอลัมน์กลาง - สิ่งอำนวยความสะดวก */}
            <div className="lg:col-span-1">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-md h-full">
                <h4 className="text-lg font-medium text-blue-700 flex items-center gap-2 mb-4">
                  <HiOutlineUserGroup className="text-blue-600" /> สิ่งอำนวยความสะดวก
                </h4>
                <div className={`grid gap-2 ${roomType?.amenities?.length > 0 ? 'grid-cols-2' : 'place-items-center min-h-[120px]'}`}>
                  {(() => {
                    let amenities = [];

                    // ตรวจสอบและแปลง amenities
                    if (roomType?.amenities) {
                      if (Array.isArray(roomType.amenities)) {
                        amenities = roomType.amenities.filter(item => item && String(item).trim() !== '');
                      } else if (typeof roomType.amenities === 'string') {
                        try {
                          const parsed = JSON.parse(roomType.amenities);
                          if (Array.isArray(parsed)) {
                            amenities = parsed.filter(item => item && String(item).trim() !== '');
                          } else if (typeof parsed === 'object' && parsed !== null) {
                            amenities = Object.values(parsed).filter(item => typeof item === 'string' && item.trim() !== '');
                          } else if (typeof parsed === 'string' && parsed.trim() !== '') {
                            amenities = [parsed];
                          }
                        } catch {
                          if (roomType.amenities.trim() !== '') {
                            amenities = [roomType.amenities];
                          }
                        }
                      } else if (typeof roomType.amenities === 'object' && roomType.amenities !== null) {
                        amenities = Object.values(roomType.amenities).filter(item => typeof item === 'string' && item.trim() !== '');
                      }
                    }

                    if (amenities.length > 0) {
                      return amenities.map((amenity, index) => (
                        <div key={index} className="bg-white px-3 py-2 rounded-md border border-blue-100 text-sm text-gray-700 flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          <span className="flex-1">{String(amenity)}</span>
                        </div>
                      ));
                    } else {
                      return (
                        <div className="text-center py-6 col-span-full">
                          <div className="text-gray-400 text-4xl mb-2">🏠</div>
                          <p className="text-gray-500 text-sm">ยังไม่มีข้อมูลสิ่งอำนวยความสะดวก</p>
                          <p className="text-gray-400 text-xs mt-1">สามารถเพิ่มข้อมูลได้ในหน้าตั้งค่าประเภทห้อง</p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>

            {/* คอลัมน์ขวา - รูปภาพ */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-blue-200 p-4 rounded-md h-full">
                <h3 className="text-lg font-medium text-blue-700 flex items-center gap-2 mb-4">
                  <FaHome className="text-blue-600" /> รูปภาพห้องพัก
                </h3>

                {roomType?.images && roomType.images.length > 0 ? (
                  <div className="relative">
                    {/* รูปภาพหลัก */}
                    <div className="relative w-full h-48 mb-3">
                      <img
                        src={`${API_URL}/uploads/${roomType.images[currentImageIndex].image_url}`}
                        alt={`ห้อง ${roomData?.number} - รูปที่ ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover rounded-md border border-gray-200"
                        onError={(e) => {
                          e.target.src = '/api/placeholder/400/200';
                        }}
                      />
                      
                      {/* ปุ่มเลื่อนรูปภาพ */}
                      {roomType.images.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                          >
                            <FaChevronLeft size={16} />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all"
                          >
                            <FaChevronRight size={16} />
                          </button>
                        </>
                      )}
                      
                      {/* Indicator จำนวนรูป */}
                      {roomType.images.length > 1 && (
                        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-md text-xs">
                          {currentImageIndex + 1} / {roomType.images.length}
                        </div>
                      )}
                    </div>

                    {/* Thumbnail รูปภาพ */}
                    {roomType.images.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto">
                        {roomType.images.map((image, index) => (
                          <div
                            key={index}
                            onClick={() => setCurrentImageIndex(index)}
                            className={`flex-shrink-0 w-16 h-16 cursor-pointer rounded-md border-2 overflow-hidden transition-all ${
                              index === currentImageIndex
                                ? 'border-blue-500'
                                : 'border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            <img
                              src={`${API_URL}/uploads/${image.image_url}`}
                              alt={`ห้อง ${roomData?.number} - ภาพย่อ ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gray-100 rounded-md border border-gray-200 flex flex-col justify-center items-center gap-2">
                    <FaRegImage className="text-5xl text-gray-400" />
                    <p className="text-sm text-gray-500">ยังไม่มีรูปภาพ</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* Contract Management Section */}
        <section className="bg-white border border-gray-300 shadow rounded-md overflow-hidden">

          {/* Tab Navigation */}
          <div className="px-4 pt-4 border-b border-gray-300">
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-4 py-2 rounded-t-md font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                  contractType === 'contract'
                    ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b-2 border-transparent'
                }`}
                onClick={() => handleContractClick('contract')}
              >
                <FaFileContract className="text-sm" /> ข้อมูลผู้เช่าปัจจุบัน
              </button>
              <button
                className={`px-4 py-2 rounded-t-md font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                  contractType === 'sold'
                    ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-b-2 border-transparent'
                }`}
                onClick={() => handleContractClick('sold')}
              >
                <HiOutlineLogout className="text-sm" /> สัญญาที่ย้ายออก
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-4">
            {contractType === 'contract' && <Contract />}
            {contractType === 'sold' && <MoveOutContract />}
          </div>
        </section>
      </div>
    </div>
  );
}

export default RoomDetail;
