import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render } from "@testing-library/react";

import { AdminUserManagement, type ManagedUser } from "./admin-user-management";

const user: ManagedUser = {
  id: "synthetic-user-id",
  name: "Demo User",
  email: "demo-user@example.test",
  role: "User",
  isEnabled: true,
  createdAt: "2026-11-01T00:00:00.000Z",
};

describe("Administrator user access view", () => {
  it("shows identity and access status without financial data", () => {
    const { getByText, queryByText } = render(
      <AdminUserManagement users={[user]} onSetEnabled={() => {}} />,
    );

    expect(getByText("Demo User")).toBeTruthy();
    expect(getByText("demo-user@example.test")).toBeTruthy();
    expect(getByText("Access enabled")).toBeTruthy();
    expect(queryByText(/balance|transaction|income|expense/i)).toBeNull();
  });

  it("requests that enabled Users be disabled", () => {
    const onSetEnabled = mock(() => {});
    const { getByRole } = render(
      <AdminUserManagement users={[user]} onSetEnabled={onSetEnabled} />,
    );

    fireEvent.click(getByRole("button", { name: "Disable Demo User" }));

    expect(onSetEnabled).toHaveBeenCalledWith(user.id, false);
  });

  it("offers re-enabling a disabled User", () => {
    const onSetEnabled = mock(() => {});
    const { getByRole, getByText } = render(
      <AdminUserManagement
        users={[{ ...user, isEnabled: false }]}
        onSetEnabled={onSetEnabled}
      />,
    );

    expect(getByText("Access disabled")).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Enable Demo User" }));

    expect(onSetEnabled).toHaveBeenCalledWith(user.id, true);
  });
});
