import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import App from "./App";

test("renders Harbor Works heading", () => {
  render(<App />);
  expect(screen.getByText("Harbor Works")).toBeDefined();
});
