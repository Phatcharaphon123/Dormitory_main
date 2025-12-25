import React from 'react';

const FooterSidebar = ({ currentUser }) => {
  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case "OWNERDORM":
        return "bg-yellow-500 text-gray-900";
      case "ADMIN":
        return "bg-blue-500 text-white";
      case "STAFF":
        return "bg-green-600 text-white";
      default:
        return "bg-gray-600 text-gray-200";
    }
  };

  return (
    <div className="bg-gray-900 border-t border-gray-700">
      <div className="p-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-inner ${
              currentUser.role === 'OWNERDORM' ? 'bg-yellow-500 text-gray-900' : 'bg-blue-500 text-white'
          }`}>
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              currentUser.name.charAt(0) // ใช้อักษรตัวแรกของชื่อ
            )}
          </div>

          {/* Text Info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white text-sm truncate">
              {currentUser.name}
            </p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide inline-block mt-0.5 ${getRoleBadgeStyle(currentUser.role)}`}>
              {currentUser.role}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FooterSidebar;
