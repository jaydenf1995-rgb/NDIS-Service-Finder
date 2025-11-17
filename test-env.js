require('dotenv').config();

console.log('=== Testing Environment Variables ===');
console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT FOUND');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '*** SET ***' : 'NOT FOUND');
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL || 'NOT FOUND');
console.log('PORT:', process.env.PORT || 'NOT FOUND');