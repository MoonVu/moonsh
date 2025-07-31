import apiService from './api';

class PositionService {
  // Lưu vị trí làm việc
  async savePosition(positionData) {
    try {
      const response = await apiService.post('/user-position', positionData);
      return response.data;
    } catch (error) {
      console.error('Error saving position:', error);
      throw error;
    }
  }

  // Lấy vị trí làm việc
  async getPosition() {
    try {
      const response = await apiService.get('/user-position');
      return response.data;
    } catch (error) {
      console.error('Error getting position:', error);
      throw error;
    }
  }

  // Cập nhật vị trí làm việc
  async updatePosition(positionData) {
    try {
      const response = await apiService.put('/user-position', positionData);
      return response.data;
    } catch (error) {
      console.error('Error updating position:', error);
      throw error;
    }
  }

  // Xóa vị trí làm việc
  async deletePosition() {
    try {
      const response = await apiService.delete('/user-position');
      return response.data;
    } catch (error) {
      console.error('Error deleting position:', error);
      throw error;
    }
  }

  // Lấy vị trí của tất cả users (admin only)
  async getAllPositions() {
    try {
      const response = await apiService.get('/user-positions');
      return response.data;
    } catch (error) {
      console.error('Error getting all positions:', error);
      throw error;
    }
  }

  // Helper method để lưu vị trí scroll
  async saveScrollPosition(page, scrollX, scrollY) {
    return this.savePosition({
      page,
      scrollPosition: { x: scrollX, y: scrollY }
    });
  }

  // Helper method để lưu tab đang chọn
  async saveSelectedTab(page, selectedTab) {
    return this.savePosition({
      page,
      selectedTab
    });
  }

  // Helper method để lưu grid state
  async saveGridState(page, gridState) {
    return this.savePosition({
      page,
      gridState
    });
  }

  // Helper method để lưu form data
  async saveFormData(page, formData) {
    return this.savePosition({
      page,
      formData
    });
  }

  // Helper method để lưu component state
  async saveComponentState(page, componentState) {
    return this.savePosition({
      page,
      componentState
    });
  }
}

export default new PositionService(); 