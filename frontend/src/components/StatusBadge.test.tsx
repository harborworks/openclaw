import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders the label text", () => {
    render(<StatusBadge label="✓ Connected" variant="set" />);
    expect(screen.getByText("✓ Connected")).toBeDefined();
  });

  it("applies the set variant class", () => {
    const { container } = render(<StatusBadge label="Set" variant="set" />);
    const badge = container.querySelector(".secret-status-set");
    expect(badge).not.toBeNull();
  });

  it("applies the unset variant class", () => {
    const { container } = render(<StatusBadge label="Not set" variant="unset" />);
    const badge = container.querySelector(".secret-status-unset");
    expect(badge).not.toBeNull();
  });

  it("applies the pending variant class", () => {
    const { container } = render(<StatusBadge label="Syncing" variant="pending" />);
    const badge = container.querySelector(".secret-status-pending");
    expect(badge).not.toBeNull();
  });

  it("always has the base secret-status class", () => {
    const { container } = render(<StatusBadge label="Test" variant="set" />);
    const badge = container.querySelector(".secret-status");
    expect(badge).not.toBeNull();
  });
});
