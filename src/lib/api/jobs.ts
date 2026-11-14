import { request } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { Job, JobStatus, JobWriteInput } from "@/types/job";

/**
 * Careers through /api/v1/admin/careers. Deadlines travel as YYYY-MM-DD and
 * the bullet fields as arrays, exactly as the console's Job type defines them.
 */

export function fetchJobsForConsole(): Promise<Job[]> {
  return request<Job[]>({ method: "GET", url: ENDPOINTS.careers });
}

export function fetchJobById(id: string): Promise<Job> {
  return request<Job>({ method: "GET", url: `${ENDPOINTS.careers}/${id}` });
}

export function createJob(input: JobWriteInput): Promise<Job> {
  return request<Job>({ method: "POST", url: ENDPOINTS.careers, data: input });
}

export function updateJob(id: string, input: JobWriteInput): Promise<Job> {
  return request<Job>({ method: "PUT", url: `${ENDPOINTS.careers}/${id}`, data: input });
}

export async function deleteJob(id: string): Promise<void> {
  await request<void>({ method: "DELETE", url: `${ENDPOINTS.careers}/${id}` });
}

export function setJobStatus(id: string, status: JobStatus): Promise<Job> {
  return request<Job>({ method: "POST", url: `${ENDPOINTS.careers}/${id}/status`, data: { status } });
}
