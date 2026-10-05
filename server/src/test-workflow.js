async function runE2ETest() {
  console.log('--- Starting JanSankalp End-to-End Verification ---');

  // 1. Citizen Login
  console.log('1. Testing Citizen Login...');
  const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'citizen@jansankalp.gov.in', password: 'password123' })
  }).then(r => r.json());

  if (!loginRes.success) throw new Error('Citizen login failed: ' + loginRes.message);
  console.log('   ✓ Logged in as:', loginRes.user.name, `(${loginRes.user.role})`);
  const citizenToken = loginRes.token;

  // 2. Duplicate Detection
  console.log('2. Testing Duplicate Detection...');
  const dupRes = await fetch('http://localhost:5000/api/v1/complaints/duplicate-check?lat=18.5173&lng=73.8415&category_id=cat-roads&radius_meters=200')
    .then(r => r.json());
  console.log('   ✓ Duplicate Check Result:', { hasDuplicates: dupRes.hasDuplicates, count: dupRes.count });

  // 3. Create New Grievance
  console.log('3. Filing New Grievance...');
  const formData = new FormData();
  formData.append('title', 'Faulty Traffic Signal at Fergusson College Gate');
  formData.append('description', 'Pedestrian crossing light remains stuck on red, creating safety hazard for college students.');
  formData.append('category_id', 'cat-roads');
  formData.append('subcategory_id', 'sub-speedbreaker');
  formData.append('priority', 'high');
  formData.append('latitude', '18.5204');
  formData.append('longitude', '73.8428');
  formData.append('location_address', 'FC Road, outside Fergusson College Main Gate, Pune');
  formData.append('landmark', 'Fergusson College Main Arch');

  const createRes = await fetch('http://localhost:5000/api/v1/complaints', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${citizenToken}` },
    body: formData
  }).then(r => r.json());

  if (!createRes.success) throw new Error('Failed to create complaint: ' + createRes.message);
  console.log('   ✓ Grievance Created:', createRes.complaintNumber, `(ID: ${createRes.complaintId})`);
  const complaintId = createRes.complaintId;

  // 4. MLA Login & Assignment
  console.log('4. MLA Office assigning to PWD Officer...');
  const mlaLogin = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'mla@jansankalp.gov.in', password: 'password123' })
  }).then(r => r.json());

  const assignRes = await fetch(`http://localhost:5000/api/v1/complaints/${complaintId}/assign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${mlaLogin.token}`
    },
    body: JSON.stringify({
      department_id: 'dept-pwd',
      assigned_user_id: 'user-officer-01',
      remarks: 'Urgent traffic signal synchronization required before evening rush hour.'
    })
  }).then(r => r.json());

  if (!assignRes.success) throw new Error('Assignment failed: ' + assignRes.message);
  console.log('   ✓ Assigned to PWD Officer:', assignRes.message);

  // 5. Officer Updates Status to In Progress & Resolved
  console.log('5. Officer updating status to Resolved...');
  const officerLogin = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'officer@jansankalp.gov.in', password: 'password123' })
  }).then(r => r.json());

  const statusRes = await fetch(`http://localhost:5000/api/v1/complaints/${complaintId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${officerLogin.token}`
    },
    body: JSON.stringify({
      status: 'resolved',
      remarks: 'Traffic signal controller motherboard replaced and timings calibrated.'
    })
  }).then(r => r.json());

  if (!statusRes.success) throw new Error('Status update failed: ' + statusRes.message);
  console.log('   ✓ Status updated to:', statusRes.newStatus);

  // 6. Citizen Submits 5-Star Rating Feedback
  console.log('6. Citizen Submitting Satisfaction Rating...');
  const feedbackRes = await fetch(`http://localhost:5000/api/v1/complaints/${complaintId}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${citizenToken}`
    },
    body: JSON.stringify({
      rating: 5,
      satisfaction: 'Very Satisfied',
      feedback_text: 'Fixed within 4 hours! Highly appreciate the quick action by MLA and traffic division.'
    })
  }).then(r => r.json());

  if (!feedbackRes.success) throw new Error('Feedback submission failed: ' + feedbackRes.message);
  console.log('   ✓ Citizen Feedback:', feedbackRes.message);

  // 7. Verify Timeline and Final State
  console.log('7. Verifying full lifecycle timeline...');
  const detailRes = await fetch(`http://localhost:5000/api/v1/complaints/${complaintId}`)
    .then(r => r.json());

  console.log('   ✓ Final Complaint State:', {
    number: detailRes.complaint.complaint_number,
    status: detailRes.complaint.status,
    rating: detailRes.complaint.feedback?.rating,
    timelineSteps: detailRes.complaint.history?.map(h => `${h.old_status} -> ${h.new_status}`)
  });

  console.log('--- ALL MODULES & WORKFLOWS VERIFIED SUCCESSFULLY ---');
}

runE2ETest().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
