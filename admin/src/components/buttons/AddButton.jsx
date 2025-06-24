import { FaPlus } from "react-icons/fa6";

function AddButton({ onClick, label = "เพิ่มข้อมูล" }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 cursor-pointer text-white font-medium px-3 py-[6px] rounded shadow text-sm"
    >
      <FaPlus size={20} />
      {label}
    </button>
  );
}

export default AddButton;

