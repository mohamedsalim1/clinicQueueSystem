const axios = require('axios');

async function testTakeQueue() {
  try {
    const response = await axios.post('http://localhost:3000/api/queue/take', {
      clinicId: '3',
      patientName: 'Test Patient',
      patientPhone: '123456789',
      patientAddress: 'Test Address'
    });
    
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('Error Response:', error.response.data);
      console.error('Status:', error.response.status);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testTakeQueue();