import { tags, tagType } from "@sparrow-tags/schema";
import { eq } from "drizzle-orm";
import { db } from "./index";

export type CreateTagInput = {
  taskId: number;
  createdById: number;
  tagType: (typeof tagType.enumValues)[number];
  values: any; // The tag values stored as JSON
  isPrediction?: boolean;
};

export type TimeSegmentTagValues = {
  label: string;
  start: number;
  end: number;
};

/**
 * Create a new tag
 * @param data Tag data to create
 * @returns The created tag
 */
export const createTag = async (data: CreateTagInput) => {
  const [tag] = await db
    .insert(tags)
    .values({
      taskId: data.taskId,
      createdById: data.createdById,
      tagType: data.tagType,
      values: data.values,
      isPrediction: data.isPrediction || false,
    })
    .returning();

  return tag;
};

/**
 * Get tags for a task
 * @param taskId Task ID
 * @returns Array of tags for the task
 */
export const getTagsByTaskId = async (taskId: number) => {
  const tagsData = await db.select().from(tags).where(eq(tags.taskId, taskId));

  return tagsData.map((tag) => ({
    id: tag.id,
    taskId: tag.taskId,
    createdById: tag.createdById,
    tagType: tag.tagType,
    isPrediction: tag.isPrediction,
    values: tag.values,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
    deletedById: tag.deletedById || null,
    deletedAt: tag.deletedAt || null,
  }));
};
