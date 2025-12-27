import React from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";

// Contexts
import { AuthProvider } from "../contexts/AuthContext";

// Components
import ProtectedRoute from "./ProtectedRoute";

// Layouts
import LayoutDormManage from "../layouts/LayoutDormManage";
import LayoutOwnerDorm from "../layouts/LayoutOwnerDorm";
import LayoutTenant from "../layouts/LayoutTenant";

// Main pages
import DormView from "../pages/OwnerDorm/ManageDorm/DormView";
import Profile from "../pages/OwnerDorm/Profile/Profile";
import AddDormInfo from "../pages/OwnerDorm/ManageDorm/Adddorm/AddDormInfo";
import Dashboard from "../pages/OwnerDorm/Dashboard/Dashboard";
import AdminManage from "../pages/OwnerDorm/AdminManage/AdminManage";

// Dorm pages (Imports เหมือนเดิม ย่อเพื่อความกระชับ)
import DashboardDorm from "../pages/DormManage/dashboard/DashboardDorm";
import RoomsPlan from "../pages/DormManage/RoomPlan/RoomPlan";
import Bills from "../pages/DormManage/Bills/MonthBills";
import PendingBills from "../pages/DormManage/Bills/PendingBills";
import AllBills from "../pages/DormManage/Bills/AllBills";
import MonthDetailBills from "../pages/DormManage/Bills/MonthDetailBills";
import RoomDetail from "../pages/DormManage/Room/RoomDetail";
import MonthlyContract from "../pages/DormManage/Room/ContractPages/MonthlyContract";
import MonthlyBills from "../pages/DormManage/Room/ContractPages/ContractReceipt/ReceiptPrint";
import ContractDetail from "../pages/DormManage/Room/ContractPages/ContractDetail";
import CancelContract from "../pages/DormManage/Room/ContractPages/CancelContract";
import MoveOutReceipt from "../pages/DormManage/TenantManage/MoveOutReceipt/MoveOutReceipt";
import MoveOutDetail from "../pages/DormManage/TenantManage/MoveOutDetail";
import MeterReading from "../pages/meter/MeterReading";
import CreateMeterReading from "../pages/meter/CreateMeterReading";
import EditMeterReading from "../pages/meter/EditMeterReading";
import RealTimeMeter from "../pages/meter/RealTimeMeter";
import RoomMeterDetail from "../pages/meter/RoomMeterDetail";
import AddMeterDigital from "../pages/meter/AddMeterDigital";
import MoveOuWaitforMoveOut from "../pages/DormManage/TenantManage/WaitforMoveOut";
import MoveOut from "../pages/DormManage/TenantManage/MoveOut";
import Receipts from "../pages/DormManage/Reports/Receipts";
import MonthlyBillsReport from "../pages/DormManage/Reports/MonthlyBillsReport";
import TenantReport from "../pages/DormManage/Reports/TenantReport";
import UtilitySummaryReport from "../pages/DormManage/Reports/UtilitySummaryReport";
import ReceiptPrint from "../pages/DormManage/Room/ContractPages/ContractReceipt/ReceiptPrint";
import SettingDormNavbar from "../pages/DormManage/SettingDorm/SettingDormNavbar";
import SettingDormInfo from "../pages/DormManage/SettingDorm/SettingDormInfo"; 

// Auth
import Login from "../pages/auth/login";
import Register from "../pages/auth/Register";

// --- Router Configuration ---
const router = createBrowserRouter([
  // 1. Root Redirect
  {
    path: "/",
    // แนะนำให้ชี้ไป Login ก่อน เดี๋ยวระบบ Login จะพาไปหน้า Dashboard ที่ถูกต้องเอง
    element: <Navigate to="/login" replace />,
  },
  // 2. Public Routes
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  
  // -----------------------------------------------------------
  // 3. กลุ่ม OWNER (ระดับบริหารจัดการภาพรวม)
  // -----------------------------------------------------------
  {
    element: (
      // ✅ แก้จุดที่ 1: ใส่ allowedRoles เพื่อให้เข้าได้เฉพาะเจ้าของ
      <ProtectedRoute allowedRoles={['OWNER', 'SUPER_ADMIN']}>
        <LayoutOwnerDorm />
      </ProtectedRoute>
    ),
    children: [
      { path: "/dormmanage", element: <DormView /> },
      { path: "/ownerdorm/add-dorm", element: <AddDormInfo /> },
      { path: "/youdorm", element: <DormView /> },
      { path: "/profile", element: <Profile /> },
      { path: "/dashboard", element: <Dashboard /> },
      { path: "/ownerdorm/adminmanage", element: <AdminManage /> },
    ],
  },

  // -----------------------------------------------------------
  // 4. กลุ่ม Management (ระดับปฏิบัติการในหอพัก)
  // -----------------------------------------------------------
  {
    element: (
      <ProtectedRoute allowedRoles={['OWNER', 'ADMIN', 'SUPER_ADMIN']}>
        <LayoutDormManage /> 
      </ProtectedRoute>
    ),
    children: [
      { path: "/dashboard/:dormId", element: <DashboardDorm /> },
      { path: "/rooms-plan/:dormId", element: <RoomsPlan /> },
      
      // Bills Group
      { path: "/bills/:dormId", element: <Bills /> },
      { path: "/bills/pending/:dormId", element: <PendingBills /> },
      { path: "/bills/all/:dormId", element: <AllBills /> },
      { path: "/bills-room/:dormId/:invoiceId", element: <MonthDetailBills /> },
      { path: "/monthly-bills/:dormId", element: <MonthlyBills /> },

      // Settings Group
      { path: "/dorm-settings/:dormId", element: <SettingDormNavbar /> },
      { path: "/setting-dorm-info/:dormId", element: <SettingDormInfo /> },

      // Room & Contract Group
      { path: "/dorm/:dormId/room/:roomNumber", element: <RoomDetail /> },
      { path: "/dorm/:dormId/room/:roomNumber/monthly-contract", element: <MonthlyContract /> },
      { path: "/dorm/:dormId/receipt/:contractId", element: <ReceiptPrint /> },
      { path: "/dorm/:dormId/receipt-print/:contractId", element: <MonthlyBills /> },
      { path: "/dorm/:dormId/contracts/:contractId/detail", element: <ContractDetail /> },
      { path: "/cancel-contract/:dormId/:roomNumber", element: <CancelContract /> },

      // Move Out Group
      { path: "/dorm/:dormId/room/:roomNumber/move-out-receipt", element: <MoveOutReceipt /> },
      { path: "/dorm/:dormId/room/:roomNumber/move-out-receipt/:moveOutReceiptId", element: <MoveOutReceipt /> },
      { path: "/dorm/:dormId/move-out/detail/:receiptNumber", element: <MoveOutDetail /> },
      { path: "/moveout/:dormId", element: <MoveOuWaitforMoveOut /> },
      { path: "/moveout/completed/:dormId", element: <MoveOut /> },

      // Meter Group
      { path: "/meter-reading/:dormId", element: <MeterReading /> },
      { path: "/create-meter-reading/:dormId", element: <CreateMeterReading /> },
      { path: "/edit-meter-reading/:dormId/:recordId", element: <EditMeterReading /> },
      { path: "/real-time-meter/:dormId", element: <RealTimeMeter /> },
      { path: "/room-meter-detail/:dormId/:roomId", element: <RoomMeterDetail /> },
      { path: "/add-meter-digital/:dormId", element: <AddMeterDigital /> },

      // Reports Routes
      { path: "/reports/receipts/:dormId", element: <Receipts /> },
      { path: "/reports/monthly-bills/:dormId", element: <MonthlyBillsReport /> },
      { path: "/reports/tenant/:dormId", element: <TenantReport /> },
      { path: "/reports/utility-summary/:dormId", element: <UtilitySummaryReport /> },

      // Tenant Routes (ถ้าจำเป็นต้องให้ Owner/Admin ดูข้อมูลผู้เช่า)
    ],
  },

  // -----------------------------------------------------------
  // 5. กลุ่ม TENANT (ผู้เช่า)
  // -----------------------------------------------------------
  {
    element: (
      <ProtectedRoute allowedRoles={['TENANT', 'OWNER', 'ADMIN', 'SUPER_ADMIN']}>
        <LayoutTenant />
      </ProtectedRoute>
    ),
    children: [

    ],
  },  
]);

const AppRoutes = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default AppRoutes;