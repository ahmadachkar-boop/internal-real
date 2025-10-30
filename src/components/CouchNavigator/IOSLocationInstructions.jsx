import React from 'react';

/**
 * Component showing iOS-specific location permission instructions
 */
const IOSLocationInstructions = ({ platformInfo }) => {
  if (!platformInfo.isIOS) {
    return null;
  }

  return (
    <p className="text-xs text-blue-700 mt-2">
      💡 Make sure Location Services are enabled in iPhone Settings first
    </p>
  );
};

export default IOSLocationInstructions;
