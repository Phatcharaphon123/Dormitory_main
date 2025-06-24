import { RxCross2 } from "react-icons/rx";
import { useState } from "react";
import { FaUser, FaDoorOpen } from "react-icons/fa";
import RoomInfo from "./RoomInfo";
import RoomRenter from "./RoomRenter";
import { useNavigate } from "react-router-dom";



function RoomNavbar({ onClose, room }) {
  const [activeTab, setActiveTab] = useState("ผู้เช่า");

  const tabs = [
    { label: "ผู้เช่า", icon: <FaUser size={20} /> },
    { label: "ข้อมูลห้องพัก", icon: <FaDoorOpen size={20} /> },
  ];

  return (
    <div className="fixed inset-0 z-[99] bg-[rgba(0,0,0,0.6)] flex items-center justify-center">
      <div className="bg-white w-[900px] rounded-lg shadow-lg overflow-hidden">
        {/* Top Bar */}
        <div className="bg-gray-100 px-6 py-3 flex items-center justify-between border-b border-black">
          <h2 className="text-lg font-medium">
            หอพัก A ห้อง {room?.roomNumber || "-"}
          </h2>
          <button
            className="px-2 py-1 border-2 border-red-600 text-red-600 font-bold rounded-md hover:bg-red-600 hover:text-white transition duration-200"
            onClick={onClose}
          >
            ปิด
          </button>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex gap-4 border-b">
            {tabs.map(({ label, icon }) => (
              <button
                key={label}
                onClick={() => setActiveTab(label)}
                className={`flex items-center gap-2 py-2 px-4 font-medium border-b-2 ${
                  activeTab === label
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent hover:text-orange-500"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === "ผู้เช่า" && <RoomRenter room={room} />}
            {activeTab === "ข้อมูลห้องพัก" && <RoomInfo room={room} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoomNavbar;
