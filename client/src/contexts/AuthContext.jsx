import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  // เริ่มต้นเป็น true เสมอ เพื่อรอเช็ค Token ให้เสร็จก่อนค่อยแสดงหน้าเว็บ
  const [loading, setLoading] = useState(true);

  // ฟังก์ชันตั้งค่า Header ให้ Axios (Helper Function)
  const setAxiosAuthHeader = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // ตรวจสอบสถานะการเข้าสู่ระบบเมื่อเริ่มต้น (Refresh หน้าจอ)
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
            // ตั้งค่า Header รอไว้เลย
            setAxiosAuthHeader(token);

            // ยิงไปเช็คกับ Backend ว่า Token ยังดีอยู่ไหม
            const response = await axios.get(`${API_URL}/api/auth/verify`);
            
            if (response.data.success) {
                setIsAuthenticated(true);
                setUser(response.data.user);
            } else {
                // Token ไม่ผ่าน (เช่น หมดอายุ หรือโดนแบน)
                logout();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            logout();
        }
      }
      
      // ไม่ว่าจะผ่านหรือไม่ผ่าน ต้องหยุด Loading เสมอ
      setLoading(false);
    };

    initAuth();
  }, []);

  // ฟังก์ชัน Login (เรียกใช้จากหน้า Login.js)
  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // ✅ ตั้งค่า Header ทันทีที่ล็อกอินผ่าน
    setAxiosAuthHeader(token);
    
    setIsAuthenticated(true);
    setUser(userData);
  };

  // ฟังก์ชัน Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // ✅ ลบ Header ออก
    setAxiosAuthHeader(null);
    
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    setIsAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {/* ✅ แก้จุดสำคัญ: ถ้ายังโหลดไม่เสร็จ ไม่ต้องแสดงเนื้อหาข้างใน */}
      {!loading ? children : (
        // (Optional) ใส่ Loading Spinner ตรงนี้ได้ถ้าต้องการ
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
        </div>
      )}
    </AuthContext.Provider>
  );
};