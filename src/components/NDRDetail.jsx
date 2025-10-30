import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { FileText, Users, Car, ClipboardList, Printer, Save, CheckCircle } from 'lucide-react';
import useNDRMembers from '../hooks/useNDRMembers';
import useNDRPrint from '../hooks/useNDRPrint';
import HomeTab from './NDRReports/HomeTab';
import AssignmentsTabEditable from './NDRReports/AssignmentsTab';
import AssignmentsTabViewOnly from './NDRReports/AssignmentsTabViewOnly';
import { CarsTabEditable, CarsTabViewOnly } from './NDRReports/CarsTab';
import NotesTabEditable from './NDRReports/NotesTab';
import NotesTabViewOnly from './NDRReports/NotesTabViewOnly';
import PrintAgreements from './NDRReports/PrintAgreements';

/**
 * NDRDetail - Detailed view component for a single NDR
 * Includes tabs for Home, Assignments, Cars, and Notes
 * @param {Object} ndr - The NDR object
 * @param {Function} onBack - Callback to return to list view
 */
const NDRDetail = ({ ndr, onBack }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [showPrintAgreements, setShowPrintAgreements] = useState(false);
  const [availableCars, setAvailableCars] = useState(ndr.availableCars || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  const [assignments, setAssignments] = useState(ndr.assignments || {
    cars: {},
    couch: [],
    phones: [],
    doc: null,
    duc: null,
    don: null,
    northgate: []
  });

  const [cars, setCars] = useState(ndr.cars || []);
  const [notes, setNotes] = useState(ndr.notes || {
    leadership: { don: '', doc: '', duc: '', execs: '', directors: '' },
    carRoles: {},
    couchPhoneRoles: { couch: '', phones: '' },
    updates: [],
    summary: ''
  });

  const isActive = ndr.status === 'active';

  // Fetch members data
  const { members, loading, directors, maleMembers, femaleMembers } = useNDRMembers(ndr.signedUpMembers);

  // Print functionality
  const { printPage, generateAgreementsData } = useNDRPrint();

  // Auto-sync assignments to notes
  useEffect(() => {
    if (!isActive) return;

    const getMemberById = (id) => members.find(m => m.id === id);

    const updatedLeadership = {
      don: assignments.don ? getMemberById(assignments.don)?.name || '' : '',
      doc: assignments.doc ? getMemberById(assignments.doc)?.name || '' : '',
      duc: assignments.duc ? getMemberById(assignments.duc)?.name || '' : '',
      execs: notes.leadership.execs || '',
      directors: notes.leadership.directors || ''
    };

    const updatedCouchPhoneRoles = {
      couch: (assignments.couch || []).map(id => getMemberById(id)?.name).filter(Boolean).join(', '),
      phones: (assignments.phones || []).map(id => getMemberById(id)?.name).filter(Boolean).join(', ')
    };

    setNotes(prev => ({
      ...prev,
      leadership: updatedLeadership,
      couchPhoneRoles: updatedCouchPhoneRoles
    }));
  }, [assignments, members, isActive]);

  // Auto-save after changes (debounced)
  useEffect(() => {
    if (!isActive) return;

    const timer = setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'ndrs', ndr.id), {
          assignments,
          cars,
          notes,
          availableCars,
          lastUpdated: Timestamp.now()
        });
      } catch (error) {
        console.error('Error auto-saving NDR data:', error);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [assignments, cars, notes, availableCars, isActive, ndr.id]);

  // Manual save function
  const manualSave = async () => {
    if (!isActive) return;

    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'ndrs', ndr.id), {
        assignments,
        cars,
        notes,
        availableCars,
        lastUpdated: Timestamp.now()
      });
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving NDR data:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Prepare print agreements data
  const handlePrintAgreements = () => {
    setShowPrintAgreements(true);
  };

  // Show print agreements view
  if (showPrintAgreements) {
    const agreementsData = generateAgreementsData({
      ...ndr,
      directors,
      males: maleMembers,
      females: femaleMembers
    });
    return (
      <PrintAgreements
        ndr={agreementsData}
        onClose={() => setShowPrintAgreements(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <button
            onClick={onBack}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Back to NDRs
          </button>
          <h2 className="text-2xl font-bold text-gray-800">{ndr.eventName}</h2>
          <p className="text-gray-600">{new Date(ndr.eventDate).toLocaleDateString()}</p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
          ndr.status === 'active' ? 'bg-green-100 text-green-800' :
          ndr.status === 'completed' ? 'bg-blue-100 text-blue-800' :
          ndr.status === 'archived' ? 'bg-gray-100 text-gray-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {ndr.status?.toUpperCase() || 'PENDING'}
        </span>
      </div>

      {/* Archived Summary View */}
      {ndr.status === 'archived' && ndr.archivedSummary && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Archived Summary</h3>
            <button
              onClick={printPage}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 print:hidden"
            >
              <Printer size={18} />
              Print Summary
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded border">
            {ndr.archivedSummary}
          </pre>
        </div>
      )}

      {/* Tabbed Interface (for non-archived NDRs) */}
      {ndr.status !== 'archived' && (
        <div className="bg-white rounded-lg shadow print:shadow-none">
          {/* Tab Navigation */}
          <div className="flex border-b overflow-x-auto print:hidden">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center gap-2 px-6 py-3 ${activeTab === 'home' ? 'border-b-2 border-red-600 text-red-600 font-medium' : 'text-gray-600'}`}
            >
              <FileText size={18} />
              Home
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`flex items-center gap-2 px-6 py-3 ${activeTab === 'assignments' ? 'border-b-2 border-red-600 text-red-600 font-medium' : 'text-gray-600'}`}
            >
              <Users size={18} />
              Assignments
            </button>
            <button
              onClick={() => setActiveTab('cars')}
              className={`flex items-center gap-2 px-6 py-3 ${activeTab === 'cars' ? 'border-b-2 border-red-600 text-red-600 font-medium' : 'text-gray-600'}`}
            >
              <Car size={18} />
              Cars
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-2 px-6 py-3 ${activeTab === 'notes' ? 'border-b-2 border-red-600 text-red-600 font-medium' : 'text-gray-600'}`}
            >
              <ClipboardList size={18} />
              Notes
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Save Button and Success Message */}
            {isActive && activeTab !== 'home' && (
              <div className="mb-4 flex items-center gap-3">
                <button
                  onClick={manualSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Changes
                    </>
                  )}
                </button>
                {showSaveSuccess && (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-2 rounded-lg border border-green-200 animate-fade-in">
                    <CheckCircle size={18} />
                    <span className="font-medium">Changes saved successfully!</span>
                  </div>
                )}
              </div>
            )}

            {/* View Only Mode Banner */}
            {!isActive && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 font-medium">
                  View Only Mode - This NDR must be activated to make changes
                </p>
              </div>
            )}

            {/* Loading State */}
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : (
              <>
                {/* Home Tab */}
                {activeTab === 'home' && (
                  <HomeTab
                    ndr={{ ...ndr, availableCars }}
                    directors={directors}
                    males={maleMembers}
                    females={femaleMembers}
                    onPrintAgreements={handlePrintAgreements}
                    onPrintPage={printPage}
                  />
                )}

                {/* Assignments Tab */}
                {activeTab === 'assignments' && (
                  isActive ? (
                    <AssignmentsTabEditable
                      assignments={assignments}
                      setAssignments={setAssignments}
                      members={members}
                      directors={directors}
                      males={maleMembers}
                      females={femaleMembers}
                      availableCars={availableCars}
                      setAvailableCars={setAvailableCars}
                    />
                  ) : (
                    <AssignmentsTabViewOnly
                      ndr={{ ...ndr, availableCars }}
                      members={members}
                    />
                  )
                )}

                {/* Cars Tab */}
                {activeTab === 'cars' && (
                  isActive ? (
                    <CarsTabEditable cars={cars} setCars={setCars} />
                  ) : (
                    <CarsTabViewOnly ndr={ndr} />
                  )
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                  isActive ? (
                    <NotesTabEditable
                      notes={notes}
                      setNotes={setNotes}
                      ndrId={ndr.id}
                      assignments={assignments}
                      members={members}
                      ndr={ndr}
                    />
                  ) : (
                    <NotesTabViewOnly ndr={ndr} members={members} />
                  )
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NDRDetail;
