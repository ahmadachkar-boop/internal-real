import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { Clock, Printer, FileText } from 'lucide-react';

/**
 * NotesTabEditable component - Editable NDR notes with progress updates and formatted reporting
 * @param {Object} notes - Notes state object
 * @param {Function} setNotes - Function to update notes
 * @param {string} ndrId - The NDR ID
 * @param {Object} assignments - Current assignments
 * @param {Array} members - Array of all members
 * @param {Object} ndr - The full NDR object
 */
const NotesTabEditable = ({ notes, setNotes, ndrId, assignments, members, ndr }) => {
  const [newUpdate, setNewUpdate] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [updateError, setUpdateError] = useState('');
  const [rideStats, setRideStats] = useState({
    completedRides: 0,
    cancelledRides: 0,
    terminatedRides: 0,
    completedRiders: 0,
    cancelledRiders: 0,
    terminatedRiders: 0
  });

  // Fetch ride statistics
  useEffect(() => {
    const fetchRideStats = async () => {
      try {
        const ridesRef = collection(db, 'rides');
        const ridesQuery = query(ridesRef, where('ndrId', '==', ndrId));

        const unsubscribe = onSnapshot(ridesQuery, (snapshot) => {
          let completed = 0, cancelled = 0, terminated = 0;
          let completedRiders = 0, cancelledRiders = 0, terminatedRiders = 0;

          snapshot.docs.forEach(doc => {
            const data = doc.data();
            const riders = data.riders || 1;

            if (data.status === 'completed') {
              completed++;
              completedRiders += riders;
            } else if (data.status === 'cancelled') {
              cancelled++;
              cancelledRiders += riders;
            } else if (data.status === 'terminated') {
              terminated++;
              terminatedRiders += riders;
            }
          });

          setRideStats({
            completedRides: completed,
            cancelledRides: cancelled,
            terminatedRides: terminated,
            completedRiders,
            cancelledRiders,
            terminatedRiders
          });
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching ride stats:', error);
      }
    };

    fetchRideStats();
  }, [ndrId]);

  // Update timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Track last update time
  useEffect(() => {
    if (notes.updates && notes.updates.length > 0) {
      const lastUpdate = notes.updates[notes.updates.length - 1];
      setLastUpdateTime(lastUpdate.timestamp);
    }
  }, [notes.updates]);

  const getTimeSinceLastUpdate = () => {
    if (!lastUpdateTime) return null;
    const diff = Math.floor((currentTime - new Date(lastUpdateTime)) / 1000 / 60);
    return diff;
  };

  const minutesSinceUpdate = getTimeSinceLastUpdate();
  const updateOverdue = minutesSinceUpdate !== null && minutesSinceUpdate >= 15;

  const addUpdate = () => {
    if (!newUpdate.trim()) {
      setUpdateError('Please enter an update');
      return;
    }

    const update = {
      id: Date.now(),
      text: newUpdate,
      timestamp: new Date(),
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    setNotes({
      ...notes,
      updates: [...(notes.updates || []), update]
    });
    setNewUpdate('');
    setUpdateError('');
  };

  // Generate formatted report as JSX
  const generateFormattedReport = () => {
    const getMemberById = (id) => members.find(m => m.id === id);

    const sortedCars = Object.entries(assignments.cars || {})
      .sort(([a], [b]) => parseInt(a) - parseInt(b));

    return (
      <div className="space-y-4">
        {/* Leadership */}
        <div className="section">
          <div className="section-title">Leadership Team</div>
          <div className="content-row"><strong>Director of the Night (DON):</strong> {notes.leadership.don || 'Not assigned'}</div>
          <div className="content-row"><strong>Director of Couch (DOC):</strong> {notes.leadership.doc || 'Not assigned'}</div>
          <div className="content-row"><strong>Director of Utility Closet (DUC):</strong> {notes.leadership.duc || 'Not assigned'}</div>
        </div>

        {/* Car Assignments */}
        <div className="section">
          <div className="section-title">Car Assignments</div>
          {sortedCars.length === 0 ? (
            <div className="content-row">No cars assigned yet</div>
          ) : (
            <div>
              {sortedCars.map(([carNum, memberIds]) => {
                if (memberIds && memberIds.length > 0) {
                  const memberNames = memberIds.map(id => getMemberById(id)?.name || 'Unknown').join(', ');
                  return <div key={carNum} className="content-row"><strong>Car {carNum}:</strong> {memberNames}</div>;
                }
                return null;
              })}
            </div>
          )}
        </div>

        {/* Progress Updates */}
        <div className="section">
          <div className="section-title">Progress Updates</div>
          {notes.updates && notes.updates.length > 0 ? (
            <div>
              {notes.updates.map(update => (
                <div key={update.id} className="content-row"><strong>[{update.time}]</strong> {update.text}</div>
              ))}
            </div>
          ) : (
            <div className="content-row">No updates yet</div>
          )}
        </div>

        {/* Ride Statistics */}
        <div className="section">
          <div className="section-title">Ride Statistics</div>
          <div className="stats-grid">
            <div className="stat-item">
              <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '4px'}}>Completed Rides</div>
              <div style={{fontSize: '24px', fontWeight: '700', color: '#059669'}}>{rideStats.completedRides}</div>
            </div>
            <div className="stat-item">
              <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '4px'}}>Cancelled Rides</div>
              <div style={{fontSize: '24px', fontWeight: '700', color: '#dc2626'}}>{rideStats.cancelledRides}</div>
            </div>
            <div className="stat-item">
              <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '4px'}}>Terminated Rides</div>
              <div style={{fontSize: '24px', fontWeight: '700', color: '#ea580c'}}>{rideStats.terminatedRides}</div>
            </div>
            <div className="stat-item">
              <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '4px'}}>Completed Riders</div>
              <div style={{fontSize: '24px', fontWeight: '700', color: '#059669'}}>{rideStats.completedRiders}</div>
            </div>
            <div className="stat-item">
              <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '4px'}}>Cancelled Riders</div>
              <div style={{fontSize: '24px', fontWeight: '700', color: '#dc2626'}}>{rideStats.cancelledRiders}</div>
            </div>
            <div className="stat-item">
              <div style={{fontSize: '14px', color: '#6b7280', marginBottom: '4px'}}>Terminated Riders</div>
              <div style={{fontSize: '24px', fontWeight: '700', color: '#ea580c'}}>{rideStats.terminatedRiders}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const downloadReportAsPDF = () => {
    const printContent = document.getElementById('formatted-report');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download the PDF');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>NDR Night Report - ${ndr.eventName}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              line-height: 1.4;
              color: #1a1a1a;
              background: #ffffff;
              padding: 20px;
              max-width: 900px;
              margin: 0 auto;
              font-size: 13px;
            }
            .report-header {
              text-align: center;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            h1 {
              font-size: 22px;
              font-weight: 700;
              color: #1e40af;
              margin-bottom: 6px;
              letter-spacing: -0.5px;
            }
            h2 {
              font-size: 16px;
              font-weight: 600;
              color: #374151;
              margin-bottom: 4px;
            }
            .date {
              font-size: 13px;
              color: #6b7280;
              font-weight: 500;
            }
            .section {
              margin-bottom: 12px;
              padding: 10px 12px;
              background: #f9fafb;
              border-radius: 6px;
              border: 1px solid #e5e7eb;
            }
            .section-title {
              font-size: 13px;
              font-weight: 700;
              color: #1e40af;
              margin-bottom: 6px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 1.5px solid #dbeafe;
              padding-bottom: 4px;
            }
            .content-row {
              margin-bottom: 4px;
              padding-left: 10px;
              font-size: 12px;
            }
            .content-row strong, .font-bold {
              font-weight: 600;
              color: #374151;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 8px;
              margin-top: 8px;
            }
            .stat-item {
              padding: 8px;
              background: white;
              border-radius: 4px;
              border: 1px solid #e5e7eb;
              font-size: 12px;
            }
            .chat-logs {
              margin-top: 16px;
              padding: 12px;
              background: #eff6ff;
              border: 1.5px solid #2563eb;
              border-radius: 6px;
            }
            @media print {
              @page { margin: 0.5in; size: letter; }
              body { padding: 0; background: white; font-size: 12px; }
              .section { page-break-inside: avoid; margin-bottom: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h1>NDR Night Report</h1>
            <h2>${ndr.eventName}</h2>
            <p class="date">${new Date(ndr.eventDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
          </div>
          ${printContent.innerHTML}
          <div class="chat-logs">
            <div style="font-size: 13px; font-weight: 700; color: #1e40af; margin-bottom: 8px;">Communication Logs</div>
            <p style="margin-bottom: 8px; color: #374151; font-size: 12px; font-weight: 600;">
              📱 Communication logs are available as a separate PDF document
            </p>
            <p style="margin-top: 4px; font-size: 11px; color: #6b7280; font-style: italic;">
              Note: Chat logs contain all communication between the couch (command center) and navigators (field operators) during the event.
              Download the Communication Logs PDF from the NDR Reports page.
            </p>
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => window.print(), 250);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const downloadChatLogsAsPDF = async () => {
    try {
      const messagesQuery = query(
        collection(db, 'couchMessages'),
        where('ndrId', '==', ndr.id),
        orderBy('timestamp', 'asc')
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      const messages = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));

      // Group messages by car number
      const messagesByCar = {};
      messages.forEach(msg => {
        const carNum = msg.carNumber || 'Unknown';
        if (!messagesByCar[carNum]) {
          messagesByCar[carNum] = [];
        }
        messagesByCar[carNum].push(msg);
      });

      // Sort car numbers
      const sortedCarNumbers = Object.keys(messagesByCar).sort((a, b) => {
        if (a === 'Unknown') return 1;
        if (b === 'Unknown') return -1;
        return parseInt(a) - parseInt(b);
      });

      // Generate HTML for chat logs
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to download the chat logs PDF');
        return;
      }

      const chatLogsHTML = sortedCarNumbers.map(carNum => {
        const carMessages = messagesByCar[carNum];
        const messagesHTML = carMessages.map(msg => {
          const time = msg.timestamp ? msg.timestamp.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit'
          }) : 'Unknown time';

          const senderClass = msg.sender === 'couch' ? 'couch-message' : 'navigator-message';
          const senderLabel = msg.sender === 'couch' ? 'Couch' : 'Navigator';

          return `
            <div class="message ${senderClass}">
              <div class="message-header">
                <span class="sender-name">${msg.senderName || senderLabel}</span>
                <span class="message-time">${time}</span>
              </div>
              <div class="message-content">${msg.message || ''}</div>
            </div>
          `;
        }).join('');

        return `
          <div class="car-section">
            <div class="car-title">Car ${carNum}</div>
            <div class="messages-container">
              ${messagesHTML || '<div class="no-messages">No messages for this car</div>'}
            </div>
          </div>
        `;
      }).join('');

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Chat Logs - ${ndr.eventName}</title>
            <meta charset="UTF-8">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                line-height: 1.5;
                color: #1a1a1a;
                background: #ffffff;
                padding: 20px;
                max-width: 900px;
                margin: 0 auto;
                font-size: 13px;
              }
              .report-header {
                text-align: center;
                border-bottom: 2px solid #2563eb;
                padding-bottom: 12px;
                margin-bottom: 20px;
              }
              h1 { font-size: 22px; font-weight: 700; color: #1e40af; margin-bottom: 6px; }
              h2 { font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 4px; }
              .date { font-size: 13px; color: #6b7280; font-weight: 500; }
              .car-section { margin-bottom: 24px; page-break-inside: avoid; }
              .car-title {
                font-size: 16px;
                font-weight: 700;
                color: #1e40af;
                background: #eff6ff;
                padding: 10px 12px;
                border-radius: 6px 6px 0 0;
                border: 1.5px solid #2563eb;
                border-bottom: none;
              }
              .messages-container {
                border: 1.5px solid #e5e7eb;
                border-radius: 0 0 6px 6px;
                padding: 12px;
                background: #f9fafb;
              }
              .message {
                margin-bottom: 10px;
                padding: 8px 10px;
                border-radius: 6px;
                border: 1px solid #e5e7eb;
                background: white;
              }
              .message-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
                padding-bottom: 4px;
                border-bottom: 1px solid #f3f4f6;
              }
              .sender-name { font-weight: 600; font-size: 12px; color: #374151; }
              .couch-message .sender-name { color: #2563eb; }
              .navigator-message .sender-name { color: #059669; }
              .message-time { font-size: 11px; color: #6b7280; }
              .message-content { font-size: 12px; color: #1a1a1a; word-wrap: break-word; }
              .no-messages { text-align: center; padding: 20px; color: #6b7280; font-style: italic; }
              @media print {
                @page { margin: 0.5in; size: letter; }
                body { padding: 0; background: white; font-size: 11px; }
                .car-section { page-break-inside: avoid; margin-bottom: 20px; }
                .message { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="report-header">
              <h1>Communication Logs</h1>
              <h2>${ndr.eventName}</h2>
              <p class="date">${new Date(ndr.eventDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
              <p style="margin-top: 8px; font-size: 12px; color: #6b7280;">
                All communication between couch (command center) and navigators (field operators)
              </p>
            </div>
            ${sortedCarNumbers.length > 0 ? chatLogsHTML : '<div class="no-messages">No chat messages found for this event</div>'}
            <script>
              window.onload = function() {
                setTimeout(() => window.print(), 250);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Error fetching chat logs:', error);
      alert('Failed to load chat logs. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">NDR Notes</h3>

      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h4 className="font-semibold mb-4">Leadership Information (Auto-synced from Assignments)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DON</label>
            <input
              type="text"
              value={notes.leadership.don}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DOC</label>
            <input
              type="text"
              value={notes.leadership.doc}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DUC</label>
            <input
              type="text"
              value={notes.leadership.duc}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Executives</label>
            <input
              type="text"
              value={notes.leadership.execs}
              onChange={(e) => setNotes({
                ...notes,
                leadership: { ...notes.leadership, execs: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Names"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Directors</label>
            <input
              type="text"
              value={notes.leadership.directors}
              onChange={(e) => setNotes({
                ...notes,
                leadership: { ...notes.leadership, directors: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Names"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Couch (Auto-synced)</label>
            <input
              type="text"
              value={notes.couchPhoneRoles.couch}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phones (Auto-synced)</label>
            <input
              type="text"
              value={notes.couchPhoneRoles.phones}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold">Progress Updates</h4>
          {minutesSinceUpdate !== null && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              updateOverdue ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-green-100 text-green-800'
            }`}>
              <Clock size={16} />
              {updateOverdue ? (
                <span>Update overdue ({minutesSinceUpdate}min ago)</span>
              ) : (
                <span>Next update in {15 - minutesSinceUpdate}min</span>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newUpdate}
              onChange={(e) => {
                setNewUpdate(e.target.value);
                if (updateError) setUpdateError('');
              }}
              onKeyPress={(e) => e.key === 'Enter' && addUpdate()}
              placeholder="Add a progress update (recommended every 15 minutes)..."
              className={`flex-1 px-3 py-2 border rounded-md ${updateError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}`}
            />
            <button
              onClick={addUpdate}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Add Update
            </button>
          </div>
          {updateError && (
            <p className="text-red-600 text-sm">{updateError}</p>
          )}
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notes.updates?.map(update => (
            <div key={update.id} className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-semibold text-blue-600">{update.time}</span>
                <span className="text-xs text-gray-500">
                  {new Date(update.timestamp).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-700">{update.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold mb-4">Night Summary</h4>
        <textarea
          value={notes.summary}
          onChange={(e) => setNotes({ ...notes, summary: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows="6"
          placeholder="Write a summary of the night..."
        />
      </div>

      {/* Formatted Report - View Only */}
      <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-semibold text-blue-900">Formatted Night Report</h4>
          <div className="flex gap-2">
            <button
              onClick={downloadReportAsPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 print:hidden"
            >
              <Printer size={18} />
              Download Report PDF
            </button>
            <button
              onClick={downloadChatLogsAsPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 print:hidden"
            >
              <FileText size={18} />
              Download Chat Logs PDF
            </button>
          </div>
        </div>
        <div className="text-sm bg-white p-4 rounded border text-gray-800 max-h-96 overflow-y-auto" id="formatted-report">
          {generateFormattedReport()}
        </div>
        <p className="text-xs text-gray-600 mt-2 italic">
          This report auto-updates with your assignments and progress updates. Click "Download as PDF" to save.
        </p>
      </div>
    </div>
  );
};

export default NotesTabEditable;
