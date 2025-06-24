function OpenButton({ onClick, label = "เปิด" }) {
  return (
    <button
      onClick={onClick}
      className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded cursor-pointer"
    >
      {label}
    </button>
  );
}

export default OpenButton;
