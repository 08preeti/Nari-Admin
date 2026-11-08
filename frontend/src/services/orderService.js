import { api } from './api';
import { toQuery } from '../utils/query';

export const listOrders = (path, params = {}) => api(`${path}${toQuery({ page: 1, limit: 10, ...params })}`);
export const getOrder = (endpoint, id) => api(`${endpoint}/${id}`);
export const updateOrderStatus = (endpoint, id, status, note = 'Updated from admin dashboard') =>
  api(`${endpoint}/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note }) });
