import React from 'react';

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  startIndex,
  endIndex,
  className = ""
}) => {
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    
    if (totalPages <= 7) {
      // แสดงทุกหน้าถ้าไม่เกิน 7 หน้า
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
              i === currentPage
                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {i}
          </button>
        );
      }
    } else {
      // หน้าแรก
      pages.push(
        <button
          key={1}
          onClick={() => handlePageChange(1)}
          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
            1 === currentPage
              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
          }`}
        >
          1
        </button>
      );

      // แสดง ... ถ้าหน้าปัจจุบันห่างจากหน้าแรกมากกว่า 3
      if (currentPage > 4) {
        pages.push(
          <span key="start-ellipsis" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
            ...
          </span>
        );
      }

      // หน้าใกล้เคียงกับหน้าปัจจุบัน
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      // ปรับให้แสดงหน้า 2, 3 ถ้าหน้าปัจจุบันใกล้หน้าแรก
      if (currentPage <= 4) {
        startPage = 2;
        endPage = Math.min(5, totalPages - 1);
      }

      // ปรับให้แสดงหน้าใกล้หน้าสุดท้าย
      if (currentPage >= totalPages - 3) {
        startPage = Math.max(2, totalPages - 4);
        endPage = totalPages - 1;
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageChange(i)}
            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
              i === currentPage
                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {i}
          </button>
        );
      }

      // แสดง ... ถ้าหน้าปัจจุบันห่างจากหน้าสุดท้ายมากกว่า 3
      if (currentPage < totalPages - 3) {
        pages.push(
          <span key="end-ellipsis" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
            ...
          </span>
        );
      }

      // หน้าสุดท้าย
      if (totalPages > 1) {
        pages.push(
          <button
            key={totalPages}
            onClick={() => handlePageChange(totalPages)}
            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
              totalPages === currentPage
                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {totalPages}
          </button>
        );
      }
    }
    
    return pages;
  };

  // ไม่แสดง pagination ถ้าไม่มีข้อมูลหรือมีหน้าเดียว
  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={`bg-white px-4 py-4 flex items-center justify-between border-t border-gray-200 ${className}`}>
      {/* Mobile pagination */}
      <div className="flex-1 flex justify-between sm:hidden">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
            currentPage === 1
              ? 'text-gray-500 bg-white cursor-not-allowed'
              : 'text-gray-700 bg-white hover:bg-gray-50'
          }`}
        >
          ก่อนหน้า
        </button>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
            currentPage === totalPages
              ? 'text-gray-500 bg-white cursor-not-allowed'
              : 'text-gray-700 bg-white hover:bg-gray-50'
          }`}
        >
          ถัดไป
        </button>
      </div>

      {/* Desktop pagination */}
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            แสดง <span className="font-medium">{startIndex + 1}</span> ถึง{' '}
            <span className="font-medium">{Math.min(endIndex, totalItems)}</span> จาก{' '}
            <span className="font-medium">{totalItems}</span> รายการ
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            {/* Previous button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 text-sm font-medium ${
                currentPage === 1
                  ? 'text-gray-500 bg-white cursor-not-allowed'
                  : 'text-gray-500 bg-white hover:bg-gray-50'
              }`}
            >
              <span className="sr-only">ก่อนหน้า</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            
            {/* Page numbers */}
            {renderPageNumbers()}
            
            {/* Next button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 text-sm font-medium ${
                currentPage === totalPages
                  ? 'text-gray-500 bg-white cursor-not-allowed'
                  : 'text-gray-500 bg-white hover:bg-gray-50'
              }`}
            >
              <span className="sr-only">ถัดไป</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
