function CancelButton({ onClick, label = "ยกเลิก" }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded shadow cursor-pointer"
    >
      {label}
    </button>
  );
}

export default CancelButton;
