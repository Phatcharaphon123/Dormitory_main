function PaginationControls({ currentPage, totalPages, setCurrentPage }) {
  const renderPages = () => {
    const pages = [];
    const maxPageDisplay = 5;

    if (totalPages <= maxPageDisplay) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) pages.push(1, 2, 3, "...", totalPages);
      else if (currentPage >= totalPages - 2) pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      else pages.push(1, "...", currentPage, "...", totalPages);
    }

    return pages.map((page, index) =>
      page === "..." ? (
        <span key={index} className="px-3 py-1 text-gray-500">...</span>
      ) : (
        <button
          key={index}
          className={`px-3 py-1 rounded ${currentPage === page ? "bg-blue-500 text-white" : "border text-gray-700 hover:bg-gray-200"}`}
          onClick={() => setCurrentPage(page)}
        >
          {page}
        </button>
      )
    );
  };

  return (
    <div className="flex items-center space-x-2">
      <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}
        className="px-3 py-1 border rounded text-gray-700 hover:bg-gray-200">
        Previous
      </button>
      {renderPages()}
      <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}
        className="px-3 py-1 border rounded text-gray-700 hover:bg-gray-200">
        Next
      </button>
    </div>
  );
}

export default PaginationControls;
