import React from 'react';

/**
 * NotesTabViewOnly component - View-only display of NDR notes
 * @param {Object} ndr - The NDR object
 * @param {Array} members - Array of all members
 */
const NotesTabViewOnly = ({ ndr, members }) => {
  const notes = ndr.notes || {
    leadership: {},
    couchPhoneRoles: {},
    updates: [],
    summary: ''
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">NDR Notes (View Only)</h3>

      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h4 className="font-semibold mb-4">Leadership Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">DON:</span>
            <span className="ml-2">{notes.leadership?.don || 'Not assigned'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">DOC:</span>
            <span className="ml-2">{notes.leadership?.doc || 'Not assigned'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">DUC:</span>
            <span className="ml-2">{notes.leadership?.duc || 'Not assigned'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Executives:</span>
            <span className="ml-2">{notes.leadership?.execs || 'N/A'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Directors:</span>
            <span className="ml-2">{notes.leadership?.directors || 'N/A'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Couch:</span>
            <span className="ml-2">{notes.couchPhoneRoles?.couch || 'Not assigned'}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Phones:</span>
            <span className="ml-2">{notes.couchPhoneRoles?.phones || 'Not assigned'}</span>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold mb-4">Progress Updates</h4>
        {notes.updates && notes.updates.length > 0 ? (
          <div className="space-y-2">
            {notes.updates.map((update, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-semibold text-blue-600">{update.time}</span>
                  {update.timestamp && (
                    <span className="text-xs text-gray-500">
                      {new Date(update.timestamp).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700">{update.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 italic">No updates recorded</p>
        )}
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold mb-4">Night Summary</h4>
        {notes.summary ? (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes.summary}</p>
        ) : (
          <p className="text-gray-500 italic">No summary available</p>
        )}
      </div>
    </div>
  );
};

export default NotesTabViewOnly;
