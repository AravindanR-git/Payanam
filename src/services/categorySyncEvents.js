let listeners = [];

export function onCategoryChange(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

export function emitCategoryChange(categoryId, eventType) {
  listeners.forEach((cb) => {
    try {
      cb(categoryId, eventType);
    } catch (error) {
      console.error('Category change listener error:', error);
    }
  });
}
