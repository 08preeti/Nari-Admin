import { api } from './api';
import { toQuery } from '../utils/query';

export const listCustomers = (params) => api(`/customers${toQuery({ page: 1, limit: 10, ...params })}`);
export const getCustomer = (mobile) => api(`/customers/${encodeURIComponent(mobile)}`);
