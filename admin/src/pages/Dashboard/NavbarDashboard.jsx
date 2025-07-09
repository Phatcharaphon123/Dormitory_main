function NavbarDashboard({ selectedBuilding, onChangeBuilding }) {
  return (
    <div className="bg-gray-100 p-4 border-b mb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <select
          value={selectedBuilding}
          onChange={(e) => onChangeBuilding(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1"
        >
          <option value="all">เลือกตึก/หอพัก ทั้งหมด</option>
          <option value="A">ตึก A</option>
          <option value="B">ตึก B</option>
          <option value="C">ตึก C</option>
        </select>
      </div>
    </div>
  );
}

export default NavbarDashboard;
