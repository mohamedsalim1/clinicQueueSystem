const http = require('http');
http.get('http://127.0.0.1:3000/api/settings/clinics', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'DATA:', data));
}).on('error', err => console.error(err));
