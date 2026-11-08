import { api } from './api';
import { toQuery } from '../utils/query';

export const getDashboardSummary = (params) => api(`/dashboard${toQuery(params)}`);
