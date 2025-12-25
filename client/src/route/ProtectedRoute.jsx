import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// รับ prop: children และ allowedRoles
const ProtectedRoute = ({ children, allowedRoles }) => {
  // ✅ 1. ดึง logout มาด้วย (เพื่อความชัวร์ว่าดีดออกจริง)
  const { isAuthenticated, user, loading, logout } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>; 
  }

  // 2. ถ้ายังไม่ Login -> ดีดไปหน้า Login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 3. ถ้า Login แล้ว แต่ Role ไม่ตรงกับที่อนุญาต
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    logout(); // สั่งลบ Token ออกจากเครื่อง
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;