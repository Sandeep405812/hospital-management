import http from 'http';

const BASE_URL = 'http://localhost:5000';

async function request(path, method = 'GET', data = null, token = null) {
  const url = new URL(path, BASE_URL);
  return new Promise((resolve) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );

    req.on('error', (err) => resolve({ status: 500, error: err.message }));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('--- TESTING ALL API ENDPOINTS ---\n');

  // 1. Auth Login
  const loginRes = await request('/api/auth/login', 'POST', {
    email: 'superadmin@hospital.com',
    password: 'password123',
  });
  console.log(`POST /api/auth/login -> ${loginRes.status} (User: ${loginRes.data?.name || 'Error'})`);
  const token = loginRes.data?.token;

  if (!token) {
    console.error('Failed to obtain token');
    process.exit(1);
  }

  // 2. Auth Endpoints
  const meRes = await request('/api/auth/me', 'GET', null, token);
  console.log(`GET /api/auth/me -> ${meRes.status} (${meRes.data?.name || ''})`);

  const profileGet = await request('/api/auth/profile', 'GET', null, token);
  console.log(`GET /api/auth/profile -> ${profileGet.status}`);

  const profilePut = await request('/api/auth/profile', 'PUT', { phoneNumber: '+91 99182 72164' }, token);
  console.log(`PUT /api/auth/profile -> ${profilePut.status}`);

  const forgotRes = await request('/api/auth/forgot-password', 'POST', { email: 'superadmin@hospital.com' });
  console.log(`POST /api/auth/forgot-password -> ${forgotRes.status}`);

  // 3. Doctors
  const docsRes = await request('/api/doctors', 'GET');
  console.log(`GET /api/doctors -> ${docsRes.status} (${Array.isArray(docsRes.data) ? docsRes.data.length + ' doctors' : ''})`);

  // 4. Patients
  const patientsRes = await request('/api/patients', 'GET', null, token);
  console.log(`GET /api/patients -> ${patientsRes.status} (${Array.isArray(patientsRes.data) ? patientsRes.data.length + ' patients' : ''})`);

  // 5. Departments
  const deptRes = await request('/api/departments', 'GET');
  console.log(`GET /api/departments -> ${deptRes.status} (${Array.isArray(deptRes.data) ? deptRes.data.length + ' departments' : ''})`);

  // 6. Appointments
  const appRes = await request('/api/appointments', 'GET', null, token);
  console.log(`GET /api/appointments -> ${appRes.status} (${Array.isArray(appRes.data) ? appRes.data.length + ' appointments' : ''})`);

  // 7. Prescriptions
  const rxRes = await request('/api/prescriptions', 'GET', null, token);
  console.log(`GET /api/prescriptions -> ${rxRes.status}`);

  // 8. Billing
  const billRes = await request('/api/billing', 'GET', null, token);
  console.log(`GET /api/billing -> ${billRes.status}`);

  // 9. Beds
  const bedRes = await request('/api/beds', 'GET', null, token);
  console.log(`GET /api/beds -> ${bedRes.status} (${Array.isArray(bedRes.data) ? bedRes.data.length + ' beds' : ''})`);

  const dischargeRes = await request('/api/beds/discharge-summaries', 'GET', null, token);
  console.log(`GET /api/beds/discharge-summaries -> ${dischargeRes.status}`);

  // 10. Staff
  const staffRes = await request('/api/staff', 'GET', null, token);
  console.log(`GET /api/staff -> ${staffRes.status} (${Array.isArray(staffRes.data) ? staffRes.data.length + ' staff members' : ''})`);

  // 11. Hospitals
  const hospRes = await request('/api/hospitals', 'GET', null, token);
  console.log(`GET /api/hospitals -> ${hospRes.status}`);

  // 12. Settings
  const settingsRes = await request('/api/settings', 'GET', null, token);
  console.log(`GET /api/settings -> ${settingsRes.status}`);

  // 13. Reports
  const reportsRes = await request('/api/reports', 'GET', null, token);
  console.log(`GET /api/reports -> ${reportsRes.status}`);

  // 14. Metrics
  const metricsRes = await request('/api/metrics', 'GET', null, token);
  console.log(`GET /api/metrics -> ${metricsRes.status}`);

  // 15. AI Chat
  const aiRes = await request('/api/ai/chat', 'POST', { message: 'Hello' });
  console.log(`POST /api/ai/chat -> ${aiRes.status}`);

  console.log('\n--- ALL API TESTS COMPLETE ---');
  process.exit(0);
}

run();
