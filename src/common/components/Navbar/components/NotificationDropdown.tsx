import React from 'react';

interface NotificationDropDownProps {
  isOpen: boolean;
  onClose: () => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  notifications: { id: number; title: string; message: string; time: string }[];
}

export const NotificationDropDown: React.FC<NotificationDropDownProps> = ({
  isOpen,
  onClose,
  dropdownRef,
  notifications,
}) => {
  if (!isOpen) return null;

  const hasNotifications = notifications.length > 0;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-4 w-80 bg-white shadow-md hover:shadow-lg rounded-2xl z-50 p-6 mr-8" // Aumenté el margen derecho a mr-8
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-12 h-12 rounded-2xl p-2 border border-blue-100 text-blue-400 bg-blue-50 mr-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <div className="font-medium text-gray-900 leading-none">
              Notifications
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {hasNotifications
                ? `You have ${notifications.length} new notifications.`
                : 'No new notifications.'}
            </p>
          </div>
        </div>
      </div>
      {hasNotifications && (
        <div className="max-h-64 overflow-y-auto space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-center p-4 bg-gray-50 shadow-sm hover:shadow-md rounded-xl"
            >
              <div>
                <div className="font-medium text-gray-900">
                  {notification.title}
                </div>
                <p className="text-sm text-gray-500">{notification.message}</p>
                <span className="text-xs text-gray-400">
                  {notification.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
