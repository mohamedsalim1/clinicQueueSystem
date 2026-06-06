const getHealthStatus = () => {
  return {
    status: 'OK',
    message: 'Clinic Queue Management System API is running',
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  getHealthStatus,
};
