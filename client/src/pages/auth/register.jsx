import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaEnvelope, FaLock, FaPhone } from 'react-icons/fa'; // ✅ เพิ่ม icons
import axios from 'axios';
import bgImage from '../../assets/bg.png';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API_URL from '../../config/api';

function Register({ setIsAuthenticated }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = async () => {
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        password: formData.password
      });

      const data = response.data;

      if (data.success) {
        toast.success('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
        setTimeout(() => {
          navigate('/login');
        }, 1500); // รอให้ toast แสดงก่อนเปลี่ยนหน้า
      } else {
        toast.error(data.message || 'สมัครสมาชิกไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Register error:', error);
      if (error.response && error.response.data) {
        toast.error(error.response.data.message || 'สมัครสมาชิกไม่สำเร็จ');
      } else {
        toast.error('เกิดข้อผิดพลาดในการสมัครสมาชิก');
      }
    }
  };

  const goToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="relative flex justify-center items-center min-h-screen bg-gray-100 overflow-hidden">
      <img
        src={bgImage}
        alt="background"
        className="absolute top-0 left-0 w-full h-full object-cover opacity-20 z-0"
      />

      <div className="relative z-10 bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-gray-600 text-center mb-6">
          สมัครสมาชิก
        </h2>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {/* Username Field */}
          <div className="relative">
            <input
              type="text"
              name="username"
              placeholder="ชื่อผู้ใช้"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              value={formData.username}
              onChange={handleChange}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <FaUser className="text-gray-400 w-5 h-5" />
            </div>
          </div>

          {/* Email Field */}
          <div className="relative">
            <input
              type="email"
              name="email"
              placeholder="อีเมล"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              value={formData.email}
              onChange={handleChange}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <FaEnvelope className="text-gray-400 w-5 h-5" />
            </div>
          </div>

          {/* Phone Field */}
          <div className="relative">
            <input
              type="tel"
              name="phone"
              placeholder="เบอร์โทรศัพท์ (ไม่บังคับ)"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              value={formData.phone}
              onChange={handleChange}
              onInput={e => e.target.value = e.target.value.replace(/[^0-9]/g, '')}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <FaPhone className="text-gray-400 w-5 h-5" />
            </div>
          </div>

          {/* Password Field */}
          <div className="relative">
            <input
              type="password"
              name="password"
              placeholder="รหัสผ่าน"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              value={formData.password}
              onChange={handleChange}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <FaLock className="text-gray-400 w-5 h-5" />
            </div>
          </div>

          {/* Confirm Password Field */}
          <div className="relative">
            <input
              type="password"
              name="confirmPassword"
              placeholder="ยืนยันรหัสผ่าน"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              value={formData.confirmPassword}
              onChange={handleChange}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <FaLock className="text-gray-400 w-5 h-5" />
            </div>
          </div>

          {/* Register Button */}
          <button
            type="button"
            onClick={handleRegister}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-md font-semibold text-lg transition-colors duration-200"
          >
            สมัครสมาชิก
          </button>

          {/* Login Link */}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600 font-bold">
              มีบัญชีอยู่แล้ว?
              <button
                type="button"
                onClick={goToLogin}
                className="text-blue-600 hover:text-blue-800 font-bold ml-1 hover:underline"
              >
                เข้าสู่ระบบ
              </button>
            </p>
          </div>
        </form>
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

export default Register;
