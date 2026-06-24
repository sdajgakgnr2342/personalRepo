import { get, post } from '@/utils/request'

export function listRecoveryRequests(params) {
  return get('/admin/recovery-requests', params)
}

export function getRecoveryRequest(id) {
  return get(`/admin/recovery-requests/${id}`)
}

export function approveRecoveryRequest(id, data) {
  return post(`/admin/recovery-requests/${id}/approve`, data)
}

export function rejectRecoveryRequest(id, data) {
  return post(`/admin/recovery-requests/${id}/reject`, data)
}

export function listAuditLogs() {
  return get('/admin/audit-logs')
}
