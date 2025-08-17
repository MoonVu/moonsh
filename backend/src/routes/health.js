/**
 * Health Routes - Health check và system info (không cần authentication)
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { ROLES } = require('../config/permissions');

/**
 * GET /api/health
 * Health check cơ bản
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      message: 'Moonne Backend Server đang hoạt động',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    }
  });
});

/**
 * GET /api/health/detailed
 * Health check chi tiết
 */
router.get('/detailed', async (req, res) => {
  try {
    // Kiểm tra MongoDB connection
    const mongoStatus = mongoose.connection.readyState;
    const mongoStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    // Memory usage
    const memoryUsage = process.memoryUsage();
    
    // Uptime
    const uptime = process.uptime();

    res.json({
      success: true,
      data: {
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        database: {
          mongodb: {
            status: mongoStates[mongoStatus] || 'unknown',
            readyState: mongoStatus
          }
        },
        system: {
          uptime: Math.floor(uptime),
          uptimeFormatted: formatUptime(uptime),
          memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
            external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100,
            unit: 'MB'
          },
          node: process.version,
          platform: process.platform,
          arch: process.arch
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      data: {
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    });
  }
});

/**
 * GET /api/health/auth-system
 * Kiểm tra auth system configuration
 */
router.get('/auth-system', (req, res) => {
  try {
    const authSystemStatus = {
      roles: Object.values(ROLES),
      jwtConfigured: !!process.env.JWT_SECRET,
      rolesCount: Object.keys(ROLES).length,
      features: {
        authentication: true,
        authorization: true,
        roleBasedAccess: true,
        permissionBasedAccess: true
      }
    };

    res.json({
      success: true,
      data: {
        status: 'OK',
        authSystem: authSystemStatus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      data: {
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    });
  }
});

/**
 * GET /api/health/ping
 * Simple ping endpoint
 */
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    data: {
      pong: true,
      timestamp: new Date().toISOString()
    }
  });
});

// Helper function để format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

module.exports = router;
