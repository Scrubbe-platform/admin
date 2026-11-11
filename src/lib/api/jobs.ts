import { request } from "@/lib/api/client";
import { CONFIRMED, notWired } from "@/lib/api/endpoints";
import { fromLegacyMmDdYy, isValidIsoDate } from "@/lib/date";
import {
  DEPARTMENTS,
  EMPLOYMENT_TYPES,
  JOB_LEVELS,
  type Department,
  type EmploymentType,
  type Job,
  type JobLevel,
  type JobStatus,
  type JobWriteInput,
} from "@/types/job";

type UnknownRecord = Record<string, unknown>;

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/**
 * The public page accepts either an array or newline-separated text for the
 * bullet fields. The console standardises on arrays; this is the only place
 * that reads the other form.
 */
export function toBullets(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
}

function oneOf<T extends string>(options: readonly T[], value: unknown, fallback: T): T {
  const found = options.find((option) => option === value);
  return found ?? fallback;
}

export function normaliseJob(raw: UnknownRecord): Job {
  const rawDeadline = str(raw["applicationDeadline"]);
  const deadline = isValidIsoDate(rawDeadline) ? rawDeadline : fromLegacyMmDdYy(rawDeadline);
  const status: JobStatus = raw["status"] === "CLOSED" ? "CLOSED" : "OPEN";

  return {
    id: str(raw["id"]) || str(raw["_id"]),
    title: str(raw["title"]),
    department: oneOf<Department>(DEPARTMENTS, raw["department"], "Engineering"),
    // The public page reads employmentType but falls back to `type`.
    employmentType: oneOf<EmploymentType>(
      EMPLOYMENT_TYPES,
      raw["employmentType"] ?? raw["type"],
      "Full-Time",
    ),
    location: str(raw["location"]),
    jobLevel: oneOf<JobLevel>(JOB_LEVELS, raw["jobLevel"], "Mid-Level"),
    salaryRange: str(raw["salaryRange"]),
    description: str(raw["description"]),
    responsibilities: toBullets(raw["responsibilities"]),
    requirements: toBullets(raw["requirements"]),
    benefits: toBullets(raw["benefits"]),
    applicationDeadline: deadline,
    applicationLink: str(raw["applicationLink"]) || null,
    status,
    createdAt: str(raw["createdAt"]),
    updatedAt: str(raw["updatedAt"]) || str(raw["createdAt"]),
  };
}

/** WIRED — the one job read that exists. Open roles only. */
export async function fetchPublicJobs(): Promise<Job[]> {
  const data = await request<UnknownRecord[]>({
    method: "GET",
    url: CONFIRMED.publicRead.jobs,
  });
  if (!Array.isArray(data)) return [];
  return data.map(normaliseJob);
}

export async function fetchJobsForConsole(): Promise<Job[]> {
  return fetchPublicJobs();
}

export async function fetchJobById(id: string): Promise<Job> {
  const all = await fetchPublicJobs();
  const found = all.find((job) => job.id === id);
  if (!found) {
    throw new Error("That role couldn't be found. It may have been removed, or the link may be wrong.");
  }
  return found;
}

/* ───────────────── writes — none confirmed ───────────────── */

export async function createJob(_input: JobWriteInput): Promise<Job> {
  return notWired("jobs.create");
}

export async function updateJob(_id: string, _input: JobWriteInput): Promise<Job> {
  return notWired("jobs.update");
}

export async function deleteJob(_id: string): Promise<void> {
  return notWired("jobs.delete");
}

export async function setJobStatus(_id: string, _status: JobStatus): Promise<Job> {
  return notWired("jobs.setStatus");
}
