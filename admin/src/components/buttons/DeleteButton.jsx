function DeleteButton({ onClick, label = "ลบ" }) {
  return (
    <button
      onClick={onClick}
      className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded cursor-pointer"
    >
      {label}
    </button>
  );
}

export default DeleteButton;
