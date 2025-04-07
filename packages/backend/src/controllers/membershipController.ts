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

    // Get the complete membership details with user and org info
    const membershipWithDetails = await db.getMembershipWithDetails(
      membership.id
    );

    res.status(201).json({
      message: "Membership created successfully",
      data: membershipWithDetails,
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

    // Update the admin status
    await db.updateMembershipAdmin(id, !!admin);

    // Get the complete membership details with user and org info
    const membershipWithDetails = await db.getMembershipWithDetails(id);

    if (!membershipWithDetails) {
      res.status(404).json({ message: "Membership not found" });
      return;
    }

    res.json({
      message: "Membership updated successfully",
      data: membershipWithDetails,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a membership
export const deleteMembership = async (req: Request, res: Response) => {
  try {
    const deletedById = req.user?.id;
    const { membershipId } = req.params;

    if (!deletedById || isNaN(deletedById)) {
      res.status(400).json({
        message: "Invalid deletedById",
      });
      return;
    }

    const id = parseInt(membershipId);
    if (isNaN(id)) {
      res.status(400).json({ message: "Invalid membership ID" });
      return;
    }

    // Get the membership details before deleting for the response
    const membershipToDelete = await db.getMembershipWithDetails(id);

    if (!membershipToDelete) {
      res.status(404).json({ message: "Membership not found" });
      return;
    }

    // Delete the membership
    await db.deleteMembership(id, deletedById);

    res.json({
      message: "Membership deleted successfully",
      data: membershipToDelete,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
