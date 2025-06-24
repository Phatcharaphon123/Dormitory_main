
function EntriesPerPageSelect({ entriesPerPage, setEntriesPerPage, setCurrentPage }) {
  const handleChange = (e) => {
    setEntriesPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="entries" className="text-gray-700">Show</label>
      <select
        id="entries"
        className="border border-gray-300 rounded px-2 py-1"
        value={entriesPerPage}
        onChange={handleChange}
      >
        <option value={10}>10</option>
        <option value={15}>15</option>
        <option value={20}>20</option>
      </select>
      <span className="text-gray-700">entries</span>
    </div>
  );
}

export default EntriesPerPageSelect;
