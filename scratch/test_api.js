const http = require('http');

const request = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = body ? JSON.parse(body) : null;
        } catch (e) {
          parsed = body;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed
        });
      });
    });
    
    req.on('error', (e) => reject(e));
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
};

const run = async () => {
  try {
    const rand = Math.floor(Math.random() * 100000);
    const orgCodeA = `TSTA-${rand}`;
    const orgCodeB = `TSTB-${rand}`;
    
    console.log('--- TEST 1: Register with invalid email format (Should Fail) ---');
    const res1 = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'Invalid User',
      email: 'bademail',
      password: 'validpass123',
      role: 'founder',
      orgName: 'Test Org',
      orgCode: orgCodeA
    });
    console.log('Status:', res1.status, 'Body:', res1.data);
    if (res1.status === 400 && res1.data.error.includes('valid email')) {
      console.log('✅ Success! Invalid email format blocked.');
    } else {
      throw new Error('TEST 1 FAILED');
    }

    console.log('\n--- TEST 2: Register with short password (Should Fail) ---');
    const res2 = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'User Short Pass',
      email: `shortpass${rand}@test.com`,
      password: '123',
      role: 'founder',
      orgName: 'Test Org',
      orgCode: orgCodeA
    });
    console.log('Status:', res2.status, 'Body:', res2.data);
    if (res2.status === 400 && res2.data.error.includes('at least 6 characters')) {
      console.log('✅ Success! Short password registration blocked.');
    } else {
      throw new Error('TEST 2 FAILED');
    }

    console.log('\n--- Registering valid founder and developer for Org A ---');
    const resFounderA = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'Founder Alice',
      email: `alice${rand}@orga.com`,
      password: 'securepassword123',
      role: 'founder',
      orgName: 'Org A',
      orgCode: orgCodeA
    });
    const tokenAlice = resFounderA.data.token;
    console.log('Alice Token obtained.');

    const resDevA = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'Developer Bob',
      email: `bob${rand}@orga.com`,
      password: 'securepassword123',
      role: 'backend_developer',
      orgName: 'Org A',
      orgCode: orgCodeA
    });
    const tokenBob = resDevA.data.token;
    const devBobId = resDevA.data.profile.startupOrg.members.find(m => m.name === 'Developer Bob').id;
    console.log('Bob Token and ID obtained.');

    console.log('\n--- Creating Task in Org A ---');
    const taskRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/tasks',
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenBob}`
      }
    }, {
      title: 'Bob Task',
      description: 'Task created by Bob in Org A',
      workspace: 'startup',
      assigneeId: devBobId,
      assigneeName: 'Developer Bob',
      assigneeRole: 'Backend Developer'
    });
    const taskId = taskRes.data.task.id;
    console.log('Task created with ID:', taskId);

    console.log('\n--- Registering valid user for Org B (Hacker) ---');
    const resHacker = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'Hacker Eve',
      email: `eve${rand}@orgb.com`,
      password: 'securepassword123',
      role: 'founder',
      orgName: 'Org B',
      orgCode: orgCodeB
    });
    const tokenEve = resHacker.data.token;
    console.log('Eve Token obtained.');

    console.log('\n--- TEST 3: Cross-tenant Comment Check (Should Fail with 403) ---');
    const commentRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/tasks/${taskId}/comments`,
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenEve}`
      }
    }, {
      text: 'Eve was here',
      authorName: 'Eve',
      authorRole: 'Founder'
    });
    console.log('Status:', commentRes.status, 'Body:', commentRes.data);
    if (commentRes.status === 403) {
      console.log('✅ Success! Eve was blocked from commenting on Alice\'s task.');
    } else {
      throw new Error('TEST 3 FAILED');
    }

    console.log('\n--- TEST 4: Cross-tenant Subtask Modification Check (Should Fail with 403) ---');
    const subtaskRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/tasks/${taskId}/subtasks`,
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenEve}`
      }
    }, {
      title: 'Malicious Subtask'
    });
    console.log('Status:', subtaskRes.status, 'Body:', subtaskRes.data);
    if (subtaskRes.status === 403) {
      console.log('✅ Success! Eve was blocked from adding a subtask to Alice\'s task.');
    } else {
      throw new Error('TEST 4 FAILED');
    }

    console.log('\n--- TEST 5: Developer self-approval Check (Should Fail with 403) ---');
    const devApproveRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/tasks/${taskId}`,
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenBob}`
      }
    }, {
      approvalStatus: 'approved'
    });
    console.log('Status:', devApproveRes.status, 'Body:', devApproveRes.data);
    if (devApproveRes.status === 403 && devApproveRes.data.error.includes('Only founder')) {
      console.log('✅ Success! Bob (developer) was blocked from self-approving the task.');
    } else {
      throw new Error('TEST 5 FAILED');
    }

    console.log('\n--- TEST 6: Founder approval check (Should Succeed with 200) ---');
    const founderApproveRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/tasks/${taskId}`,
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAlice}`
      }
    }, {
      approvalStatus: 'approved'
    });
    console.log('Status:', founderApproveRes.status, 'Body:', founderApproveRes.data);
    if (founderApproveRes.status === 200 && founderApproveRes.data.task.approvalStatus === 'approved') {
      console.log('✅ Success! Alice (Founder) approved the task successfully.');
    } else {
      throw new Error('TEST 6 FAILED');
    }

    console.log('\n🎉 ALL SECURITY TESTS PASSED SUCCESSFULLY!');
  } catch (error) {
    console.error('❌ Test script failed:', error.message || error);
    process.exit(1);
  }
};

run();
