import React from 'react';

/**
 * CarsTabEditable component - Editable car information management
 * @param {Array} cars - Array of car objects
 * @param {Function} setCars - Function to update cars
 */
export const CarsTabEditable = ({ cars, setCars }) => {
  const addCar = () => {
    const maxCarNumber = cars.length > 0
      ? Math.max(...cars.map(c => c.carNumber))
      : 0;

    const newCar = {
      id: Date.now(),
      carNumber: maxCarNumber + 1,
      make: '',
      model: '',
      color: '',
      licensePlate: '',
      driver: '',
      navigator: ''
    };
    setCars([...cars, newCar]);
  };

  const updateCar = (carId, field, value) => {
    setCars(cars.map(car =>
      car.id === carId ? { ...car, [field]: value } : car
    ));
  };

  const removeCar = (carId) => {
    if (window.confirm('Remove this car?')) {
      setCars(cars.filter(car => car.id !== carId));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Car Information</h3>
        <button
          onClick={addCar}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Add Car
        </button>
      </div>

      <div className="space-y-4">
        {cars.map(car => (
          <div key={car.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold">Car {car.carNumber}</h4>
              <button
                onClick={() => removeCar(car.id)}
                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
              >
                Remove
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                <input
                  type="text"
                  value={car.make}
                  onChange={(e) => updateCar(car.id, 'make', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Make"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input
                  type="text"
                  value={car.model}
                  onChange={(e) => updateCar(car.id, 'model', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Model"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="text"
                  value={car.color}
                  onChange={(e) => updateCar(car.id, 'color', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Color"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                <input
                  type="text"
                  value={car.licensePlate}
                  onChange={(e) => updateCar(car.id, 'licensePlate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="License Plate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                <input
                  type="text"
                  value={car.driver}
                  onChange={(e) => updateCar(car.id, 'driver', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Driver name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Navigator</label>
                <input
                  type="text"
                  value={car.navigator}
                  onChange={(e) => updateCar(car.id, 'navigator', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Navigator name"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * CarsTabViewOnly component - View-only display of car information
 * @param {Object} ndr - The NDR object
 */
export const CarsTabViewOnly = ({ ndr }) => {
  const cars = ndr.cars || [];

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold">Car Information (View Only)</h3>

      {cars.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No cars added yet
        </div>
      ) : (
        <div className="space-y-4">
          {cars.map(car => (
            <div key={car.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <h4 className="text-lg font-semibold mb-3">Car {car.carNumber}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Make:</span>
                  <span className="ml-2">{car.make || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Model:</span>
                  <span className="ml-2">{car.model || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Color:</span>
                  <span className="ml-2">{car.color || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">License Plate:</span>
                  <span className="ml-2">{car.licensePlate || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Driver:</span>
                  <span className="ml-2">{car.driver || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Navigator:</span>
                  <span className="ml-2">{car.navigator || 'N/A'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
