import React, { useState, useEffect, useRef } from 'react';
import { Car, AlertCircle, Info } from 'lucide-react';
import { useActiveNDR } from '../ActiveNDRContext';
import { useGoogleMaps } from '../GoogleMapsProvider';
import { useRideData } from '../hooks/useRideData';
import { useCarTracking } from '../hooks/useCarTracking';
import { useRideActions } from '../hooks/useRideActions';
import Snackbar from './Snackbar';
import Modal from './RideManagement/Modal';
import CarStatusGrid from './RideManagement/CarStatusGrid';
import RideCard from './RideManagement/RideCard';
import EditRideModal from './RideManagement/EditRideModal';
import AssignCarModal from './RideManagement/AssignCarModal';
import SplitRideModal from './RideManagement/SplitRideModal';
import ReassignRideModal from './RideManagement/ReassignRideModal';
import TrafficInfoModal from './RideManagement/TrafficInfoModal';

// CONSTANTS
const ETA_DEBOUNCE_MS = 45000;
const ETA_REFRESH_INTERVAL_MS = 180000;
const API_RATE_LIMIT_PER_HOUR = 500;
const API_RESET_INTERVAL_MS = 3600000;

const RideManagement = () => {
  const { activeNDR, loading: ndrLoading } = useActiveNDR();
  const { isLoaded: googleMapsLoaded } = useGoogleMaps();
  const [availableCars, setAvailableCars] = useState(0);
  const [activeTab, setActiveTab] = useState('pending');

  // Custom hooks
  const { rides, loading } = useRideData(activeNDR);
  const { carLocations, carStatuses, currentTime } = useCarTracking(activeNDR, rides, availableCars);
  const {
    assignCar: doAssignCar,
    startRide: doStartRide,
    completeRide: doCompleteRide,
    cancelRide: doCancelRide,
    terminateRide: doTerminateRide,
    updateRide: doUpdateRide,
    splitRide: doSplitRide,
    reassignRide: doReassignRide,
    assignToActiveRide: doAssignToActiveRide,
    undoLastAction: doUndoLastAction,
    checkCarEligibility,
    eligibleCars,
    checkingEligibility,
    loadingStates
  } = useRideActions(activeNDR, availableCars);

  // Modal states
  const [editingRide, setEditingRide] = useState(null);
  const [assigningRide, setAssigningRide] = useState(null);
  const [splittingRide, setSplittingRide] = useState(null);
  const [splitRiders, setSplitRiders] = useState({ ride1: 1, ride2: 1 });
  const [reassigningRide, setReassigningRide] = useState(null);
  const [trafficModalOpen, setTrafficModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const [promptModal, setPromptModal] = useState({ isOpen: false, title: '', message: '', onSubmit: null });
  const [promptValue, setPromptValue] = useState('');
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });
  const [snackbar, setSnackbar] = useState({ isOpen: false, message: '', type: 'info', onUndo: null });
  const [lastAction, setLastAction] = useState(null);
  const [multiRideSuggestions, setMultiRideSuggestions] = useState({});

  const isMounted = useRef(true);
  const apiCallCount = useRef(0);
  const lastApiReset = useRef(Date.now());

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!activeNDR) return;
    setAvailableCars(activeNDR.availableCars || 0);
  }, [activeNDR]);

  // Action handlers
  const handleAssignCar = async (ride) => {
    setAssigningRide({ ...ride, selectedCar: '' });
    await checkCarEligibility(ride);
  };

  const handleAssignCarSubmit = async () => {
    if (!assigningRide || !assigningRide.selectedCar) {
      setAlertModal({
        isOpen: true,
        title: 'No Car Selected',
        message: 'Please select a car number before assigning.'
      });
      return;
    }

    try {
      await doAssignCar(assigningRide.id, parseInt(assigningRide.selectedCar));
      setAssigningRide(null);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error assigning car: ' + error.message
      });
    }
  };

  const handleStartRide = (rideId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Mark as Picked Up?',
      message: 'Confirm that the patron has been picked up.',
      onConfirm: async () => {
        try {
          await doStartRide(rideId);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        } catch (error) {
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: 'Error starting ride: ' + error.message
          });
        }
      }
    });
  };

  const handleCompleteRide = (rideId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Complete Ride?',
      message: 'Mark this ride as completed?',
      onConfirm: async () => {
        try {
          const result = await doCompleteRide(rideId);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          setLastAction({ type: 'complete', rideId, previousState: result.previousState });
          setSnackbar({
            isOpen: true,
            message: 'Ride marked as completed',
            type: 'success',
            onUndo: () => handleUndo()
          });
        } catch (error) {
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: 'Error completing ride: ' + error.message
          });
        }
      }
    });
  };

  const handleCancelRide = (rideId) => {
    setPromptModal({
      isOpen: true,
      title: 'Cancel Ride',
      message: 'Please provide a reason for cancellation:',
      onSubmit: async (reason) => {
        try {
          const result = await doCancelRide(rideId, reason);
          setPromptModal({ isOpen: false, title: '', message: '', onSubmit: null });
          setPromptValue('');
          setLastAction({ type: 'cancel', rideId, previousState: result.previousState });
          setSnackbar({
            isOpen: true,
            message: 'Ride cancelled',
            type: 'warning',
            onUndo: () => handleUndo()
          });
        } catch (error) {
          setPromptModal({ isOpen: false, title: '', message: '', onSubmit: null });
          setPromptValue('');
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: 'Error cancelling ride: ' + error.message
          });
        }
      }
    });
  };

  const handleTerminateRide = (rideId) => {
    setPromptModal({
      isOpen: true,
      title: 'Terminate Ride',
      message: 'Reason for termination (e.g., patron no-show, unsafe situation):',
      onSubmit: async (reason) => {
        try {
          const result = await doTerminateRide(rideId, reason);
          setPromptModal({ isOpen: false, title: '', message: '', onSubmit: null });
          setPromptValue('');
          setLastAction({ type: 'terminate', rideId, previousState: result.previousState });
          setSnackbar({
            isOpen: true,
            message: 'Ride terminated',
            type: 'warning',
            onUndo: () => handleUndo()
          });
        } catch (error) {
          setPromptModal({ isOpen: false, title: '', message: '', onSubmit: null });
          setPromptValue('');
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: 'Error terminating ride: ' + error.message
          });
        }
      }
    });
  };

  const handleUndo = async () => {
    if (!lastAction) return;
    try {
      await doUndoLastAction(lastAction);
      setSnackbar({ isOpen: false, message: '', type: 'info', onUndo: null });
      setLastAction(null);
      setSnackbar({
        isOpen: true,
        message: `Undo successful - ride restored to ${lastAction.previousState.status}`,
        type: 'success',
        onUndo: null
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Undo Failed',
        message: 'Could not undo the last action: ' + error.message
      });
    }
  };

  const handleEditRide = (ride) => {
    setEditingRide({
      ...ride,
      dropoffs: ride.dropoffs || [ride.dropoff]
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRide) return;

    const patronName = editingRide.patronName?.trim();
    const phone = editingRide.phone?.trim();
    const pickup = editingRide.pickup?.trim();
    const riders = editingRide.riders;

    if (!patronName || !phone || !pickup || !riders || riders < 1) {
      setAlertModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'All fields are required and riders must be at least 1.'
      });
      return;
    }

    const hasEmptyDropoff = editingRide.dropoffs.some(d => !d?.trim());
    if (hasEmptyDropoff) {
      setAlertModal({
        isOpen: true,
        title: 'Validation Error',
        message: 'All dropoff locations must be filled in.'
      });
      return;
    }

    try {
      await doUpdateRide(editingRide);
      setEditingRide(null);
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error updating ride: ' + error.message
      });
    }
  };

  const handleSplitRide = (ride) => {
    if (ride.riders < 2) {
      setAlertModal({
        isOpen: true,
        title: 'Cannot Split',
        message: 'Cannot split a ride with less than 2 riders.'
      });
      return;
    }
    setSplittingRide(ride);
    setSplitRiders({ ride1: 1, ride2: ride.riders - 1 });
  };

  const handleSplitRideSubmit = async () => {
    if (!splittingRide) return;

    const totalRiders = splitRiders.ride1 + splitRiders.ride2;
    if (totalRiders !== splittingRide.riders || splitRiders.ride1 < 1 || splitRiders.ride2 < 1) {
      setAlertModal({
        isOpen: true,
        title: 'Invalid Split',
        message: 'Split must equal total riders and each ride must have at least 1 rider.'
      });
      return;
    }

    try {
      await doSplitRide(splittingRide, splitRiders);
      setAlertModal({
        isOpen: true,
        title: 'Success',
        message: 'Ride split successfully!'
      });
      setSplittingRide(null);
      setSplitRiders({ ride1: 1, ride2: 1 });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error splitting ride: ' + error.message
      });
    }
  };

  const handleReassign = (ride) => {
    setReassigningRide({ ...ride, newCarNumber: '' });
  };

  const handleReassignSubmit = async () => {
    if (!reassigningRide || !reassigningRide.newCarNumber) {
      setAlertModal({
        isOpen: true,
        title: 'No Car Selected',
        message: 'Please select a car to reassign to.'
      });
      return;
    }

    try {
      await doReassignRide(reassigningRide.id, parseInt(reassigningRide.newCarNumber));
      setReassigningRide(null);
      setSnackbar({
        isOpen: true,
        message: `Ride reassigned to Car ${reassigningRide.newCarNumber}`,
        type: 'success',
        onUndo: null
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        title: 'Error',
        message: 'Error reassigning ride: ' + error.message
      });
    }
  };

  const handleAssignToActiveRide = (pendingRideId, activeRideId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Assign to Same Car?',
      message: 'This will assign the pending ride to the same car. Both riders will show as separate active rides.',
      onConfirm: async () => {
        try {
          const result = await doAssignToActiveRide(pendingRideId, activeRideId);
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          setSnackbar({
            isOpen: true,
            message: `Ride assigned to Car ${result.carNumber}. Both riders will show as separate active rides.`,
            type: 'success',
            onUndo: null
          });
        } catch (error) {
          setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
          setAlertModal({
            isOpen: true,
            title: 'Error',
            message: 'Error assigning ride: ' + error.message
          });
        }
      }
    });
  };

  // Edit modal helpers
  const updateDropoff = (index, value) => {
    const newDropoffs = [...editingRide.dropoffs];
    newDropoffs[index] = value;
    setEditingRide({ ...editingRide, dropoffs: newDropoffs });
  };

  const addDropoffToEdit = () => {
    setEditingRide({
      ...editingRide,
      dropoffs: [...editingRide.dropoffs, '']
    });
  };

  const removeDropoffFromEdit = (index) => {
    if (editingRide.dropoffs.length <= 1) {
      setAlertModal({
        isOpen: true,
        title: 'Cannot Remove',
        message: 'Ride must have at least one dropoff location.'
      });
      return;
    }
    const newDropoffs = editingRide.dropoffs.filter((_, i) => i !== index);
    setEditingRide({ ...editingRide, dropoffs: newDropoffs });
  };

  // Loading states
  if (ndrLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Ride Management</h2>
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!activeNDR) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Ride Management</h2>
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-8 text-center">
          <AlertCircle className="mx-auto mb-4 text-yellow-600" size={64} />
          <h3 className="text-xl font-bold text-gray-800 mb-2">No Active NDR</h3>
          <p className="text-gray-600 mb-4">
            Ride Management is currently unavailable. A director must activate an NDR from the NDR Reports page before you can manage rides.
          </p>
          <p className="text-sm text-gray-500">
            Directors: Go to NDR Reports and activate an Operating Night event to enable Ride Management.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Ride Management</h2>
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <p className="text-gray-500">Loading rides...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Ride Management</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="bg-green-100 px-4 py-2 rounded-lg">
            <p className="text-sm font-semibold text-green-800">Active NDR: {activeNDR.eventName}</p>
          </div>
          <div className="bg-blue-100 px-4 py-2 rounded-lg flex items-center gap-2">
            <Car size={18} className="text-blue-800" />
            <p className="text-sm font-semibold text-blue-800">
              {availableCars} {availableCars === 1 ? 'Car' : 'Cars'} Available
            </p>
          </div>
          <button
            onClick={() => setTrafficModalOpen(true)}
            className="bg-orange-100 hover:bg-orange-200 px-4 py-2 rounded-lg flex items-center gap-2 min-h-touch touch-manipulation transition"
          >
            <Info size={18} className="text-orange-800" />
            <p className="text-sm font-semibold text-orange-800">Traffic Info</p>
          </button>
        </div>
      </div>

      {/* Car Status Board */}
      <CarStatusGrid
        availableCars={availableCars}
        carStatuses={carStatuses}
        carLocations={carLocations}
        currentTime={currentTime}
      />

      {availableCars === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 font-medium">
            No cars are set as available for this event. Directors should update the car count in NDR Assignments.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 px-2 sm:px-4 md:px-6 py-3 md:py-4 text-center transition text-xs sm:text-sm md:text-base min-h-touch touch-manipulation ${
              activeTab === 'pending' ? 'border-b-2 border-blue-600 text-blue-600 font-medium' : 'text-gray-600'
            }`}
          >
            Pending ({rides.pending.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 px-2 sm:px-4 md:px-6 py-3 md:py-4 text-center transition text-xs sm:text-sm md:text-base min-h-touch touch-manipulation ${
              activeTab === 'active' ? 'border-b-2 border-purple-600 text-purple-600 font-medium' : 'text-gray-600'
            }`}
          >
            Active ({rides.active.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 px-2 sm:px-4 md:px-6 py-3 md:py-4 text-center transition text-xs sm:text-sm md:text-base min-h-touch touch-manipulation ${
              activeTab === 'completed' ? 'border-b-2 border-green-600 text-green-600 font-medium' : 'text-gray-600'
            }`}
          >
            History ({rides.completed.length})
          </button>
        </div>

        {/* Ride List */}
        <div className="p-4">
          {rides[activeTab].length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No {activeTab} rides
            </div>
          ) : (
            rides[activeTab].map((ride, index) => {
              // Check if we're in edit or assign mode for this ride
              if (editingRide?.id === ride.id) {
                return (
                  <div key={ride.id} className="mb-4 p-4 border-2 rounded-lg border-gray-200">
                    <EditRideModal
                      ride={editingRide}
                      onChange={setEditingRide}
                      onSave={handleSaveEdit}
                      onCancel={() => setEditingRide(null)}
                      onUpdateDropoff={updateDropoff}
                      onAddDropoff={addDropoffToEdit}
                      onRemoveDropoff={removeDropoffFromEdit}
                      isSaving={loadingStates.savingEdit}
                    />
                  </div>
                );
              }

              if (assigningRide?.id === ride.id) {
                return (
                  <div key={ride.id} className="mb-4 p-4 border-2 rounded-lg border-gray-200">
                    <AssignCarModal
                      ride={assigningRide}
                      selectedCar={assigningRide.selectedCar}
                      onSelectCar={(car) => setAssigningRide({ ...assigningRide, selectedCar: car })}
                      onAssign={handleAssignCarSubmit}
                      onCancel={() => setAssigningRide(null)}
                      eligibleCars={eligibleCars}
                      checkingEligibility={checkingEligibility}
                      isAssigning={loadingStates.assigningCar}
                      availableCars={availableCars}
                    />
                  </div>
                );
              }

              return (
                <RideCard
                  key={ride.id}
                  ride={ride}
                  index={index}
                  activeTab={activeTab}
                  multiRideSuggestions={multiRideSuggestions}
                  loadingStates={loadingStates}
                  onAssignCar={handleAssignCar}
                  onEdit={handleEditRide}
                  onSplit={handleSplitRide}
                  onCancel={handleCancelRide}
                  onStartRide={handleStartRide}
                  onCompleteRide={handleCompleteRide}
                  onTerminateRide={handleTerminateRide}
                  onReassign={handleReassign}
                  onAssignToActiveRide={handleAssignToActiveRide}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Split Ride Modal */}
      {splittingRide && (
        <SplitRideModal
          ride={splittingRide}
          splitRiders={splitRiders}
          onChangeSplit={setSplitRiders}
          onSplit={handleSplitRideSubmit}
          onCancel={() => {
            setSplittingRide(null);
            setSplitRiders({ ride1: 1, ride2: 1 });
          }}
          isSplitting={loadingStates.splittingRide}
        />
      )}

      {/* Reassign Modal */}
      {reassigningRide && (
        <ReassignRideModal
          ride={reassigningRide}
          newCarNumber={reassigningRide.newCarNumber}
          onChangeCarNumber={(car) => setReassigningRide({ ...reassigningRide, newCarNumber: car })}
          onReassign={handleReassignSubmit}
          onCancel={() => setReassigningRide(null)}
          availableCars={availableCars}
        />
      )}

      {/* Traffic Info Modal */}
      <TrafficInfoModal
        isOpen={trafficModalOpen}
        onClose={() => setTrafficModalOpen(false)}
        googleMapsLoaded={googleMapsLoaded}
      />

      {/* Alert Modal */}
      <Modal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '' })}
        title={alertModal.title}
        actions={
          <button
            onClick={() => setAlertModal({ isOpen: false, title: '', message: '' })}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold min-h-touch touch-manipulation"
          >
            OK
          </button>
        }
      >
        <p className="text-gray-700">{alertModal.message}</p>
      </Modal>

      {/* Confirm Modal */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
        title={confirmModal.title}
        actions={
          <>
            <button
              onClick={() => {
                if (confirmModal.onConfirm) confirmModal.onConfirm();
              }}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold min-h-touch touch-manipulation"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold min-h-touch touch-manipulation"
            >
              Cancel
            </button>
          </>
        }
      >
        <p className="text-gray-700">{confirmModal.message}</p>
      </Modal>

      {/* Prompt Modal */}
      <Modal
        isOpen={promptModal.isOpen}
        onClose={() => {
          setPromptModal({ isOpen: false, title: '', message: '', onSubmit: null });
          setPromptValue('');
        }}
        title={promptModal.title}
        actions={
          <>
            <button
              onClick={() => {
                if (promptModal.onSubmit) promptModal.onSubmit(promptValue);
              }}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold min-h-touch touch-manipulation"
            >
              Submit
            </button>
            <button
              onClick={() => {
                setPromptModal({ isOpen: false, title: '', message: '', onSubmit: null });
                setPromptValue('');
              }}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold min-h-touch touch-manipulation"
            >
              Cancel
            </button>
          </>
        }
      >
        <p className="text-gray-700 mb-3">{promptModal.message}</p>
        <input
          type="text"
          value={promptValue}
          onChange={(e) => setPromptValue(e.target.value)}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-touch"
          placeholder="Enter text..."
          autoFocus
        />
      </Modal>

      {/* Snackbar */}
      <Snackbar
        isOpen={snackbar.isOpen}
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar({ ...snackbar, isOpen: false })}
        onUndo={snackbar.onUndo}
        autoHideDuration={snackbar.onUndo ? undefined : 5000}
      />
    </div>
  );
};

export default RideManagement;
