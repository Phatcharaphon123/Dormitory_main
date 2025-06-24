import { TiCogOutline } from "react-icons/ti";
import { TbLogout2 } from "react-icons/tb";
import { LuClock10 } from "react-icons/lu";
import { useState, useEffect } from "react";

function Navbar() {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (date) => {
    return date.toLocaleString("th-TH", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="bg-gray-800 text-white p-4.5 flex justify-between items-center shadow-md">
      <div className="flex gap-2 items-center">
        <div></div><LuClock10 size={20}/>วันที่-เวลา 
        <span className=" text-gray-300">{formatDateTime(dateTime)}</span>
        </div>
      <div className="flex items-center space-x-4">
        <button className="flex gap-1 items-center bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md">
          <TiCogOutline size={20} />
          <span>Settings</span>
        </button>
        <button className="flex gap-1 items-center bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md">
          <TbLogout2 size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default Navbar;
