// hooks/useRefreshStatus.js
import { useState, useEffect } from 'react';
import axios from 'axios';

const BASE_URL = "https://gasmachineserestaurantrms.onrender.com/api/auth/refresh-status";

const useRefreshStatus = () => {
  const [refreshed, setRefreshed] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(BASE_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRefreshed(res.data.refreshed);
    } catch (err) {
      console.error('Failed to fetch refresh status');
      setRefreshed(true); // safe default
    } finally {
      setLoading(false);
    }
  };

  const markAsRefreshed = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${BASE_URL}/mark`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRefreshed(res.data.refreshed); // should be true
    } catch (err) {
      console.error('Failed to mark as refreshed');
    }
  };

  const resetRefreshStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${BASE_URL}/reset`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRefreshed(res.data.refreshed); // should be false
    } catch (err) {
      console.error('Failed to reset refresh status');
      throw err;
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return { refreshed, loading, markAsRefreshed, resetRefreshStatus, fetchStatus };
};

export default useRefreshStatus;