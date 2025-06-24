// components/table/SearchBox.jsx

function SearchBox({ searchTerm, setSearchTerm, setCurrentPage }) {
  const handleChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="search" className="text-gray-700">Search:</label>
      <input
        id="search"
        type="text"
        className="border border-gray-300 rounded px-2 py-1"
        placeholder="ค้นหา"
        value={searchTerm}
        onChange={handleChange}
      />
    </div>
  );
}

export default SearchBox;
