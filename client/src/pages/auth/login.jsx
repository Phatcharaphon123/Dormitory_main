import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock } from 'react-icons/fa'; // ✅ import icons
import axios from 'axios';
import bgImage from '../../assets/bg.png';
import { useAuth } from '../../contexts/AuthContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import API_URL from '../../config/api';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        username: username,
        password: password
      });

      const data = response.data;

      if (data.success) {
        // ใช้ login function จาก AuthContext
        login(data.token, data.user);
        toast.success('เข้าสู่ระบบสำเร็จ!');
        setTimeout(() => {
          navigate('/youdorm');
        }, 1500); // รอให้ toast แสดงก่อนเปลี่ยนหน้า
      } else {
        toast.error(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response && error.response.data) {
        toast.error(error.response.data.message || 'เข้าสู่ระบบไม่สำเร็จ');
      } else {
        toast.error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
      }
    }
  };

  const goToRegister = () => {
    navigate('/register');
  };

  return (
    <div className="relative flex justify-center items-center min-h-screen bg-gray-100 overflow-hidden">
      {/* พื้นหลังแบบจาง */}
      <img
        src={bgImage}
        alt="background"
        className="absolute top-0 left-0 w-full h-full object-cover opacity-20 z-0"
      />

      {/* กล่อง Login */}
      <div className="relative z-10 bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-gray-600 text-center mb-6 py-6">
          Login เข้าใช้งานระบบ
        </h2>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {/* Username */}
          <div className="relative">
            <input
              type="text"
              placeholder="Username"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <FaUser className="text-gray-400 w-5 h-5" />
            </div>
          </div>

          {/* Password */}
          <div className="relative">
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <FaLock className="text-gray-400 w-5 h-5" />
            </div>
          </div>

          {/* Login Button */}
          <button
            type="button"
            onClick={handleLogin}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-lg transition-colors duration-200"
          >
            Login/เข้าสู่ระบบ
          </button>
        </form>

        {/* ไปหน้าสมัคร */}
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-600 font-bold">
            ยังไม่มีบัญชี?
            <button
              type="button"
              onClick={goToRegister}
              className="text-blue-600 hover:text-blue-800 font-bold ml-1 hover:underline"
            >
              สมัครสมาชิก
            </button>
          </p>
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

export default Login;
