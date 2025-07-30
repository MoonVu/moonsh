import React, { useState, useEffect } from 'react';
import apiService from './services/api';

export default function ApiTest() {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'admin123' });

  const showMessage = (msg, type = 'info') => {
    setMessage(`${type === 'error' ? '❌' : '✅'} ${msg}`);
    setTimeout(() => setMessage(''), 3000);
  };

  const testHealth = async () => {
    setStatus('loading');
    try {
      const result = await apiService.healthCheck();
      showMessage(`Server OK: ${result.message}`);
    } catch (error) {
      showMessage(`Server Error: ${error.message}`, 'error');
    }
    setStatus('idle');
  };

  const initDemo = async () => {
    setStatus('loading');
    try {
      await apiService.initDemo();
      showMessage('Demo data initialized successfully');
    } catch (error) {
      showMessage(`Init Error: ${error.message}`, 'error');
    }
    setStatus('idle');
  };

  const handleLogin = async () => {
    setStatus('loading');
    try {
      const result = await apiService.login(loginForm.username, loginForm.password);
      showMessage(`Login successful! Welcome ${result.user.username}`);
    } catch (error) {
      showMessage(`Login Error: ${error.message}`, 'error');
    }
    setStatus('idle');
  };

  const getTasks = async () => {
    setStatus('loading');
    try {
      const result = await apiService.getTasks();
      setTasks(result);
      showMessage(`Loaded ${result.length} tasks`);
    } catch (error) {
      showMessage(`Get Tasks Error: ${error.message}`, 'error');
    }
    setStatus('idle');
  };

  const createTask = async () => {
    setStatus('loading');
    try {
      const newTask = {
        title: 'Task test từ React',
        description: 'Mô tả task được tạo từ React component',
        assigned_to: 'user1',
        priority: 'Trung bình'
      };
      await apiService.createTask(newTask);
      showMessage('Task created successfully');
      getTasks(); // Refresh list
    } catch (error) {
      showMessage(`Create Task Error: ${error.message}`, 'error');
    }
    setStatus('idle');
  };

  const getProfile = async () => {
    setStatus('loading');
    try {
      const profile = await apiService.getProfile();
      showMessage(`Profile: ${profile.username} (${profile.group_name})`);
    } catch (error) {
      showMessage(`Profile Error: ${error.message}`, 'error');
    }
    setStatus('idle');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🚀 Moonne API Integration Test</h1>
      
      {message && (
        <div style={{ 
          padding: '10px', 
          margin: '10px 0', 
          backgroundColor: message.includes('❌') ? '#ffebee' : '#e8f5e8',
          border: '1px solid #ccc',
          borderRadius: '5px'
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        
        {/* System Tests */}
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
          <h3>🔧 System Tests</h3>
          <button 
            onClick={testHealth} 
            disabled={status === 'loading'}
            style={{ margin: '5px', padding: '8px 12px' }}
          >
            Health Check
          </button>
          <button 
            onClick={initDemo} 
            disabled={status === 'loading'}
            style={{ margin: '5px', padding: '8px 12px' }}
          >
            Init Demo Data
          </button>
        </div>

        {/* Login */}
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
          <h3>🔐 Login Test</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
              style={{ padding: '8px' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              style={{ padding: '8px' }}
            />
            <button 
              onClick={handleLogin} 
              disabled={status === 'loading'}
              style={{ padding: '8px 12px' }}
            >
              Login
            </button>
          </div>
        </div>

        {/* User Profile */}
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
          <h3>👤 User Profile</h3>
          <button 
            onClick={getProfile} 
            disabled={status === 'loading'}
            style={{ padding: '8px 12px' }}
          >
            Get Profile
          </button>
        </div>

        {/* Tasks */}
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
          <h3>📋 Tasks API</h3>
          <button 
            onClick={getTasks} 
            disabled={status === 'loading'}
            style={{ margin: '5px', padding: '8px 12px' }}
          >
            Get Tasks
          </button>
          <button 
            onClick={createTask} 
            disabled={status === 'loading'}
            style={{ margin: '5px', padding: '8px 12px' }}
          >
            Create Task
          </button>
        </div>
      </div>

      {/* Tasks List */}
      {tasks.length > 0 && (
        <div style={{ marginTop: '20px', border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
          <h3>📋 Tasks List ({tasks.length})</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {tasks.map((task, index) => (
              <div key={task.id || index} style={{ 
                border: '1px solid #eee', 
                padding: '10px', 
                margin: '5px 0', 
                borderRadius: '3px',
                backgroundColor: '#f9f9f9'
              }}>
                <strong>{task.title}</strong>
                <br />
                <small>Assigned to: {task.assigned_to} | Priority: {task.priority} | Status: {task.status}</small>
                {task.description && <p style={{ margin: '5px 0', fontSize: '14px' }}>{task.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          zIndex: 1000
        }}>
          Loading...
        </div>
      )}
    </div>
  );
} 