import { IoIosArrowBack } from "react-icons/io";

function BackButton({ onClick, label = "ย้อนกลับ" }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center bg-orange-400 hover:bg-orange-500 text-white font-medium p-2 rounded shadow cursor-pointer"
    >
      <IoIosArrowBack size={20} />
      {label}
    </button>
  );
}

export default BackButton;

