
function SaveButton({ onClick, label = "บันทึก" }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-[#008421] hover:bg-green-600 text-white font-medium py-2 px-4 rounded shadow cursor-pointer"
    >
      {label}
    </button>
  );
}

export default SaveButton;
