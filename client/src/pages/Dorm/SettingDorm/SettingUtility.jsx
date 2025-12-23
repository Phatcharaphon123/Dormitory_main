import React, { useState } from "react";
import { FaTint, FaBolt } from "react-icons/fa";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Component สำหรับ Confirmation Popup
function ConfirmationPopup({ isOpen, onClose, onConfirm, title, message, waterRate, electricRate }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-start justify-center pt-10">
      <div className="bg-white border border-gray-300 rounded-md shadow-lg w-[90%] md:w-[500px] p-6 z-50">
        <h2 className="text-lg font-semibold text-blue-700 mb-4">{title}</h2>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-4">{message}</p>
          
          {/* แสดงข้อมูลที่จะบันทึก */}
          <div className="bg-gray-50 p-4 rounded-md border">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ค่าน้ำ:</span>
                <span className="text-sm font-semibold">{waterRate} บาท/หน่วย</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">ค่าไฟ:</span>
                <span className="text-sm font-semibold">{electricRate} บาท/หน่วย</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button 
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md transition-colors"
            onClick={onClose}
          >
            ยกเลิก
          </button>
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            onClick={onConfirm}
          >
            ยืนยันการบันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingUtility() {
  const { dormId } = useParams();
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);

  useEffect(() => {
    const fetchUtilityRates = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:3001/api/utilities/dormitories/${dormId}/rates`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = response.data;
        setFormData({
          waterValue: data.water_rate ? data.water_rate.toString() : "",
          electricValue: data.electricity_rate ? data.electricity_rate.toString() : "",
        });
      } catch (err) {
        console.error("Error loading utility rates:", err);
        toast.error("ไม่สามารถโหลดข้อมูลค่าสาธารณูปโภคได้");
        // ตั้งค่าเป็นค่าว่างถ้าไม่สามารถโหลดได้
        setFormData({
          waterValue: "",
          electricValue: "",
        });
      }
    };

    if (dormId) {
      fetchUtilityRates();
    }
  }, [dormId]);

  const [formData, setFormData] = useState({
    waterValue: "",
    electricValue: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveClick = () => {
    if (!formData.waterValue || !formData.electricValue) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    // ตรวจสอบว่าเป็นตัวเลขที่ถูกต้อง
    const waterRate = parseFloat(formData.waterValue);
    const electricRate = parseFloat(formData.electricValue);
    
    if (isNaN(waterRate) || isNaN(electricRate) || waterRate <= 0 || electricRate <= 0) {
      toast.error("กรุณากรอกตัวเลขที่ถูกต้องและมากกว่า 0");
      return;
    }

    // แสดง popup ยืนยัน
    setShowConfirmPopup(true);
  };

  const handleConfirmSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:3001/api/utilities/dormitories/${dormId}/rates`,
        {
          water_rate: parseFloat(formData.waterValue),
          electricity_rate: parseFloat(formData.electricValue),
        },
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          }
        }
      );

      const data = response.data;
      toast.success("บันทึกสำเร็จ!");
      console.log("response:", data);
      setShowConfirmPopup(false);
    } catch (err) {
      console.error("error:", err);
      let errorMessage = "เกิดข้อผิดพลาดในการบันทึก";
      
      if (err.response && err.response.data && err.response.data.error) {
        errorMessage = err.response.data.error;
      } else if (err.response && err.response.status) {
        errorMessage = `เกิดข้อผิดพลาด (${err.response.status}): ${err.response.statusText}`;
      }
      
      toast.error(errorMessage);
      setShowConfirmPopup(false);
    }
  };

  const InputWithUnit = ({
    label,
    name,
    value,
    onChange,
    placeholder,
    unit,
  }) => (
    <div className="mb-3">
      <label className="text-sm text-gray-700 block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="flex-1 border rounded-md px-3 py-2 text-sm"
        />
        <span className="text-sm text-gray-600 whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
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
      <h2 className="text-lg font-semibold mb-4 text-blue-700">
        กำหนดค่าน้ำและค่าไฟ
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* กล่องค่าน้ำ */}
        <div className="bg-white p-4 rounded-md border border-gray-300 flex gap-4 shadow-sm">
          <div className="flex flex-col items-center">
            <span className="font-semibold text-sm mb-1">ค่าน้ำ</span>
            <div className="w-30 h-30 border-2 border-blue-600 bg-white rounded-md flex items-center justify-center">
              <FaTint size={50} className="text-4xl text-blue-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-md font-semibold mb-2">การคิดค่าน้ำ (ตามหน่วย)</h3>
            <InputWithUnit
              label="ราคาต่อหน่วย"
              name="waterValue"
              value={formData.waterValue}
              onChange={handleChange}
              placeholder="ระบุจำนวน"
              unit="บาท/หน่วย"
            />
          </div>
        </div>

        {/* กล่องค่าไฟ */}
        <div className="bg-white p-4 rounded-md border border-gray-300 flex gap-4 h-fit shadow-sm">
          <div className="flex flex-col items-center">
            <span className="font-semibold text-sm mb-1">ค่าไฟ</span>
            <div className="w-30 h-30 border-2 border-yellow-400 bg-white rounded-md flex items-center justify-center">
              <FaBolt size={50} className="text-4xl text-yellow-400" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-md font-semibold mb-2">การคิดค่าไฟ (ตามหน่วย)</h3>
            <InputWithUnit
              label="ราคาต่อหน่วย"
              name="electricValue"
              value={formData.electricValue}
              onChange={handleChange}
              placeholder="ระบุจำนวน"
              unit="บาท/หน่วย"
            />
          </div>
        </div>
      </div>

      {/* ปุ่มบันทึก */}
      <div className="mt-6 flex gap-4 justify-end">
        <button
          onClick={handleSaveClick}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
        >
          บันทึก
        </button>
      </div>

      {/* Confirmation Popup */}
      <ConfirmationPopup
        isOpen={showConfirmPopup}
        onClose={() => setShowConfirmPopup(false)}
        onConfirm={handleConfirmSave}
        title="ยืนยันการบันทึกข้อมูล"
        message="คุณต้องการบันทึกค่าน้ำและค่าไฟดังต่อไปนี้หรือไม่?"
        waterRate={formData.waterValue}
        electricRate={formData.electricValue}
      />
    </div>
  );
}

export default SettingUtility;