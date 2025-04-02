import { Request, Response } from "express";
import * as db from "../db";

// Get all memberships
export const getAllMemberships = async (req: Request, res: Response) => {
  try {
    const memberships = await db.getAllMemberships();
    res.json(memberships);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new membership
export const createMembership = async (req: Request, res: Response) => {
  try {
    const { userId, orgId, admin = false } = req.body;

    // Validate required fields
    if (userId === undefined || orgId === undefined) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    // Create the membership
    const membership = await db.createMembership({
      userId,
      orgId,
      admin: !!admin,
    });

    res.status(201).json({
      message: "Membership created successfully",
      data: membership,
    });
  } catch (error: any) {
    if (error.message.includes("already exists")) {
      res.status(409).json({ message: error.message });
      return;
    }
    if (error.message.includes("not found")) {
      res.status(404).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: error.message });
  }
};

// Update a membership's admin status
export const updateMembershipAdmin = async (req: Request, res: Response) => {
  try {
    const { membershipId } = req.params;
    const { admin } = req.body;

    if (admin === undefined) {
      res.status(400).json({ message: "Admin status is required" });
      return;
    }

    const id = parseInt(membershipId);
    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid membership ID" });
      return;
    }

    const membership = await db.updateMembershipAdmin(id, !!admin);

    if (!membership) {
      res.status(404).json({ message: "Membership not found" });
      return;
    }

    res.json({
      message: "Membership updated successfully",
      data: membership,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a membership
export const deleteMembership = async (req: Request, res: Response) => {
  try {
    const { membershipId } = req.params;

    const id = parseInt(membershipId);
    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid membership ID" });
      return;
    }

    const membership = await db.deleteMembership(id);

    if (!membership) {
      res.status(404).json({ message: "Membership not found" });
      return;
    }

    res.json({
      message: "Membership deleted successfully",
      data: membership,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
