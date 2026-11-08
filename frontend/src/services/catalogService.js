import { api } from './api';
import { toQuery } from '../utils/query';

export const listRecords = (endpoint, params = {}) => api(`${endpoint}${toQuery({ page: 1, limit: 100, ...params })}`);
export const getRecord = (endpoint, id) => api(`${endpoint}/${id}`);
export const createRecord = (endpoint, payload) => api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
export const updateRecord = (endpoint, id, payload) => api(`${endpoint}/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
export const setRecordStatus = (endpoint, id, isActive) => api(`${endpoint}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
export const deleteRecord = (endpoint, id) => api(`${endpoint}/${id}`, { method: 'DELETE' });

export const adjustStock = (id, payload) => api(`/products/${id}/stock-adjustments`, { method: 'POST', body: JSON.stringify(payload) });
export const inventoryHistory = (id, params = {}) => api(`/products/${id}/inventory-history${toQuery({ limit: 20, ...params })}`);
