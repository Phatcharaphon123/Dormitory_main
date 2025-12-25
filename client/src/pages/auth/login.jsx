import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock } from "react-icons/fa"; // เปลี่ยนไอคอนเป็นรูปซองจดหมาย
import axios from "axios";
import bgImage from "../../assets/bg.png";
import { useAuth } from "../../contexts/AuthContext";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import API_URL from "../../config/api";

function Login() {
  // เปลี่ยนจาก username เป็น email ให้ตรงกับ Backend
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    try {
      // ส่ง email และ password ไปที่ API
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email: email,
        password: password,
      });

      const data = response.data;

      if (data.success) {
        // ดึงข้อมูลจาก payload และ token (ตาม Backend ใหม่)
        const { token, payload } = data;

        // บันทึกลง Context (User Storage)
        login(token, payload);

        toast.success("เข้าสู่ระบบสำเร็จ!");

        // ตรวจสอบ Role เพื่อพาไปหน้าเว็บที่ถูกต้อง
        setTimeout(() => {
          // ✅ 1. เช็ค SUPER_ADMIN ก่อนเลย ให้ไปหน้า /admin/dashboard
          if (payload.role === "SUPER_ADMIN") {
            navigate("/admin/dashboard");
          }
          // ✅ 2. OWNER ไปหน้า Dashboard ปกติ
          else if (payload.role === "OWNER") {
            navigate("/dashboard");
          }
          // ✅ 3. STAFF
          else if (payload.role === "STAFF") {
            if (payload.staffDormId) {
              navigate(`/dashboard/${payload.staffDormId}`);
            } else {
              toast.warning("บัญชีนี้ยังไม่ได้ผูกกับหอพัก");
              navigate("/login");
            }
          }
          // ✅ 4. TENANT
          else if (payload.role === "TENANT") {
            navigate("/my-room");
          }
          // Fallback
          else {
            navigate("/login");
          }
        }, 1000);
      } else {
        toast.error(data.message || "เข้าสู่ระบบไม่สำเร็จ");
      }
    } catch (error) {
      console.error("Login error:", error);
      if (error.response && error.response.data) {
        toast.error(error.response.data.message || "เข้าสู่ระบบไม่สำเร็จ");
      } else {
        toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อระบบ");
      }
    }
  };

  const goToRegister = () => {
    navigate("/register");
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
          {/* Email Input */}
          <div className="relative">
            <input
              type="email"
              placeholder="อีเมล (Email)"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <FaEnvelope className="text-gray-400 w-5 h-5" />
            </div>
          </div>

          {/* Password Input */}
          <div className="relative">
            <input
              type="password"
              placeholder="รหัสผ่าน (Password)"
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
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-lg transition-colors duration-200 shadow-md"
          >
            เข้าสู่ระบบ
          </button>
        </form>

        {/* ไปหน้าสมัคร */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            ยังไม่มีบัญชีเจ้าของหอพัก?
            <button
              type="button"
              onClick={goToRegister}
              className="text-blue-600 hover:text-blue-800 font-bold ml-1 hover:underline"
            >
              สมัครสมาชิกใหม่
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
