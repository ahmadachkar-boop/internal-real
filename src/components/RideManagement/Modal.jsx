import React from 'react';

/**
 * Reusable modal component (replaces alert/prompt/confirm)
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.children - Modal content
 * @param {React.ReactNode} props.actions - Modal action buttons
 */
const Modal = ({ isOpen, onClose, title, children, actions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        {title && (
          <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
        )}
        <div className="mb-6">{children}</div>
        <div className="flex gap-3">
          {actions}
        </div>
      </div>
    </div>
  );
};

export default Modal;
