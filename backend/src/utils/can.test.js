/**
 * Tests cho can() helper function
 */

const { can } = require('../middleware/authorize');

// Mock user objects
const adminUser = {
  id: '1',
  username: 'admin',
  role: { name: 'ADMIN' },
  permissions: [
    'users.view', 'users.edit', 'users.delete',
    'schedules.view', 'schedules.edit', 'schedules.delete',
    'reports.view'
  ]
};

const cskhUser = {
  id: '2',
  username: 'cskh1',
  role: { name: 'CSKH' },
  permissions: [
    'users.view',
    'schedules.view',
    'reports.view'
  ]
};

const noPermUser = {
  id: '3',
  username: 'guest',
  role: { name: 'GUEST' },
  permissions: []
};

// Test cases
function runTests() {
  console.log('🧪 Running can() helper tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  function test(description, actual, expected) {
    if (actual === expected) {
      console.log(`✅ ${description}`);
      passed++;
    } else {
      console.log(`❌ ${description} - Expected: ${expected}, Got: ${actual}`);
      failed++;
    }
  }
  
  // Test 1: Admin user should have all permissions
  test('Admin can view users', can(adminUser, 'users', 'view'), true);
  test('Admin can edit users', can(adminUser, 'users', 'edit'), true);
  test('Admin can delete users', can(adminUser, 'users', 'delete'), true);
  
  // Test 2: CSKH user has limited permissions
  test('CSKH can view users', can(cskhUser, 'users', 'view'), true);
  test('CSKH cannot edit users', can(cskhUser, 'users', 'edit'), false);
  test('CSKH cannot delete users', can(cskhUser, 'users', 'delete'), false);
  test('CSKH can view schedules', can(cskhUser, 'schedules', 'view'), true);
  test('CSKH cannot edit schedules', can(cskhUser, 'schedules', 'edit'), false);
  
  // Test 3: User with no permissions
  test('Guest cannot view users', can(noPermUser, 'users', 'view'), false);
  test('Guest cannot edit anything', can(noPermUser, 'schedules', 'edit'), false);
  
  // Test 4: Edge cases
  test('Null user returns false', can(null, 'users', 'view'), false);
  test('User without permissions array returns false', can({id: '4'}, 'users', 'view'), false);
  test('Empty permissions array returns false', can({permissions: []}, 'users', 'view'), false);
  
  // Test 5: Non-existent permissions
  test('Admin cannot access non-existent resource', can(adminUser, 'nonexistent', 'view'), false);
  test('Admin cannot perform non-existent action', can(adminUser, 'users', 'nonexistent'), false);
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
    return true;
  } else {
    console.log('❌ Some tests failed!');
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
