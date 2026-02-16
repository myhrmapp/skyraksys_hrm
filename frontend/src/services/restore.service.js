/**
 * Restore Service
 * API service for recovering soft-deleted records (admin only)
 */
import http from '../http-common';

class RestoreService {
  // Employee Reviews
  async getDeletedReviews() {
    const response = await http.get('/restore/employee-reviews');
    return response.data;
  }

  async restoreReview(id) {
    const response = await http.post(`/restore/employee-reviews/${id}`);
    return response.data;
  }

  // Leave Balances
  async getDeletedBalances() {
    const response = await http.get('/restore/leave-balances');
    return response.data;
  }

  async restoreBalance(id) {
    const response = await http.post(`/restore/leave-balances/${id}`);
    return response.data;
  }

  // Users
  async getDeletedUsers() {
    const response = await http.get('/restore/users');
    return response.data;
  }

  async restoreUser(id) {
    const response = await http.post(`/restore/users/${id}`);
    return response.data;
  }
}

export const restoreService = new RestoreService();
