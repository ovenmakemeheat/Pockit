import { Button } from "@Pockit/ui/components/button";
import { describe, expect, it, mock } from "bun:test";
import { fireEvent, render } from "@testing-library/react";

describe("shared Button", () => {
  it("renders an accessible button and handles activation", () => {
    const onClick = mock(() => {});

    const { getByRole } = render(<Button onClick={onClick}>Continue</Button>);
    fireEvent.click(getByRole("button", { name: "Continue" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
