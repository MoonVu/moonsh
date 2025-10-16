import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import positionService from '../services/positionService';

export const usePosition = () => {
  const location = useLocation();
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(false);

  // Lấy vị trí từ server khi component mount
  useEffect(() => {
    const loadPosition = async () => {
      setLoading(true);
      try {
        const response = await positionService.getPosition();
        if (response.success) {
          setPosition(response.data);
        }
      } catch (error) {
        console.error('Error loading position:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPosition();
  }, []);

  // Lưu vị trí scroll
  const saveScrollPosition = useCallback(async (scrollX, scrollY) => {
    try {
      await positionService.saveScrollPosition(location.pathname, scrollX, scrollY);
    } catch (error) {
      console.error('Error saving scroll position:', error);
    }
  }, [location.pathname]);

  // Lưu tab đang chọn
  const saveSelectedTab = useCallback(async (selectedTab) => {
    try {
      await positionService.saveSelectedTab(location.pathname, selectedTab);
    } catch (error) {
      console.error('Error saving selected tab:', error);
    }
  }, [location.pathname]);

  // Lưu grid state
  const saveGridState = useCallback(async (gridState) => {
    try {
      await positionService.saveGridState(location.pathname, gridState);
    } catch (error) {
      console.error('Error saving grid state:', error);
    }
  }, [location.pathname]);

  // Lưu form data
  const saveFormData = useCallback(async (formData) => {
    try {
      await positionService.saveFormData(location.pathname, formData);
    } catch (error) {
      console.error('Error saving form data:', error);
    }
  }, [location.pathname]);

  // Lưu component state
  const saveComponentState = useCallback(async (componentState) => {
    try {
      await positionService.saveComponentState(location.pathname, componentState);
    } catch (error) {
      console.error('Error saving component state:', error);
    }
  }, [location.pathname]);

  // Lưu toàn bộ vị trí
  const saveFullPosition = useCallback(async (positionData) => {
    try {
      const fullData = {
        page: location.pathname,
        ...positionData
      };
      await positionService.savePosition(fullData);
    } catch (error) {
      console.error('Error saving full position:', error);
    }
  }, [location.pathname]);

  // Xóa vị trí
  const deletePosition = useCallback(async () => {
    try {
      await positionService.deletePosition();
      setPosition(null);
    } catch (error) {
      console.error('Error deleting position:', error);
    }
  }, []);

  // Auto-save scroll position khi scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      saveScrollPosition(scrollX, scrollY);
    };

    // Debounce scroll events
    let timeoutId;
    const debouncedScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleScroll, 100);
    };

    window.addEventListener('scroll', debouncedScroll);
    return () => {
      window.removeEventListener('scroll', debouncedScroll);
      clearTimeout(timeoutId);
    };
  }, [saveScrollPosition]);

  // Restore scroll position khi load page
  useEffect(() => {
    if (position && position.page === location.pathname && position.scrollPosition) {
      const { x, y } = position.scrollPosition;
      window.scrollTo(x, y);
    }
  }, [position, location.pathname]);

  return {
    position,
    loading,
    saveScrollPosition,
    saveSelectedTab,
    saveGridState,
    saveFormData,
    saveComponentState,
    saveFullPosition,
    deletePosition
  };
}; 