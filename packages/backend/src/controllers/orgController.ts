import { NextFunction, Request, Response } from "express";
import * as db from "../db";

/**
 * Get all organizations
 * This endpoint is protected by the superadmin middleware
 */
export const getAllOrgs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const orgs = await db.getAllOrgs();

    res.status(200).json({
      success: true,
      data: orgs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new organization
 * This endpoint is protected by the superadmin middleware
 */
export const createOrg = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { slug } = req.body;

    if (!slug) {
      res.status(400).json({
        message: "Missing required field: slug is required",
      });
      return;
    }

    // Validate slug format (alphanumeric + hyphens)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      res.status(400).json({
        message:
          "Invalid slug format. Only lowercase letters, numbers, and hyphens are allowed.",
      });
      return;
    }

    // Create the org
    const org = await db.createOrg(slug);

    res.status(201).json({
      success: true,
      data: org,
    });
  } catch (error: any) {
    // Handle specific errors
    if (error.message === "Organization with this slug already exists") {
      res.status(409).json({
        message: error.message,
      });
      return;
    }

    next(error);
  }
};

/**
 * Delete an organization
 * This endpoint is protected by the superadmin middleware
 */
export const deleteOrg = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { orgId } = req.params;

    if (!orgId || isNaN(parseInt(orgId))) {
      res.status(400).json({
        message: "Invalid organization ID",
      });
      return;
    }

    // Delete the org
    const deletedOrg = await db.deleteOrg(parseInt(orgId));

    res.status(200).json({
      success: true,
      message: `Organization ${deletedOrg.slug} deleted successfully`,
      data: deletedOrg,
    });
  } catch (error) {
    next(error);
  }
};
