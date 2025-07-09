import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar.jsx";
// import DormInfo from "./pages/notusenow/DormInfo.jsx";
import RoomTypes from "./pages/Dorminfo/RoomTypes.jsx";
import Camera from "./pages/notusenow/Camera.jsx";
import PlusRoomType from "./pages/Dorminfo/AddRoomType.jsx";
import RoomsManage from "./pages/notusenow/RoomsManage.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import DailyCustomer from "./pages/notusenow/DailyCustomer.jsx";
import MonthlyCustomer from "./pages/notusenow/MonthlyCustomer.jsx";
import RoomsPlan from "./pages/RoomPlan/RoomPlan.jsx";
import Bills from "./pages/Bills/Bills.jsx";
import DormInfo from "./pages/Dorminfo/DormInfo.jsx";
// import EditDorm from "./pages/editform/EditDorm.jsx";
import DormRoomManage from "./pages/Dorminfo/DormRoomManage.jsx";



function App() {
  return (
    <Router>
      <div className="bg-[#f4f6f9]">
      <div className="flex">
        <Sidebar />
        <main className="flex-1">
          <Navbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {/* <Route path="/dorminfo" element={<DormInfo />} /> */}
            <Route path="/rooms-plan" element={<RoomsPlan />} />
            <Route path="/bills" element={<Bills />} />
            <Route path="/room-types" element={<RoomTypes />} />
            <Route path="/add-room-type" element={<PlusRoomType />} />
            <Route path="/rooms-manage" element={<RoomsManage />} />
            <Route path="/dorm-room-manage" element={<DormRoomManage />} />
            <Route path="/monthly-customer" element={<MonthlyCustomer />} />
            <Route path="/daily-customer" element={<DailyCustomer />} />
            <Route path="/camera" element={<Camera />} />
            {/* <Route path="/edit-dorm/:dormId" element={<EditDorm />} /> */}
            <Route path="/dorm-info" element={<DormInfo />} />
            <Route path="/dorm-info/:dormId" element={<DormInfo />} />
          </Routes>
        </main>
      </div>
      </div>
    </Router>
  );
}

export default App;
