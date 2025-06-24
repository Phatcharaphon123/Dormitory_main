import React from "react";
import { FaPlus } from "react-icons/fa";

function TestButton({ text }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-semibold text-blue-950">ประเภทห้องพัก</h1>
        <button className="flex items-center gap-2 bg-[#008421] hover:bg-green-600 text-white font-medium py-2 px-4 rounded-xl shadow transition duration-300">
          <FaPlus size={20} />[{text}]
        </button>
      </div>
    </div>
  );
}

export default TestButton;
