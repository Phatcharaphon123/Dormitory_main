import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { FaRegImage, FaTrash } from "react-icons/fa";
import { IoIosArrowBack,IoIosArrowForward } from "react-icons/io";
import { PiSealWarningFill } from "react-icons/pi";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API_URL from '../../../config/api';

function SettingRoomType() {
  const { dormId } = useParams();
  
  const [formData, setFormData] = useState({
    name: '',
    size: '',
    amenities: [],
    monthlyPrice: '',
    monthlyDeposit: '',
    advancePayment: '',
    existingImages: [], // รูปภาพเก่าที่มีอยู่แล้ว (จาก backend)
    newImages: [], // รูปภาพใหม่ที่ผู้ใช้เลือก
  });

  const [roomTypes, setRoomTypes] = useState([]);
  const [amenitiesList, setAmenitiesList] = useState(['แอร์', 'Wi-Fi', 'ตู้เย็น', 'เครื่องทำน้ำอุ่น']);
  const [newAmenity, setNewAmenity] = useState('');
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState({}); // เก็บ index รูปภาพปัจจุบันของแต่ละ room
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);

  // โหลดข้อมูล room types เมื่อ component mount
  useEffect(() => {
    fetchRoomTypes();
  }, [dormId]);

  // ฟังก์ชันดึงข้อมูล room types จาก backend
  const fetchRoomTypes = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/room-types/dormitories/${dormId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = response.data;
        
        // ตรวจสอบและแก้ไขข้อมูล amenities ถ้าจำเป็น
      const sanitizedData = data.map(room => ({
        ...room,
        amenities: (() => {
          try {
            if (Array.isArray(room.amenities)) {
              return room.amenities;
            } else if (typeof room.amenities === 'string') {
              return JSON.parse(room.amenities);
            }
            return [];
          } catch (error) {
            return [];
          }
        })(),
        images: (() => {
          if (Array.isArray(room.images)) {
            // ถ้าเป็น array ของ string ให้แปลงเป็น object
            if (room.images.length > 0 && typeof room.images[0] === "string") {
              return room.images.map(img => ({ image_url: img }));
            }
            return room.images;
          }
          if (typeof room.images === "string" && room.images) {
            try {
              const arr = JSON.parse(room.images);
              if (Array.isArray(arr)) {
                if (arr.length > 0 && typeof arr[0] === "string") {
                  return arr.map(img => ({ image_url: img }));
                }
                return arr;
              }
            } catch {
              return [];
            }
          }
          return [];
        })(),
      }));
      setRoomTypes(sanitizedData);
              
      // เซ็ต currentImageIndex สำหรับแต่ละห้อง
      const imageIndexes = {};
      sanitizedData.forEach((room, index) => {
        imageIndexes[index] = 0;
      });
      setCurrentImageIndex(imageIndexes);
    } catch (error) {
      console.error('Error fetching room types:', error);
      if (error.response) {
        console.error('Failed to fetch room types:', error.response.status);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.response.status);
      } else {
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (amenity) => {
    setFormData((prev) => {
      const hasAmenity = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: hasAmenity
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  const handleAddAmenity = () => {
    const trimmed = newAmenity.trim();
    if (trimmed && !amenitiesList.includes(trimmed)) {
      setAmenitiesList((prev) => [...prev, trimmed]);
      setNewAmenity('');
    }
  };

  const handleAdd = async () => {
    if (!formData.name) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setIsLoading(true);
    
    try {
      // เตรียมข้อมูลเป็น FormData เพื่อส่งไฟล์
      const formDataToSend = new FormData();
      
      console.log('Sending amenities:', formData.amenities); // Debug log
      
      formDataToSend.append('name', formData.name);
      formDataToSend.append('monthly_rent', formData.monthlyPrice || '0');
      formDataToSend.append('security_deposit', formData.monthlyDeposit || '0');
      formDataToSend.append('prepaid_amount', formData.advancePayment || '0');
      formDataToSend.append('amenities', JSON.stringify(formData.amenities));

      if (selectedRoomIndex === null) {
        // สร้างใหม่ - ใช้ newImages เท่านั้น
        console.log('=== FRONTEND DEBUG: CREATE NEW ROOM TYPE ===');
        console.log('newImages:', formData.newImages);
        console.log('newImages length:', formData.newImages.length);
        
        formData.newImages.forEach((image, index) => {
          if (image instanceof File) {
            console.log(`Adding image ${index}:`, image.name, image.size, image.type);
            formDataToSend.append('images', image);
          } else {
            console.log(`Image ${index} is not a File:`, image);
          }
        });

        // DEBUG: ดูค่าที่ส่งไป
        console.log('FormData entries:', [...formDataToSend.entries()]);

        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${API_URL}/api/room-types/dormitories/${dormId}`,
          formDataToSend,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        console.log('Response status:', response.status);
        if (response.status === 200 || response.status === 201) {
          const result = response.data;
          console.log('Success response:', result);
          toast.success('เพิ่มประเภทห้องสำเร็จ');
          fetchRoomTypes();
        } else {
          console.error('Error response:', response.data);
          toast.error('เกิดข้อผิดพลาด: ' + (response.data?.error || 'Unknown error'));
        }
      } else {
        // อัพเดต - ส่งทั้ง existing และ new images
        formDataToSend.append('existing_images', JSON.stringify(formData.existingImages));
        
        formData.newImages.forEach((image) => {
          if (image instanceof File) {
            formDataToSend.append('images', image);
          }
        });

        const roomTypeId = roomTypes[selectedRoomIndex].room_type_id;
        const token = localStorage.getItem('token');
        const response = await axios.put(
          `${API_URL}/api/room-types/dormitories/${dormId}/${roomTypeId}`,
          formDataToSend,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.status === 200) {
          toast.success('อัพเดตประเภทห้องสำเร็จ');
          fetchRoomTypes();
        } else {
          toast.error('เกิดข้อผิดพลาด: ' + (response.data?.error || 'Unknown error'));
        }
      }

      // รีเซ็ตฟอร์ม
      setFormData({
        name: '',
        amenities: [],
        monthlyPrice: '',
        monthlyDeposit: '',
        advancePayment: '',
        existingImages: [],
        newImages: [],
      });
      setSelectedRoomIndex(null);

    } catch (error) {
      console.error('Error saving room type:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (index) => {
    setRoomToDelete(index);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (roomToDelete === null) return;

    setIsLoading(true);

    try {
      const roomTypeId = roomTypes[roomToDelete].room_type_id;
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/api/room-types/dormitories/${dormId}/${roomTypeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 200) {
        toast.success('ลบประเภทห้องสำเร็จ');
        fetchRoomTypes(); // โหลดข้อมูลใหม่
      } else {
        const error = response.data || {};
        
        // ตรวจสอบ status code 400 หรือข้อความ error ที่เกี่ยวกับการใช้งาน
        if (
          response.status === 400 ||
          (error.error && 
            (error.error.includes("มีห้องใช้งานอยู่") ||
             error.error.includes("room(s) are using this type") ||
             error.error.includes("cannot delete") ||
             error.error.includes("in use") ||
             error.error.includes("ถูกใช้งาน"))
          )
        ) {
          toast.error('ไม่สามารถลบประเภทห้องนี้ได้\n\nประเภทห้องนี้ถูกใช้งานอยู่ในห้องพักบางห้อง\nกรุณาเปลี่ยนประเภทห้องของห้องที่ใช้งานประเภทนี้ก่อน แล้วลองอีกครั้ง');
        } else {
          toast.error('เกิดข้อผิดพลาดในการลบ: ' + (error.error || error.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error deleting room type:', error);
      toast.error('ไม่สามารถลบประเภทห้องนี้ได้\n\nประเภทห้องนี้ถูกใช้งานอยู่ในห้องพักบางห้อง\nกรุณาเปลี่ยนประเภทห้องของห้องที่ใช้งานประเภทนี้ก่อน แล้วลองอีกครั้ง');
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
      setRoomToDelete(null);
    }
  };

  const handleDeleteAmenity = (amenityToDelete) => {
    setAmenitiesList((prev) => prev.filter((a) => a !== amenityToDelete));
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.filter((a) => a !== amenityToDelete),
    }));
  };

  const handleEdit = (index) => {
    const room = roomTypes[index];
    
    // ปลอดภัยในการ parse amenities
    let amenitiesArray = [];
    try {
      if (Array.isArray(room.amenities)) {
        amenitiesArray = room.amenities;
      } else if (typeof room.amenities === 'string') {
        amenitiesArray = JSON.parse(room.amenities);
      }
    } catch (error) {
      console.error('Error parsing amenities:', error);
      amenitiesArray = [];
    }
    
    setFormData({
      name: room.room_type_name,
      amenities: amenitiesArray,
      monthlyPrice: room.monthly_rent || '',
      monthlyDeposit: room.security_deposit || '',
      advancePayment: room.prepaid_amount || '',
      existingImages: room.images ? room.images.map(img => img.image_url) : [], // รูปเก่า
      newImages: [], // รูปใหม่เริ่มต้นเป็นว่าง
    });
    setSelectedRoomIndex(index);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    console.log('=== IMAGE SELECTION DEBUG ===');
    console.log('Selected files:', files);
    console.log('Files length:', files.length);
    files.forEach((file, index) => {
      console.log(`File ${index}:`, file.name, file.size, file.type);
    });
    
    if (files.length > 0) {
      // เพิ่มไฟล์ใหม่เข้าไปใน newImages
      setFormData((prev) => { 
        const newData = { ...prev, newImages: [...prev.newImages, ...files] };
        console.log('Updated formData.newImages:', newData.newImages);
        return newData;
      });
    }
  };

  const handleRemoveExistingImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      existingImages: prev.existingImages.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleRemoveNewImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      newImages: prev.newImages.filter((_, index) => index !== indexToRemove)
    }));
  };


  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-lg font-bold mb-4 text-blue-700">กำหนดประเภทห้อง</h2>

      {/* กล่องข้อมูลสำคัญ */}
      <div className="bg-blue-50 border border-blue-300 rounded-md p-3 mb-4">
        <div className="flex items-start gap-2">
          <span className="text-gray-600 text-lg">⚠️</span>
          <div className="text-sm text-gray-800">
            <p className="font-medium mb-1">ข้อมูลสำคัญ:</p>
            <ul className="space-y-1 text-sm">
              <li>• <strong className='text-blue-600'>สามารถแก้ไขข้อมูลประเภทห้องได้ตลอดเวลา</strong> เช่น ชื่อ ราคา สิ่งอำนวยความสะดวก และรูปภาพ</li>
              <li>• <strong className='text-red-500'>ลบได้เฉพาะประเภทห้องที่ไม่มีห้องพักใช้งานอยู่</strong> เพื่อป้องกันการสูญหายของข้อมูลสำคัญ</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ฟอร์ม */}
        <div className="bg-white p-4 rounded-md border border-gray-300 shadow-sm h-fit ">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-600">ชื่อประเภทห้อง</label>
              <input
                type="text"
                name="name"
                className="w-full border px-3 py-2 rounded-md text-sm"
                value={formData.name}
                onChange={handleChange}
                placeholder="เช่น ห้องแอร์"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-bold text-gray-600">ค่ารายเดือน (บาท)</label>
                <input
                  type="number"
                  name="monthlyPrice"
                  min={0}
                  className="w-full border px-3 py-2 rounded-md text-sm"
                  value={formData.monthlyPrice}
                  onChange={handleChange}
                  placeholder="เช่น 3500"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-600">เงินประกัน (บาท)</label>
                <input
                  type="number"
                  name="monthlyDeposit"
                  min={0}
                  className="w-full border px-3 py-2 rounded-md text-sm"
                  value={formData.monthlyDeposit}
                  onChange={handleChange}
                  placeholder="เช่น 5000"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-600">ค่าล่วงหน้า (บาท)</label>
                <input
                  type="number"
                  name="advancePayment"
                  min={0}
                  className="w-full border px-3 py-2 rounded-md text-sm"
                  value={formData.advancePayment}
                  onChange={handleChange}
                  placeholder="เช่น 3500"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-600 block mb-2">สิ่งอำนวยความสะดวก</label>
              <div className="flex flex-wrap gap-3 mb-2">
                {amenitiesList.map((item, index) => (
                  <div key={index} className="flex items-center gap-1 border px-2 py-1 rounded-md bg-gray-100">
                    <label className="text-sm flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={formData.amenities.includes(item)}
                        onChange={() => handleCheckbox(item)}
                      />
                      {item}
                    </label>
                    <button
                      onClick={() => handleDeleteAmenity(item)}
                      className="text-red-500 hover:text-red-700 text-xs font-bold"
                      title="ลบ"
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  placeholder="เพิ่มสิ่งอำนวยความสะดวกใหม่"
                  className="flex-1 border px-3 py-2 rounded-md text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddAmenity}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                >
                  เพิ่ม
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600 block mb-1">รูปภาพประเภทห้อง</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="w-full border border-black rounded-md px-3 py-2 text-sm"
              />
              
              {/* แสดงรูปภาพที่เลือก */}
              {(formData.existingImages.length > 0 || formData.newImages.length > 0) && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    รูปภาพทั้งหมด ({formData.existingImages.length + formData.newImages.length} รูป)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {/* แสดงรูปเก่า */}
                    {formData.existingImages.map((imageUrl, index) => (
                      <div key={`existing-${index}`} className="relative">
                        <img
                          src={`${API_URL}/uploads/${imageUrl}`}
                          alt={`existing ${index}`}
                          className="w-full h-30 object-cover rounded-md border"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                        <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-1 rounded-md">
                          เก่า
                        </div>
                      </div>
                    ))}
                    
                    {/* แสดงรูปใหม่ */}
                    {formData.newImages.map((image, index) => (
                      <div key={`new-${index}`} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`new preview ${index}`}
                          className="w-full h-30 object-cover rounded-md border"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                        >
                          ×
                        </button>
                        <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1 rounded-md">
                          ใหม่
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>



            <button
              onClick={handleAdd}
              disabled={isLoading}
              className={`mt-2 px-6 py-2 rounded-md text-sm ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {isLoading 
                ? 'กำลังบันทึก...' 
                : (selectedRoomIndex === null ? 'เพิ่มประเภทห้อง' : 'อัปเดตประเภทห้อง')
              }
            </button>
          </div>
        </div>

        {/* รายการห้อง */}
        <div className="bg-white p-4 rounded-md border border-gray-300 shadow-sm h-fit">
          <h3 className="text-md font-semibold text-gray-700 mb-2">รายการประเภทห้องที่เพิ่ม</h3>
          {isLoading ? (
            <p className="text-sm text-gray-500">กำลังโหลด...</p>
          ) : roomTypes.length === 0 ? (
            <p className="text-sm text-gray-500">ยังไม่มีข้อมูล</p>
          ) : (
          <div className={`${roomTypes.length > 3 ? 'max-h-146 overflow-y-auto' : ''} space-y-3`}>
          {roomTypes.map((room, index) => {
            const currentImg = currentImageIndex[index] || 0;
            const roomImages = room.images || [];
            
            return (
            <div
              key={room.room_type_id || index}
              className="border border-gray-300 rounded-md p-3 shadow-sm bg-white flex items-start gap-4 relative"
            >
              {/* รูปภาพด้านซ้าย */}
              <div className="w-60 h-40 border border-gray-300 rounded-md flex items-center justify-center overflow-hidden bg-gray-50 relative">
                {roomImages && roomImages.length > 0 ? (
                  <>
                    <img
                      src={`${API_URL}/uploads/${roomImages[currentImg]?.image_url || roomImages[currentImg]}`}
                      alt="room"
                      className="object-cover w-full h-full"
                    />
                    
                    {/* ตัวควบคุมการเลื่อนรูป */}
                    {roomImages.length > 1 && (
                      <>
                        {/* ปุ่มซ้าย */}
                        {currentImg > 0 && (
                          <button
                            onClick={() => setCurrentImageIndex(prev => ({
                              ...prev,
                              [index]: currentImg - 1
                            }))}
                            className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-blue-500  text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-opacity-70"
                          >
                            <IoIosArrowBack size={15}/>
                          </button>
                        )}
                        
                        {/* ปุ่มขวา */}
                        {currentImg < roomImages.length - 1 && (
                          <button
                            onClick={() => setCurrentImageIndex(prev => ({
                              ...prev,
                              [index]: currentImg + 1
                            }))}
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-blue-500  text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-opacity-70"
                          >
                            <IoIosArrowForward size={15}/>
                          </button>
                        )}
                        
                        {/* จุดบอกตำแหน่งรูป */}
                        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
                          {roomImages.map((_, imgIndex) => (
                            <div
                              key={imgIndex}
                              className={`w-1.5 h-1.5 rounded-full ${
                                imgIndex === currentImg ? 'bg-white' : 'bg-white bg-opacity-50'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400 text-sm">
                    <FaRegImage className="text-2xl mb-1" />
                    <p>ยังไม่มีรูปภาพ</p>
                  </div>
                )}
              </div>

              {/* รายละเอียดห้อง */}
              <div className="flex-1">
                {/* ปุ่มแก้ไข/ลบ */}
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    onClick={() => handleEdit(index)}
                    disabled={isLoading}
                    className={`px-3 py-1 rounded-md text-xs ${
                      isLoading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-500 hover:bg-blue-600'
                    } text-white`}
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(index)}
                    disabled={isLoading}
                    className={`px-3 py-1 rounded-md text-xs ${
                      isLoading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-red-500 hover:bg-red-600'
                    } text-white`}
                  >
                    ลบ
                  </button>
                </div>

                {/* ข้อมูลห้อง */}
                <p className="text-sm"><strong>ชื่อ:</strong> {room.room_type_name}</p>
                <p className="text-sm"><strong>ค่ารายเดือน:</strong> {room.monthly_rent || '-'} บาท</p>
                <p className="text-sm"><strong>เงินประกันรายเดือน:</strong> {room.security_deposit || '-'} บาท</p>
                <p className="text-sm"><strong>ค่าล่วงหน้า:</strong> {room.prepaid_amount || '-'} บาท</p>
                <p className="text-sm">
                  <strong>สิ่งอำนวยความสะดวก:</strong>{' '}
                  {(() => {
                    try {
                      const amenities = Array.isArray(room.amenities)
                        ? room.amenities
                        : JSON.parse(room.amenities || '[]');

                      return amenities.length > 0 ? amenities.join(', ') : 'ไม่มี';
                    } catch (e) {
                      return 'ไม่มี';
                    }
                  })()}
                </p>
              </div>
            </div>
            );
          })}
          </div>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Popup */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-[10vh]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-md bg-red-100 mb-4">
                <FaTrash className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ยืนยันการลบประเภทห้อง
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                คุณต้องการลบประเภทห้อง "{roomToDelete !== null ? roomTypes[roomToDelete]?.room_type_name : ''}" หรือไม่?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setRoomToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isLoading ? 'กำลังลบ...' : 'ลบ'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
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

export default SettingRoomType;
