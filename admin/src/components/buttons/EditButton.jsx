function EditButton({ onClick, label = "แก้ไข" }) {
  return (
    <button
      onClick={onClick}
      className="bg-yellow-400 hover:bg-yellow-500 text-black py-1 px-3 rounded cursor-pointer"
    >
      {label}
    </button>
  );
}

export default EditButton;
