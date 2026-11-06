import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";

type SignInCallbacks = {
  onSuccess: () => void;
  onError: (error: { error: { message: string; statusText: string } }) => void;
};

type Credentials = { email: string; password: string };
const signInEmail = mock(
  async (_credentials: Credentials, callbacks: SignInCallbacks) => {
    callbacks.onSuccess();
  },
);
const navigate = mock(async (_options: { to: string }) => {});
const toastSuccess = mock((_message: string) => {});
const toastError = mock((_message: string) => {});

mock.module("@/lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ isPending: false }),
    signIn: { email: signInEmail },
  },
}));
mock.module("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));
mock.module("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

const { default: SignInForm } = await import("./sign-in-form");

describe("sign-in form", () => {
  it("validates required login fields without sending invalid credentials", async () => {
    signInEmail.mockClear();
    const view = render(<SignInForm />);
    const form = view.container.querySelector("form");
    if (!form) throw new Error("Expected the sign-in form");

    fireEvent.submit(form);

    expect(await view.findByText("Enter a valid email address")).toBeTruthy();
    expect(
      await view.findByText("Password must be at least 8 characters"),
    ).toBeTruthy();
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it("submits valid credentials and navigates to the dashboard", async () => {
    signInEmail.mockClear();
    navigate.mockClear();
    toastSuccess.mockClear();
    const view = render(<SignInForm />);
    fireEvent.input(view.getByLabelText("Email"), {
      target: { value: "demo-user@example.test" },
    });
    fireEvent.input(view.getByLabelText("Password"), {
      target: { value: "synthetic-password" },
    });
    fireEvent.click(view.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(signInEmail).toHaveBeenCalledWith(
        {
          email: "demo-user@example.test",
          password: "synthetic-password",
        },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
      expect(navigate).toHaveBeenCalledWith({ to: "/dashboard" });
      expect(toastSuccess).toHaveBeenCalledWith("Sign in successful");
    });
    expect(view.queryByText(/sign up/i)).toBeNull();
  });

  it("shows the authentication error returned by the server", async () => {
    signInEmail.mockClear();
    toastError.mockClear();
    signInEmail.mockImplementationOnce(async (_credentials, callbacks) => {
      callbacks.onError({
        error: { message: "Invalid credentials", statusText: "Unauthorized" },
      });
    });
    const view = render(<SignInForm />);
    fireEvent.input(view.getByLabelText("Email"), {
      target: { value: "demo-user@example.test" },
    });
    fireEvent.input(view.getByLabelText("Password"), {
      target: { value: "synthetic-password" },
    });
    fireEvent.click(view.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Invalid credentials");
    });
  });
});
