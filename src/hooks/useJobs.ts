"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createJob, deleteJob, fetchJobsForConsole, setJobStatus, updateJob } from "@/lib/api/jobs";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Job, JobStatus, JobWriteInput } from "@/types/job";

export const jobKeys = {
  all: ["jobs"] as const,
  list: () => [...jobKeys.all, "list"] as const,
};

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: jobKeys.list(),
    queryFn: fetchJobsForConsole,
    staleTime: 30_000,
  });
}

export function useJob(id: string | undefined) {
  const { data, ...rest } = useJobs();
  return { ...rest, data: id ? data?.find((job) => job.id === id) : undefined };
}

function useJobListSnapshot() {
  const queryClient = useQueryClient();

  return {
    async mutateList(apply: (previous: Job[]) => Job[]) {
      await queryClient.cancelQueries({ queryKey: jobKeys.list() });
      const previous = queryClient.getQueryData<Job[]>(jobKeys.list());
      if (previous) queryClient.setQueryData<Job[]>(jobKeys.list(), apply(previous));
      return previous;
    },
    rollback(previous: Job[] | undefined) {
      if (previous) queryClient.setQueryData<Job[]>(jobKeys.list(), previous);
    },
    invalidate() {
      return queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  };
}

export function useCreateJob() {
  const snapshot = useJobListSnapshot();

  return useMutation<Job, unknown, JobWriteInput>({
    mutationFn: (input) => createJob(input),
    onSuccess: async () => {
      toastSuccess("Role created.");
      await snapshot.invalidate();
    },
    onError: (error) => toastError(error, "Could not create the role."),
  });
}

export function useUpdateJob() {
  const snapshot = useJobListSnapshot();

  return useMutation<Job, unknown, { id: string; input: JobWriteInput }, { previous: Job[] | undefined }>({
    mutationFn: ({ id, input }) => updateJob(id, input),
    onMutate: async ({ id, input }) => {
      const previous = await snapshot.mutateList((list) =>
        list.map((job) => (job.id === id ? { ...job, ...input } : job)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      snapshot.rollback(context?.previous);
      toastError(error, "Could not save your changes.");
    },
    onSuccess: () => toastSuccess("Changes saved."),
    onSettled: () => snapshot.invalidate(),
  });
}

export function useSetJobStatus() {
  const snapshot = useJobListSnapshot();

  return useMutation<Job, unknown, { id: string; status: JobStatus }, { previous: Job[] | undefined }>({
    mutationFn: ({ id, status }) => setJobStatus(id, status),
    onMutate: async ({ id, status }) => {
      const previous = await snapshot.mutateList((list) =>
        list.map((job) => (job.id === id ? { ...job, status } : job)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      snapshot.rollback(context?.previous);
      toastError(error, "Could not change the role's status.");
    },
    onSuccess: (_data, variables) =>
      toastSuccess(variables.status === "CLOSED" ? "Role closed." : "Role reopened."),
    onSettled: () => snapshot.invalidate(),
  });
}

export function useDeleteJob() {
  const snapshot = useJobListSnapshot();

  return useMutation<void, unknown, { id: string }, { previous: Job[] | undefined }>({
    mutationFn: ({ id }) => deleteJob(id),
    onMutate: async ({ id }) => {
      const previous = await snapshot.mutateList((list) => list.filter((job) => job.id !== id));
      return { previous };
    },
    onError: (error, _vars, context) => {
      snapshot.rollback(context?.previous);
      toastError(error, "Could not delete the role.");
    },
    onSuccess: () => toastSuccess("Deleted."),
    onSettled: () => snapshot.invalidate(),
  });
}
