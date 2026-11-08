import { api } from './api';
import { listOrders } from './orderService';

export const listPayments = (kind, params) => listOrders(`/payments/${kind}`, params);
export const updatePayment = (kind, id, payload) => api(`/payments/${kind}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
