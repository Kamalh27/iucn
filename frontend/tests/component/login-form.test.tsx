import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LoginForm } from "@/features/auth/components/login-form"

const loginAdminMock = vi.hoisted(() => vi.fn())

vi.mock("@/features/auth/api", () => ({
  loginAdmin: loginAdminMock,
}))

describe("LoginForm", () => {
  beforeEach(() => {
    loginAdminMock.mockReset()
  })

  it("submits trimmed credentials and calls onSuccess", async () => {
    loginAdminMock.mockResolvedValue({ id: "1", email: "admin@local.dev", full_name: "Admin", role: "admin" })
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    render(<LoginForm onSuccess={onSuccess} />)

    await user.type(screen.getByPlaceholderText("admin@local.dev"), "  admin@local.dev  ")
    await user.type(screen.getByPlaceholderText("admin123"), "s3cret-pass")
    await user.click(screen.getByRole("button", { name: /admin login/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(loginAdminMock).toHaveBeenCalledWith("admin@local.dev", "s3cret-pass")
  })

  it("shows the error message returned by the API and does not call onSuccess", async () => {
    loginAdminMock.mockRejectedValue(new Error("Invalid credentials"))
    const onSuccess = vi.fn()
    const user = userEvent.setup()

    render(<LoginForm onSuccess={onSuccess} />)

    await user.type(screen.getByPlaceholderText("admin@local.dev"), "admin@local.dev")
    await user.type(screen.getByPlaceholderText("admin123"), "wrong-pass")
    await user.click(screen.getByRole("button", { name: /admin login/i }))

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("disables the submit button and shows progress state while submitting", async () => {
    let resolveLogin: (value: unknown) => void = () => {}
    loginAdminMock.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve
      }),
    )
    const user = userEvent.setup()

    render(<LoginForm onSuccess={vi.fn()} />)

    await user.type(screen.getByPlaceholderText("admin@local.dev"), "admin@local.dev")
    await user.type(screen.getByPlaceholderText("admin123"), "pass")
    await user.click(screen.getByRole("button", { name: /admin login/i }))

    const button = screen.getByRole("button", { name: /signing in/i })
    expect(button).toBeDisabled()

    resolveLogin({ id: "1", email: "admin@local.dev", full_name: "Admin", role: "admin" })
    await waitFor(() => expect(screen.getByRole("button")).not.toBeDisabled())
  })

  it("requires both fields before the browser allows submission", () => {
    render(<LoginForm onSuccess={vi.fn()} />)

    expect(screen.getByPlaceholderText("admin@local.dev")).toBeRequired()
    expect(screen.getByPlaceholderText("admin123")).toBeRequired()
  })
})
