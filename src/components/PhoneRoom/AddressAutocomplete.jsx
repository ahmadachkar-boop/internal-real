import React from 'react';
import { MapPin, TrendingUp } from 'lucide-react';

/**
 * AddressAutocomplete Component
 *
 * A reusable address input component with autocomplete suggestions and common locations.
 * Handles both Google Maps autocomplete results and frequently used locations from the current event.
 *
 * @param {string} value - The current input value
 * @param {function} onChange - Called when input value changes
 * @param {function} onSelect - Called when a suggestion is selected
 * @param {string} label - Label text for the input field
 * @param {string} placeholder - Placeholder text for the input
 * @param {array} suggestions - Array of address suggestions from autocomplete
 * @param {boolean} showSuggestions - Whether to show autocomplete suggestions dropdown
 * @param {function} setShowSuggestions - Function to toggle suggestions dropdown
 * @param {array} commonLocations - Array of common locations with {address, count} structure
 * @param {boolean} showCommonLocations - Whether to show common locations dropdown
 * @param {function} setShowCommonLocations - Function to toggle common locations dropdown
 * @param {object} inputRef - React ref for the input element
 * @param {string} className - Additional CSS classes for the container
 * @param {string} inputClassName - Additional CSS classes for the input element
 * @param {boolean} required - Whether the input is required
 * @param {string} borderColor - Border color class for suggestions (e.g., 'border-[#79F200]')
 */
const AddressAutocomplete = ({
  value,
  onChange,
  onSelect,
  label,
  placeholder = "Start typing address...",
  suggestions = [],
  showSuggestions = false,
  setShowSuggestions,
  commonLocations = [],
  showCommonLocations = false,
  setShowCommonLocations,
  inputRef,
  className = "",
  inputClassName = "",
  required = false,
  borderColor = "border-[#79F200]"
}) => {

  const handleInputChange = (e) => {
    onChange(e.target.value);
  };

  const handleFocus = () => {
    // Show common locations if available and input is empty
    if (commonLocations.length > 0 && !value) {
      setShowCommonLocations?.(true);
    }
  };

  const handleSuggestionSelect = (address) => {
    onSelect(address);
    setShowSuggestions?.(false);
    setShowCommonLocations?.(false);
  };

  const handleCommonLocationSelect = (address) => {
    onSelect(address);
    setShowCommonLocations?.(false);
  };

  return (
    <div className={`relative ${className}`} ref={inputRef}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <MapPin size={16} />
          {label}
        </label>
      )}

      <input
        type="text"
        inputMode="text"
        autoComplete="street-address"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#79F200] focus:border-[#79F200] transition outline-none text-gray-900 ${inputClassName}`}
        placeholder={placeholder}
        required={required}
      />

      {/* Common Locations Dropdown */}
      {showCommonLocations && commonLocations.length > 0 && (
        <div className={`absolute z-10 w-full mt-2 bg-white border-2 ${borderColor} rounded-xl shadow-2xl max-h-48 md:max-h-64 lg:max-h-80 overflow-y-auto`}>
          <div className={`p-3 ${borderColor === 'border-[#79F200]' ? 'bg-[#79F200]' : borderColor === 'border-orange-500' ? 'bg-orange-50' : 'bg-gray-100'} sticky top-0`}>
            <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp size={16} />
              Common Locations Tonight
            </p>
          </div>
          {commonLocations.map((location, index) => (
            <div
              key={index}
              onClick={() => handleCommonLocationSelect(location.address)}
              className={`px-4 py-3 hover:${borderColor === 'border-[#79F200]' ? 'bg-[#79F200]/20' : 'bg-orange-50'} cursor-pointer transition flex items-center justify-between border-b border-gray-100 last:border-0`}
            >
              <div className="flex items-center gap-2 flex-1">
                <MapPin size={16} className={`${borderColor === 'border-[#79F200]' ? 'text-[#79F200]' : 'text-orange-500'} flex-shrink-0`} />
                <span className="text-sm text-gray-900">{location.address}</span>
              </div>
              <span className="text-xs font-bold text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
                {location.count}x
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Autocomplete Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className={`absolute z-10 w-full mt-2 bg-white border-2 ${borderColor} rounded-xl shadow-2xl max-h-40 md:max-h-56 lg:max-h-64 overflow-y-auto`}>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionSelect(suggestion)}
              className={`px-4 py-3 hover:${borderColor === 'border-[#79F200]' ? 'bg-[#79F200]/20' : 'bg-orange-50'} cursor-pointer transition flex items-center gap-2 border-b border-gray-100 last:border-0`}
            >
              <MapPin size={16} className={borderColor === 'border-[#79F200]' ? 'text-[#79F200]' : 'text-orange-500'} />
              <span className="text-sm text-gray-900">{suggestion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;
