import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Contexts
import { AuthProvider } from "./contexts/AuthContext";

// Components
import ProtectedRoute from "./components/ProtectedRoute";

// Layouts
import MainLayout from "./pages/main/MainLayout";
import LayoutDormManage from "./layouts/LayoutDormManage";

// Main pages
import YouDorm from "./pages/main/Youdorm/YouDorm";
import Profile from "./pages/main/Profile/Profile";

// Dorm pages
import DashboardDorm from "./pages/DormManage/dashboard/DashboardDorm";
import RoomsPlan from "./pages/DormManage/RoomPlan/RoomPlan";
import Bills from "./pages/DormManage/Bills/MonthBills";
import PendingBills from "./pages/DormManage/Bills/PendingBills";
import AllBills from "./pages/DormManage/Bills/AllBills";
import MonthDetailBills from "./pages/DormManage/Bills/MonthDetailBills";
import AddDorm from "./pages/main/Youdorm/Adddorm/AddDormInfo";
import RoomDetail from "./pages/DormManage/Room/RoomDetail";
import MonthlyContract from "./pages/DormManage/Room/ContractPages/MonthlyContract";
import MonthlyBills from "./pages/DormManage/Room/ContractPages/ContractReceipt/ReceiptPrint";
import ContractDetail from "./pages/DormManage/Room/ContractPages/ContractDetail";
import CancelContract from "./pages/DormManage/Room/ContractPages/CancelContract";
import MoveOutReceipt from "./pages/DormManage/MoveOutManage/MoveOutReceipt/MoveOutReceipt";
import MoveOutDetail from "./pages/DormManage/MoveOutManage/MoveOutDetail";
import MeterReading from "./pages/meter/MeterReading";
import CreateMeterReading from "./pages/meter/CreateMeterReading";
import EditMeterReading from "./pages/meter/EditMeterReading";
import RealTimeMeter from "./pages/meter/RealTimeMeter";
import RoomMeterDetail from "./pages/meter/RoomMeterDetail";
import AddMeterDigital from "./pages/meter/AddMeterDigital";
import MoveOuWaitforMoveOut from "./pages/DormManage/MoveOutManage/WaitforMoveOut";
import MoveOut from "./pages/DormManage/MoveOutManage/MoveOut";

// Reports pages
import Receipts from "./pages/DormManage/Reports/Receipts";
import MonthlyBillsReport from "./pages/DormManage/Reports/MonthlyBillsReport";
import TenantReport from "./pages/DormManage/Reports/TenantReport";
import UtilitySummaryReport from "./pages/DormManage/Reports/UtilitySummaryReport";
import ReceiptPrint from "./pages/DormManage/Room/ContractPages/ContractReceipt/ReceiptPrint";


// Setting pages
import SettingDormNavbar from "./pages/DormManage/SettingDorm/SettingDormNavbar";
import SettingDormInfo from "./pages/DormManage/SettingDorm/SettingDormInfo"; 

// Auth
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* ✅ เส้นทางเริ่มต้นไปหน้า login */}
          <Route path="/" element={<Navigate to="/login" />} />

          {/* 🔸 Route ที่ไม่ใช้ Layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          

          {/* 🔹 MainLayout: สำหรับหน้า main เช่น dashboard หลักของผู้ใช้ */}
          <Route element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }>
            <Route path="/youdorm" element={<YouDorm />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/add-dorm" element={<AddDorm />} />
          </Route>

          {/* 🔷 DormLayout: สำหรับหน้า admin/เจ้าของหอ */}
          <Route element={
            <ProtectedRoute>
              <LayoutDormManage />
            </ProtectedRoute>
          }>
            <Route path="/dashboard/:dormId" element={<DashboardDorm />} />
            <Route path="/rooms-plan/:dormId" element={<RoomsPlan />} />
            <Route path="/bills/:dormId" element={<Bills />} />
            <Route path="/bills/pending/:dormId" element={<PendingBills />} />
            <Route path="/bills/all/:dormId" element={<AllBills />} />
            <Route path="/bills-room/:dormId/:invoiceId" element={<MonthDetailBills />} />

            <Route path="/dorm-settings/:dormId" element={<SettingDormNavbar />} />
            <Route path="/setting-dorm-info/:dormId" element={<SettingDormInfo />} />

            <Route path="/dorm/:dormId/room/:roomNumber" element={<RoomDetail />} />
            <Route path="/dorm/:dormId/room/:roomNumber/monthly-contract" element={<MonthlyContract />} />
            <Route path="/dorm/:dormId/receipt/:contractId" element={<ReceiptPrint />} />
            <Route path="/dorm/:dormId/receipt-print/:contractId" element={<MonthlyBills />} />
            <Route path="/monthly-bills/:dormId" element={<MonthlyBills />} />
            <Route path="/dorm/:dormId/contracts/:contractId/detail" element={<ContractDetail />} />
            <Route path="/cancel-contract/:dormId/:roomNumber" element={<CancelContract />} />
            <Route path="/dorm/:dormId/room/:roomNumber/move-out-receipt" element={<MoveOutReceipt />} />
            <Route path="/dorm/:dormId/room/:roomNumber/move-out-receipt/:moveOutReceiptId" element={<MoveOutReceipt />} />
            <Route path="/dorm/:dormId/move-out/detail/:receiptNumber" element={<MoveOutDetail />} />

            <Route path="/meter-reading/:dormId" element={<MeterReading />} />
            <Route path="/create-meter-reading/:dormId" element={<CreateMeterReading />} />
            <Route path="/edit-meter-reading/:dormId/:recordId" element={<EditMeterReading />} />
            <Route path="/real-time-meter/:dormId" element={<RealTimeMeter />} />
            <Route path="/room-meter-detail/:dormId/:roomId" element={<RoomMeterDetail />} />
            <Route path="/add-meter-digital/:dormId" element={<AddMeterDigital />} />

            <Route path="/moveout/:dormId" element={<MoveOuWaitforMoveOut />} />
            <Route path="/moveout/completed/:dormId" element={<MoveOut />} />

            {/* Reports Routes */}
            <Route path="/reports/receipts/:dormId" element={<Receipts />} />
            <Route path="/reports/monthly-bills/:dormId" element={<MonthlyBillsReport />} />
            <Route path="/reports/tenant/:dormId" element={<TenantReport />} />
            <Route path="/reports/utility-summary/:dormId" element={<UtilitySummaryReport />} />
          </Route>

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
