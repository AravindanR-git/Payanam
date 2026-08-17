let listeners = [];

export function onTripChange(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

export function emitTripChange(tripId, eventType) {
  listeners.forEach((cb) => {
    try {
      cb(tripId, eventType);
    } catch (error) {
      console.error('Trip change listener error:', error);
    }
  });
}
