import { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';

/**
 * Custom hook for managing car information
 * @param {Object} ndr - The NDR object
 * @param {boolean} isActive - Whether the NDR is active
 * @returns {Object} Cars state and save functions
 */
const useNDRCars = (ndr, isActive) => {
  const [cars, setCars] = useState(ndr.cars || []);
  const [availableCars, setAvailableCars] = useState(ndr.availableCars || 0);

  /**
   * Save cars to Firestore
   */
  const saveCars = async () => {
    if (!isActive) return;

    try {
      await updateDoc(doc(db, 'ndrs', ndr.id), {
        cars,
        availableCars,
        lastUpdated: Timestamp.now()
      });
    } catch (error) {
      console.error('Error saving cars:', error);
      throw error;
    }
  };

  /**
   * Add a new car
   */
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

  /**
   * Update a car field
   */
  const updateCar = (carId, field, value) => {
    setCars(cars.map(car =>
      car.id === carId ? { ...car, [field]: value } : car
    ));
  };

  /**
   * Remove a car
   */
  const removeCar = (carId) => {
    if (window.confirm('Remove this car?')) {
      setCars(cars.filter(car => car.id !== carId));
    }
  };

  return {
    cars,
    setCars,
    availableCars,
    setAvailableCars,
    saveCars,
    addCar,
    updateCar,
    removeCar
  };
};

export default useNDRCars;
