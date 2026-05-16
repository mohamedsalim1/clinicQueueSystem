const queueService = require('./src/services/queue.service');

queueService.getAllClinicsState()
  .then(result => {
    console.log('Success:', JSON.stringify(result, null, 2));
  })
  .catch(err => {
    console.error('Error:', err);
    console.error('Stack:', err.stack);
  });