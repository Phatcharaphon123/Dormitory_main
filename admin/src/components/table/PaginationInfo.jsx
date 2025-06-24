function PaginationInfo({ indexOfFirst, indexOfLast, totalEntries }) {
  const showingFrom = totalEntries === 0 ? 0 : indexOfFirst + 1;
  const showingTo = Math.min(indexOfLast, totalEntries);

  return (
    <div className="text-sm text-gray-700 mb-2 sm:mb-0">
      Showing {showingFrom} to {showingTo} of {totalEntries} entries
    </div>
  );
}

export default PaginationInfo;
