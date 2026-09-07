let listeners = [];

export function onItemChange(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

export function emitItemChange(itemId, eventType) {
  console.log(`[Realtime] expenseItems emitting UI event id=${itemId} eventType=${eventType}`);
  listeners.forEach((cb) => {
    try {
      cb(itemId, eventType);
    } catch (error) {
      console.error('Item change listener error:', error);
    }
  });
}
