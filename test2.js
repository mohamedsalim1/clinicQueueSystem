const { exec } = require('child_process');
const server = exec('node src/index.js');
setTimeout(() => {
  const http = require('http');
  http.get('http://127.0.0.1:3000/api/settings/clinics', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('STATUS:', res.statusCode, 'DATA:', data);
      server.kill();
    });
  }).on('error', err => {
    console.error('HTTP Error:', err);
    server.kill();
  });
}, 2000);
