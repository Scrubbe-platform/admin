"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createBlog,
  deleteBlog,
  fetchBlogsForConsole,
  publishBlog,
  unpublishBlog,
  updateBlog,
} from "@/lib/api/blogs";
import { toastError, toastSuccess } from "@/lib/toast";
import type { Blog, BlogWriteInput } from "@/types/blog";

export const blogKeys = {
  all: ["blogs"] as const,
  list: () => [...blogKeys.all, "list"] as const,
};

export function useBlogs() {
  return useQuery<Blog[]>({
    queryKey: blogKeys.list(),
    queryFn: fetchBlogsForConsole,
    staleTime: 30_000,
  });
}

export function useBlog(id: string | undefined) {
  const { data, ...rest } = useBlogs();
  return { ...rest, data: id ? data?.find((blog) => blog.id === id) : undefined };
}

function useBlogListSnapshot() {
  const queryClient = useQueryClient();

  return {
    /** Applies an optimistic change and returns the rollback. */
    async mutateList(apply: (previous: Blog[]) => Blog[]) {
      await queryClient.cancelQueries({ queryKey: blogKeys.list() });
      const previous = queryClient.getQueryData<Blog[]>(blogKeys.list());
      if (previous) queryClient.setQueryData<Blog[]>(blogKeys.list(), apply(previous));
      return previous;
    },
    rollback(previous: Blog[] | undefined) {
      if (previous) queryClient.setQueryData<Blog[]>(blogKeys.list(), previous);
    },
    invalidate() {
      return queryClient.invalidateQueries({ queryKey: blogKeys.all });
    },
  };
}

export function useCreateBlog() {
  const snapshot = useBlogListSnapshot();

  return useMutation<Blog, unknown, BlogWriteInput>({
    mutationFn: (input) => createBlog(input),
    // No optimistic insert: the server owns id, slug collisions and timestamps,
    // so an optimistic row would be a fabricated record.
    onSuccess: async () => {
      toastSuccess("Draft saved.");
      await snapshot.invalidate();
    },
    onError: (error) => toastError(error, "Could not save the draft."),
  });
}

export function useUpdateBlog() {
  const snapshot = useBlogListSnapshot();

  return useMutation<Blog, unknown, { id: string; input: BlogWriteInput }, { previous: Blog[] | undefined }>({
    mutationFn: ({ id, input }) => updateBlog(id, input),
    onMutate: async ({ id, input }) => {
      const previous = await snapshot.mutateList((list) =>
        list.map((blog) =>
          blog.id === id
            ? {
                ...blog,
                title: input.title,
                slug: input.slug,
                excerpt: input.excerpt,
                content: input.content,
                category: input.category,
                tags: input.tags,
                coverImageUrl: input.coverImageUrl,
                isFeatured: input.isFeatured,
                author: { ...blog.author, name: input.authorName, ...(input.authorRole ? { role: input.authorRole } : {}) },
              }
            : blog,
        ),
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

export function usePublishBlog() {
  const snapshot = useBlogListSnapshot();

  return useMutation<Blog, unknown, { id: string }, { previous: Blog[] | undefined }>({
    mutationFn: ({ id }) => publishBlog(id),
    onMutate: async ({ id }) => {
      const previous = await snapshot.mutateList((list) =>
        list.map((blog) =>
          blog.id === id ? { ...blog, status: "PUBLISHED", publishedAt: new Date().toISOString() } : blog,
        ),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      snapshot.rollback(context?.previous);
      toastError(error, "Could not publish the post.");
    },
    onSuccess: () => toastSuccess("Published."),
    onSettled: () => snapshot.invalidate(),
  });
}

export function useUnpublishBlog() {
  const snapshot = useBlogListSnapshot();

  return useMutation<Blog, unknown, { id: string }, { previous: Blog[] | undefined }>({
    mutationFn: ({ id }) => unpublishBlog(id),
    onMutate: async ({ id }) => {
      const previous = await snapshot.mutateList((list) =>
        list.map((blog) => (blog.id === id ? { ...blog, status: "DRAFT", publishedAt: null } : blog)),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      snapshot.rollback(context?.previous);
      toastError(error, "Could not return the post to draft.");
    },
    onSuccess: () => toastSuccess("Returned to draft."),
    onSettled: () => snapshot.invalidate(),
  });
}

export function useDeleteBlog() {
  const snapshot = useBlogListSnapshot();

  return useMutation<void, unknown, { id: string }, { previous: Blog[] | undefined }>({
    mutationFn: ({ id }) => deleteBlog(id),
    onMutate: async ({ id }) => {
      const previous = await snapshot.mutateList((list) => list.filter((blog) => blog.id !== id));
      return { previous };
    },
    onError: (error, _vars, context) => {
      snapshot.rollback(context?.previous);
      toastError(error, "Could not delete the post.");
    },
    onSuccess: () => toastSuccess("Deleted."),
    onSettled: () => snapshot.invalidate(),
  });
}
